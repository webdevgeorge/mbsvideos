import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import type { Scene, VideoProps } from '../timeline';
import { CharacterVideo } from './character/CharacterVideo';
import { ease } from './parts';
import { HeroScene, IntroScene, OpenHouseScene, OutroScene, PhotoScene } from './scenes';

const BY_KIND = {
    intro: IntroScene,
    photo: PhotoScene,
    openhouse: OpenHouseScene,
    outro: OutroScene,
    hero: HeroScene,
} as const;

/**
 * Hands one scene over to the next. "push" slides the new scene in from the
 * right while the old one drifts left and darkens; "fade" cross-dissolves.
 */
const Handover: React.FC<{
    scene: Scene;
    first: boolean;
    last: boolean;
    transition: number;
    style: 'push' | 'fade';
    children: React.ReactNode;
}> = ({ scene, first, last, transition: T, style, children }) => {
    const frame = useCurrentFrame();
    const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease } as const;
    const enter = first ? 1 : interpolate(frame, [0, T], [0, 1], clamp);
    const exit = last ? 0 : interpolate(frame, [scene.duration - T, scene.duration], [0, 1], clamp);

    const transform = style === 'push' ? `translateX(${(1 - enter) * 100 - exit * 30}%)` : undefined;
    const opacity = style === 'fade' ? enter : 1;
    return (
        <AbsoluteFill style={{ transform, opacity, overflow: 'hidden' }}>
            {children}
            {style === 'push' && exit > 0 && <AbsoluteFill style={{ background: `rgba(0,0,0,${exit * 0.5})` }} />}
        </AbsoluteFill>
    );
};

const PhotoVideo: React.FC<VideoProps> = ({ listing, brand, photos, timeline }) => (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
        {timeline.scenes.map((scene, i) => {
            const Body = BY_KIND[scene.kind];
            return (
                <Sequence key={i} from={scene.start} durationInFrames={scene.duration}>
                    <Handover
                        scene={scene}
                        first={i === 0}
                        last={i === timeline.scenes.length - 1}
                        transition={timeline.transition}
                        style={brand.transition}
                    >
                        <Body scene={scene} index={i} listing={listing} brand={brand} photos={photos} />
                    </Handover>
                </Sequence>
            );
        })}
    </AbsoluteFill>
);

export const ListingVideo: React.FC<VideoProps> = (props) =>
    props.listing.style === 'character' ? <CharacterVideo {...props} /> : <PhotoVideo {...props} />;
