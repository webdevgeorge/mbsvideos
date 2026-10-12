#!/usr/bin/env node
/**
 * Generates placeholder photos + a music bed for listings/example, so the
 * pipeline can be tried before real listing photos exist. Safe to re-run.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpeg, run } from './ff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'listings', 'example');

const ROOMS = [
    ['01-exterior', '0x6B8CAE', '0xE8D9B5', 4032, 3024],
    ['02-living-room', '0xD8C3A5', '0x8E8D8A', 4032, 3024],
    ['03-kitchen', '0xEAE7DC', '0x7A9E9F', 4032, 3024],
    ['04-dining', '0xC9A66B', '0x3E3E3E', 4032, 3024],
    ['05-primary-bedroom', '0xB8B8D1', '0x5B5F97', 4032, 3024],
    ['06-primary-bath', '0xF2F2F2', '0x9DB4C0', 3024, 4032],
    ['07-backyard', '0x7FB069', '0x2E5266', 4032, 3024],
];

const bin = await ffmpeg();
if (!bin) throw new Error('ffmpeg not found; run npm install');
await fs.mkdir(path.join(dir, 'photos'), { recursive: true });

for (const [name, c0, c1, w, h] of ROOMS) {
    const src = `gradients=s=${w}x${h}:c0=${c0}:c1=${c1}:x0=0:y0=0:x1=${w}:y1=${h}:speed=0.00001`;
    await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', src, '-vf', 'vignette', '-frames:v', '1', '-q:v', '3', path.join(dir, 'photos', `${name}.jpg`)]);
}

// A soft 4-chord pad, 40s, so the music mix can be heard. Replace with a real track.
const chord = (f, a, b, c) => `0.05*(sin(2*PI*${a}*t)+sin(2*PI*${b}*t)+sin(2*PI*${c}*t))*(1-0.3*sin(2*PI*0.1*t))*between(t\\,${f}\\,${f + 10})`;
const expr = [chord(0, 220, 277.18, 329.63), chord(10, 196, 246.94, 293.66), chord(20, 174.61, 220, 261.63), chord(30, 196, 246.94, 329.63)].join('+');
await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `aevalsrc='${expr}':d=40:s=48000`, '-af', 'aecho=0.8:0.7:400:0.4,lowpass=f=2500', '-c:a', 'libmp3lame', '-q:a', '4', path.join(dir, 'music.mp3')]);

console.log('✓ listings/example ready. Now: npm run make -- listings/example');
