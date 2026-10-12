import React from 'react';

/** Simple line icons, drawn in a 24x24 box. */
const Svg: React.FC<{ size: number; color: string; children: React.ReactNode }> = ({ size, color, children }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);

type P = { size?: number; color?: string };

export const Bed: React.FC<P> = ({ size = 36, color = '#fff' }) => (
    <Svg size={size} color={color}>
        <path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1" />
        <circle cx={7} cy={10.5} r={1.8} />
    </Svg>
);
export const Bath: React.FC<P> = ({ size = 36, color = '#fff' }) => (
    <Svg size={size} color={color}>
        <path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" />
    </Svg>
);
export const Ruler: React.FC<P> = ({ size = 36, color = '#fff' }) => (
    <Svg size={size} color={color}>
        <path d="M4 4h16v16H4zM4 9h4M4 14h6M9 4v4M14 4v6" />
    </Svg>
);
export const Star: React.FC<P> = ({ size = 36, color = '#fff' }) => (
    <Svg size={size} color={color}>
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </Svg>
);
export const Clock: React.FC<P> = ({ size = 36, color = '#fff' }) => (
    <Svg size={size} color={color}>
        <circle cx={12} cy={12} r={9} />
        <path d="M12 7v5l3 2" />
    </Svg>
);
export const Phone: React.FC<P> = ({ size = 36, color = '#fff' }) => (
    <Svg size={size} color={color}>
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </Svg>
);
export const Pin: React.FC<P> = ({ size = 36, color = '#fff' }) => (
    <Svg size={size} color={color}>
        <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
        <circle cx={12} cy={9} r={2.5} />
    </Svg>
);
