#!/usr/bin/env node
/**
 * listing folder -> vertical MP4.
 *
 *   node tools/make.mjs listings/123-oak-st [--check] [--out file.mp4]
 *
 * 1. validate listing.json + brand.json
 * 2. resize photos (cached) and stage them with brand assets as the bundle's public dir
 * 3. plan the timeline (src/timeline.ts, shared with the render)
 * 4. render silent video with Remotion, plus a cover image and a 3x3 preview sheet
 * 5. mix music + transition whooshes with ffmpeg and mux
 *
 * --check stops after the cover and preview sheet (fast look before a full render).
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { brandSchema, listingSchema } from '../src/schema.ts';
import { FPS, HEIGHT, WIDTH, layout, planScenes } from '../src/timeline.ts';
import { finishAudio } from './audio.mjs';
import { buildNarration, piperInstalled, speak, voiceModel } from './voice.mjs';
import { dimensions, ffmpeg, run } from './ff.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache');
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

function parseArgs(argv) {
    const opts = { check: false, out: null, dir: null, style: null, backdrop: null, voice: true };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--check') opts.check = true;
        else if (a === '--out') opts.out = argv[++i];
        else if (a === '--style') opts.style = argv[++i];
        else if (a === '--no-voice') opts.voice = false;
        else if (a === '--backdrop') opts.backdrop = argv[++i];
        else if (!opts.dir) opts.dir = a;
        else throw new Error(`Unexpected argument: ${a}`);
    }
    if (!opts.dir) {
        console.log('Usage: npm run make -- <listing folder> [--style photo|character] [--backdrop illustrated|photo] [--no-voice] [--check] [--out file.mp4]');
        process.exit(1);
    }
    return opts;
}

async function readJson(file, schema, what) {
    if (!existsSync(file)) throw new Error(`${what} not found: ${file}`);
    let raw;
    try {
        raw = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (e) {
        throw new Error(`${what} is not valid JSON (${file}): ${e.message}`);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
        throw new Error(`${what} has problems (${file}):\n${lines.join('\n')}`);
    }
    return parsed.data;
}

/** "03-primary_bedroom.jpg" -> "Primary Bedroom" */
export function labelFromFile(file) {
    return path
        .basename(file, path.extname(file))
        .replace(/^\d+[\s._-]*/, '')
        .replace(/[._-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function listPhotos(dir, listing) {
    if (listing.photos?.length) {
        return listing.photos.map((p) => {
            const file = typeof p === 'string' ? p : p.file;
            const label = typeof p === 'string' ? labelFromFile(file) : (p.label ?? labelFromFile(file));
            return { file: path.resolve(dir, file), label };
        });
    }
    const photoDir = path.join(dir, 'photos');
    if (!existsSync(photoDir)) return [];
    const names = (await fs.readdir(photoDir)).filter((n) => IMAGE_EXT.test(n)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    return names.map((n) => ({ file: path.join(photoDir, n), label: labelFromFile(n) }));
}

/**
 * Downscale to just over what the frame needs. Phone photos are 12-48MP and
 * Chrome decoding them every frame is most of the render time otherwise.
 * Landscape: height 2208 (frame height + room for the Ken Burns zoom).
 * Portrait: width 1242. Cached by content of path + size + mtime.
 */
async function preparePhoto(file, bin) {
    const st = await fs.stat(file).catch(() => null);
    if (!st) throw new Error(`Photo not found: ${file}`);
    const key = createHash('sha1').update(`${file}|${st.size}|${st.mtimeMs}|v1`).digest('hex').slice(0, 16);
    const out = path.join(CACHE, 'photos', `${key}.jpg`);
    const { width, height } = await dimensions(file);
    const aspect = width / height;
    if (!existsSync(out)) {
        await fs.mkdir(path.dirname(out), { recursive: true });
        const scale = aspect > WIDTH / HEIGHT ? 'scale=-2:2208' : 'scale=1242:-2';
        await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-vf', scale, '-q:v', '3', out]);
    }
    return { cached: out, aspect };
}

async function stageAsset(src, publicDir, name) {
    if (!src) return undefined;
    if (!existsSync(src)) throw new Error(`File not found: ${src}`);
    const rel = `brand/${name}${path.extname(src).toLowerCase()}`;
    await fs.mkdir(path.join(publicDir, 'brand'), { recursive: true });
    await fs.copyFile(src, path.join(publicDir, rel));
    return rel;
}

const pct = (p) => `${String(Math.round(p * 100)).padStart(3)}%`;

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    const dir = path.resolve(opts.dir);
    const id = path.basename(dir);
    const t0 = Date.now();

    // 1. inputs
    const listing = await readJson(path.join(dir, 'listing.json'), listingSchema, 'listing.json');
    if (opts.style) listing.style = listingSchema.shape.style.parse(opts.style);
    if (opts.backdrop) listing.backdrop = listingSchema.shape.backdrop.parse(opts.backdrop);
    const brandFile = listing.brand ? path.resolve(dir, listing.brand) : path.join(ROOT, 'brand', 'brand.json');
    const brand = await readJson(brandFile, brandSchema, 'brand.json');
    const brandDir = path.dirname(brandFile);

    const bin = await ffmpeg();
    if (!bin) throw new Error('No working ffmpeg found. Run `npm install` (installs ffmpeg-static).');

    // 2. stage public dir
    const publicDir = path.join(CACHE, 'public', id);
    await fs.rm(publicDir, { recursive: true, force: true });
    await fs.mkdir(path.join(publicDir, 'photos'), { recursive: true });

    const sources = await listPhotos(dir, listing);
    if (!sources.length) console.warn('! No photos found; using brand-colour backgrounds.');
    const photos = [];
    for (const [i, p] of sources.entries()) {
        const { cached, aspect } = await preparePhoto(p.file, bin);
        const rel = `photos/${String(i + 1).padStart(2, '0')}.jpg`;
        await fs.copyFile(cached, path.join(publicDir, rel));
        photos.push({ src: rel, label: p.label, aspect });
    }
    const stagedBrand = {
        ...brand,
        logo: await stageAsset(brand.logo && path.resolve(brandDir, brand.logo), publicDir, 'logo'),
        headshot: await stageAsset(brand.headshot && path.resolve(brandDir, brand.headshot), publicDir, 'headshot'),
    };
    console.log(`• ${listing.template} · ${listing.style} style · ${listing.address.street} · ${photos.length} photos`);

    // 3. timeline
    // 3. narration + timeline. With a voice, every scene is paced by its spoken
    // line. Without one, the character still "talks" to estimated timings and
    // the photo style keeps fixed scene lengths.
    const planned = planScenes(listing, brand, photos.length);
    const useVoice = opts.voice && listing.voice;
    let clips = null;
    if (useVoice && !piperInstalled()) {
        console.warn('! Piper not installed, rendering without a voice. Run: npm run setup');
    } else if (useVoice) {
        const model = voiceModel(brand);
        process.stdout.write(`• voice ${path.basename(model, '.onnx')}…`);
        clips = [];
        for (const s of planned) clips.push(s.say ? await speak(s.say, model, brand.voiceSpeed) : null);
        process.stdout.write(' done\n');
    }
    const timeline = layout(planned, listing, {
        fps: FPS,
        narrate: Boolean(clips) || listing.style === 'character',
        speech: clips?.map((c) => c?.speech),
    });
    let narration = null;
    if (clips?.some(Boolean)) {
        narration = path.join(CACHE, `${id}.voice.wav`);
        const placed = timeline.scenes.flatMap((s, i) => (clips[i] ? [{ file: clips[i].file, at: s.speechAt }] : []));
        timeline.energy = await buildNarration(placed, timeline.total / FPS, FPS, narration);
    }
    const inputProps = { listing, brand: stagedBrand, photos, timeline };
    const total = timeline.total / FPS;
    console.log(`• ${timeline.scenes.length} scenes, ${total.toFixed(1)}s`);

    // 4. render
    process.stdout.write('• bundling…');
    const serveUrl = await bundle({
        entryPoint: path.join(ROOT, 'src', 'index.ts'),
        publicDir,
        outDir: path.join(CACHE, 'bundle', id),
    });
    process.stdout.write(' done\n');
    const composition = await selectComposition({ serveUrl, id: 'Listing', inputProps });

    const outDir = path.join(ROOT, 'out');
    await fs.mkdir(outDir, { recursive: true });
    const suffix = listing.style === 'photo' ? '' : `-${listing.style}${listing.backdrop === 'photo' ? '-photo' : ''}`;
    const out = path.resolve(opts.out ?? path.join(outDir, `${id}${suffix}.mp4`));
    const base = out.replace(/\.mp4$/i, '');

    const intro = timeline.scenes[0];
    await renderStill({
        serveUrl, composition, inputProps,
        frame: Math.min(intro.start + intro.duration - 10, timeline.total - 1),
        output: `${base}.cover.jpg`, imageFormat: 'jpeg', jpegQuality: 90,
    });

    // Preview sheet: one frame from late in each of nine evenly spread scenes.
    const sheetDir = path.join(CACHE, 'sheet', id);
    await fs.rm(sheetDir, { recursive: true, force: true });
    await fs.mkdir(sheetDir, { recursive: true });
    const picks = Array.from({ length: 9 }, (_, i) => {
        const s = timeline.scenes[Math.min(timeline.scenes.length - 1, Math.round((i * (timeline.scenes.length - 1)) / 8))];
        return Math.min(s.start + Math.round(s.duration * 0.7), timeline.total - 1);
    });
    for (const [i, frame] of picks.entries()) {
        await renderStill({ serveUrl, composition, inputProps, frame, output: path.join(sheetDir, `${i + 1}.jpg`), imageFormat: 'jpeg' });
    }
    await run(bin, [
        '-y', '-hide_banner', '-loglevel', 'error', '-i', path.join(sheetDir, '%d.jpg'),
        '-vf', 'scale=360:-2,tile=3x3:padding=8:color=white', '-frames:v', '1', `${base}.sheet.jpg`,
    ]);
    console.log(`• cover  ${path.relative(ROOT, base)}.cover.jpg\n• sheet  ${path.relative(ROOT, base)}.sheet.jpg`);
    if (opts.check) return;

    const silent = path.join(CACHE, `${id}.silent.mp4`);
    let last = -1;
    await renderMedia({
        serveUrl, composition, inputProps,
        codec: 'h264', crf: 18, colorSpace: 'bt709', muted: true,
        outputLocation: silent,
        onProgress: ({ progress }) => {
            const p = Math.floor(progress * 20);
            if (p !== last) {
                last = p;
                process.stdout.write(`\r• rendering ${pct(progress)}`);
            }
        },
    });
    process.stdout.write('\n');

    // 5. sound
    const music = listing.music ? path.resolve(dir, listing.music) : brand.music ? path.resolve(brandDir, brand.music) : null;
    if (music && !existsSync(music)) throw new Error(`Music file not found: ${music}`);
    const events =
        listing.style === 'character'
            ? timeline.scenes.flatMap((s) => s.pops.map((p) => ({ t: (s.start + p) / FPS, kind: 'pop' })))
            : timeline.scenes.slice(1).map((s) => ({ t: s.start / FPS, kind: 'whoosh' }));
    const mixed = await finishAudio({ silent, out, total, music, voice: narration, events, sfx: brand.sfx });
    if (!mixed) await fs.copyFile(silent, out);

    console.log(`✓ ${path.relative(ROOT, out)}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

main().catch((e) => {
    console.error(`\n✗ ${e.message}`);
    process.exit(1);
});
