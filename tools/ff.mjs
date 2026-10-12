import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const run = promisify(execFile);

/**
 * An ffmpeg that can actually mix audio, or null.
 *
 * Probed by capability rather than trusted: Remotion's bundled ffmpeg lists
 * amix with a `(null)` implementation and writes silent aac, which looks like
 * a muxing bug until you check. Order: ffmpeg-static, then whatever is on PATH.
 */
let ffmpegCache;
export async function ffmpeg() {
    if (ffmpegCache !== undefined) return ffmpegCache;
    const candidates = ['ffmpeg'];
    try {
        const mod = await import('ffmpeg-static');
        const bundled = mod.default ?? mod;
        if (typeof bundled === 'string') candidates.unshift(bundled);
    } catch {}
    for (const cand of candidates) {
        try {
            const { stdout } = await run(cand, ['-hide_banner', '-filters'], { maxBuffer: 8 << 20 });
            const line = stdout.split('\n').find((l) => /\bamix\b/.test(l));
            if (line && !line.includes('(null)')) return (ffmpegCache = cand);
        } catch {}
    }
    return (ffmpegCache = null);
}

let ffprobeCache;
export async function ffprobe() {
    if (ffprobeCache) return ffprobeCache;
    const candidates = ['ffprobe'];
    try {
        const mod = await import('ffprobe-static');
        const p = (mod.default ?? mod).path;
        if (p) candidates.unshift(p);
    } catch {}
    for (const cand of candidates) {
        try {
            await run(cand, ['-version']);
            return (ffprobeCache = cand);
        } catch {}
    }
    throw new Error('ffprobe not found. Run `npm install` or install ffmpeg.');
}

/** { width, height } of an image or video. */
export async function dimensions(file) {
    const { stdout } = await run(await ffprobe(), [
        '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height', '-of', 'json', file,
    ]);
    const s = JSON.parse(stdout).streams?.[0];
    if (!s) throw new Error(`Not an image: ${file}`);
    return { width: s.width, height: s.height };
}

export async function durationOf(file) {
    const { stdout } = await run(await ffprobe(), [
        '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
    ]);
    return parseFloat(stdout);
}
