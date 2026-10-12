import type { Brand, Listing, Template } from './schema';

/**
 * Listing data -> an ordered list of scenes with frame timings.
 *
 * Pure and dependency-free (type imports only), so tools/make.mjs can import it
 * straight from Node and the render, the sound effects and the narration all
 * work from the same timings.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
/** Frames two scenes overlap while one hands over to the next. */
export const TRANSITION = 14;

export type Overlay =
    | { type: 'none' }
    | { type: 'stats' }
    | { type: 'price' }
    | { type: 'feature'; text: string }
    | { type: 'point'; text: string };

export type SceneKind = 'intro' | 'photo' | 'openhouse' | 'outro' | 'hero';

export type PlannedScene = {
    kind: SceneKind;
    /** Index into props.photos. */
    photo: number;
    overlay: Overlay;
    /** Narration for this scene; empty means silent. */
    say: string;
};

/** A spoken word, seconds from the start of the video. */
export type Word = { w: string; start: number; end: number };

export type Scene = PlannedScene & {
    start: number;
    duration: number;
    /** The scene's narration, timed. Drives the character's mouth and the captions. */
    words: Word[];
    /** Frames (from the scene's start) at which each pop-up item appears. */
    pops: number[];
    /** Seconds from the video start at which this scene's narration begins. */
    speechAt: number;
};

export type Timeline = {
    fps: number;
    total: number;
    transition: number;
    scenes: Scene[];
    /** Narration loudness per frame (0..1) when a voice track exists; drives the mouth. */
    energy?: number[];
};

export type PhotoAsset = { src: string; label: string; aspect: number };

export type VideoProps = {
    listing: Listing;
    brand: Brand;
    photos: PhotoAsset[];
    timeline: Timeline;
};

const BADGE: Record<Template, string> = {
    'property-tour': 'PROPERTY TOUR',
    'just-listed': 'JUST LISTED',
    'open-house': 'OPEN HOUSE',
    'just-sold': 'JUST SOLD',
    'price-reduced': 'PRICE REDUCED',
    'agent-intro': 'MEET YOUR AGENT',
};

export const badgeFor = (l: Listing) => l.headline ?? BADGE[l.template];

export const formatPrice = (n: number) =>
    '$' + Math.round(n).toLocaleString('en-US');

/** "$1,250,000" reads badly aloud; "1.25 million dollars" does not. */
export function spokenPrice(n: number): string {
    if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)} million dollars`;
    if (n >= 1_000) return `${Math.round(n / 1_000)} thousand dollars`;
    return `${Math.round(n)} dollars`;
}

export function priceLabel(l: Listing): string {
    if (l.template === 'just-sold') return 'SOLD FOR';
    if (l.template === 'price-reduced') return 'NOW OFFERED AT';
    return 'OFFERED AT';
}

export const hasStats = (l: Listing) =>
    l.beds !== undefined || l.baths !== undefined || l.sqft !== undefined;

function statsLine(l: Listing): string {
    const parts: string[] = [];
    if (l.beds !== undefined) parts.push(`${l.beds} bedroom${l.beds === 1 ? '' : 's'}`);
    if (l.baths !== undefined) parts.push(`${l.baths} bathroom${l.baths === 1 ? '' : 's'}`);
    if (l.sqft !== undefined) parts.push(`${l.sqft.toLocaleString('en-US')} square feet`);
    if (parts.length > 1) parts[parts.length - 1] = 'and ' + parts[parts.length - 1];
    return parts.join(', ') + '.';
}

function introLine(l: Listing): string {
    const where = [l.address.street, l.address.city].filter(Boolean).join(', ');
    switch (l.template) {
        case 'just-listed':
            return `Just listed. ${where}.`;
        case 'open-house':
            return `You're invited to an open house at ${where}.`;
        case 'just-sold':
            return `Just sold. ${where}.`;
        case 'price-reduced':
            return `Price reduced on ${where}.`;
        default:
            return `Take a tour of ${where}.`;
    }
}

function priceLine(l: Listing): string {
    if (l.price === undefined) return '';
    const p = spokenPrice(l.price);
    if (l.template === 'just-sold') return `Sold for ${p}.`;
    if (l.template === 'price-reduced') return `Now offered at ${p}.`;
    return `Offered at ${p}.`;
}

function outroLine(l: Listing, b: Brand): string {
    const who = b.agentName + (b.brokerage ? ` with ${b.brokerage}` : '');
    if (l.template === 'just-sold') return `Thinking of selling? Call ${who}.`;
    if (l.template === 'agent-intro') return `Ready to make a move? Call ${who}.`;
    return `To schedule a private showing, call ${who}.`;
}

export function outroCta(l: Listing): string {
    if (l.template === 'just-sold') return 'Thinking of selling?';
    if (l.template === 'agent-intro') return "Let's talk";
    return 'Schedule your private tour';
}

/** Which scenes, in what order, saying what. No timings yet. */
export function planScenes(l: Listing, b: Brand, photoCount: number): PlannedScene[] {
    const say = (key: string, fallback: string) => l.lines[key] ?? fallback;
    const n = Math.max(photoCount, 1);
    const scenes: PlannedScene[] = [];

    if (l.template === 'agent-intro') {
        scenes.push({
            kind: 'hero',
            photo: 0,
            overlay: { type: 'none' },
            say: say('intro', `Hi, I'm ${b.agentName}${b.brokerage ? `, with ${b.brokerage}` : ''}.`),
        });
        l.points.forEach((text, i) =>
            scenes.push({ kind: 'photo', photo: (i + 1) % n, overlay: { type: 'point', text }, say: text }),
        );
    } else {
        scenes.push({ kind: 'intro', photo: 0, overlay: { type: 'none' }, say: say('intro', introLine(l)) });

        // Information cards, handed out one per photo after the opener.
        const cards: { overlay: Overlay; say: string }[] = [];
        if (l.template === 'price-reduced' && l.price !== undefined) {
            cards.push({ overlay: { type: 'price' }, say: say('price', priceLine(l)) });
        }
        if (hasStats(l)) cards.push({ overlay: { type: 'stats' }, say: say('stats', statsLine(l)) });
        if (l.template !== 'price-reduced' && l.price !== undefined) {
            cards.push({ overlay: { type: 'price' }, say: say('price', priceLine(l)) });
        }
        for (const text of l.features) cards.push({ overlay: { type: 'feature', text }, say: `${text}.` });

        // Every remaining photo gets a scene; if there are more cards than
        // photos, photos repeat (skipping the opener when there is a choice).
        const count = Math.max(n - 1, cards.length);
        for (let i = 0; i < count; i++) {
            const photo = n === 1 ? 0 : 1 + (i % (n - 1));
            const card = cards[i] ?? { overlay: { type: 'none' } as Overlay, say: '' };
            scenes.push({ kind: 'photo', photo, ...card });
        }

        if (l.openHouse) {
            const time = l.openHouse.time.replace(/\s*[–-]\s*/g, ' to ');
            scenes.push({
                kind: 'openhouse',
                photo: 0,
                overlay: { type: 'none' },
                say: say('openhouse', `Join us for an open house, ${l.openHouse.date}, from ${time}.`),
            });
        }
    }

    scenes.push({ kind: 'outro', photo: 0, overlay: { type: 'none' }, say: say('outro', outroLine(l, b)) });
    return scenes;
}

const DEFAULT_SECONDS: Record<SceneKind, number> = {
    intro: 3.5,
    hero: 4,
    photo: 3,
    openhouse: 4,
    outro: 4.5,
};

/** Speech relative to its own start, in seconds. */
export type Speech = { words: Word[]; total: number };

/**
 * A believable reading of `text` with no audio: word length sets word
 * duration, punctuation adds a pause. Used for lip-sync and captions until a
 * real voice track supplies exact timings.
 */
export function estimateSpeech(text: string): Speech {
    const words: Word[] = [];
    let t = 0;
    for (const w of text.split(/\s+/).filter(Boolean)) {
        const letters = w.replace(/[^\p{L}\p{N}]/gu, '').length;
        const d = 0.14 + 0.058 * Math.max(letters, 1);
        words.push({ w, start: t, end: t + d });
        t += d + 0.04;
        if (/[.!?]$/.test(w)) t += 0.32;
        else if (/[,;:]$/.test(w)) t += 0.16;
    }
    return { words, total: words.length ? words[words.length - 1].end : 0 };
}

/** Pop-up items a scene shows, for the character style's stagger and pop sounds. */
function popCount(s: PlannedScene, l: Listing): number {
    switch (s.kind) {
        case 'intro':
            return 3;
        case 'hero':
            return 2;
        case 'openhouse':
            return 2;
        case 'outro':
            return 3;
        default:
            if (s.overlay.type === 'stats') return 1 + [l.beds, l.baths, l.sqft].filter((v) => v !== undefined).length;
            return s.overlay.type === 'none' ? 1 : 2;
    }
}

/** Frames between a scene's start and its narration starting. */
const SPEECH_LEAD = 10;
/** Frames between two pop-ups in one scene. */
const POP_GAP = 9;

/**
 * Give each scene a length, a start frame, timed words and pop-up cues.
 *
 * A scene lasts its default length or as long as its narration needs plus a
 * beat, whichever is longer. `speech[i]` overrides the estimate (a real voice
 * track). Consecutive scenes overlap by TRANSITION frames.
 */
export function layout(
    planned: PlannedScene[],
    listing: Listing,
    opts: { fps?: number; speech?: (Speech | undefined)[]; narrate?: boolean } = {},
): Timeline {
    const fps = opts.fps ?? FPS;
    const narrate = opts.narrate ?? true;
    let cursor = 0;
    const scenes: Scene[] = planned.map((s, i) => {
        const enter = i > 0 ? TRANSITION : 0;
        const speech = narrate ? (opts.speech?.[i] ?? estimateSpeech(s.say)) : { words: [], total: 0 };
        const talk = speech.total > 0 ? (SPEECH_LEAD + 0) / fps + speech.total + 0.7 : 0;
        const want = Math.max(DEFAULT_SECONDS[s.kind], talk);
        const duration = Math.round(want * fps) + enter;
        const start = i === 0 ? 0 : cursor - TRANSITION;
        cursor = start + duration;
        const offset = (start + enter + SPEECH_LEAD) / fps;
        const words = speech.words.map((w) => ({ w: w.w, start: w.start + offset, end: w.end + offset }));
        const pops = Array.from({ length: popCount(s, listing) }, (_, k) => enter + 4 + k * POP_GAP);
        return { ...s, start, duration, words, pops, speechAt: offset };
    });
    return { fps, total: cursor, transition: TRANSITION, scenes };
}
