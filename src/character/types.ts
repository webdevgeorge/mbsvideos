/**
 * Who is on screen: a character described by options, never by a picture.
 * The roster is realtors.
 */

export const BUILDS = ['slim', 'regular', 'broad'] as const;
export type Build = (typeof BUILDS)[number];

export const HAIR_STYLES = ['short', 'side', 'curly', 'bun', 'long', 'ponytail', 'bald', 'buzz'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const TOPS = ['shirt-tie', 'blazer', 'hoodie', 'polo', 'tee', 'scrubs'] as const;
export type Top = (typeof TOPS)[number];

export const ACCESSORIES = ['headset', 'glasses', 'cap'] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export type CastSpec = {
    id: string;
    name: string;
    kind: 'person' | 'robot';
    build: Build;
    skin: string;
    hair: { style: HairStyle; color: string };
    top: Top;
    topColor: string;
    legColor: string;
    accessory: Accessory | null;
};

export const SKIN_TONES = {
    porcelain: '#F6D7C3',
    light: '#EFC3A4',
    sand: '#DDA77F',
    tan: '#C68A5E',
    brown: '#9A6440',
    deep: '#6B4229',
} as const;

const base = { kind: 'person' as const, build: 'regular' as const, top: 'blazer' as const, topColor: '#0F2A44', legColor: '#23324A', accessory: null };

/** Pick one in brand.json: "character": "sofia", or customise: { "preset": "sofia", "hair": { "color": "#C9A06A" } } */
export const ROSTER: readonly CastSpec[] = [
    { ...base, id: 'james', name: 'James', skin: SKIN_TONES.light, hair: { style: 'short', color: '#3B2416' } },
    { ...base, id: 'sofia', name: 'Sofia', build: 'slim', skin: SKIN_TONES.tan, hair: { style: 'long', color: '#1F1410' } },
    { ...base, id: 'marcus', name: 'Marcus', build: 'broad', skin: SKIN_TONES.brown, hair: { style: 'buzz', color: '#15100D' } },
    { ...base, id: 'emily', name: 'Emily', build: 'slim', skin: SKIN_TONES.porcelain, hair: { style: 'ponytail', color: '#C9A06A' } },
    { ...base, id: 'david', name: 'David', top: 'shirt-tie', topColor: '#F4F1EA', skin: SKIN_TONES.sand, hair: { style: 'side', color: '#8A8A8A' }, accessory: 'glasses' },
    { ...base, id: 'aisha', name: 'Aisha', skin: SKIN_TONES.deep, hair: { style: 'curly', color: '#120C0A' } },
    { ...base, id: 'grace', name: 'Grace', build: 'slim', skin: SKIN_TONES.light, hair: { style: 'bun', color: '#5A3825' }, accessory: 'glasses' },
];

export const CAST_IDS = ROSTER.map((c) => c.id);

type CastInput = string | (Partial<Omit<CastSpec, 'hair'>> & { preset?: string; hair?: Partial<CastSpec['hair']> });

/**
 * A preset id or a partial spec -> what to draw. A blazer takes the brand's
 * primary colour unless the input sets topColor itself.
 */
export function castOf(input: CastInput, brandColor?: string): CastSpec {
    if (typeof input === 'string') {
        const preset = ROSTER.find((c) => c.id === input) ?? ROSTER[0];
        return preset.top === 'blazer' && brandColor ? { ...preset, topColor: brandColor } : preset;
    }
    const preset = ROSTER.find((c) => c.id === (input.preset ?? input.id)) ?? ROSTER[0];
    const spec: CastSpec = { ...preset, ...input, hair: { ...preset.hair, ...(input.hair ?? {}) }, id: input.id ?? preset.id } as CastSpec;
    if (!input.topColor && spec.top === 'blazer' && brandColor) spec.topColor = brandColor;
    return spec;
}
