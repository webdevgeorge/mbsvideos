import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { PhotoAsset } from '../timeline';
import { sans } from './fonts';

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

export function rgba(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** 0 -> 1 spring that starts `delay` frames into the scene. */
export function useEnter(delay = 0): number {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    return spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 22 });
}

/** Fades and lifts a block into place. */
export const Rise: React.FC<{ delay?: number; distance?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
    delay = 0,
    distance = 40,
    children,
    style,
}) => {
    const p = useEnter(delay);
    return (
        <div style={{ opacity: p, transform: `translateY(${(1 - p) * distance}px)`, ...style }}>{children}</div>
    );
};

/**
 * A listing photo with a slow Ken Burns move.
 *
 * A landscape photo in a 9:16 frame shows only a third of its width, so it
 * pans across horizontally; a tall photo pans vertically. `reverse` alternates
 * the direction between scenes so consecutive moves don't feel mechanical.
 */
export const Photo: React.FC<{
    photo?: PhotoAsset;
    duration: number;
    reverse?: boolean;
    blur?: boolean;
    fallback: string;
}> = ({ photo, duration, reverse, blur, fallback }) => {
    const frame = useCurrentFrame();
    const t = interpolate(frame, [0, duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const pos = reverse ? 85 - 70 * t : 15 + 70 * t;
    const scale = 1.04 + 0.08 * t;
    const filter = blur ? 'blur(28px) brightness(0.55)' : undefined;

    if (!photo) {
        return (
            <AbsoluteFill
                style={{ background: `linear-gradient(160deg, ${fallback}, #000)`, transform: `scale(${scale})`, filter }}
            />
        );
    }
    const wide = photo.aspect > 1080 / 1920;
    return (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
            <Img
                src={staticFile(photo.src)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: wide ? `${pos}% 50%` : `50% ${pos}%`,
                    transform: `scale(${blur ? 1.15 : scale})`,
                    filter,
                }}
            />
        </AbsoluteFill>
    );
};

/** Dark at the top and bottom where text sits, clear through the middle. */
export const Shade: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
    <AbsoluteFill
        style={{
            background: `linear-gradient(to bottom,
                rgba(0,0,0,${0.45 * strength}) 0%,
                rgba(0,0,0,0) 22%,
                rgba(0,0,0,0) 42%,
                rgba(0,0,0,${0.55 * strength}) 62%,
                rgba(0,0,0,${0.85 * strength}) 100%)`,
        }}
    />
);

export const Badge: React.FC<{ text: string; bg: string; fg: string; delay?: number }> = ({ text, bg, fg, delay = 0 }) => {
    const p = useEnter(delay);
    return (
        <div
            style={{
                display: 'inline-block',
                padding: '14px 30px',
                background: bg,
                color: fg,
                fontFamily: sans,
                fontWeight: 700,
                fontSize: 34,
                letterSpacing: 7,
                borderRadius: 6,
                opacity: p,
                transform: `translateX(${(1 - p) * -40}px)`,
            }}
        >
            {text}
        </div>
    );
};

/** Room name, top-left, e.g. "KITCHEN". */
export const RoomLabel: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
    const p = useEnter(8);
    if (!text) return null;
    return (
        <div
            style={{
                position: 'absolute',
                top: 210,
                left: 80,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 26px 12px 20px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.38)',
                color: 'white',
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 28,
                letterSpacing: 5,
                textTransform: 'uppercase',
                opacity: p,
                transform: `translateY(${(1 - p) * -20}px)`,
            }}
        >
            <span style={{ width: 12, height: 12, borderRadius: 99, background: accent }} />
            {text}
        </div>
    );
};

export const Logo: React.FC<{ src?: string }> = ({ src }) =>
    src ? (
        <Img
            src={staticFile(src)}
            style={{ position: 'absolute', top: 200, right: 80, height: 72, objectFit: 'contain', opacity: 0.92 }}
        />
    ) : null;

/** Content area kept clear of the Reels/TikTok UI along the bottom and right. */
export const Lower: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ position: 'absolute', left: 80, right: 120, bottom: 430 }}>{children}</div>
);
