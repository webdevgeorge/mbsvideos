import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { Brand, Listing } from '../schema';
import { badgeFor, formatPrice, outroCta, priceLabel, type Overlay, type PhotoAsset, type Scene } from '../timeline';
import { serif, sans } from './fonts';
import { Badge, Logo, Lower, Photo, RoomLabel, Rise, Shade, ease, rgba, useEnter } from './parts';

type SceneProps = { scene: Scene; index: number; listing: Listing; brand: Brand; photos: PhotoAsset[] };

const cityLine = (l: Listing) =>
    [l.address.city, [l.address.state, l.address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

/* ---------- opener ---------- */

const SoldStamp: React.FC<{ color: string }> = ({ color }) => {
    const p = useEnter(10);
    return (
        <div
            style={{
                position: 'absolute',
                top: 420,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                opacity: p,
            }}
        >
            <div
                style={{
                    border: `12px solid ${color}`,
                    color,
                    padding: '10px 60px',
                    fontFamily: serif,
                    fontWeight: 700,
                    fontSize: 210,
                    letterSpacing: 12,
                    transform: `rotate(-8deg) scale(${2 - p})`,
                    background: 'rgba(0,0,0,0.25)',
                }}
            >
                SOLD
            </div>
        </div>
    );
};

export const IntroScene: React.FC<SceneProps> = ({ scene, listing, brand, photos }) => {
    const { primary, accent } = brand.colors;
    return (
        <AbsoluteFill>
            <Photo photo={photos[scene.photo]} duration={scene.duration} fallback={primary} />
            <Shade />
            <Logo src={brand.logo} />
            {listing.template === 'just-sold' && <SoldStamp color={accent} />}
            <Lower>
                <Badge text={badgeFor(listing)} bg={accent} fg={primary} delay={4} />
                <Rise delay={10}>
                    <div
                        style={{
                            marginTop: 30,
                            fontFamily: serif,
                            fontWeight: 700,
                            fontSize: 104,
                            lineHeight: 1.02,
                            color: 'white',
                            textShadow: '0 4px 30px rgba(0,0,0,0.4)',
                        }}
                    >
                        {listing.address.street}
                    </div>
                </Rise>
                <Rise delay={16}>
                    <div
                        style={{
                            marginTop: 22,
                            fontFamily: sans,
                            fontWeight: 600,
                            fontSize: 38,
                            letterSpacing: 5,
                            color: 'rgba(255,255,255,0.9)',
                            textTransform: 'uppercase',
                        }}
                    >
                        {cityLine(listing)}
                    </div>
                </Rise>
            </Lower>
        </AbsoluteFill>
    );
};

/* ---------- information cards ---------- */

const StatsCard: React.FC<{ listing: Listing; brand: Brand }> = ({ listing, brand }) => {
    const items = [
        listing.beds !== undefined && { value: String(listing.beds), label: 'BEDS' },
        listing.baths !== undefined && { value: String(listing.baths), label: 'BATHS' },
        listing.sqft !== undefined && { value: listing.sqft.toLocaleString('en-US'), label: 'SQ FT' },
    ].filter(Boolean) as { value: string; label: string }[];
    const p = useEnter(6);
    return (
        <div
            style={{
                display: 'flex',
                background: rgba(brand.colors.primary, 0.82),
                borderRadius: 28,
                padding: '44px 0',
                opacity: p,
                transform: `translateY(${(1 - p) * 50}px)`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
        >
            {items.map((it, i) => (
                <div
                    key={it.label}
                    style={{
                        flex: 1,
                        textAlign: 'center',
                        borderLeft: i ? '2px solid rgba(255,255,255,0.15)' : undefined,
                    }}
                >
                    <Rise delay={12 + i * 6} distance={24}>
                        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 88, color: 'white', lineHeight: 1 }}>
                            {it.value}
                        </div>
                        <div
                            style={{
                                marginTop: 16,
                                fontFamily: sans,
                                fontWeight: 700,
                                fontSize: 28,
                                letterSpacing: 5,
                                color: brand.colors.accent,
                            }}
                        >
                            {it.label}
                        </div>
                    </Rise>
                </div>
            ))}
        </div>
    );
};

const PriceCard: React.FC<{ listing: Listing; brand: Brand }> = ({ listing, brand }) => {
    const frame = useCurrentFrame();
    const strike = interpolate(frame, [20, 34], [0, 100], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: ease,
    });
    const showOld = listing.template === 'price-reduced' && listing.previousPrice !== undefined;
    return (
        <div>
            <Rise delay={4}>
                <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 34, letterSpacing: 7, color: brand.colors.accent }}>
                    {priceLabel(listing)}
                </div>
            </Rise>
            {showOld && (
                <Rise delay={8}>
                    <div
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            marginTop: 18,
                            fontFamily: sans,
                            fontWeight: 600,
                            fontSize: 56,
                            color: 'rgba(255,255,255,0.7)',
                        }}
                    >
                        {formatPrice(listing.previousPrice!)}
                        <div
                            style={{
                                position: 'absolute',
                                left: -6,
                                top: '52%',
                                height: 6,
                                width: `calc(${strike}% + 12px)`,
                                background: '#E5484D',
                                borderRadius: 3,
                            }}
                        />
                    </div>
                </Rise>
            )}
            <Rise delay={showOld ? 30 : 10}>
                <div
                    style={{
                        marginTop: 10,
                        fontFamily: serif,
                        fontWeight: 700,
                        fontSize: 132,
                        lineHeight: 1.05,
                        color: 'white',
                        textShadow: '0 4px 30px rgba(0,0,0,0.45)',
                    }}
                >
                    {formatPrice(listing.price ?? 0)}
                </div>
            </Rise>
        </div>
    );
};

const Statement: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
    const frame = useCurrentFrame();
    const bar = interpolate(frame, [4, 20], [0, 110], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
    return (
        <div>
            <div style={{ width: bar, height: 10, background: accent, borderRadius: 5, marginBottom: 30 }} />
            <Rise delay={8}>
                <div
                    style={{
                        fontFamily: serif,
                        fontWeight: 700,
                        fontSize: 80,
                        lineHeight: 1.1,
                        color: 'white',
                        textShadow: '0 4px 30px rgba(0,0,0,0.45)',
                    }}
                >
                    {text}
                </div>
            </Rise>
        </div>
    );
};

const OverlayCard: React.FC<{ overlay: Overlay; listing: Listing; brand: Brand }> = ({ overlay, listing, brand }) => {
    switch (overlay.type) {
        case 'stats':
            return <StatsCard listing={listing} brand={brand} />;
        case 'price':
            return <PriceCard listing={listing} brand={brand} />;
        case 'feature':
        case 'point':
            return <Statement text={overlay.text} accent={brand.colors.accent} />;
        default:
            return null;
    }
};

export const PhotoScene: React.FC<SceneProps> = ({ scene, index, listing, brand, photos }) => {
    const photo = photos[scene.photo];
    return (
        <AbsoluteFill>
            <Photo photo={photo} duration={scene.duration} reverse={index % 2 === 1} fallback={brand.colors.primary} />
            <Shade strength={scene.overlay.type === 'none' ? 0.6 : 1} />
            <RoomLabel text={photo?.label ?? ''} accent={brand.colors.accent} />
            <Logo src={brand.logo} />
            <Lower>
                <OverlayCard overlay={scene.overlay} listing={listing} brand={brand} />
            </Lower>
        </AbsoluteFill>
    );
};

/* ---------- open house ---------- */

export const OpenHouseScene: React.FC<SceneProps> = ({ scene, listing, brand, photos }) => {
    const { primary, accent } = brand.colors;
    const oh = listing.openHouse!;
    const p = useEnter(4);
    return (
        <AbsoluteFill>
            <Photo photo={photos[scene.photo]} duration={scene.duration} blur fallback={primary} />
            <AbsoluteFill style={{ background: rgba(primary, 0.45) }} />
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 200 }}>
                <div
                    style={{
                        width: 860,
                        padding: '80px 60px',
                        textAlign: 'center',
                        border: `3px solid ${rgba(accent, 0.9)}`,
                        borderRadius: 32,
                        background: rgba(primary, 0.55),
                        opacity: p,
                        transform: `scale(${0.92 + 0.08 * p})`,
                    }}
                >
                    <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 42, letterSpacing: 12, color: accent }}>
                        OPEN HOUSE
                    </div>
                    <Rise delay={10}>
                        <div style={{ marginTop: 40, fontFamily: serif, fontWeight: 700, fontSize: 92, lineHeight: 1.05, color: 'white' }}>
                            {oh.date}
                        </div>
                    </Rise>
                    <Rise delay={16}>
                        <div style={{ marginTop: 24, fontFamily: sans, fontWeight: 600, fontSize: 56, color: 'white' }}>{oh.time}</div>
                    </Rise>
                    <Rise delay={22}>
                        <div style={{ width: 120, height: 4, background: accent, margin: '48px auto 36px' }} />
                        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 36, letterSpacing: 2, color: 'rgba(255,255,255,0.9)' }}>
                            {listing.address.street}
                        </div>
                        <div style={{ marginTop: 8, fontFamily: sans, fontSize: 30, letterSpacing: 2, color: 'rgba(255,255,255,0.7)' }}>
                            {cityLine(listing)}
                        </div>
                    </Rise>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

/* ---------- agent ---------- */

const Headshot: React.FC<{ src?: string; size: number; accent: string; primary: string; name: string }> = ({
    src,
    size,
    accent,
    primary,
    name,
}) => (
    <div
        style={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `8px solid ${accent}`,
            overflow: 'hidden',
            background: primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
    >
        {src ? (
            <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
            <span style={{ fontFamily: serif, fontSize: size * 0.4, color: accent }}>
                {name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
            </span>
        )}
    </div>
);

export const OutroScene: React.FC<SceneProps> = ({ scene, listing, brand, photos }) => {
    const { primary, accent } = brand.colors;
    const p = useEnter(2);
    const contact = [brand.website, brand.email].filter(Boolean);
    return (
        <AbsoluteFill>
            <Photo photo={photos[scene.photo]} duration={scene.duration} blur fallback={primary} />
            <AbsoluteFill style={{ background: rgba(primary, 0.72) }} />
            <AbsoluteFill style={{ alignItems: 'center', paddingTop: 260, textAlign: 'center', color: 'white' }}>
                <Rise delay={0}>
                    <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 36, letterSpacing: 6, color: accent, textTransform: 'uppercase' }}>
                        {outroCta(listing)}
                    </div>
                </Rise>
                <div style={{ marginTop: 56, opacity: p, transform: `scale(${0.85 + 0.15 * p})` }}>
                    <Headshot src={brand.headshot} size={360} accent={accent} primary={primary} name={brand.agentName} />
                </div>
                <Rise delay={8}>
                    <div style={{ marginTop: 50, fontFamily: serif, fontWeight: 700, fontSize: 84, lineHeight: 1.05 }}>{brand.agentName}</div>
                    <div style={{ marginTop: 14, fontFamily: sans, fontWeight: 600, fontSize: 32, letterSpacing: 3, opacity: 0.85 }}>
                        {[brand.title, brand.brokerage].filter(Boolean).join('  ·  ')}
                    </div>
                </Rise>
                {brand.phone && (
                    <Rise delay={14}>
                        <div style={{ marginTop: 50, fontFamily: serif, fontWeight: 700, fontSize: 76, color: accent }}>{brand.phone}</div>
                    </Rise>
                )}
                {contact.length > 0 && (
                    <Rise delay={18}>
                        {contact.map((c) => (
                            <div key={c} style={{ marginTop: 10, fontFamily: sans, fontSize: 32, letterSpacing: 1, opacity: 0.85 }}>
                                {c}
                            </div>
                        ))}
                    </Rise>
                )}
                {brand.logo && (
                    <Rise delay={22}>
                        <Img src={staticFile(brand.logo)} style={{ marginTop: 50, height: 110, objectFit: 'contain' }} />
                    </Rise>
                )}
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

export const HeroScene: React.FC<SceneProps> = ({ scene, brand, photos }) => {
    const { primary, accent } = brand.colors;
    const p = useEnter(4);
    return (
        <AbsoluteFill>
            <Photo photo={photos[scene.photo]} duration={scene.duration} fallback={primary} />
            <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${rgba(primary, 0.35)}, ${rgba(primary, 0.85)})` }} />
            <AbsoluteFill style={{ alignItems: 'center', paddingTop: 380, textAlign: 'center', color: 'white' }}>
                <div style={{ opacity: p, transform: `scale(${0.85 + 0.15 * p})` }}>
                    <Headshot src={brand.headshot} size={500} accent={accent} primary={primary} name={brand.agentName} />
                </div>
                <Rise delay={12}>
                    <div style={{ marginTop: 60, fontFamily: sans, fontWeight: 700, fontSize: 36, letterSpacing: 10, color: accent }}>MEET</div>
                    <div style={{ marginTop: 12, fontFamily: serif, fontWeight: 700, fontSize: 104, lineHeight: 1.02 }}>{brand.agentName}</div>
                    <div style={{ marginTop: 18, fontFamily: sans, fontWeight: 600, fontSize: 34, letterSpacing: 3, opacity: 0.85 }}>
                        {[brand.title, brand.brokerage].filter(Boolean).join('  ·  ')}
                    </div>
                </Rise>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
