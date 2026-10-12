import { ffmpeg, run } from './ff.mjs';

/**
 * Synthesised transition whoosh.
 *
 * Pure lavfi: no sample files to license. Weight sits in 300-800Hz so it reads
 * on a phone speaker, the pitch sweeps so it isn't a beep, and every noise
 * source is seeded so two renders of the same listing are identical.
 * Expressions avoid commas (pow/min/max) because a comma separates filters.
 */
const WHOOSH = [
    'anoisesrc=d=0.65:c=pink:seed=13:a=0.9,highpass=f=400,lowpass=f=8000,' +
        "volume='sin(PI*t/0.65)*sin(PI*t/0.65)*0.5':eval=frame," +
        'aecho=0.9:0.5:55:0.18',
    "aevalsrc='(0.26*sin(2*PI*(360*t+2000*t*t))+0.13*sin(2*PI*(720*t+4000*t*t))" +
        "+0.06*sin(2*PI*(1080*t+6000*t*t)))*sin(PI*t/0.65)':d=0.65",
];
/** The whoosh peaks ~0.3s in; start it early so the peak meets the cut. */
const WHOOSH_LEAD = 0.2;

/**
 * A bubbly "pop" for a card springing in: a fast upward chirp (500->1700Hz)
 * with a click on the front, gone in under 0.2s.
 */
const POP = [
    "aevalsrc='0.55*sin(2*PI*(500*t+3000*t*t))*exp(-24*t)':d=0.2",
    'anoisesrc=d=0.03:c=white:seed=21:a=0.4,highpass=f=2000,' + "volume='exp(-90*t)':eval=frame",
];

const SOUNDS = { whoosh: { srcs: WHOOSH, lead: WHOOSH_LEAD }, pop: { srcs: POP, lead: 0.02 } };

const NORM = 'aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo';

/**
 * Build the soundtrack and mux it onto the silent render.
 *
 * - music: looped/trimmed to length, faded in and out, ducked under the voice
 * - voice: optional narration track, already timed to the video
 * - events: [{ t, kind: 'whoosh' | 'pop' }] synthesised effects
 *
 * Returns false (and leaves `out` untouched) when there is nothing to add.
 */
export async function finishAudio({ silent, out, total, music, voice, events, sfx }) {
    const bin = await ffmpeg();
    const wantSfx = sfx && events.length > 0;
    if (!music && !voice && !wantSfx) return false;
    if (!bin) {
        console.warn('! No ffmpeg with working audio filters found; writing the video without sound.');
        return false;
    }

    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-i', silent];
    const chains = [];
    const mix = [];
    let input = 1;

    let voiceLabel = null;
    if (voice) {
        args.push('-i', voice);
        chains.push(`[${input}:a]${NORM},apad,atrim=0:${total},asplit=2[voice][vkey]`);
        voiceLabel = 'voice';
        input++;
    }

    if (music) {
        args.push('-stream_loop', '-1', '-i', music);
        const fadeOut = Math.max(total - 2.5, 0);
        let chain = `[${input}:a]${NORM},atrim=0:${total},asetpts=N/SR/TB,` +
            `afade=t=in:d=1,afade=t=out:st=${fadeOut}:d=2.5,volume=${voice ? 0.55 : 0.8}`;
        if (voice) {
            chains.push(chain + '[mraw]');
            chains.push('[mraw][vkey]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[music]');
        } else {
            chains.push(chain + '[music]');
        }
        mix.push('[music]');
        input++;
    } else if (voice) {
        chains.push('[vkey]anullsink');
    }
    if (voiceLabel) mix.push(`[${voiceLabel}]`);

    if (wantSfx) {
        const parts = [];
        for (const { t, kind } of events) {
            const sound = SOUNDS[kind] ?? SOUNDS.whoosh;
            const ms = Math.max(0, Math.round((t - sound.lead) * 1000));
            for (const src of sound.srcs) {
                args.push('-f', 'lavfi', '-i', src);
                const label = `s${input}`;
                chains.push(`[${input}:a]${NORM},adelay=${ms}|${ms}[${label}]`);
                parts.push(`[${label}]`);
                input++;
            }
        }
        chains.push(
            `${parts.join('')}amix=inputs=${parts.length}:normalize=0:duration=longest,` +
                `highpass=f=120,volume=${voice || music ? 0.35 : 0.5}[sfx]`,
        );
        mix.push('[sfx]');
    }

    chains.push(
        `${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=longest,` +
            `atrim=0:${total},alimiter=limit=0.95[out]`,
    );

    args.push(
        '-filter_complex', chains.join(';'),
        '-map', '0:v', '-map', '[out]',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-t', String(total), '-movflags', '+faststart', out,
    );
    await run(bin, args, { maxBuffer: 16 << 20 });
    return true;
}
