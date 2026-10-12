/**
 * A character, drawn from its description, in one of three paints.
 *
 * Drawn once, in vector, in a fixed 200x340 box with the feet on the bottom
 * edge. Every skin uses this same drawing:
 *
 *   flat   - filled shapes with a thin outline (clean modern)
 *   line   - outlines only (blueprint, and hand-drawn under a boil filter)
 *   pixel  - filled, with every detail at least one pixel cell wide, so the
 *            skin's pixelate filter turns it into sprite art without losing
 *            an eye between two samples
 *
 * One drawing is what keeps the same person recognisably the same across four
 * looks. Two drawings per character would drift apart the first time one of
 * them was touched.
 */
import React from 'react';
import type { CastSpec } from './types';
import type { Arms, Mouth } from './motion';

export const FIGURE_W = 200;
export const FIGURE_H = 340;

export type Paint = 'flat' | 'line' | 'pixel';

export type FigureProps = {
    cast: CastSpec;
    arms: Arms;
    mouth: Mouth;
    blink: boolean;
    paint: Paint;
    /** Outline colour for flat and pixel. */
    outline?: string;
    /** Stroke colour for line paint. */
    lineColor?: string;
    /** Fill behind a line drawing, so it is not see-through. */
    lineFill?: string;
    /** Multiplies every stroke width. */
    weight?: number;
};

const TORSO_W = { slim: 84, regular: 96, broad: 112 } as const;

const shade = (hex: string, amt: number): string => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
    const r = f((n >> 16) & 255);
    const g = f((n >> 8) & 255);
    const b = f(n & 255);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

export const Figure: React.FC<FigureProps> = ({
    cast,
    arms,
    mouth,
    blink,
    paint,
    outline = '#1D1416',
    lineColor = '#FFFFFF',
    lineFill = 'transparent',
    weight = 1,
}) => {
    const line = paint === 'line';
    // Pixel needs strokes at least a cell wide or the internal lines (arm
    // against body) vanish between samples.
    const ow = (paint === 'pixel' ? 5.2 : 3) * weight;
    const lw = 3.2 * weight;

    /** A filled part: its colour, or the outline treatment in line paint. */
    const part = (fill: string) =>
        line
            ? { fill: lineFill, stroke: lineColor, strokeWidth: lw, strokeLinejoin: 'round' as const }
            : { fill, stroke: outline, strokeWidth: ow, strokeLinejoin: 'round' as const };
    /** A small dark detail — eyes, mouth — solid in every paint. */
    const ink = line ? lineColor : outline;

    const tw = TORSO_W[cast.build];
    const cx = 100;
    const shoulderY = 160;
    const hipY = 242;
    const sleeveShort = cast.top === 'tee' || cast.top === 'polo' || cast.top === 'scrubs';
    const sleeveColor = cast.top === 'shirt-tie' ? cast.topColor : cast.top === 'blazer' ? cast.topColor : cast.topColor;

    const arm = (side: 'r' | 'l') => {
        const x = side === 'r' ? cx + tw / 2 - 8 : cx - tw / 2 + 8;
        const upper = side === 'r' ? arms.rUpper : arms.lUpper;
        const fore = side === 'r' ? arms.rFore : arms.lFore;
        const thick = cast.build === 'broad' ? 26 : cast.build === 'slim' ? 20 : 23;
        if (cast.kind === 'robot') {
            return (
                <g transform={`translate(${x} ${shoulderY + 4}) rotate(${upper})`}>
                    <rect x={-thick / 2} y={0} width={thick} height={50} rx={8} {...part(shade(cast.skin, -0.18))} />
                    <g transform={`translate(0 48) rotate(${fore})`}>
                        <rect x={-thick / 2 + 2} y={0} width={thick - 4} height={44} rx={8} {...part(shade(cast.skin, -0.1))} />
                        <circle cx={0} cy={48} r={11} {...part(shade(cast.skin, -0.3))} />
                    </g>
                </g>
            );
        }
        return (
            <g transform={`translate(${x} ${shoulderY + 4}) rotate(${upper})`}>
                <rect x={-thick / 2} y={-4} width={thick} height={56} rx={thick / 2} {...part(sleeveColor)} />
                <g transform={`translate(0 48) rotate(${fore})`}>
                    <rect
                        x={-thick / 2 + 1}
                        y={-6}
                        width={thick - 2}
                        height={50}
                        rx={(thick - 2) / 2}
                        {...part(sleeveShort ? cast.skin : sleeveColor)}
                    />
                    <circle cx={0} cy={48} r={thick / 2 + 1} {...part(cast.skin)} />
                </g>
            </g>
        );
    };

    // ── the body ────────────────────────────────────────────────────────────
    const legW = tw * 0.36;
    const Legs = (
        <g>
            <rect x={cx - 3 - legW} y={hipY - 10} width={legW} height={90} rx={6} {...part(cast.kind === 'robot' ? shade(cast.skin, -0.2) : cast.legColor)} />
            <rect x={cx + 3} y={hipY - 10} width={legW} height={90} rx={6} {...part(cast.kind === 'robot' ? shade(cast.skin, -0.2) : cast.legColor)} />
            <rect x={cx - 6 - legW} y={318} width={legW + 8} height={18} rx={8} {...part('#1E1A1A')} />
            <rect x={cx + 2} y={318} width={legW + 8} height={18} rx={8} {...part('#1E1A1A')} />
        </g>
    );

    const torsoPath = `M ${cx - tw / 2} ${hipY}
        L ${cx - tw / 2} ${shoulderY + 16}
        Q ${cx - tw / 2} ${shoulderY} ${cx - tw / 2 + 18} ${shoulderY}
        L ${cx + tw / 2 - 18} ${shoulderY}
        Q ${cx + tw / 2} ${shoulderY} ${cx + tw / 2} ${shoulderY + 16}
        L ${cx + tw / 2} ${hipY} Z`;

    const Torso = (() => {
        if (cast.kind === 'robot') {
            return (
                <g>
                    <rect x={cx - tw / 2} y={shoulderY} width={tw} height={hipY - shoulderY} rx={14} {...part(cast.skin)} />
                    <rect x={cx - 24} y={shoulderY + 22} width={48} height={34} rx={6} {...part(cast.topColor)} />
                    <circle cx={cx} cy={shoulderY + 39} r={7} fill={line ? lineColor : '#E9F4FF'} />
                </g>
            );
        }
        const top = cast.topColor;
        switch (cast.top) {
            case 'shirt-tie':
                return (
                    <g>
                        <path d={torsoPath} {...part(top)} />
                        <path d={`M ${cx - 16} ${shoulderY} L ${cx} ${shoulderY + 18} L ${cx + 16} ${shoulderY}`} {...part(top)} />
                        <path
                            d={`M ${cx - 6} ${shoulderY + 12} L ${cx + 6} ${shoulderY + 12} L ${cx + 9} ${hipY - 26} L ${cx} ${hipY - 14} L ${cx - 9} ${hipY - 26} Z`}
                            {...part('#7A2633')}
                        />
                    </g>
                );
            case 'blazer':
                return (
                    <g>
                        <path d={torsoPath} {...part(top)} />
                        <path d={`M ${cx - 18} ${shoulderY} L ${cx} ${shoulderY + 46} L ${cx + 18} ${shoulderY} Z`} {...part('#F4F1EA')} />
                        <path d={`M ${cx - 20} ${shoulderY} L ${cx - 4} ${shoulderY + 58} L ${cx - 26} ${shoulderY + 30} Z`} {...part(shade(top, -0.18))} />
                        <path d={`M ${cx + 20} ${shoulderY} L ${cx + 4} ${shoulderY + 58} L ${cx + 26} ${shoulderY + 30} Z`} {...part(shade(top, -0.18))} />
                        <circle cx={cx} cy={shoulderY + 64} r={3.6} fill={ink} />
                    </g>
                );
            case 'hoodie':
                return (
                    <g>
                        <path d={`M ${cx - 34} ${shoulderY + 4} Q ${cx} ${shoulderY - 22} ${cx + 34} ${shoulderY + 4}`} {...part(shade(top, -0.2))} />
                        <path d={torsoPath} {...part(top)} />
                        <path d={`M ${cx - tw / 2 + 16} ${hipY - 6} L ${cx - tw / 2 + 22} ${hipY - 40} L ${cx + tw / 2 - 22} ${hipY - 40} L ${cx + tw / 2 - 16} ${hipY - 6} Z`} {...part(shade(top, -0.12))} />
                        <line x1={cx - 9} y1={shoulderY + 8} x2={cx - 11} y2={shoulderY + 40} stroke={line ? lineColor : '#F4F1EA'} strokeWidth={line ? lw : 4} strokeLinecap="round" />
                        <line x1={cx + 9} y1={shoulderY + 8} x2={cx + 11} y2={shoulderY + 40} stroke={line ? lineColor : '#F4F1EA'} strokeWidth={line ? lw : 4} strokeLinecap="round" />
                    </g>
                );
            case 'polo':
                return (
                    <g>
                        <path d={torsoPath} {...part(top)} />
                        <path d={`M ${cx - 22} ${shoulderY - 2} L ${cx - 4} ${shoulderY + 14} L ${cx - 12} ${shoulderY + 22} Z`} {...part(shade(top, 0.25))} />
                        <path d={`M ${cx + 22} ${shoulderY - 2} L ${cx + 4} ${shoulderY + 14} L ${cx + 12} ${shoulderY + 22} Z`} {...part(shade(top, 0.25))} />
                        <line x1={cx} y1={shoulderY + 14} x2={cx} y2={shoulderY + 40} stroke={ink} strokeWidth={line ? lw : 3} />
                    </g>
                );
            case 'scrubs':
                return (
                    <g>
                        <path d={torsoPath} {...part(top)} />
                        <path d={`M ${cx - 18} ${shoulderY} L ${cx} ${shoulderY + 30} L ${cx + 18} ${shoulderY}`} fill="none" stroke={ink} strokeWidth={line ? lw : 3.4} />
                        <rect x={cx + tw / 2 - 34} y={shoulderY + 34} width={20} height={18} rx={3} {...part(shade(top, -0.1))} />
                    </g>
                );
            case 'tee':
            default:
                return (
                    <g>
                        <path d={torsoPath} {...part(top)} />
                        <path d={`M ${cx - 16} ${shoulderY} Q ${cx} ${shoulderY + 14} ${cx + 16} ${shoulderY}`} fill="none" stroke={ink} strokeWidth={line ? lw : 3.4} />
                    </g>
                );
        }
    })();

    // ── the head ────────────────────────────────────────────────────────────
    const headX = cx - 44;
    const headY = 44;
    const headW = 88;
    const headH = 98;
    const eyeY = 94;
    const hair = cast.hair.color;

    const HairBack = (() => {
        if (cast.kind === 'robot') return null;
        switch (cast.hair.style) {
            case 'long':
                return <path d={`M ${headX - 6} 70 Q ${headX - 10} 150 ${headX + 4} 184 L ${headX + headW - 4} 184 Q ${headX + headW + 10} 150 ${headX + headW + 6} 70 Z`} {...part(hair)} />;
            case 'ponytail':
                return <path d={`M ${headX + headW - 8} 62 Q ${headX + headW + 30} 74 ${headX + headW + 18} 150 Q ${headX + headW + 4} 120 ${headX + headW - 2} 90 Z`} {...part(hair)} />;
            case 'bun':
                return <circle cx={cx} cy={38} r={20} {...part(hair)} />;
            default:
                return null;
        }
    })();

    const HairFront = (() => {
        if (cast.kind === 'robot') return null;
        const top = `M ${headX - 2} 92 Q ${headX - 4} 40 ${cx} 36 Q ${headX + headW + 4} 40 ${headX + headW + 2} 92`;
        switch (cast.hair.style) {
            case 'bald':
                return null;
            case 'buzz':
                return <path d={`${top} Q ${cx} 58 ${headX - 2} 92 Z`} {...part(shade(hair, 0.1))} />;
            case 'curly':
                return (
                    <g>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <circle key={i} cx={headX + 6 + i * 15.5} cy={48 + (i % 2) * 6} r={15} {...part(hair)} />
                        ))}
                        <circle cx={headX + 2} cy={70} r={11} {...part(hair)} />
                        <circle cx={headX + headW - 2} cy={70} r={11} {...part(hair)} />
                    </g>
                );
            case 'side':
                return <path d={`${top} Q ${headX + headW - 10} 60 ${cx + 6} 62 Q ${cx - 16} 64 ${headX + 8} 84 Z`} {...part(hair)} />;
            case 'long':
            case 'ponytail':
            case 'bun':
                return <path d={`${top} Q ${headX + headW - 14} 58 ${cx} 56 Q ${headX + 14} 58 ${headX - 2} 92 Z`} {...part(hair)} />;
            case 'short':
            default:
                return <path d={`${top} Q ${headX + headW - 6} 62 ${cx} 60 Q ${headX + 6} 62 ${headX - 2} 92 Z`} {...part(hair)} />;
        }
    })();

    const Mouth = (() => {
        const my = 122;
        if (cast.kind === 'robot') {
            const bars = mouth === 'closed' ? 0 : mouth === 'small' ? 2 : mouth === 'open' ? 3 : 4;
            return (
                <g>
                    <rect x={cx - 22} y={my - 6} width={44} height={14} rx={4} fill={line ? 'none' : '#1A2230'} stroke={line ? lineColor : 'none'} strokeWidth={lw} />
                    {Array.from({ length: 5 }, (_, i) => {
                        const on = Math.abs(i - 2) < bars / 2 + 0.01 || (bars === 0 && i === 2);
                        const h = bars === 0 ? 2 : 4 + (2 - Math.abs(i - 2)) * (bars - 1.2);
                        return <rect key={i} x={cx - 19 + i * 8} y={my + 1 - h / 2} width={6} height={Math.max(2, h)} fill={on ? (line ? lineColor : '#5BE1FF') : 'none'} />;
                    })}
                </g>
            );
        }
        switch (mouth) {
            case 'closed':
                return <path d={`M ${cx - 9} ${my} Q ${cx} ${my + 4} ${cx + 9} ${my}`} fill="none" stroke={ink} strokeWidth={paint === 'pixel' ? 5 : line ? lw : 3.6} strokeLinecap="round" />;
            case 'small':
                return <ellipse cx={cx} cy={my + 1} rx={7} ry={paint === 'pixel' ? 5 : 4} fill={ink} />;
            case 'open':
                return (
                    <g>
                        <ellipse cx={cx} cy={my + 2} rx={9} ry={8} fill={ink} />
                        {!line && <ellipse cx={cx} cy={my + 6} rx={5} ry={3} fill="#C9545C" />}
                    </g>
                );
            case 'wide':
            default:
                return (
                    <g>
                        <path d={`M ${cx - 13} ${my - 3} L ${cx + 13} ${my - 3} Q ${cx + 12} ${my + 13} ${cx} ${my + 13} Q ${cx - 12} ${my + 13} ${cx - 13} ${my - 3} Z`} fill={ink} />
                        {!line && <ellipse cx={cx} cy={my + 7} rx={6} ry={3.4} fill="#C9545C" />}
                    </g>
                );
        }
    })();

    const Eyes = (() => {
        if (cast.kind === 'robot') {
            return (
                <g>
                    <rect x={headX + 10} y={eyeY - 20} width={headW - 20} height={34} rx={12} fill={line ? 'none' : '#1A2230'} stroke={line ? lineColor : 'none'} strokeWidth={lw} />
                    {blink ? (
                        <>
                            <rect x={cx - 26} y={eyeY - 3} width={16} height={4} fill={line ? lineColor : '#5BE1FF'} />
                            <rect x={cx + 10} y={eyeY - 3} width={16} height={4} fill={line ? lineColor : '#5BE1FF'} />
                        </>
                    ) : (
                        <>
                            <rect x={cx - 25} y={eyeY - 11} width={14} height={18} rx={4} fill={line ? lineColor : '#5BE1FF'} />
                            <rect x={cx + 11} y={eyeY - 11} width={14} height={18} rx={4} fill={line ? lineColor : '#5BE1FF'} />
                        </>
                    )}
                </g>
            );
        }
        const ex = [cx - 17, cx + 17];
        return (
            <g>
                {ex.map((x, i) =>
                    blink ? (
                        <rect key={i} x={x - 6} y={eyeY - 1.5} width={12} height={paint === 'pixel' ? 5 : 3} rx={1.5} fill={ink} />
                    ) : (
                        <ellipse key={i} cx={x} cy={eyeY} rx={paint === 'pixel' ? 5.5 : 4.6} ry={paint === 'pixel' ? 7 : 6.2} fill={ink} />
                    ),
                )}
                {/* Brows: the hair colour in flat, the line in line paint. */}
                {ex.map((x, i) => (
                    <line
                        key={`b${i}`}
                        x1={x - 7}
                        y1={eyeY - 15 - (i === 1 ? arms.tilt * 0.3 : 0)}
                        x2={x + 7}
                        y2={eyeY - 17}
                        stroke={line ? lineColor : shade(hair, -0.1)}
                        strokeWidth={paint === 'pixel' ? 5 : line ? lw : 4}
                        strokeLinecap="round"
                    />
                ))}
            </g>
        );
    })();

    const Accessory = (() => {
        switch (cast.accessory) {
            case 'headset':
                return (
                    <g>
                        <path d={`M ${headX - 4} 96 Q ${headX - 6} 30 ${cx} 30 Q ${headX + headW + 6} 30 ${headX + headW + 4} 96`} fill="none" stroke={line ? lineColor : '#4A4A52'} strokeWidth={line ? lw : 7} />
                        <rect x={headX + headW - 4} y={82} width={16} height={30} rx={6} {...part('#5C5C66')} />
                        <path d={`M ${headX + headW + 4} 108 Q ${headX + headW - 4} 132 ${cx + 16} 128`} fill="none" stroke={line ? lineColor : '#4A4A52'} strokeWidth={line ? lw : 5} />
                        <circle cx={cx + 14} cy={128} r={5} {...part('#3A3A42')} />
                    </g>
                );
            case 'glasses':
                return (
                    <g fill="none" stroke={ink} strokeWidth={paint === 'pixel' ? 4.4 : line ? lw : 3}>
                        <rect x={cx - 31} y={eyeY - 11} width={27} height={22} rx={7} />
                        <rect x={cx + 4} y={eyeY - 11} width={27} height={22} rx={7} />
                        <line x1={cx - 4} y1={eyeY - 2} x2={cx + 4} y2={eyeY - 2} />
                    </g>
                );
            case 'cap':
                return (
                    <g>
                        <path d={`M ${headX - 2} 74 Q ${headX} 32 ${cx} 32 Q ${headX + headW} 32 ${headX + headW + 2} 74 Z`} {...part(shade(cast.topColor, -0.25))} />
                        <path d={`M ${cx} 70 L ${headX + headW + 34} 72 Q ${headX + headW + 30} 80 ${cx} 78 Z`} {...part(shade(cast.topColor, -0.35))} />
                    </g>
                );
            default:
                return null;
        }
    })();

    const Head = (
        <g transform={`rotate(${arms.tilt} ${cx} 140)`}>
            {HairBack}
            {cast.kind === 'robot' ? (
                <g>
                    <line x1={cx} y1={headY - 4} x2={cx} y2={headY - 24} stroke={line ? lineColor : '#5C6475'} strokeWidth={line ? lw : 5} />
                    <circle cx={cx} cy={headY - 28} r={8} {...part(cast.topColor)} />
                    <rect x={headX - 2} y={headY} width={headW + 4} height={headH - 6} rx={20} {...part(cast.skin)} />
                    <rect x={headX - 12} y={eyeY - 12} width={12} height={28} rx={4} {...part(shade(cast.skin, -0.2))} />
                    <rect x={headX + headW} y={eyeY - 12} width={12} height={28} rx={4} {...part(shade(cast.skin, -0.2))} />
                </g>
            ) : (
                <g>
                    <rect x={cx - 12} y={128} width={24} height={36} {...part(shade(cast.skin, -0.08))} />
                    <circle cx={headX - 1} cy={eyeY + 4} r={10} {...part(cast.skin)} />
                    <circle cx={headX + headW + 1} cy={eyeY + 4} r={10} {...part(cast.skin)} />
                    <rect x={headX} y={headY} width={headW} height={headH} rx={36} {...part(cast.skin)} />
                    {!line && paint === 'flat' && (
                        <>
                            <circle cx={cx - 27} cy={eyeY + 18} r={7} fill="#E8846F" opacity={0.28} />
                            <circle cx={cx + 27} cy={eyeY + 18} r={7} fill="#E8846F" opacity={0.28} />
                        </>
                    )}
                </g>
            )}
            {HairFront}
            {Eyes}
            {cast.kind !== 'robot' && (
                <path d={`M ${cx + 1} ${eyeY + 6} Q ${cx + 6} ${eyeY + 16} ${cx - 1} ${eyeY + 18}`} fill="none" stroke={line ? lineColor : shade(cast.skin, -0.3)} strokeWidth={paint === 'pixel' ? 4 : line ? lw * 0.8 : 2.6} strokeLinecap="round" />
            )}
            {Mouth}
            {Accessory}
        </g>
    );

    return (
        <g>
            {Legs}
            {Torso}
            {arm('l')}
            {arm('r')}
            {Head}
        </g>
    );
};
