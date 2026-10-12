#!/usr/bin/env node
/**
 * One-time download of Piper (offline text-to-speech) and two English voices
 * into .piper/. About 140 MB. Safe to re-run: skips anything already there.
 *
 *   Piper 2023.11.14-2  github.com/rhasspy/piper (MIT)
 *   Voices              huggingface.co/rhasspy/piper-voices
 */
import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PIPER_DIR, VOICES, piperInstalled } from './voice.mjs';

const RELEASE = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2';
const ARCHIVE = { win32: 'piper_windows_amd64.zip', darwin: 'piper_macos_x64.tar.gz', linux: 'piper_linux_x86_64.tar.gz' }[process.platform];
const VOICE_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US';

async function download(url, file) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} downloading ${url}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
}

await fs.mkdir(path.join(PIPER_DIR, 'voices'), { recursive: true });

if (!piperInstalled()) {
    if (!ARCHIVE) throw new Error(`No Piper build for ${process.platform}`);
    const archive = path.join(PIPER_DIR, ARCHIVE);
    console.log(`• downloading ${ARCHIVE}…`);
    await download(`${RELEASE}/${ARCHIVE}`, archive);
    if (ARCHIVE.endsWith('.zip')) {
        execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force '${archive}' '${PIPER_DIR}'`]);
    } else {
        execFileSync('tar', ['-xzf', archive, '-C', PIPER_DIR]);
    }
    await fs.rm(archive);
}

for (const name of Object.values(VOICES)) {
    const [, speaker, quality] = name.split('-');
    for (const ext of ['.onnx', '.onnx.json']) {
        const file = path.join(PIPER_DIR, 'voices', name + ext);
        if (existsSync(file)) continue;
        console.log(`• downloading ${name}${ext}…`);
        await download(`${VOICE_BASE}/${speaker}/${quality}/${name}${ext}?download=true`, file);
    }
}
console.log('✓ Piper ready');
