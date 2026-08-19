import React, { useRef } from 'react';
import { SunIcon, MoonIcon, CheckIcon } from './Icons';

// ── Palette Definitions ───────────────────────────────────────────────────────

const ACCENT_COLORS = [
  { label: 'Purple',  light: '#7c3aed', dark: '#8b5cf6' },
  { label: 'Indigo',  light: '#4f46e5', dark: '#6366f1' },
  { label: 'Blue',    light: '#2563eb', dark: '#3b82f6' },
  { label: 'Teal',    light: '#0d9488', dark: '#14b8a6' },
  { label: 'Green',   light: '#16a34a', dark: '#22c55e' },
  { label: 'Orange',  light: '#ea580c', dark: '#f97316' },
  { label: 'Rose',    light: '#e11d48', dark: '#f43f5e' },
  { label: 'Amber',   light: '#d97706', dark: '#f59e0b' },
];

const BOT_BUBBLE_COLORS = [
  { label: 'Default',    light: null, dark: null },
  { label: 'Soft Blue',  light: '#dbeafe', dark: '#1e3a5f' },
  { label: 'Mint',       light: '#dcfce7', dark: '#14532d' },
  { label: 'Lavender',   light: '#ede9fe', dark: '#2e1065' },
  { label: 'Warm',       light: '#ffedd5', dark: '#431407' },
];

// ── HSL Helpers ───────────────────────────────────────────────────────────────

function hexToHsl(hex) {
  if (!hex || hex.length < 7) return [0, 0, 50];
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hsl(h, s, l) { return `hsl(${h}, ${s}%, ${l}%)`; }

/** Generate all preview colors from accent hex + theme */
function getPreviewTheme(accentHex, isDark) {
  const [h, s] = hexToHsl(accentHex);
  const bs = Math.min(s, 30);

  if (isDark) {
    return {
      bg:         hsl(h, bs, 9),
      headerBg:   hsl(h, bs, 13),
      accent:     accentHex,
      botBubbleBg: hsl(h, bs, 16),
      botText:    hsl(h, 12, 87),
      border:     hsl(h, Math.min(bs, 18), 20),
      dotColor:   hsl(h, Math.min(bs, 18), 20),
      textMuted:  hsl(h, 10, 40),
    };
  } else {
    return {
      bg:         hsl(h, Math.min(bs, 28), 95),
      headerBg:   hsl(h, Math.min(bs, 15), 99),
      accent:     accentHex,
      botBubbleBg: hsl(h, Math.min(bs, 28), 96),
      botText:    hsl(h, Math.min(s, 40), 22),
      border:     hsl(h, Math.min(bs, 18), 87),
      dotColor:   hsl(h, Math.min(bs, 18), 87),
      textMuted:  hsl(h, Math.min(s, 20), 60),
    };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThemeCard({ label, icon, active, onClick }) {
  return (
    <button
      className={`cp-theme-card ${active ? 'active' : ''}`}
      onClick={onClick}
      title={`Switch to ${label} mode`}
      aria-pressed={active}
    >
      <div className="cp-theme-card-icon">{icon}</div>
      <span className="cp-theme-card-label">{label}</span>
      {active && (
        <div className="cp-theme-card-check">
          <CheckIcon size={10} />
        </div>
      )}
    </button>
  );
}

function ColorSwatch({ color, label, active, onClick, isDark }) {
  const isDefault = color === null || (color && color.light === null);
  const displayColor = isDefault
    ? (isDark ? '#2e2a25' : '#f0ece4')
    : (isDark ? color.dark : color.light);

  return (
    <button
      className={`cp-swatch ${active ? 'active' : ''} ${isDefault ? 'default-swatch' : ''}`}
      onClick={onClick}
      title={label}
      style={{ backgroundColor: displayColor }}
      aria-label={label}
    >
      {active && (
        <span className="cp-swatch-check">
          <CheckIcon size={11} />
        </span>
      )}
    </button>
  );
}

// ── Live Preview ──────────────────────────────────────────────────────────────

function LivePreview({ accentHex, botBubbleColor, theme }) {
  const isDark = theme === 'dark';
  const pt = getPreviewTheme(accentHex, isDark);

  // Override bot bubble if custom selection
  let botBg = pt.botBubbleBg;
  if (botBubbleColor && botBubbleColor.light !== null) {
    botBg = isDark ? botBubbleColor.dark : botBubbleColor.light;
  }

  return (
    <div className="cp-preview-card" style={{ background: pt.bg }}>
      {/* Mini Header */}
      <div className="cp-preview-header" style={{ background: pt.headerBg, borderBottom: `1px solid ${pt.border}` }}>
        <div className="cp-preview-dot" style={{ background: pt.accent }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Cormorant, Cormorant Garamond, Georgia, serif', letterSpacing: '0.8px', color: pt.botText, lineHeight: 1 }}>ELYXIR</span>
          <span style={{ fontSize: 7, color: pt.textMuted, lineHeight: 1 }}>● Online</span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="cp-preview-body" style={{ background: pt.bg }}>
        {/* Bot message */}
        <div className="cp-preview-row bot">
          <div className="cp-preview-avatar" style={{ background: pt.accent }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div
            className="cp-preview-bubble bot"
            style={{ background: botBg, border: `1px solid ${pt.border}` }}
          >
            <span style={{ fontSize: 8, color: pt.botText, lineHeight: 1.4, display: 'block' }}>
              Hey! How can I<br/>help you today?
            </span>
          </div>
        </div>

        {/* User message */}
        <div className="cp-preview-row user">
          <div className="cp-preview-bubble user" style={{ background: pt.accent }}>
            <span style={{ fontSize: 8, color: '#ffffff', lineHeight: 1.4, display: 'block' }}>
              Hello! 👋
            </span>
          </div>
        </div>

        {/* Bot reply */}
        <div className="cp-preview-row bot">
          <div className="cp-preview-avatar" style={{ background: pt.accent }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div
            className="cp-preview-bubble bot"
            style={{ background: botBg, border: `1px solid ${pt.border}` }}
          >
            <span style={{ fontSize: 8, color: pt.botText, lineHeight: 1.4, display: 'block' }}>
              Hi! I'm ready to<br/>assist you 😊
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main CustomizePanel ───────────────────────────────────────────────────────

export default function CustomizePanel({
  theme,
  onToggleTheme,
  accentColorIndex,
  onAccentChange,
  customAccent,
  onCustomAccentChange,
  botBubbleIndex,
  onBotBubbleChange,
  customBotBubble,
  onCustomBotBubbleChange,
}) {
  const accentWheelRef = useRef(null);
  const botWheelRef = useRef(null);

  const isDark = theme === 'dark';

  // Resolved accent hex for preview
  const resolvedAccentHex = accentColorIndex === 'custom'
    ? customAccent
    : (isDark
        ? (ACCENT_COLORS[accentColorIndex] || ACCENT_COLORS[0]).dark
        : (ACCENT_COLORS[accentColorIndex] || ACCENT_COLORS[0]).light);

  // Resolved bot bubble object for preview
  const resolvedBotBubble = botBubbleIndex === 'custom'
    ? { light: customBotBubble, dark: customBotBubble }
    : BOT_BUBBLE_COLORS[botBubbleIndex] || BOT_BUBBLE_COLORS[0];

  return (
    <div className="customize-panel">
      <div className="cp-inner">

        {/* ── Header ─────────────────────────────────── */}
        <div className="cp-section-title-main">
          <span>🎨</span>
          <span>Customize Your Bot</span>
        </div>

        {/* ── Theme ──────────────────────────────────── */}
        <div className="cp-section">
          <div className="cp-section-label">Theme</div>
          <div className="cp-theme-row">
            <ThemeCard
              label="Light"
              icon={<SunIcon size={20} />}
              active={!isDark}
              onClick={() => isDark && onToggleTheme()}
            />
            <ThemeCard
              label="Dark"
              icon={<MoonIcon size={20} />}
              active={isDark}
              onClick={() => !isDark && onToggleTheme()}
            />
          </div>
        </div>

        {/* ── Accent Color ───────────────────────────── */}
        <div className="cp-section">
          <div className="cp-section-label">Accent Color</div>
          <div className="cp-swatches-row">
            {ACCENT_COLORS.map((c, i) => (
              <ColorSwatch
                key={c.label}
                color={c}
                label={c.label}
                active={accentColorIndex === i}
                onClick={() => onAccentChange(i)}
                isDark={isDark}
              />
            ))}
            {/* Color Wheel */}
            <button
              className={`cp-swatch cp-swatch-wheel ${accentColorIndex === 'custom' ? 'active' : ''}`}
              title="Custom color"
              onClick={() => accentWheelRef.current?.click()}
              aria-label="Pick custom accent color"
            >
              {accentColorIndex === 'custom' && (
                <span className="cp-swatch-check">
                  <CheckIcon size={10} />
                </span>
              )}
            </button>
            <input
              ref={accentWheelRef}
              type="color"
              value={customAccent}
              onChange={(e) => {
                onCustomAccentChange(e.target.value);
                onAccentChange('custom');
              }}
              style={{ display: 'none' }}
              aria-label="Custom accent color picker"
            />
          </div>
          {accentColorIndex === 'custom' && (
            <div className="cp-custom-color-display" style={{ background: customAccent }}>
              <span>{customAccent.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* ── Bot Bubble Color ───────────────────────── */}
        <div className="cp-section">
          <div className="cp-section-label">Bot Messages</div>
          <div className="cp-swatches-row">
            {BOT_BUBBLE_COLORS.map((c, i) => (
              <ColorSwatch
                key={c.label}
                color={c}
                label={c.label}
                active={botBubbleIndex === i}
                onClick={() => onBotBubbleChange(i)}
                isDark={isDark}
              />
            ))}
            {/* Color Wheel */}
            <button
              className={`cp-swatch cp-swatch-wheel ${botBubbleIndex === 'custom' ? 'active' : ''}`}
              title="Custom bubble color"
              onClick={() => botWheelRef.current?.click()}
              aria-label="Pick custom bot bubble color"
            >
              {botBubbleIndex === 'custom' && (
                <span className="cp-swatch-check">
                  <CheckIcon size={10} />
                </span>
              )}
            </button>
            <input
              ref={botWheelRef}
              type="color"
              value={customBotBubble}
              onChange={(e) => {
                onCustomBotBubbleChange(e.target.value);
                onBotBubbleChange('custom');
              }}
              style={{ display: 'none' }}
              aria-label="Custom bot bubble color picker"
            />
          </div>
          {botBubbleIndex === 'custom' && (
            <div className="cp-custom-color-display" style={{ background: customBotBubble, color: '#333' }}>
              <span>{customBotBubble.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* ── Live Preview ───────────────────────────── */}
        <div className="cp-section">
          <div className="cp-section-label">Preview</div>
          <LivePreview
            accentHex={resolvedAccentHex}
            botBubbleColor={resolvedBotBubble}
            theme={theme}
          />
        </div>

      </div>
    </div>
  );
}

export { ACCENT_COLORS, BOT_BUBBLE_COLORS };
