import React from 'react';

/**
 * ELYXIR Potion / Laboratory Beaker Flask Icon
 * Matches the official ELYXIR brand icon:
 * - Conical flask outline with rounded base corners
 * - Top lip rim & neck
 * - Interior liquid level line
 * - Floating bubbles inside liquid
 */
export default function ElyxirFlaskIcon({ size = 26, className = '', color = 'var(--accent)' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-label="ELYXIR logo icon"
    >
      {/* Top flask lip rim */}
      <path
        d="M9 3.2H15"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Main flask body */}
      <path
        d="M10 3.5V7.5L4.6 18.2C3.9 19.6 4.9 21.2 6.5 21.2H17.5C19.1 21.2 20.1 19.6 19.4 18.2L14 7.5V3.5"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Liquid level wave/line */}
      <path
        d="M6.8 14.8H17.2"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* Bubbles in liquid */}
      <circle cx="9.2" cy="18.2" r="1.3" fill={color} />
      <circle cx="14" cy="17.2" r="0.95" fill={color} />
      <circle cx="15.8" cy="19" r="0.75" fill={color} />
    </svg>
  );
}
