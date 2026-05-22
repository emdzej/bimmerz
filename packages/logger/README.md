# @emdzej/bimmerz-logger

Shared **pino** logger wrapper for the bimmerz family of apps (inpax, ncsx,
ediabasx, xbusx).

Env-driven log level, isomorphic (Node + browser), per-module child loggers.

## Usage

```ts
import { logger, getLogger } from "@emdzej/bimmerz-logger";

logger.info("app booting");

const log = getLogger("transport");
log.debug({ port: "/dev/ttyUSB0" }, "opening serial");
```

## Environment

- `BIMMERZ_LOG_LEVEL` — overrides the default (`info`). Accepts any pino level
  (`trace` / `debug` / `info` / `warn` / `error` / `fatal` / `silent`).
- `NODE_ENV=production` — disables the `pino-pretty` transport for lean bundles.

## Custom loggers

```ts
import { createLogger } from "@emdzej/bimmerz-logger";

const log = createLogger({ name: "my-tool", level: "debug", destination: "/tmp/run.log" });
```

- `destination` writes through `pino/file` (Node-only).
- Omit it and the logger uses `pino-pretty` in dev / plain JSON in production.
