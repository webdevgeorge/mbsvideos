import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Listing } from '../../schema';
import type { PhotoAsset } from '../../timeline';
import { round } from '../fonts';

const INK = '#1D1416';
const OW = 4;

const shade = (hex: string, amt: number): string => {
    const n = parseInt(hex.slice(1), 16);
    const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
    return `#${((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1)}`;
};

export const signText = (l: Listing): string => {
    switch (l.template) {
        case 'just-sold':
            return 'SOLD';
        case 'open-house':
            return 'OPEN HOUSE';
        case 'agent-intro':
            return 'REALTOR®';
        default:
            return 'FOR SALE';
    }
};

const Cloud: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#FFFFFF" opacity={0.95}>
        <ellipse cx={0} cy={20} rx={90} ry={34} />
        <circle cx={-38} cy={6} r={36} />
        <circle cx={12} cy={-10} r={48} />
        <circle cx={58} cy={10} r={32} />
    </g>
);

const Bush: React.FC<{ x: number; y: number; r: number; c?: string }> = ({ x, y, r, c = '#4FA34F' }) => (
    <g stroke={INK} strokeWidth={OW}>
        <circle cx={x - r * 0.7} cy={y} r={r * 0.75} fill={c} />
        <circle cx={x + r * 0.7} cy={y} r={r * 0.75} fill={c} />
        <circle cx={x} cy={y - r * 0.35} r={r} fill={shade(c, 0.08)} />
    </g>
);

const Window: React.FC<{ x: number; y: number; w: number; h: number; trim: string }> = ({ x, y, w, h, trim }) => (
    <g>
        <rect x={x} y={y} width={w} height={h} rx={6} fill="#BFE3F5" stroke={INK} strokeWidth={OW} />
        <path d={`M ${x + 14} ${y + h - 14} L ${x + w * 0.45} ${y + 14}`} stroke="#FFFFFF" strokeWidth={8} opacity={0.6} strokeLinecap="round" />
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={trim} strokeWidth={8} />
        <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={trim} strokeWidth={8} />
        <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={INK} strokeWidth={OW} />
        <rect x={x - 10} y={y + h} width={w + 20} height={18} rx={4} fill={trim} stroke={INK} strokeWidth={OW} />
        {[0.2, 0.45, 0.7].map((f) => (
            <circle key={f} cx={x + w * f + 10} cy={y + h + 2} r={10} fill={f === 0.45 ? '#F28AA5' : '#F5C344'} stroke={INK} strokeWidth={3} />
        ))}
    </g>
);

/** A drawn neighbourhood: sky, drifting clouds, the house, lawn and a swinging yard sign. */
export const IllustratedWorld: React.FC<{ listing: Listing; primary: string; accent: string; brokerage: string }> = ({
    listing,
    primary,
    accent,
    brokerage,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = frame / fps;
    const drift = (x0: number, speed: number) => ((x0 + t * speed) % 1500) - 250;
    const roof = shade(primary, -0.1);
    const swing = Math.sin(t * 1.7) * 3;

    return (
        <AbsoluteFill>
            <svg width={1080} height={1920} viewBox="0 0 1080 1920">
                <defs>
                    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#6FB7F2" />
                        <stop offset="0.75" stopColor="#CFE9FB" />
                    </linearGradient>
                    <radialGradient id="sun">
                        <stop offset="0" stopColor="#FFF4C2" />
                        <stop offset="0.5" stopColor="#FFD66B" />
                        <stop offset="1" stopColor="#FFD66B" stopOpacity={0} />
                    </radialGradient>
                </defs>
                <rect width={1080} height={1920} fill="url(#sky)" />
                <g transform={`rotate(${t * 6} 880 300)`}>
                    {Array.from({ length: 12 }, (_, i) => (
                        <rect key={i} x={876} y={140} width={8} height={40} rx={4} fill="#FFE08A" transform={`rotate(${i * 30} 880 300)`} />
                    ))}
                </g>
                <circle cx={880} cy={300} r={150} fill="url(#sun)" />
                <circle cx={880} cy={300} r={80} fill="#FFD66B" />
                <Cloud x={drift(100, 18)} y={520} s={1.1} />
                <Cloud x={drift(700, 12)} y={760} s={0.8} />
                <Cloud x={drift(1150, 22)} y={940} s={1.3} />
                <Cloud x={drift(400, 9)} y={1110} s={0.7} />

                {/* hills */}
                <path d="M0 1470 Q 260 1360 540 1450 T 1080 1420 L 1080 1640 L 0 1640 Z" fill="#A8D98F" />
                <path d="M0 1530 Q 300 1460 620 1520 T 1080 1500 L 1080 1640 L 0 1640 Z" fill="#8FCB78" />

                {/* back tree, behind the agent */}
                <rect x={128} y={1300} width={44} height={330} rx={10} fill="#8A5A3B" stroke={INK} strokeWidth={OW} />
                <g stroke={INK} strokeWidth={OW}>
                    <circle cx={90} cy={1260} r={100} fill="#3E9A4D" />
                    <circle cx={220} cy={1250} r={95} fill="#3E9A4D" />
                    <circle cx={150} cy={1160} r={115} fill="#4CAF5B" />
                </g>

                {/* picket fence */}
                {Array.from({ length: 9 }, (_, i) => (
                    <path
                        key={i}
                        d={`M ${10 + i * 54} 1640 L ${10 + i * 54} 1560 L ${30 + i * 54} 1535 L ${50 + i * 54} 1560 L ${50 + i * 54} 1640 Z`}
                        fill="#FFFFFF"
                        stroke={INK}
                        strokeWidth={3}
                    />
                ))}
                <rect x={0} y={1580} width={490} height={14} fill="#FFFFFF" stroke={INK} strokeWidth={3} />

                {/* house */}
                <rect x={900} y={1000} width={56} height={130} fill="#B5574B" stroke={INK} strokeWidth={OW} />
                <rect x={890} y={990} width={76} height={22} fill="#9C4A40" stroke={INK} strokeWidth={OW} />
                <rect x={500} y={1180} width={540} height={440} fill="#F4EBDD" stroke={INK} strokeWidth={OW} />
                {Array.from({ length: 10 }, (_, i) => (
                    <line key={i} x1={502} y1={1220 + i * 40} x2={1038} y2={1220 + i * 40} stroke="#E4D7C2" strokeWidth={3} />
                ))}
                <path d="M 460 1200 L 770 950 L 1080 1200 Z" fill={roof} stroke={INK} strokeWidth={OW} strokeLinejoin="round" />
                <path d="M 445 1205 L 770 940 L 1095 1205" fill="none" stroke={shade(roof, -0.3)} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={770} cy={1105} r={38} fill="#BFE3F5" stroke={INK} strokeWidth={OW} />
                <line x1={732} y1={1105} x2={808} y2={1105} stroke="#FFFFFF" strokeWidth={6} />
                <line x1={770} y1={1067} x2={770} y2={1143} stroke="#FFFFFF" strokeWidth={6} />
                <Window x={545} y={1270} w={130} h={120} trim="#FFFFFF" />
                <Window x={865} y={1270} w={130} h={120} trim="#FFFFFF" />
                <rect x={696} y={1404} width={148} height={14} fill={shade(roof, -0.2)} stroke={INK} strokeWidth={OW} />
                <path d="M 715 1620 L 715 1470 Q 770 1420 825 1470 L 825 1620 Z" fill={accent} stroke={INK} strokeWidth={OW} />
                <rect x={735} y={1480} width={70} height={40} rx={6} fill={shade(accent, 0.3)} stroke={INK} strokeWidth={3} />
                <circle cx={808} cy={1550} r={7} fill="#F5C344" stroke={INK} strokeWidth={3} />
                <rect x={690} y={1612} width={160} height={18} rx={4} fill="#CFC3AE" stroke={INK} strokeWidth={OW} />

                {/* lawn + path */}
                <rect x={0} y={1625} width={1080} height={295} fill="#7BC86C" />
                <line x1={0} y1={1625} x2={1080} y2={1625} stroke={INK} strokeWidth={OW} />
                {Array.from({ length: 6 }, (_, i) => (
                    <rect key={i} x={i * 190 - 40} y={1700 + (i % 2) * 90} width={120} height={14} rx={7} fill="#6AB85C" />
                ))}
                <path d="M 715 1630 L 825 1630 L 930 1920 L 610 1920 Z" fill="#E9DCC2" stroke={INK} strokeWidth={OW} />
                <Bush x={570} y={1610} r={46} />
                <Bush x={980} y={1610} r={50} />

                {/* yard sign */}
                <rect x={1006} y={1560} width={18} height={300} fill="#FFFFFF" stroke={INK} strokeWidth={OW} />
                <rect x={830} y={1572} width={194} height={16} fill="#FFFFFF" stroke={INK} strokeWidth={OW} />
                <g transform={`rotate(${swing} 925 1588)`}>
                    <line x1={860} y1={1588} x2={860} y2={1612} stroke={INK} strokeWidth={4} />
                    <line x1={990} y1={1588} x2={990} y2={1612} stroke={INK} strokeWidth={4} />
                    <rect x={830} y={1610} width={190} height={130} rx={10} fill="#FFFFFF" stroke={INK} strokeWidth={OW} />
                    <rect x={832} y={1612} width={186} height={36} rx={8} fill={primary} />
                    <text x={925} y={1638} textAnchor="middle" fontFamily={round} fontWeight={700} fontSize={22} fill="#FFFFFF" letterSpacing={2}>
                        {(brokerage || 'REALTY').toUpperCase().slice(0, 16)}
                    </text>
                    <text x={925} y={1704} textAnchor="middle" fontFamily={round} fontWeight={700} fontSize={signText(listing).length > 8 ? 30 : 40} fill={primary}>
                        {signText(listing)}
                    </text>
                </g>
            </svg>
        </AbsoluteFill>
    );
};

/** The listing's own front photo behind the agent. */
export const PhotoWorld: React.FC<{ photo?: PhotoAsset; primary: string }> = ({ photo, primary }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const scale = interpolate(frame, [0, durationInFrames], [1.05, 1.18]);
    return (
        <AbsoluteFill style={{ background: `linear-gradient(${primary}, #000)` }}>
            {photo && (
                <Img
                    src={staticFile(photo.src)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 60%', transform: `scale(${scale})` }}
                />
            )}
            <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)' }} />
        </AbsoluteFill>
    );
};
