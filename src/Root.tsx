import React from 'react';
import { Composition } from 'remotion';
import { brandSchema, listingSchema } from './schema';
import { FPS, HEIGHT, WIDTH, layout, planScenes, type VideoProps } from './timeline';
import { ListingVideo } from './video/ListingVideo';

/**
 * Studio preview data only. Real renders get their props from tools/make.mjs.
 * With no photos the scenes fall back to brand-coloured gradients.
 */
const listing = listingSchema.parse({
    template: 'just-listed',
    address: { street: '123 Oak Street', city: 'Austin', state: 'TX', zip: '78701' },
    price: 1250000,
    beds: 4,
    baths: 3,
    sqft: 2850,
    features: ["Chef's kitchen with quartz island", 'Resort-style pool'],
    openHouse: { date: 'Saturday, Oct 18', time: '1 – 4 PM' },
});
const brand = brandSchema.parse({
    agentName: 'Jordan Rivers',
    brokerage: 'Summit Realty',
    phone: '(512) 555-0142',
    website: 'jordanrivers.com',
});
const sample: VideoProps = {
    listing,
    brand,
    photos: [],
    timeline: layout(planScenes(listing, brand, 0), listing, { narrate: false }),
};

export const Root: React.FC = () => (
    <Composition
        id="Listing"
        component={ListingVideo}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={sample.timeline.total}
        defaultProps={sample}
        calculateMetadata={({ props }) => ({ durationInFrames: props.timeline.total, fps: props.timeline.fps })}
    />
);
