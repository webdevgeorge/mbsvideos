import { z } from 'zod';

/**
 * The two input files: one listing.json per property, one brand.json per agent.
 * Imported by both the Remotion bundle and tools/make.mjs (Node strips the
 * types), so validation and rendering can never disagree about the shape.
 */

export const TEMPLATES = [
    'property-tour',
    'just-listed',
    'open-house',
    'just-sold',
    'price-reduced',
    'agent-intro',
] as const;

export const STYLES = ['photo', 'character'] as const;

const photoEntry = z.union([
    z.string(),
    z.object({ file: z.string(), label: z.string().optional() }),
]);

export const listingSchema = z
    .object({
        template: z.enum(TEMPLATES).default('just-listed'),
        /** photo: full-screen listing photos. character: cartoon agent presenting in front of a house. */
        style: z.enum(STYLES).default('photo'),
        /** character style: drawn house, or the listing's first photo behind the agent. */
        backdrop: z.enum(['illustrated', 'photo']).default('illustrated'),
        address: z.object({
            street: z.string().min(1),
            city: z.string().default(''),
            state: z.string().default(''),
            zip: z.string().default(''),
        }),
        price: z.number().positive().optional(),
        previousPrice: z.number().positive().optional(),
        beds: z.number().nonnegative().optional(),
        baths: z.number().nonnegative().optional(),
        sqft: z.number().positive().optional(),
        features: z.array(z.string()).default([]),
        openHouse: z.object({ date: z.string(), time: z.string() }).optional(),
        /** Replaces the badge text, e.g. "COMING SOON". */
        headline: z.string().optional(),
        /** agent-intro only: one selling point per scene. */
        points: z.array(z.string()).default([]),
        /** Explicit order/labels. Omit to use photos/ sorted by filename. */
        photos: z.array(photoEntry).optional(),
        /** Path relative to the listing folder. Falls back to brand.music. */
        music: z.string().optional(),
        /** Path to a brand.json. Falls back to ./brand/brand.json. */
        brand: z.string().optional(),
        /** Spoken narration (Piper, offline). */
        voice: z.boolean().default(true),
        /** Narration overrides by scene key: intro, stats, price, openhouse, outro. */
        lines: z.record(z.string(), z.string()).default({}),
    })
    .superRefine((l, ctx) => {
        const need = (cond: unknown, path: string, message: string) => {
            if (!cond) ctx.addIssue({ code: 'custom', path: [path], message });
        };
        if (l.template === 'open-house') need(l.openHouse, 'openHouse', 'open-house needs { date, time }');
        if (l.template === 'price-reduced') {
            need(l.price, 'price', 'price-reduced needs the new price');
            need(l.previousPrice, 'previousPrice', 'price-reduced needs previousPrice');
        }
        if (l.template === 'agent-intro') need(l.points.length, 'points', 'agent-intro needs at least one point');
    });

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'use #RRGGBB');

export const brandSchema = z.object({
    agentName: z.string().min(1),
    title: z.string().default('REALTOR®'),
    brokerage: z.string().default(''),
    phone: z.string().default(''),
    email: z.string().default(''),
    website: z.string().default(''),
    /** Paths relative to the brand.json folder. */
    logo: z.string().optional(),
    headshot: z.string().optional(),
    music: z.string().optional(),
    colors: z
        .object({
            primary: hex.default('#0F2A44'),
            accent: hex.default('#C8A15A'),
        })
        .prefault({}),
    transition: z.enum(['push', 'fade']).default('push'),
    /** character style: a preset id (james, sofia, marcus, emily, david, aisha, grace) or a customised spec. */
    character: z
        .union([
            z.string(),
            z.object({
                preset: z.string().optional(),
                build: z.enum(['slim', 'regular', 'broad']).optional(),
                skin: z.string().optional(),
                hair: z
                    .object({
                        style: z.enum(['short', 'side', 'curly', 'bun', 'long', 'ponytail', 'bald', 'buzz']).optional(),
                        color: z.string().optional(),
                    })
                    .optional(),
                top: z.enum(['shirt-tie', 'blazer', 'polo', 'tee']).optional(),
                topColor: z.string().optional(),
                legColor: z.string().optional(),
                accessory: z.enum(['glasses', 'cap']).nullable().optional(),
            }),
        ])
        .default('james'),
    sfx: z.boolean().default(true),
    /** "auto" matches the character (male/female), or "male", "female", or a Piper model name. */
    voice: z.string().default('auto'),
    /** Piper length_scale: below 1 speaks faster, above 1 slower. */
    voiceSpeed: z.number().min(0.6).max(1.6).default(0.95),
});

export type Style = (typeof STYLES)[number];
export type Template = (typeof TEMPLATES)[number];
export type Listing = z.output<typeof listingSchema>;
export type Brand = z.output<typeof brandSchema>;
