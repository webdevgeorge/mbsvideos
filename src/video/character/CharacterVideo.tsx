import React, { useMemo } from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { castOf } from '../../character/types';
import type { Brand, Listing } from '../../schema';
import { badgeFor, formatPrice, priceLabel, type PhotoAsset, type Scene, type VideoProps } from '../../timeline';
import { round } from '../fonts';
import { Photo, ease, rgba } from '../parts';
import { Agent } from './Agent';
import { Bath, Bed, Clock, Phone, Pin, Ruler, Star } from './icons';
import { IllustratedWorld, PhotoWorld } from './World';

const INK = '#1D1416';
const MUTED = '#6B6670';

type Ctx = { scene: Scene; index: number; listing: Listing; brand: Brand; photos: PhotoAsset[] };

/* ---------- motion helpers ---------- */

/** Springs in with a little overshoot: the "pop". */
const Pop: React.FC<{ at: number; rotate?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
    at,
    rotate = 0,
    style,
    children,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const p = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 170, mass: 0.7 } });
    const o = interpolate(frame - at, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return (
        <div style={{ ...style, opacity: o, transform: `${style?.transform ?? ''} scale(${p}) rotate(${rotate * p}deg)` }}>{children}</div>
    );
};

/** Gentle idle float so held cards don't look frozen. */
const useFloat = (seed: number, amp = 6) => {
    const frame = useCurrentFrame();
    return Math.sin(frame / 22 + seed) * amp;
};

/** The scene's cards shrink away during the last frames as the next scene pops in. */
const Exit: React.FC<{ scene: Scene; transition: number; last: boolean; children: React.ReactNode }> = ({
    scene,
    transition,
    last,
    children,
}) => {
    const frame = useCurrentFrame();
    const q = last
        ? 0
        : interpolate(frame, [scene.duration - transition, scene.duration - 2], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: ease,
          });
    return (
        <AbsoluteFill style={{ opacity: 1 - q, transform: `translateY(${-q * 60}px) scale(${1 - q * 0.15})` }}>{children}</AbsoluteFill>
    );
};

/* ---------- building blocks ---------- */

const card: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: 32,
    boxShadow: '0 22px 50px rgba(0,0,0,0.25)',
    border: `4px solid ${INK}`,
};

const Polaroid: React.FC<{ photo?: PhotoAsset; duration: number; at: number; tilt: number; top: number; width: number; label?: string; brand: Brand; reverse?: boolean; children?: React.ReactNode }> = ({
    photo,
    duration,
    at,
    tilt,
    top,
    width,
    label,
    brand,
    reverse,
    children,
}) => {
    const float = useFloat(tilt);
    const h = Math.round((width - 36) * 0.62);
    return (
        <Pop at={at} rotate={tilt} style={{ position: 'absolute', top: top + float, left: (1080 - width) / 2, width }}>
            <div style={{ ...card, borderRadius: 14, padding: '18px 18px 0' }}>
                <div style={{ position: 'relative', height: h, borderRadius: 6, overflow: 'hidden', border: `3px solid ${INK}` }}>
                    <Photo photo={photo} duration={duration} reverse={reverse} fallback={brand.colors.primary} />
                    {children}
                </div>
                <div
                    style={{
                        height: label ? 86 : 26,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: round,
                        fontWeight: 600,
                        fontSize: 46,
                        color: brand.colors.primary,
                    }}
                >
                    {label}
                </div>
            </div>
        </Pop>
    );
};

const Chip: React.FC<{ at: number; icon: React.ReactNode; value: string; label: string; brand: Brand; seed: number }> = ({
    at,
    icon,
    value,
    label,
    brand,
    seed,
}) => {
    const float = useFloat(seed, 5);
    return (
        <Pop at={at} rotate={seed % 2 ? 2 : -2} style={{ transform: `translateY(${float}px)` }}>
            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 26px 16px 16px', borderRadius: 999 }}>
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: 99,
                        background: brand.colors.accent,
                        border: `3px solid ${INK}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {icon}
                </div>
                <div>
                    <div style={{ fontFamily: round, fontWeight: 700, fontSize: 52, lineHeight: 1, color: brand.colors.primary }}>{value}</div>
                    <div style={{ fontFamily: round, fontWeight: 600, fontSize: 22, letterSpacing: 3, color: MUTED, marginTop: 4 }}>{label}</div>
                </div>
            </div>
        </Pop>
    );
};

const Row: React.FC<{ top: number; children: React.ReactNode }> = ({ top, children }) => (
    <div style={{ position: 'absolute', top, left: 40, right: 40, display: 'flex', justifyContent: 'center', gap: 18 }}>{children}</div>
);

/* ---------- speech bubble (captions) ---------- */

const Bubble: React.FC<{ scene: Scene; brand: Brand }> = ({ scene, brand }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const words = scene.words;
    if (!words.length) return null;
    const t = (scene.start + frame) / fps;
    const first = words[0].start;
    const atFrame = Math.round(first * fps) - scene.start - 4;
    const p = spring({ frame: frame - atFrame, fps, config: { damping: 12, stiffness: 180 } });
    const chars = words.reduce((n, w) => n + w.w.length + 1, 0);
    const size = chars > 110 ? 36 : chars > 70 ? 42 : 48;

    return (
        <div
            style={{
                position: 'absolute',
                left: 60,
                right: 60,
                top: 1030,
                display: 'flex',
                justifyContent: 'center',
                transform: `scale(${p})`,
                transformOrigin: '30% 100%',
                opacity: p > 0.02 ? 1 : 0,
            }}
        >
            <div style={{ ...card, position: 'relative', padding: '22px 34px', borderRadius: 40, maxWidth: 960 }}>
                <div style={{ fontFamily: round, fontWeight: 600, fontSize: size, lineHeight: 1.22, color: INK, textAlign: 'center' }}>
                    {words.map((w, i) => {
                        const now = t >= w.start && t < w.end + 0.04;
                        const said = t >= w.start;
                        return (
                            <span key={i} style={{ color: now ? brand.colors.primary : INK, opacity: said ? 1 : 0.35 }}>
                                {w.w}{' '}
                            </span>
                        );
                    })}
                </div>
                {/* tail toward the agent's head */}
                <svg width={70} height={56} viewBox="0 0 70 56" style={{ position: 'absolute', left: 150, bottom: -50 }}>
                    <path d="M4 0 L 60 0 L 14 52 Z" fill="#FFFFFF" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
                    <rect x={0} y={-6} width={66} height={8} fill="#FFFFFF" />
                </svg>
            </div>
        </div>
    );
};

/* ---------- scenes ---------- */

const IntroPops: React.FC<Ctx> = ({ scene, listing, brand, photos }) => {
    const [a, b, c] = scene.pops;
    const { primary, accent } = brand.colors;
    const city = [listing.address.city, listing.address.state].filter(Boolean).join(', ');
    return (
        <>
            <Pop at={a} rotate={-4} style={{ position: 'absolute', top: 205, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <div
                    style={{
                        ...card,
                        background: accent,
                        padding: '14px 48px',
                        borderRadius: 999,
                        fontFamily: round,
                        fontWeight: 700,
                        fontSize: 66,
                        letterSpacing: 2,
                        color: primary,
                    }}
                >
                    {badgeFor(listing)}!
                </div>
            </Pop>
            <Polaroid photo={photos[scene.photo]} duration={scene.duration} at={b} tilt={2} top={340} width={820} brand={brand}>
                {listing.template === 'just-sold' && <SoldStamp at={c + 6} />}
            </Polaroid>
            <Pop at={c} rotate={-1.5} style={{ position: 'absolute', top: 845, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 38px 18px 22px' }}>
                    <Pin size={54} color={primary} />
                    <div>
                        <div style={{ fontFamily: round, fontWeight: 700, fontSize: 54, lineHeight: 1.05, color: primary }}>{listing.address.street}</div>
                        {city && <div style={{ fontFamily: round, fontWeight: 600, fontSize: 30, color: MUTED }}>{city}</div>}
                    </div>
                </div>
            </Pop>
        </>
    );
};

const SoldStamp: React.FC<{ at: number }> = ({ at }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const p = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 200 } });
    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: p > 0.01 ? 1 : 0 }}>
            <div
                style={{
                    border: '12px solid #E5484D',
                    color: '#E5484D',
                    background: 'rgba(255,255,255,0.8)',
                    padding: '0 40px',
                    borderRadius: 18,
                    fontFamily: round,
                    fontWeight: 700,
                    fontSize: 170,
                    transform: `rotate(-12deg) scale(${3 - 2 * p})`,
                }}
            >
                SOLD
            </div>
        </AbsoluteFill>
    );
};

const PhotoPops: React.FC<Ctx> = ({ scene, index, listing, brand, photos }) => {
    const photo = photos[scene.photo];
    const [a, b = a, c = b, d = c] = scene.pops;
    const { primary, accent } = brand.colors;
    const o = scene.overlay;
    const tilt = index % 2 ? 1.8 : -1.8;

    let extra: React.ReactNode = null;
    if (o.type === 'stats') {
        const chips: React.ReactNode[] = [];
        const at = [b, c, d];
        if (listing.beds !== undefined) chips.push(<Chip key="bd" at={at[chips.length]} seed={1} icon={<Bed size={42} color={primary} />} value={String(listing.beds)} label="BEDS" brand={brand} />);
        if (listing.baths !== undefined) chips.push(<Chip key="ba" at={at[chips.length]} seed={2} icon={<Bath size={42} color={primary} />} value={String(listing.baths)} label="BATHS" brand={brand} />);
        if (listing.sqft !== undefined) chips.push(<Chip key="sf" at={at[chips.length]} seed={3} icon={<Ruler size={42} color={primary} />} value={listing.sqft.toLocaleString('en-US')} label="SQ FT" brand={brand} />);
        extra = <Row top={860}>{chips}</Row>;
    } else if (o.type === 'price') {
        extra = (
            <Row top={845}>
                <PriceTag at={b} listing={listing} brand={brand} />
            </Row>
        );
    } else if (o.type === 'feature' || o.type === 'point') {
        extra = (
            <Row top={860}>
                <Pop at={b} rotate={index % 2 ? -1.5 : 1.5}>
                    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 18, padding: '20px 34px 20px 20px', maxWidth: 960 }}>
                        <div style={{ flex: 'none', width: 76, height: 76, borderRadius: 99, background: accent, border: `3px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Star size={44} color={primary} />
                        </div>
                        <div style={{ fontFamily: round, fontWeight: 600, fontSize: o.text.length > 34 ? 42 : 50, lineHeight: 1.12, color: primary }}>{o.text}</div>
                    </div>
                </Pop>
            </Row>
        );
    }

    return (
        <>
            <Polaroid photo={photo} duration={scene.duration} at={a} tilt={tilt} top={215} width={900} label={photo?.label} brand={brand} reverse={index % 2 === 1} />
            {extra}
        </>
    );
};

const PriceTag: React.FC<{ at: number; listing: Listing; brand: Brand }> = ({ at, listing, brand }) => {
    const frame = useCurrentFrame();
    const strike = interpolate(frame - at, [12, 24], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
    const swing = Math.sin((frame - at) / 9) * Math.max(0, 4 - (frame - at) / 12);
    const old = listing.template === 'price-reduced' ? listing.previousPrice : undefined;
    return (
        <Pop at={at} style={{ transform: `rotate(${swing - 3}deg)` }}>
            <div style={{ ...card, background: brand.colors.accent, display: 'flex', alignItems: 'center', gap: 26, padding: '18px 44px 18px 26px', borderRadius: 26 }}>
                <div style={{ width: 30, height: 30, borderRadius: 99, background: '#FFFFFF', border: `4px solid ${INK}` }} />
                <div>
                    <div style={{ fontFamily: round, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: rgba(brand.colors.primary, 0.75) }}>{priceLabel(listing)}</div>
                    {old !== undefined && (
                        <div style={{ position: 'relative', display: 'inline-block', fontFamily: round, fontWeight: 600, fontSize: 38, color: rgba(brand.colors.primary, 0.6) }}>
                            {formatPrice(old)}
                            <div style={{ position: 'absolute', left: -4, top: '50%', height: 6, width: `calc(${strike}% + 8px)`, background: '#E5484D', borderRadius: 3 }} />
                        </div>
                    )}
                    <div style={{ fontFamily: round, fontWeight: 700, fontSize: 80, lineHeight: 1, color: brand.colors.primary }}>{formatPrice(listing.price ?? 0)}</div>
                </div>
            </div>
        </Pop>
    );
};

const OpenHousePops: React.FC<Ctx> = ({ scene, listing, brand }) => {
    const [a, b] = scene.pops;
    const oh = listing.openHouse!;
    const { primary, accent } = brand.colors;
    const float = useFloat(2);
    return (
        <>
            <Pop at={a} rotate={-2} style={{ position: 'absolute', top: 230 + float, left: 190, width: 700 }}>
                <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
                    <div style={{ background: accent, borderBottom: `4px solid ${INK}`, padding: '26px 0', textAlign: 'center', fontFamily: round, fontWeight: 700, fontSize: 58, letterSpacing: 3, color: primary }}>
                        OPEN HOUSE
                    </div>
                    <div style={{ padding: '44px 40px 50px', textAlign: 'center' }}>
                        <div style={{ fontFamily: round, fontWeight: 700, fontSize: 76, lineHeight: 1.08, color: primary }}>{oh.date}</div>
                        <div style={{ marginTop: 24, fontFamily: round, fontWeight: 600, fontSize: 34, color: MUTED }}>{listing.address.street}</div>
                    </div>
                </div>
            </Pop>
            <Row top={830}>
                <Pop at={b} rotate={2}>
                    <div style={{ ...card, background: primary, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 44px', borderRadius: 999 }}>
                        <Clock size={56} color={accent} />
                        <div style={{ fontFamily: round, fontWeight: 700, fontSize: 64, color: '#FFFFFF' }}>{oh.time}</div>
                    </div>
                </Pop>
            </Row>
        </>
    );
};

const OutroPops: React.FC<Ctx> = ({ scene, brand }) => {
    const [a, b, c] = scene.pops;
    const { primary, accent } = brand.colors;
    const float = useFloat(4, 4);
    return (
        <>
            <Pop at={a} style={{ position: 'absolute', top: 215 + float, left: 110, width: 860 }}>
                <div style={{ ...card, padding: '44px 40px 40px', textAlign: 'center' }}>
                    {brand.headshot ? (
                        <Img src={staticFile(brand.headshot)} style={{ width: 200, height: 200, borderRadius: 999, objectFit: 'cover', border: `6px solid ${accent}` }} />
                    ) : null}
                    <div style={{ marginTop: 14, fontFamily: round, fontWeight: 700, fontSize: 74, lineHeight: 1.05, color: primary }}>{brand.agentName}</div>
                    <div style={{ marginTop: 8, fontFamily: round, fontWeight: 600, fontSize: 32, color: MUTED }}>
                        {[brand.title, brand.brokerage].filter(Boolean).join(' · ')}
                    </div>
                    {brand.website && <div style={{ marginTop: 10, fontFamily: round, fontWeight: 500, fontSize: 32, color: MUTED }}>{brand.website}</div>}
                </div>
            </Pop>
            {brand.phone && (
                <Row top={790}>
                    <Pop at={b} rotate={-2}>
                        <div style={{ ...card, background: accent, display: 'flex', alignItems: 'center', gap: 18, padding: '20px 46px', borderRadius: 999 }}>
                            <Phone size={56} color={primary} />
                            <div style={{ fontFamily: round, fontWeight: 700, fontSize: 66, color: primary }}>{brand.phone}</div>
                        </div>
                    </Pop>
                </Row>
            )}
            {brand.logo && (
                <Pop at={c} style={{ position: 'absolute', top: 190, right: 70 }}>
                    <div style={{ background: primary, borderRadius: 20, padding: '12px 20px', border: `4px solid ${INK}` }}>
                        <Img src={staticFile(brand.logo)} style={{ height: 64, display: 'block' }} />
                    </div>
                </Pop>
            )}
        </>
    );
};

const HeroPops: React.FC<Ctx> = ({ scene, brand }) => {
    const [a, b] = scene.pops;
    const { primary, accent } = brand.colors;
    return (
        <>
            <Pop at={a} rotate={-3} style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <div style={{ ...card, padding: '40px 60px', textAlign: 'center' }}>
                    <div style={{ fontFamily: round, fontWeight: 600, fontSize: 48, color: MUTED }}>Hi, I'm</div>
                    <div style={{ fontFamily: round, fontWeight: 700, fontSize: 96, lineHeight: 1.05, color: primary }}>{brand.agentName}</div>
                </div>
            </Pop>
            <Row top={640}>
                <Pop at={b} rotate={2}>
                    <div style={{ ...card, background: accent, padding: '16px 40px', borderRadius: 999, fontFamily: round, fontWeight: 700, fontSize: 46, color: primary }}>
                        {[brand.title, brand.brokerage].filter(Boolean).join(' · ')}
                    </div>
                </Pop>
            </Row>
        </>
    );
};

const POPS = { intro: IntroPops, photo: PhotoPops, openhouse: OpenHousePops, outro: OutroPops, hero: HeroPops } as const;

/* ---------- the composition ---------- */

/**
 * Character style: a cartoon realtor stands in front of the house and talks
 * the viewer through the listing while cards pop up above them.
 * The world and the agent persist; only the cards and the speech change per scene.
 */
export const CharacterVideo: React.FC<VideoProps> = ({ listing, brand, photos, timeline }) => {
    const cast = useMemo(() => castOf(brand.character, brand.colors.primary), [brand]);
    return (
        <AbsoluteFill style={{ backgroundColor: '#CFE9FB' }}>
            {listing.backdrop === 'photo' ? (
                <PhotoWorld photo={photos[0]} primary={brand.colors.primary} />
            ) : (
                <IllustratedWorld listing={listing} primary={brand.colors.primary} accent={brand.colors.accent} brokerage={brand.brokerage} />
            )}
            <Agent cast={cast} timeline={timeline} />
            {timeline.scenes.map((scene, i) => {
                const Body = POPS[scene.kind];
                return (
                    <Sequence key={i} from={scene.start} durationInFrames={scene.duration}>
                        <Exit scene={scene} transition={timeline.transition} last={i === timeline.scenes.length - 1}>
                            <Body scene={scene} index={i} listing={listing} brand={brand} photos={photos} />
                            <Bubble scene={scene} brand={brand} />
                        </Exit>
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};
