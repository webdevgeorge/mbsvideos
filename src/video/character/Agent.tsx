import React, { useMemo } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Figure } from '../../character/Figure';
import { armsAt, blinkAt, breathAt, mouthAt, type Gesture, type Mouth } from '../../character/motion';
import type { CastSpec } from '../../character/types';
import type { Timeline } from '../../timeline';

/**
 * Mouth from the voice track's loudness. Shapes vary frame to frame inside a
 * loud stretch so a sustained vowel doesn't freeze, and a one-frame gap
 * between syllables still closes.
 */
function mouthFromLevel(energy: number[], frame: number): Mouth {
    const e = energy[frame] ?? 0;
    if (e < 0.12) return 'closed';
    if (e < 0.35) return 'small';
    const wobble = (frame * 7) % 3;
    if (e < 0.7) return wobble === 0 ? 'small' : 'open';
    return wobble === 0 ? 'open' : 'wide';
}

/** The drawing's full reach with arms raised. */
const VIEW = { x: -80, y: -60, w: 360, h: 404 };
const FEET_Y = 336;

export const AGENT = { height: 800, feetY: 1800, centerX: 300 };

/**
 * The realtor: talks along with the narration, blinks, breathes, waves at the
 * start and end, and points up at each new pop-up card.
 */
export const Agent: React.FC<{ cast: CastSpec; timeline: Timeline; shadow?: boolean }> = ({ cast, timeline, shadow = true }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = frame / fps;

    const { words, gestures, reveals } = useMemo(() => {
        const words = timeline.scenes.flatMap((s) => s.words);
        const gestures: Gesture[] = [];
        const reveals: number[] = [];
        for (const s of timeline.scenes) {
            const at = (s.start + (s.pops[0] ?? 0)) / fps;
            if (s.kind === 'intro' || s.kind === 'hero' || s.kind === 'outro') {
                gestures.push({ start: at, end: at + 1.6, pose: 'wave' });
            } else if (s.kind === 'openhouse' || s.overlay.type === 'stats') {
                gestures.push({ start: at, end: at + 1.8, pose: 'present' });
            } else {
                reveals.push((s.start + (s.pops[1] ?? s.pops[0] ?? 0)) / fps);
            }
        }
        return { words, gestures, reveals };
    }, [timeline, fps]);

    const arms = armsAt(t, gestures, reveals, 1.3);
    const mouth = timeline.energy ? mouthFromLevel(timeline.energy, frame) : mouthAt(words, t);
    const blink = blinkAt(t, 3);
    const talking = mouth !== 'closed';
    const bob = breathAt(t) * 3 + (talking ? -Math.abs(Math.sin(t * 8)) * 5 : 0);

    const enter = spring({ frame: frame - 2, fps, config: { damping: 14, mass: 0.8 } });
    const height = AGENT.height;
    const width = (height * VIEW.w) / VIEW.h;
    const unit = height / VIEW.h;
    const top = AGENT.feetY - (FEET_Y - VIEW.y) * unit;
    const left = AGENT.centerX - (100 - VIEW.x) * unit;

    return (
        <>
            {shadow && (
                <div
                    style={{
                        position: 'absolute',
                        left: AGENT.centerX - 150,
                        top: AGENT.feetY - 22,
                        width: 300,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.22)',
                        transform: `translateX(${(1 - enter) * -600}px)`,
                    }}
                />
            )}
            <svg
                width={width}
                height={height}
                viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
                style={{
                    position: 'absolute',
                    left,
                    top,
                    overflow: 'visible',
                    transform: `translate(${(1 - enter) * -600}px, ${bob}px)`,
                }}
            >
                <Figure cast={cast} arms={arms} mouth={mouth} blink={blink} paint="flat" />
            </svg>
        </>
    );
};
