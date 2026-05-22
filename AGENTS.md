# Agent orientation — bimmerz

Shared workspace for BMW tooling. Common code (Svelte components, theme,
logger, utilities) consumed by `inpax`, `ncsx`, `ediabasx`, `xbusx`.

## Layout

```
bimmerz/
├── packages/
│   ├── logger/         — @emdzej/bimmerz-logger     (pino wrapper, isomorphic)
│   ├── theme/          — @emdzej/bimmerz-theme      (Tailwind preset + CSS vars)
│   └── ui/             — @emdzej/bimmerz-ui        (Svelte 5 components, source-only)
├── eslint.config.js
├── pnpm-workspace.yaml
├── tsconfig.build.json — shared compiler options
├── tsconfig.json       — project references entrypoint
├── turbo.json
└── vitest.config.ts
```

## Hot reload / dev loop

Apps that consume from this repo see changes after rebuilding the affected
package — `tsc`-emitted packages (logger, theme) need a `pnpm --filter <name>
build`; source-only Svelte packages (ui) just need the consumer's Vite to
restart pick up the new file content.

Local linking is handled by pnpm workspaces — sibling repos like `ediabasx`
or `ncsx` add a `"file:../bimmerz/packages/X"` dependency (or `workspace:*`
when they live in the same workspace). Until that integration lands here,
consumer repos can publish-and-consume via npm pre-release tags.

## Versioning

Independent per package. Apps consume via `^x.y.z`. No enforced lockstep —
breaking changes get a major bump and the consumer migrates on its own
schedule.

## Svelte packaging convention

`@emdzej/bimmerz-ui` ships `.svelte` source, not pre-compiled JS. See
[README.md](README.md) for the rationale + the `package.json` shape.

## Don't add here

- App-specific UI (per-chassis flows, per-protocol pickers — those stay in
  the consuming app).
- Anything that hardcodes a single app's accent colour. Per-app accents stay
  in the consuming app's `tailwind.config.ts`.
- BMW proprietary data of any kind. This repo runs through CI; nothing here
  should reference a real `.prg`/`.dat`/`.ipo` file.
