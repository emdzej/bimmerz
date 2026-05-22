# @emdzej/bimmerz-ui

Shared **Svelte 5** components for the bimmerz app family. Source-only —
consumer apps' Vite + svelte-plugin compiles them. No pre-compiled output.

## Convention: source-only Svelte libs

Svelte components ship as `.svelte` files, not pre-compiled JS. The
`package.json` carries:

```json
{
  "svelte": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "svelte": "./src/index.ts",
      "import": "./src/index.ts"
    }
  }
}
```

The `svelte` export condition is what the consumer's Vite plugin reads to
locate the source. The `types` condition lets `svelte-check` resolve them
the same way without an explicit `.d.ts` step.

**Why:** Svelte 5's compiler output depends on the consumer's compiler
version + rune config. Pre-compiling locks the output to whichever Svelte
version the lib was built against and breaks tree-shaking + HMR in the
consuming app. Letting consumers compile means every version, every dev
mode, every runes setting works.

A consumer's `vite.config.ts` should also tell `optimizeDeps` about us so
the dev server pre-bundles the source:

```ts
optimizeDeps: {
  include: ["@emdzej/bimmerz-ui"],
}
```

## Required peer setup

Components use semantic colour tokens (`bg-surface`, `text-foreground`,
`text-accent`, …) from [`@emdzej/bimmerz-theme`](../theme). Wire that
preset into the consumer app's `tailwind.config.ts` first; the
components break visually without it.

## Components

| Name | Purpose |
|---|---|
| `<Brand body="EDIABAS" suffix="X" />` | Split-colour wordmark — body in foreground, suffix in accent. |

More to come — About dialog, Settings dialog scaffolding, Connect button,
install picker. The existing app-specific implementations in inpax-web /
ncsx-web / ediabasx-web are slated for consolidation here once their
shapes stabilise.

## Usage

```svelte
<script lang="ts">
  import { Brand } from "@emdzej/bimmerz-ui";
</script>

<Brand body="EDIABAS" suffix="X" />
```

Pair with `@emdzej/bimmerz-theme` for the colour tokens. Each consumer
app picks its own `accent` colour via `tailwind.config.ts` extend.
