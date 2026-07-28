# Spacing & Layout Architecture

> How OpenChamber implements user-configurable UI density via a single CSS custom property that scales the entire Tailwind spacing system.

## Overview

OpenChamber's Settings → Appearance page includes a "Spacing & Layout" section with a "Spacing Density" slider (50%–200%). Changing this value instantly rescales all padding, margins, gaps, and column widths throughout the application — without any component-level changes.

The system is built on a **single root CSS custom property** (`--padding-scale`) that every Tailwind spacing token references. This is the key architectural insight: instead of passing a scale factor to every component, the CSS variable system does the propagation automatically.

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Zustand Store (useUIStore.ts)                     │
│  padding: number  (50–200, default 100)                     │
│  setPadding() → clamps → set() → applyPadding()             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 2: Runtime Application (applyPadding method)         │
│  scale = padding / 100                                       │
│  adjustedScale = Math.sqrt(scale)     ← non-linear          │
│  lineHeightScale = 1 + (scale - 1) * 0.15  ← dampened      │
│  Sets on document.documentElement:                          │
│    --padding-scale = adjustedScale                           │
│    --line-height-tight/normal/relaxed/loose                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 3: React Binding (ThemeProvider.tsx)                 │
│  useLayoutEffect → applyTypography() + applyPadding()      │
│  Re-runs when fontSize or padding changes                   │
│  useLayoutEffect = synchronous, before browser paint        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 4: CSS Token Layer (design-system.css @theme inline) │
│  --spacing-1: calc(0.25rem * var(--padding-scale, 1))       │
│  --spacing-2: calc(0.5rem * var(--padding-scale, 1))        │
│  ... (all 30+ spacing tokens)                               │
│  → Tailwind utilities (p-4, gap-8, m-2, etc.) auto-scale    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 5: Direct CSS Consumers (typography.css)             │
│  .chat-column {                                             │
│    padding-inline: calc(clamp(...) * var(--padding-scale)) │
│  }                                                           │
│  Non-Tailwind CSS also respects the scale                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Layer 6: Opt-out Mechanism (Header.tsx)                    │
│  <header style={{ '--padding-scale': '1' }}>                │
│  Per-element override: sets scale to 1 locally              │
│  Header stays fixed density while content scales            │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1: Zustand Store State

**File:** `packages/ui/src/stores/useUIStore.ts`

### State Definition (line ~581)

```typescript
interface UIStore {
  // ...
  fontSize: number;        // 50–200, default 100 (percentage)
  terminalFontSize: number; // 9–52, default 13 (px)
  padding: number;          // 50–200, default 100 (percentage) ← THE spacing control
  cornerRadius: number;     // default 18
  inputBarOffset: number;   // 0–100, default 0 (mobile)
  // ...
}
```

### Default Values (line ~870)

```typescript
fontSize: 100,
terminalFontSize: 13,
padding: 100,
cornerRadius: 18,
inputBarOffset: 0,
```

### Setter with Clamping (line ~1623)

```typescript
setPadding: (size) => {
  // Clamp between 50% and 200%
  const clampedSize = Math.max(50, Math.min(200, size));
  set({ padding: clampedSize });
  get().applyPadding();  // ← immediately applies to DOM
},
```

The setter does three things:
1. **Clamps** the value to a safe range (50–200%)
2. **Persists** it to the store (which triggers the persist middleware → localStorage)
3. **Applies** it to the DOM by calling `applyPadding()`

## Layer 2: Runtime Application

**File:** `packages/ui/src/stores/useUIStore.ts` (line ~1660)

```typescript
applyPadding: () => {
  const { padding } = get();
  const root = document.documentElement;

  const scale = padding / 100;  // 100 → 1.0, 50 → 0.5, 200 → 2.0

  // When at default (100%), remove all overrides → CSS defaults take over
  if (scale === 1) {
    root.style.removeProperty('--padding-scale');
    root.style.removeProperty('--line-height-tight');
    root.style.removeProperty('--line-height-normal');
    root.style.removeProperty('--line-height-relaxed');
    root.style.removeProperty('--line-height-loose');
    return;
  }

  // Non-linear scaling: square root for more natural feel at extremes
  // 50% → 0.707 (not 0.5), 200% → 1.414 (not 2.0)
  const adjustedScale = Math.sqrt(scale);

  // Single root variable that all spacing tokens reference
  root.style.setProperty('--padding-scale', adjustedScale.toString());

  // Dampened line-height scaling: only 15% of the spacing delta
  // Prevents text from becoming too spread out at high density
  const lineHeightScale = 1 + (scale - 1) * 0.15;

  root.style.setProperty('--line-height-tight', (1.25 * lineHeightScale).toFixed(3));
  root.style.setProperty('--line-height-normal', (1.5 * lineHeightScale).toFixed(3));
  root.style.setProperty('--line-height-relaxed', (1.625 * lineHeightScale).toFixed(3));
  root.style.setProperty('--line-height-loose', (2 * lineHeightScale).toFixed(3));
},
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **`Math.sqrt(scale)`** | Linear scaling makes 50% feel too cramped and 200% too airy. Square root compresses the extremes: 50% → 0.707x, 200% → 1.414x. |
| **Line-height dampening (0.15x)** | If line-height scaled at the same rate as padding, text blocks would look absurdly tall or short. 15% of the delta keeps text readable. |
| **Remove on default** | When `padding === 100`, the method removes the CSS custom properties entirely instead of setting them to `1`. This lets the CSS `:root` defaults take over cleanly, avoiding specificity issues. |
| **Single root variable** | Only `--padding-scale` is set. All 30+ spacing tokens derive from it via `calc()`. One write, many consumers. |

## Layer 3: React Binding

**File:** `packages/ui/src/components/providers/ThemeProvider.tsx`

```typescript
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const fontSize = useUIStore((state) => state.fontSize);
  const applyTypography = useUIStore((state) => state.applyTypography);
  const padding = useUIStore((state) => state.padding);
  const applyPadding = useUIStore((state) => state.applyPadding);

  React.useLayoutEffect(() => {
    applyTypography();
    applyPadding();
  }, [fontSize, applyTypography, padding, applyPadding]);

  return <>{children}</>;
};
```

### Why `useLayoutEffect`?

`useLayoutEffect` runs **synchronously after DOM mutations but before the browser paints**. This is critical:

- If `useEffect` were used, the user would see a one-frame flash where the old density is applied, then it snaps to the new density.
- `useLayoutEffect` ensures the CSS variables are written to `document.documentElement` before the browser gets a chance to paint, making the transition invisible.

The effect re-runs whenever `fontSize` or `padding` changes, keeping the DOM in sync with the store.

## Layer 4: CSS Token Layer

**File:** `packages/ui/src/styles/design-system.css`

### Root Default (line ~18)

```css
@layer base {
  :root {
    --padding-scale: 1;  /* Default; overridden at runtime by applyPadding() */
    /* ... */
  }
}
```

### Tailwind Spacing Override (line ~212)

```css
@theme inline {
  /* Override Tailwind spacing scale with custom properties that respect --padding-scale */
  --spacing-0: 0;
  --spacing-0\.5: calc(0.125rem * var(--padding-scale, 1));
  --spacing-1: calc(0.25rem * var(--padding-scale, 1));
  --spacing-1\.5: calc(0.375rem * var(--padding-scale, 1));
  --spacing-2: calc(0.5rem * var(--padding-scale, 1));
  --spacing-2\.5: calc(0.625rem * var(--padding-scale, 1));
  --spacing-3: calc(0.75rem * var(--padding-scale, 1));
  --spacing-3\.5: calc(0.875rem * var(--padding-scale, 1));
  --spacing-4: calc(1rem * var(--padding-scale, 1));
  --spacing-5: calc(1.25rem * var(--padding-scale, 1));
  --spacing-6: calc(1.5rem * var(--padding-scale, 1));
  --spacing-7: calc(1.75rem * var(--padding-scale, 1));
  --spacing-8: calc(2rem * var(--padding-scale, 1));
  --spacing-9: calc(2.25rem * var(--padding-scale, 1));
  --spacing-10: calc(2.5rem * var(--padding-scale, 1));
  --spacing-11: calc(2.75rem * var(--padding-scale, 1));
  --spacing-12: calc(3rem * var(--padding-scale, 1));
  --spacing-14: calc(3.5rem * var(--padding-scale, 1));
  --spacing-16: calc(4rem * var(--padding-scale, 1));
  --spacing-20: calc(5rem * var(--padding-scale, 1));
  --spacing-24: calc(6rem * var(--padding-scale, 1));
  --spacing-28: calc(7rem * var(--padding-scale, 1));
  --spacing-32: calc(8rem * var(--padding-scale, 1));
  --spacing-36: calc(9rem * var(--padding-scale, 1));
  --spacing-40: calc(10rem * var(--padding-scale, 1));
  --spacing-44: calc(11rem * var(--padding-scale, 1));
  --spacing-48: calc(12rem * var(--padding-scale, 1));
  --spacing-52: calc(13rem * var(--padding-scale, 1));
  --spacing-56: calc(14rem * var(--padding-scale, 1));
  --spacing-60: calc(15rem * var(--padding-scale, 1));
  --spacing-64: calc(16rem * var(--padding-scale, 1));
  --spacing-72: calc(18rem * var(--padding-scale, 1));
  --spacing-80: calc(20rem * var(--padding-scale, 1));
  --spacing-96: calc(24rem * var(--padding-scale, 1));
}
```

### How This Works with Tailwind v4

In Tailwind v4, the `@theme inline` block defines design tokens that Tailwind utilities reference. When you write `className="p-4"`, Tailwind generates:

```css
.p-4 { padding: var(--spacing-4); }
```

By overriding `--spacing-4` to `calc(1rem * var(--padding-scale, 1))`, every `p-4` utility now scales with `--padding-scale`. The same applies to `gap-*`, `m-*`, `w-*`, `h-*`, and any utility that references the spacing scale.

The `var(--padding-scale, 1)` fallback ensures that if the variable is never set (e.g., before JS runs), the spacing defaults to 1x — the standard Tailwind values.

## Layer 5: Direct CSS Consumers

**File:** `packages/ui/src/styles/typography.css`

Some CSS rules don't use Tailwind utilities but still need to respect the spacing scale:

```css
@layer components {
  .chat-column {
    width: min(100%, 48rem);
    margin-inline: auto;
    padding-inline: calc(clamp(0.75rem, 2.5vw, 1rem) * var(--padding-scale, 1));
  }

  .wide-chat-layout .chat-column {
    width: min(100%, 64rem);
  }

  .chat-input-column {
    width: min(100%, 48rem);
    margin-inline: auto;
    padding-inline: calc(clamp(0.75rem, 2.5vw, 1rem) * var(--padding-scale, 1));
  }

  .chat-message-column {
    width: min(100%, 48rem);
    margin-inline: auto;
    padding-inline: calc(clamp(0.75rem, 2.5vw, 1rem) * var(--padding-scale, 1));
  }

  @media (min-width: 1024px) {
    .chat-column {
      padding-inline: calc(clamp(1rem, 2.5vw, 1.5rem) * var(--padding-scale, 1));
    }
    .chat-input-column {
      padding-inline: calc(clamp(1rem, 2.5vw, 1.5rem) * var(--padding-scale, 1));
    }
    .chat-message-column {
      padding-inline: calc(clamp(1rem, 2.5vw, 1.5rem) * var(--padding-scale, 1));
    }
  }
}
```

These use `clamp()` for responsive base values, then multiply by `--padding-scale`. The pattern is: `calc(<responsive-base> * var(--padding-scale, 1))`.

## Layer 6: Per-Element Opt-Out

**File:** `packages/ui/src/components/layout/Header.tsx` (line ~2659)

```typescript
<header
  ref={headerRef}
  className={headerClassName}
  style={{ ['--padding-scale' as string]: '1' } as React.CSSProperties}
>
```

The Header component explicitly sets `--padding-scale: 1` via inline style. Because CSS custom properties cascade, this overrides the root value for the header and all its descendants. The header stays at a fixed density regardless of the user's spacing preference.

This is the opt-out mechanism: any component that should NOT scale can set `--padding-scale: 1` locally.

## Layer 7: Persistence & Boot

### Persistence (Zustand persist middleware)

**File:** `packages/ui/src/stores/useUIStore.ts` (line ~2260)

```typescript
// In the persist partialize function:
padding: state.padding,
cornerRadius: state.cornerRadius,
fontSize: state.fontSize,
terminalFontSize: state.terminalFontSize,
inputBarOffset: state.inputBarOffset,
```

The Zustand `persist` middleware serializes these values to `localStorage`. On page reload, the store rehydrates from `localStorage`, and the `ThemeProvider`'s `useLayoutEffect` re-applies them to the DOM.

### Desktop Settings Sync

**File:** `packages/ui/src/lib/appearanceAutoSave.ts`

For the Electron desktop app, appearance settings are also synced to the desktop settings store (which writes to disk via Electron IPC):

```typescript
type AppearanceSlice = {
  fontSize: number;
  terminalFontSize: number;
  padding: number;
  cornerRadius: number;
  inputBarOffset: number;
  // ...
};
```

The `startAppearanceAutoSave()` function subscribes to the store and diffs the appearance slice. When `padding` changes, it writes the new value to the desktop settings store.

### Boot Restoration

**File:** `packages/ui/src/lib/persistence.ts` (line ~600)

```typescript
if (typeof settings.padding === 'number' && Number.isFinite(settings.padding) && settings.padding !== store.padding) {
  store.setPadding(settings.padding);
}
```

On boot, persisted settings are loaded and applied to the store. `setPadding()` calls `applyPadding()`, which writes the CSS variables.

### Boot Gate (Flash Prevention)

**File:** `packages/ui/src/apps/appBootReady.ts`

```typescript
// Resolves once the one-time app boot work that affects layout has been applied —
// notably persisted appearance/typography preferences (font size, spacing), which are
// loaded asynchronously and would otherwise reflow the UI a frame after first paint.
// The mobile splash gate (useFontsReady) awaits this so the first UI shown is final.
```

A promise (`appBootReadyPromise`) is created and resolved (`markAppBootReady()`) after the persisted layout settings are applied. The mobile splash screen waits for this promise before hiding, ensuring the user never sees a layout flash.

## Layer 8: Typography Scaling (Parallel System)

**File:** `packages/ui/src/stores/useUIStore.ts` (line ~1634)

The "Interface Font Size" setting works in parallel with spacing, using the same pattern but for font sizes:

```typescript
applyTypography: () => {
  const { fontSize } = get();
  const root = document.documentElement;

  const scale = fontSize / 100;

  const entries = Object.entries(SEMANTIC_TYPOGRAPHY) as Array<[SemanticTypographyKey, string]>;

  // Default must be SEMANTIC_TYPOGRAPHY (from CSS). Remove overrides.
  if (scale === 1) {
    for (const [key] of entries) {
      root.style.removeProperty(getTypographyVariable(key));
    }
    return;
  }

  for (const [key, baseValue] of entries) {
    const numericValue = parseFloat(baseValue);
    if (!Number.isFinite(numericValue)) continue;
    root.style.setProperty(getTypographyVariable(key), `${numericValue * scale}rem`);
  }
},
```

**File:** `packages/ui/src/lib/typography.ts`

```typescript
export const SEMANTIC_TYPOGRAPHY = {
  markdown: '0.9375rem',
  code: '0.8125rem',
  uiHeader: '0.9375rem',
  uiLabel: '0.8750rem',
  meta: '0.875rem',
  micro: '0.875rem',
} as const;
```

Each semantic font size gets its own CSS variable (`--text-markdown`, `--text-code`, etc.) which is scaled by the `fontSize` percentage. Unlike spacing, typography uses **linear** scaling (no `Math.sqrt`).

## UI Component: The Settings Slider

**File:** `packages/ui/src/components/sections/openchamber/OpenChamberVisualSettings.tsx` (line ~1253)

```tsx
{shouldShow('spacing') && (
  <div data-settings-item="appearance.spacing-density"
       className={cn("py-1", isMobile ? "flex flex-col gap-3" : "flex items-center gap-8")}>
    <div className={cn("flex min-w-0 flex-col", isMobile ? "w-full" : "w-56 shrink-0")}>
      <span className="typography-ui-label text-foreground">
        {t('settings.openchamber.visual.field.spacingDensity')}
      </span>
    </div>
    <div className={cn("flex items-center gap-2", isMobile ? "w-full" : "w-fit")}>
      <NumberInput
        value={padding}
        onValueChange={setPadding}
        min={50}
        max={200}
        step={5}
        className="w-16"
      />
      <Button size="sm" type="button" variant="ghost"
        onClick={() => setPadding(100)}
        disabled={padding === 100}
        className="h-7 w-7 px-0 text-muted-foreground hover:text-foreground"
        aria-label={t('settings.openchamber.visual.actions.resetSpacingAria')}
        title={t('settings.common.actions.reset')}
      >
        <Icon name="restart" className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
)}
```

The UI is a `NumberInput` (50–200, step 5) with a reset button that sets it back to 100. The `setPadding` store action handles clamping and DOM application.

## Settings Search Integration

**File:** `packages/ui/src/lib/settings/search.ts` (line ~117)

```typescript
{
  id: 'appearance.spacing-density',
  page: 'appearance',
  titleKey: 'settings.openchamber.visual.field.spacingDensity',
  keywords: ['density', 'compact', 'comfortable', 'spacing'],
},
```

The settings search index includes the spacing density setting with keywords for discoverability.

## i18n Keys

**File:** `packages/ui/src/lib/i18n/messages/en.settings.ts`

```typescript
'settings.openchamber.visual.section.spacingAndLayout': 'Spacing & Layout',
'settings.openchamber.visual.field.spacingDensity': 'Spacing Density',
'settings.openchamber.visual.actions.resetSpacingAria': 'Reset spacing',
```

These keys are translated across 10+ languages (en, es, fr, ja, ko, zh-CN, zh-TW, pt-BR, pl, uk).

## Complete Data Flow Summary

```
User drags slider to 150%
    │
    ▼
NumberInput onValueChange → setPadding(150)
    │
    ▼
useUIStore.setPadding(150)
    ├─ clamp: Math.max(50, Math.min(200, 150)) → 150
    ├─ set({ padding: 150 })  ← Zustand state update
    │   └─ persist middleware → localStorage.setItem(...)
    │   └─ appearanceAutoSave → desktop settings sync
    └─ get().applyPadding()
        │
        ▼
    applyPadding()
        ├─ scale = 150 / 100 = 1.5
        ├─ adjustedScale = Math.sqrt(1.5) = 1.2247
        ├─ lineHeightScale = 1 + (1.5 - 1) * 0.15 = 1.075
        ├─ root.style.setProperty('--padding-scale', '1.2247')
        ├─ root.style.setProperty('--line-height-normal', '1.612')
        └─ ... (other line-heights)
        │
        ▼
    CSS cascade updates
        ├─ --spacing-4: calc(1rem * 1.2247) = 1.2247rem
        ├─ --spacing-8: calc(2rem * 1.2247) = 2.4494rem
        └─ ... (all 30+ spacing tokens)
        │
        ▼
    Tailwind utilities recompute
        ├─ .p-4 { padding: 1.2247rem }  (was 1rem)
        ├─ .gap-8 { gap: 2.4494rem }    (was 2rem)
        └─ ... (every spacing utility in the app)
        │
        ▼
    Browser repaints with new spacing
    (ThemeProvider's useLayoutEffect ensures this happens before paint)
```

## File Reference

| File | Role |
|------|------|
| `packages/ui/src/stores/useUIStore.ts` | Store state, `setPadding()`, `applyPadding()` |
| `packages/ui/src/components/providers/ThemeProvider.tsx` | React binding via `useLayoutEffect` |
| `packages/ui/src/styles/design-system.css` | `--padding-scale` default + `@theme inline` spacing overrides |
| `packages/ui/src/styles/typography.css` | Direct CSS consumers (chat columns) |
| `packages/ui/src/lib/typography.ts` | `SEMANTIC_TYPOGRAPHY` constants for font scaling |
| `packages/ui/src/components/sections/openchamber/OpenChamberVisualSettings.tsx` | Settings UI (slider + reset) |
| `packages/ui/src/components/layout/Header.tsx` | Per-element opt-out (`--padding-scale: 1`) |
| `packages/ui/src/lib/persistence.ts` | Boot restoration from persisted settings |
| `packages/ui/src/lib/appearanceAutoSave.ts` | Desktop settings sync |
| `packages/ui/src/apps/appBootReady.ts` | Boot gate to prevent layout flash |
| `packages/ui/src/lib/settings/search.ts` | Settings search index entry |
| `packages/ui/src/lib/i18n/messages/en.settings.ts` | i18n strings |
