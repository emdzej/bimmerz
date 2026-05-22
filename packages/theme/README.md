# @emdzej/bimmerz-theme

Shared Tailwind preset + CSS variables for the bimmerz app family. Defines the
`bg-base` / `bg-surface` / `bg-elevated` / `text-foreground` / `text-muted` /
`text-faint` / `border-divider` / `border-rule` semantic token system every app
already uses. Each app picks its own `accent` colour.

## Wire it in (consumer app)

```ts
// tailwind.config.ts
import preset from "@emdzej/bimmerz-theme";
import type { Config } from "tailwindcss";

export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,svelte}"],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: "#2563eb", muted: "#1e40af" }, // pick your own
      },
    },
  },
} satisfies Config;
```

```css
/* src/app.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
@import "@emdzej/bimmerz-theme/tokens.css";
```

```ts
// src/main.ts — apply on boot
import { applyTheme, watchSystemTheme } from "@emdzej/bimmerz-theme";
applyTheme("system"); // or whatever the user has saved
watchSystemTheme(() => applyTheme("system"));
```

## JS API

```ts
import { applyTheme, isDarkTheme, watchSystemTheme, type ThemeChoice } from "@emdzej/bimmerz-theme";
```

- `applyTheme(choice)` — toggle the `dark` class on `<html>`.
- `isDarkTheme(choice)` — resolve `"system"` against `prefers-color-scheme`.
- `watchSystemTheme(onChange)` — listen for OS-preference changes.

## Why a shared preset

Every bimmerz app converged on the same colour tokens independently — there's
no reason for each to redefine them. Centralising in one preset means a
palette change ripples to all consumers via a single dependency bump.

Accent stays per-app on purpose: ncsx (blue-600), inpax (blue-500), ediabasx
(cyan-500), xbusx (TBD) — distinct accents make the app you're in
recognisable at a glance.
