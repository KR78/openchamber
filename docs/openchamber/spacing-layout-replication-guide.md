# Spacing & Layout Replication Guide

> Step-by-step guide to replicating OpenChamber's user-configurable spacing density system in another React + Tailwind v4 + Zustand project.

## Prerequisites

| Requirement | Why |
|-------------|-----|
| React 18+ | `useLayoutEffect` for flash-free application |
| Tailwind CSS v4 | `@theme inline` block for spacing token overrides |
| Zustand | State management with `persist` middleware |
| TypeScript | Type safety for store state |

If you use a different state manager (Redux, Jotai, etc.) or CSS framework, the principles still apply — adapt the implementation details accordingly.

## Architecture Principle

The entire system rests on one insight:

> **Override Tailwind's `--spacing-*` tokens to multiply by a single CSS custom property (`--padding-scale`). Then control that one variable from JavaScript.**

This means every `p-4`, `gap-8`, `m-2` utility automatically scales. No component changes. No prop drilling. No context providers.

```
User sets padding to 150%
    → Store writes --padding-scale: 1.2247 to <html>
    → CSS recalculates --spacing-4: calc(1rem * 1.2247)
    → Every p-4 utility now resolves to 1.2247rem
    → Entire UI rescales
```

## Step-by-Step Implementation

### Step 1: Define the CSS Foundation

Create or edit your main CSS file (e.g., `src/styles/design-system.css`):

```css
@layer base {
  :root {
    /* The single root variable. Default = 1 (no scaling). */
    --padding-scale: 1;
  }
}

@theme inline {
  /* Override every Tailwind spacing token to respect --padding-scale.
     The var(--padding-scale, 1) fallback ensures 1x scaling if JS hasn't run yet. */
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

**Important:** Only include the spacing tokens you actually use. Tailwind v4 generates utilities for all defined tokens, so unused tokens add weight. Start with the full set and prune later.

### Step 2: Create the Zustand Store

Create `src/stores/useUIStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // Spacing density: 50–200 (percentage). 100 = default.
  padding: number;

  // Font size scale: 50–200 (percentage). 100 = default.
  fontSize: number;

  // Actions
  setPadding: (size: number) => void;
  setFontSize: (size: number) => void;
  applyPadding: () => void;
  applyTypography: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      padding: 100,
      fontSize: 100,

      setPadding: (size) => {
        const clampedSize = Math.max(50, Math.min(200, size));
        set({ padding: clampedSize });
        get().applyPadding();
      },

      setFontSize: (size) => {
        const clampedSize = Math.max(50, Math.min(200, size));
        set({ fontSize: clampedSize });
        get().applyTypography();
      },

      applyPadding: () => {
        const { padding } = get();
        const root = document.documentElement;

        const scale = padding / 100;

        // At default, remove overrides so CSS :root defaults take over
        if (scale === 1) {
          root.style.removeProperty('--padding-scale');
          root.style.removeProperty('--line-height-tight');
          root.style.removeProperty('--line-height-normal');
          root.style.removeProperty('--line-height-relaxed');
          root.style.removeProperty('--line-height-loose');
          return;
        }

        // Non-linear scaling: square root for natural feel at extremes
        const adjustedScale = Math.sqrt(scale);

        root.style.setProperty('--padding-scale', adjustedScale.toString());

        // Dampened line-height scaling (15% of spacing delta)
        const lineHeightScale = 1 + (scale - 1) * 0.15;

        root.style.setProperty('--line-height-tight', (1.25 * lineHeightScale).toFixed(3));
        root.style.setProperty('--line-height-normal', (1.5 * lineHeightScale).toFixed(3));
        root.style.setProperty('--line-height-relaxed', (1.625 * lineHeightScale).toFixed(3));
        root.style.setProperty('--line-height-loose', (2 * lineHeightScale).toFixed(3));
      },

      applyTypography: () => {
        const { fontSize } = get();
        const root = document.documentElement;

        const scale = fontSize / 100;

        // Define your semantic font sizes here
        const typography = {
          markdown: '0.9375rem',
          code: '0.8125rem',
          uiHeader: '0.9375rem',
          uiLabel: '0.8750rem',
          meta: '0.875rem',
          micro: '0.875rem',
        };

        const entries = Object.entries(typography) as Array<[string, string]>;

        if (scale === 1) {
          for (const [key] of entries) {
            const varName = `--text-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.removeProperty(varName);
          }
          return;
        }

        for (const [key, baseValue] of entries) {
          const numericValue = parseFloat(baseValue);
          if (!Number.isFinite(numericValue)) continue;
          const varName = `--text-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(varName, `${numericValue * scale}rem`);
        }
      },
    }),
    {
      name: 'ui-settings',
      partialize: (state) => ({
        padding: state.padding,
        fontSize: state.fontSize,
      }),
    }
  )
);
```

### Step 3: Create the ThemeProvider Component

Create `src/components/ThemeProvider.tsx`:

```typescript
import React from 'react';
import { useUIStore } from '@/stores/useUIStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const fontSize = useUIStore((state) => state.fontSize);
  const applyTypography = useUIStore((state) => state.applyTypography);
  const padding = useUIStore((state) => state.padding);
  const applyPadding = useUIStore((state) => state.applyPadding);

  // useLayoutEffect = runs after DOM mutation, BEFORE browser paint.
  // This prevents a one-frame flash where old density is visible.
  React.useLayoutEffect(() => {
    applyTypography();
    applyPadding();
  }, [fontSize, applyTypography, padding, applyPadding]);

  return <>{children}</>;
};
```

Mount it high in your app tree (e.g., in `App.tsx` or `main.tsx`):

```typescript
import { ThemeProvider } from '@/components/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      {/* rest of app */}
    </ThemeProvider>
  );
}
```

### Step 4: Create the Settings UI

Create a settings component with a number input and reset button:

```typescript
import React from 'react';
import { useUIStore } from '@/stores/useUIStore';

export const SpacingSettings: React.FC = () => {
  const padding = useUIStore((state) => state.padding);
  const setPadding = useUIStore((state) => state.setPadding);

  return (
    <div className="flex items-center gap-8 py-1">
      <div className="flex min-w-0 flex-col w-56 shrink-0">
        <span className="text-sm font-medium">Spacing Density</span>
      </div>
      <div className="flex items-center gap-2 w-fit">
        <input
          type="number"
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value))}
          min={50}
          max={200}
          step={5}
          className="w-16 px-2 py-1 border rounded"
          aria-label="Spacing density percentage"
        />
        <span className="text-sm text-muted-foreground">%</span>
        <button
          type="button"
          onClick={() => setPadding(100)}
          disabled={padding === 100}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Reset spacing"
          title="Reset"
        >
          ↺
        </button>
      </div>
    </div>
  );
};
```

### Step 5: Handle Direct CSS Consumers (Optional)

If you have CSS that doesn't use Tailwind utilities but should still scale, multiply by `--padding-scale`:

```css
@layer components {
  .content-column {
    width: min(100%, 48rem);
    margin-inline: auto;
    /* clamp() for responsive base, then scale */
    padding-inline: calc(clamp(0.75rem, 2.5vw, 1rem) * var(--padding-scale, 1));
  }

  @media (min-width: 1024px) {
    .content-column {
      padding-inline: calc(clamp(1rem, 2.5vw, 1.5rem) * var(--padding-scale, 1));
    }
  }
}
```

### Step 6: Per-Element Opt-Out (Optional)

If certain elements (like a fixed header) should NOT scale, set `--padding-scale: 1` locally:

```typescript
function Header() {
  return (
    <header
      style={{ ['--padding-scale' as string]: '1' } as React.CSSProperties}
      className="p-4 border-b"
    >
      {/* This header stays at 1x density regardless of user setting */}
    </header>
  );
}
```

CSS custom properties cascade, so all children of this header will also use scale 1.

### Step 7: Prevent Boot Flash (Optional but Recommended)

If your app loads settings asynchronously (e.g., from an API or IndexedDB), the user may see a one-frame flash where the default density is shown before the persisted value is applied.

Create a boot gate:

```typescript
// src/boot/appBootReady.ts
let resolveBoot: (() => void) | null = null;
let resolved = false;

export const appBootReadyPromise = new Promise<void>((resolve) => {
  resolveBoot = resolve;
});

export function markAppBootReady(): void {
  if (resolved) return;
  resolved = true;
  resolveBoot?.();
}
```

In your app bootstrap:

```typescript
// After persisted settings are loaded and applied to the store:
useUIStore.getState().applyPadding();
useUIStore.getState().applyTypography();
markAppBootReady();
```

In your splash/loading screen:

```typescript
import { appBootReadyPromise } from '@/boot/appBootReady';

// Show splash until boot is ready
const [booted, setBooted] = React.useState(false);
React.useEffect(() => {
  appBootReadyPromise.then(() => setBooted(true));
}, []);

if (!booted) return <SplashScreen />;
return <App />;
```

## Scaling Curve Reference

OpenChamber uses `Math.sqrt(scale)` for non-linear spacing and `1 + (scale - 1) * 0.15` for line-height dampening. Here's what that produces:

| User Setting | Linear Scale | Spacing Scale (sqrt) | Line-Height Scale (0.15x) |
|-------------|-------------|---------------------|--------------------------|
| 50% | 0.50 | 0.707 | 0.925 |
| 75% | 0.75 | 0.866 | 0.9625 |
| 100% (default) | 1.00 | 1.000 | 1.000 |
| 125% | 1.25 | 1.118 | 1.0375 |
| 150% | 1.50 | 1.225 | 1.075 |
| 175% | 1.75 | 1.323 | 1.1125 |
| 200% | 2.00 | 1.414 | 1.150 |

**Why non-linear?** At 50%, linear scaling would make everything half-size — too cramped. Square root gives 0.707x, which is compact but usable. At 200%, linear would double everything — too airy. Square root gives 1.414x, which is spacious but not wasteful.

**Why dampened line-height?** If line-height scaled at the same rate as padding, a 200% spacing setting would make text blocks 2x taller, which looks absurd. 15% of the delta keeps text proportions reasonable.

## Testing Checklist

- [ ] Default (100%) produces standard Tailwind spacing — no CSS overrides on `<html>`
- [ ] Setting to 150% increases all `p-*`, `gap-*`, `m-*` utilities proportionally
- [ ] Setting to 50% decreases all spacing — but not as drastically as linear (sqrt)
- [ ] Reset button returns to 100% and removes CSS overrides
- [ ] Refreshing the page restores the persisted value without a flash
- [ ] Header (or any opt-out element) stays at fixed density
- [ ] Direct CSS consumers (`.content-column`) also scale
- [ ] Line-heights scale more gently than spacing
- [ ] No layout shift / reflash when adjusting the slider

## Common Pitfalls

### 1. Using `useEffect` instead of `useLayoutEffect`

```typescript
// ❌ BAD — causes a one-frame flash
React.useEffect(() => {
  applyPadding();
}, [padding]);

// ✅ GOOD — runs before paint, no flash
React.useLayoutEffect(() => {
  applyPadding();
}, [padding]);
```

### 2. Setting `--padding-scale` to the raw percentage

```typescript
// ❌ BAD — 150 means 150x scaling, not 1.5x
root.style.setProperty('--padding-scale', padding.toString());

// ✅ GOOD — divide by 100 first, then apply non-linear curve
const scale = padding / 100;
const adjustedScale = Math.sqrt(scale);
root.style.setProperty('--padding-scale', adjustedScale.toString());
```

### 3. Not removing overrides at default

```typescript
// ❌ BAD — leaves --padding-scale: 1 on <html>, which can cause specificity issues
if (scale === 1) {
  root.style.setProperty('--padding-scale', '1');
  return;
}

// ✅ GOOD — removes the override, letting CSS :root default take over
if (scale === 1) {
  root.style.removeProperty('--padding-scale');
  return;
}
```

### 4. Forgetting the `var(--padding-scale, 1)` fallback

```css
/* ❌ BAD — if JS hasn't run yet, --padding-scale is undefined, spacing breaks */
--spacing-4: calc(1rem * var(--padding-scale));

/* ✅ GOOD — falls back to 1x if the variable isn't set yet */
--spacing-4: calc(1rem * var(--padding-scale, 1));
```

### 5. Overriding `--spacing-0`

```css
/* ❌ BAD — 0 * anything is still 0, but calc() adds overhead */
--spacing-0: calc(0 * var(--padding-scale, 1));

/* ✅ GOOD — just use 0 directly */
--spacing-0: 0;
```

### 6. Not clamping the input

```typescript
// ❌ BAD — user could set padding to 1000, breaking the UI
setPadding: (size) => {
  set({ padding: size });
  get().applyPadding();
},

// ✅ GOOD — clamp to a safe range
setPadding: (size) => {
  const clampedSize = Math.max(50, Math.min(200, size));
  set({ padding: clampedSize });
  get().applyPadding();
},
```

## Adaptation Notes

### For Tailwind v3 (not v4)

Tailwind v3 doesn't have `@theme inline`. Instead, override the spacing scale in `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        0.5: 'calc(0.125rem * var(--padding-scale, 1))',
        1: 'calc(0.25rem * var(--padding-scale, 1))',
        2: 'calc(0.5rem * var(--padding-scale, 1))',
        // ... etc
      },
    },
  },
};
```

And define `--padding-scale: 1` in your global CSS `:root`.

### For CSS Modules / Styled Components

The same principle applies — define `--padding-scale` on `:root` and use `calc()` in your styles:

```css
/* MyComponent.module.css */
.container {
  padding: calc(1rem * var(--padding-scale, 1));
}
```

### For Non-Zustand State Managers

The store logic is framework-agnostic. Adapt to your state manager:

- **Redux:** Put `padding` in a slice, dispatch `setPadding`, call `applyPadding` in a `useLayoutEffect` that reads from the store.
- **Jotai:** Use an atom for `padding`, a `useLayoutEffect` that reads the atom and calls `applyPadding`.
- **Context:** Store `padding` in context, `useLayoutEffect` in a provider applies it.

The key is: state change → `useLayoutEffect` → `document.documentElement.style.setProperty('--padding-scale', ...)`.

## Summary

The entire system is:

1. **One CSS variable** (`--padding-scale`) on `:root`
2. **One `@theme inline` block** overriding all `--spacing-*` tokens to multiply by it
3. **One store action** (`applyPadding`) that writes the variable to `<html>`
4. **One React effect** (`useLayoutEffect` in `ThemeProvider`) that re-runs on state change

That's it. Four moving parts, and the entire UI becomes user-configurable for density.
