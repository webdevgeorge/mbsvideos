/**
 * How a character moves, as pure functions of time.
 *
 * Nothing here reads the clock, the DOM or any state: everything is a function
 * of the frame's time and the spoken words. That is what keeps a render
 * deterministic across parallel workers, and it is what makes the mouth
 * testable without rendering a single frame.
 */
import type { Word } from '../timeline';

export const MOUTHS = ['closed', 'small', 'open', 'wide'] as const;
export type Mouth = (typeof MOUTHS)[number];

export const POSES = ['idle', 'point', 'think', 'wave', 'shrug', 'present'] as const;
export type Pose = (typeof POSES)[number];

/** The word being spoken at `t`, or -1 in a gap. Words are in time order. */
export function wordAt(words: Word[], t: number): number {
    let lo = 0;
    let hi = words.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const w = words[mid];
        if (t < w.start) hi = mid - 1;
        else if (t >= w.end) lo = mid + 1;
        else return mid;
    }
    return -1;
}

/**
 * Seconds per mouth shape while talking — about eleven shapes a second, which
 * is the rate a syllable-ish flap reads as speech rather than as chattering.
 */
export const MOUTH_STEP = 0.09;

/**
 * The mouth on this frame.
 *
 * Open while a word is being said, closed in the gaps, and cycling through
 * shapes inside a word so a long word does not freeze on one. The cycle is
 * offset by the word's index, so two words in a row never flap identically.
 *
 * Energy, when a voice track supplied it, has the last word: a frame inside a
 * word's span that is actually silent (the tail of a word the aligner padded)
 * closes, and a quiet one cannot open wide.
 */
export function mouthAt(words: Word[], t: number, energy?: number | null): Mouth {
    const i = wordAt(words, t);
    if (i < 0) return 'closed';
    const w = words[i];
    const into = t - w.start;
    const span = Math.max(0.06, w.end - w.start);
    const cycle: Mouth[] = ['open', 'small', 'wide', 'small'];
    let m: Mouth = cycle[(Math.floor(into / MOUTH_STEP) + i) % cycle.length];
    // The last sliver of a word settles toward closed, which reads as the
    // consonant at the end rather than a mouth hanging open into the gap.
    if (into / span > 0.82) m = 'small';
    if (energy !== undefined && energy !== null) {
        if (energy < 0.05) return 'closed';
        if (energy < 0.16 && m === 'wide') m = 'open';
    }
    return m;
}

/** A small deterministic pseudo-random number in [0, 1) from an integer. */
export function hash01(n: number): number {
    let x = (n | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
}

/** How long a blink holds, seconds. */
export const BLINK = 0.13;

/**
 * Whether the eyes are shut on this frame: a blink every 2.8 to 4.6 seconds,
 * placed by a seed so two characters in one video never blink in unison.
 */
export function blinkAt(t: number, seed = 0): boolean {
    let at = 0.8 + hash01(seed) * 1.6;
    let k = 1;
    while (at <= t) {
        if (t - at < BLINK) return true;
        at += 2.8 + hash01(seed * 31 + k) * 1.8;
        k++;
    }
    return false;
}

/** A slow breath, -1..1. The layout decides how many pixels that is. */
export const breathAt = (t: number) => Math.sin(t * 2.1);

/**
 * Joint angles for one pose, in degrees. 0 is an arm hanging straight down;
 * negative swings the RIGHT arm (the one on the right of the screen) out and
 * up to the right, positive swings the LEFT arm out to the left. Forearms are
 * relative to their upper arm.
 */
export type Arms = { rUpper: number; rFore: number; lUpper: number; lFore: number; tilt: number };

export const POSE_ARMS: Record<Pose, Arms> = {
    idle: { rUpper: -8, rFore: -4, lUpper: 8, lFore: 4, tilt: 0 },
    // Up and to the right, at the graphic above the presenter's head.
    point: { rUpper: -138, rFore: -8, lUpper: 8, lFore: 4, tilt: 4 },
    think: { rUpper: -28, rFore: 132, lUpper: 10, lFore: -64, tilt: -6 },
    wave: { rUpper: -150, rFore: -18, lUpper: 8, lFore: 4, tilt: 4 },
    shrug: { rUpper: -34, rFore: -92, lUpper: 34, lFore: 92, tilt: 5 },
    present: { rUpper: -48, rFore: -22, lUpper: 48, lFore: 22, tilt: 0 },
};

/** Seconds a move between two poses takes. */
export const POSE_MOVE = 0.28;

export type Gesture = { start: number; end: number; pose: Pose };

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

const mix = (a: Arms, b: Arms, p: number): Arms => ({
    rUpper: a.rUpper + (b.rUpper - a.rUpper) * p,
    rFore: a.rFore + (b.rFore - a.rFore) * p,
    lUpper: a.lUpper + (b.lUpper - a.lUpper) * p,
    lFore: a.lFore + (b.lFore - a.lFore) * p,
    tilt: a.tilt + (b.tilt - a.tilt) * p,
});

/**
 * The pose a character holds at `t`, as joint angles.
 *
 * Written gestures win. Otherwise the character points for a moment whenever
 * something new appears on screen — `reveals` are those moments — which is
 * what makes a presenter read as presenting rather than as standing beside a
 * slideshow. Every change is eased in and out over POSE_MOVE, never cut.
 */
export function armsAt(t: number, gestures: Gesture[], reveals: number[], pointHold = 1.4): Arms {
    // Turn auto-points into the same shape as written gestures, then let the
    // written ones override wherever they overlap.
    const spans: Gesture[] = reveals.map((r) => ({ start: r, end: r + pointHold, pose: 'point' as Pose }));
    const all = [...spans, ...gestures].sort((a, b) => a.start - b.start);

    let current: Gesture | null = null;
    for (const g of gestures) if (g.start <= t && t < g.end) current = g;
    if (!current) for (const g of spans) if (g.start <= t && t < g.end) current = g;

    const idle = POSE_ARMS.idle;
    // Wave is the one pose that moves while held.
    const held = (pose: Pose, since: number): Arms => {
        const a = POSE_ARMS[pose];
        return pose === 'wave' ? { ...a, rFore: a.rFore + Math.sin(since * 11) * 18 } : a;
    };

    if (current) {
        const p = ease((t - current.start) / POSE_MOVE);
        // Coming from whatever was held just before, not always from idle, so
        // a point that turns into a shrug does not drop the arm on the way.
        const prev = [...all].reverse().find((g) => g !== current && g.end > current!.start - POSE_MOVE && g.start < current!.start);
        const from = prev ? held(prev.pose, current.start - prev.start) : idle;
        return mix(from, held(current.pose, t - current.start), p);
    }

    // Settling back to idle after the last thing ended.
    const last = [...all].reverse().find((g) => g.end <= t);
    if (last && t - last.end < POSE_MOVE) {
        const p = ease((t - last.end) / POSE_MOVE);
        return mix(held(last.pose, last.end - last.start), idle, p);
    }
    return idle;
}
