# bimmerz

**Shared workspace for BMW tooling.** Common Svelte components, theme tokens,
loggers, and utility packages consumed by [`inpax`](https://github.com/emdzej/inpax),
[`ncsx`](https://github.com/emdzej/ncsx), [`ediabasx`](https://github.com/emdzej/ediabasx),
and [`xbusx`](https://github.com/emdzej/xbusx).

Every package here is independently versioned and publishable. Apps in the
sibling repos consume them as ordinary npm dependencies.

## Packages

| Package | Purpose |
|---|---|
| [`@emdzej/bimmerz-logger`](packages/logger) | pino-backed logger wrapper. Isomorphic (Node + browser), env-driven level, per-module child loggers. |
| [`@emdzej/bimmerz-theme`](packages/theme) | Tailwind preset + CSS variables. `bg-base` / `bg-surface` / `text-foreground` / `border-divider` token system. Light/dark via class. |
| [`@emdzej/bimmerz-ui`](packages/ui) | Svelte 5 components. Source-only — consumer apps compile via their own Vite. |

## Develop

```bash
pnpm install                          # at the repo root
pnpm build                            # build everything via turbo
pnpm typecheck                        # tsc across all packages
pnpm lint                             # eslint
pnpm test                             # vitest
```

Per-package work uses the standard pnpm filter pattern:

```bash
pnpm --filter @emdzej/bimmerz-logger build
pnpm --filter @emdzej/bimmerz-ui typecheck
```

## Svelte component packaging — the source-only convention

`@emdzej/bimmerz-ui` ships **.svelte source files**, not pre-compiled JS.
The consumer app's Vite + `@sveltejs/vite-plugin-svelte` compiles them.

Why: Svelte 5's compiler output depends on the consumer's compiler version
and rune config. Pre-compiling locks the output to a specific Svelte
version and breaks tree-shaking + HMR. Source-only ships the canonical
form, lets each app's build pick the right output.

The `package.json` exposes this via the `svelte` export condition:

```json
{
  "svelte": "./src/index.ts",
  "exports": {
    ".": { "svelte": "./src/index.ts", "types": "./src/index.ts", "import": "./src/index.ts" }
  }
}
```

Consumer apps should also tell `optimizeDeps` about the package so dev-server
pre-bundling resolves cleanly:

```ts
// vite.config.ts
optimizeDeps: {
  include: ["@emdzej/bimmerz-ui"],
}
```

This is the same convention `@emdzej/inpax-web-provider` uses successfully —
copy that shape for any future Svelte package in this workspace.

## Conventions

- **TypeScript**: every package extends `tsconfig.build.json` from the root
  (TS 5.7, `NodeNext` module/resolution, strict). Svelte packages override
  to `@tsconfig/svelte` (`ESNext` / Bundler) because Vite plus
  `verbatimModuleSyntax: false` is what the Svelte 5 compiler expects.
- **Linting**: shared `eslint.config.js` at the root — TS-aware via
  `typescript-eslint`. No app-specific overrides for now.
- **Testing**: `vitest` from the root, picking up `packages/**/src/**/*.test.ts`.
- **Versioning**: independent — bump per package, no enforced lockstep.
  Apps consume via `^x.y.z` so patch/minor bumps flow without coordination.

## License

[PolyForm Noncommercial 1.0.0](./LICENSE) — same as the sibling repos. Free
for noncommercial use (personal projects, research, hobby work). Commercial
use needs a separate licence — open an issue if you need one.

## Disclaimer

This project is for educational and research purposes only. It is not
affiliated with BMW AG.
