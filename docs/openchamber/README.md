# OpenChamber Documentation

Technical documentation for OpenChamber's UI systems and architecture.

## Documents

| Document | Description |
|----------|-------------|
| [Spacing & Layout Architecture](./spacing-layout-architecture.md) | How OpenChamber implements the user-configurable "Spacing & Layout" settings — the full data flow from Zustand store through CSS custom properties to Tailwind utilities. |
| [Spacing & Layout Replication Guide](./spacing-layout-replication-guide.md) | Step-by-step guide to replicating the same spacing-density system in another React + Tailwind v4 + Zustand project. |

## Quick Summary

OpenChamber's "Spacing & Layout" settings allow users to control the density of the entire UI via a single percentage slider (50%–200%). The system works by:

1. Storing a `padding` percentage in a Zustand store
2. Computing a non-linear scale (`Math.sqrt(scale)`) at runtime
3. Writing it to a single root CSS custom property: `--padding-scale`
4. Overriding every Tailwind `--spacing-*` token to multiply by `--padding-scale`
5. Applying via `useLayoutEffect` to prevent visible reflow

This means **every** Tailwind spacing utility (`p-4`, `gap-8`, `m-2`, etc.) automatically scales — no component-level changes are needed.
