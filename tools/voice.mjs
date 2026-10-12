/**
 * Offline narration with Piper (https://github.com/rhasspy/piper).
 *
 * One clip per scene, so each scene is exactly as long as its line needs.
 * Piper gives no word timings, so captions use the text-based estimate
 * stretched over where the clip is actually voiced, and the character's mouth
 * follows the loudness of the audio frame by frame.
 */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimateSpeech } from '../src/timeline.ts';
import { ffmpeg, run } from './ff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PIPER_DIR = path.join(ROOT, '.piper');
const PIPER = path.join(PIPER_DIR, 'piper', process.platform === 'win32' ? 'piper.exe' : 'piper');

export const VOICES = {
    male: 'en_US-ryan-medium',
    female: 'en_US-lessac-medium',
};
/** Which voice each character preset gets when brand.voice is "auto". */
const PRESET_VOICE = { james: 'male', marcus: 'male', david: 'male', sofia: 'female', emily: 'female', aisha: 'female', grace: 'female' };

const RATE = 22050;

export const piperInstalled = () => existsSync(PIPER);

export function voiceModel(brand) {
    let v = brand.voice;
    if (v === 'auto') {
        const preset = typeof brand.character === 'string' ? brand.character : (brand.character.preset ?? 'james');
        v = PRESET_VOICE[preset] ?? 'male';
    }
    const name = VOICES[v] ?? v;
    const file = path.join(PIPER_DIR, 'voices', `${name}.onnx`);
    if (!existsSync(file)) throw new Error(`Voice model not found: ${file}. Run: npm run setup`);
    return file;
}

/** Make text read naturally: "1 – 4 PM" -> "1 to 4 PM", drop ®/™, "&" -> "and". */
export function speakable(text) {
    return text
        .replace(/[®™©]/g, '')
        .replace(/(\d)\s*[–-]\s*(\d)/g, '$1 to $2')
        .replace(/&/g, ' and ')
        .replace(/\s+/g, ' ')
        .trim();
}

function piper(model, text, out, lengthScale) {
    return new Promise((resolve, reject) => {
        const p = spawn(PIPER, ['--model', model, '--output_file', out, '--length_scale', String(lengthScale), '--sentence_silence', '0.25'], {
            cwd: path.dirname(PIPER),
        });
        let err = '';
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`piper failed (${code}): ${err.slice(-400)}`))));
        p.stdin.end(text + '\n');
    });
}

/** Mono 16-bit samples of a wav, via ffmpeg. */
async function samples(file, rate) {
    const bin = await ffmpeg();
    const { stdout } = await run(bin, ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(rate), '-'], {
        encoding: 'buffer',
        maxBuffer: 256 << 20,
    });
    return new Int16Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.length / 2));
}

/** RMS per window. */
function rms(pcm, window) {
    const out = [];
    for (let i = 0; i < pcm.length; i += window) {
        let s = 0;
        const end = Math.min(pcm.length, i + window);
        for (let j = i; j < end; j++) s += (pcm[j] / 32768) ** 2;
        out.push(Math.sqrt(s / Math.max(1, end - i)));
    }
    return out;
}

/**
 * Synthesise one scene's line. Cached by text + voice + speed.
 * Returns { file, duration, speech } where speech is { words, total } relative
 * to the clip's start, fitted to the voiced part of the clip.
 */
export async function speak(text, model, lengthScale = 1) {
    const clean = speakable(text);
    const key = createHash('sha1').update(`${clean}|${path.basename(model)}|${lengthScale}|v1`).digest('hex').slice(0, 16);
    const dir = path.join(ROOT, '.cache', 'voice');
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${key}.wav`);
    if (!existsSync(file)) await piper(model, clean, file, lengthScale);

    const pcm = await samples(file, RATE);
    const duration = pcm.length / RATE;

    // Where the voice actually starts and stops (10ms windows over a threshold).
    const win = rms(pcm, RATE / 100);
    const peak = Math.max(...win, 1e-6);
    const on = win.findIndex((v) => v > peak * 0.08);
    let off = win.length - 1;
    while (off > 0 && win[off] <= peak * 0.08) off--;
    const v0 = Math.max(0, on) / 100;
    const v1 = Math.max(v0 + 0.1, (off + 1) / 100);

    const est = estimateSpeech(clean);
    const k = est.total > 0 ? (v1 - v0) / est.total : 1;
    const words = est.words.map((w) => ({ w: w.w, start: v0 + w.start * k, end: v0 + w.end * k }));
    return { file, duration, speech: { words, total: duration } };
}

/**
 * Lay every scene's clip at its start time into one narration track, and
 * measure its loudness per video frame (0..1) for the mouth.
 */
export async function buildNarration(clips, total, fps, out) {
    const bin = await ffmpeg();
    const args = ['-y', '-hide_banner', '-loglevel', 'error'];
    const chains = [];
    clips.forEach((c, i) => {
        args.push('-i', c.file);
        const ms = Math.round(c.at * 1000);
        chains.push(`[${i}:a]aresample=48000,adelay=${ms}|${ms}[c${i}]`);
    });
    chains.push(`${clips.map((_, i) => `[c${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:duration=longest,apad,atrim=0:${total}[out]`);
    args.push('-filter_complex', chains.join(';'), '-map', '[out]', '-ac', '1', out);
    await run(bin, args, { maxBuffer: 16 << 20 });

    const rate = 24000;
    const pcm = await samples(out, rate);
    const levels = rms(pcm, rate / fps);
    // Normalise against a loud-but-not-peak level so ordinary speech opens the mouth.
    const sorted = [...levels].filter((v) => v > 0.002).sort((a, b) => a - b);
    const ref = sorted[Math.floor(sorted.length * 0.9)] || 1;
    return levels.map((v) => Math.min(1, +(v / ref).toFixed(3)));
}
