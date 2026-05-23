# @emdzej/bimmerz-logger

Shared structured logger for the bimmerz family of tools
([`ediabasx`](https://github.com/emdzej/ediabasx),
[`inpax`](https://github.com/emdzej/inpax),
[`ncsx`](https://github.com/emdzej/ncsx), and the apps that build on
them).

**Pino-shape API**, hierarchical categories, runtime-mutable central
config, pluggable sinks. No environment variables. Works in both
Node and the browser; tree-shake-friendly so web bundles don't ship
pino.

## TL;DR

```ts
import { configureLogger, getLogger } from '@emdzej/bimmerz-logger';

// App start — configure once, anywhere.
configureLogger({
  level: 'info',
  categories: {
    EDIABASX: 'debug',
    'EDIABASX.parser': 'trace',
    INPAX: 'info',
  },
});

// Anywhere in the codebase — log with or without a category.
const log = getLogger('EDIABASX.parser');
log.debug({ jobId: 'C_S_LESEN' }, 'parsing request packet');
log.info('parser ready');

// Want to flip on debug for one subsystem at runtime?
configureLogger({ categories: { ...prev, INPAX: 'debug' } });
// — every previously-handed-out INPAX logger sees the new level immediately.
```

## Design

The interface is the same shape as pino — `log.debug(bindings, msg)`,
levels `trace` through `fatal`, `log.child(bindings)`. We don't
re-export pino's types because we don't want our public API locked
to one implementation. The default sink is a small console wrapper
(works in browser + Node); apps that want pino's pretty-print, JSON,
or file destinations opt in via `@emdzej/bimmerz-logger/sinks/pino`.

Logger handles are **proxies**, not snapshots — they consult the live
config on every call. So once an app calls `configureLogger(…)`, every
logger handle anyone ever cached picks up the new settings on its next
emit. No need to "refetch" loggers from callers.

Categories are **hierarchical** by dot. A rule for `EDIABASX` applies
to `EDIABASX.parser` and `EDIABASX.parser.lexer` unless a more
specific rule wins. Most specific match always wins:

```ts
configureLogger({
  level: 'warn',
  categories: {
    EDIABASX: 'debug',          // covers EDIABASX, EDIABASX.runner, …
    'EDIABASX.parser': 'trace', // overrides for parser sub-tree
    INPAX: 'info',
  },
});

getLogger('EDIABASX.parser.lexer').trace('hit');  // matches EDIABASX.parser → 'trace' → emitted
getLogger('EDIABASX.runner').debug('hit');        // matches EDIABASX → 'debug' → emitted
getLogger('INPAX.dispatcher').debug('miss');      // matches INPAX → 'info' → dropped
getLogger().debug('miss');                        // root → 'warn' fallback → dropped
```

## API

### `configureLogger(partial: Partial<LoggerConfig>)`

Replace or merge into the active configuration. Shallow merge —
`categories` and `sink` are replaced wholesale when present in the
partial.

```ts
configureLogger({ level: 'debug' });                    // bump default level
configureLogger({ categories: { EDIABASX: 'trace' } }); // change category rules
configureLogger({ categories: {} });                    // clear all category rules
```

Apply early in your app's entry point. You can re-apply at any time
— the change is immediate for every existing logger handle.

### `getLogger(category?: string): Logger`

Returns a logger handle. With no argument, the root logger
(category = `null`). With a dot-separated string, a category-scoped
logger.

```ts
const root = getLogger();
const parser = getLogger('EDIABASX.parser');
const job = parser.child({ jobId: 'C_S_LESEN' });
```

### `Logger`

```ts
interface Logger {
  readonly level: LogLevel;     // currently-effective threshold (live)

  trace(msg: string): void;
  trace(bindings: object, msg: string): void;
  debug(msg: string): void;
  debug(bindings: object, msg: string): void;
  info(msg: string): void;
  info(bindings: object, msg: string): void;
  warn(...): void;
  error(...): void;
  fatal(...): void;

  child(bindings: object): Logger;
}
```

Two call forms — string-only `log.info("done")`, or bindings-first
`log.info({ jobId, count }, "done")`. Bindings are merged with any
permanent `child()` bindings; call bindings win on key conflicts.

`log.level` is a read-only getter that returns the live effective
level for this logger's category. Cheap to call — use it as an
escape hatch for hot paths where formatting the message is expensive:

```ts
if (log.level === 'trace') {
  log.trace({ details: expensiveDump() }, 'sg op');
}
```

### Sinks

Bundled sinks (importable from the main entry):

| Function | Use |
|---|---|
| `consoleSink({ colors?, relativeTime? })` | Default. Routes through `console.{debug,info,warn,error}`. ANSI colour when TTY. |
| `bufferSink({ capacity? })` | In-memory ring of last N records. `.snapshot()` returns them — drives "Download log" UIs. |
| `multiSink(a, b, …)` | Fan one record out to every wrapped sink. Failures in one sink don't poison the others. |
| `nullSink()` | Drops everything. Tests, or to disable logging without changing level. |

Optional pino sink — import from the subpath so it's not in the
default tree-shake graph:

```ts
import { pinoSink } from '@emdzej/bimmerz-logger/sinks/pino';

configureLogger({
  level: 'info',
  sink: pinoSink({ pretty: true }),     // pino-pretty when TTY
  // or: pinoSink({ destination: '/var/log/app.log' })
});
```

## Sink contract

```ts
interface Sink {
  write(record: LogRecord): void;
}

interface LogRecord {
  level: LogLevel;
  category: string | null;
  bindings: Record<string, unknown>;
  msg: string;
  time: number;  // Date.now()
}
```

Roll your own sink for special destinations:

```ts
const httpSink: Sink = {
  write(rec) {
    if (rec.level === 'error' || rec.level === 'fatal') {
      navigator.sendBeacon('/log', JSON.stringify(rec));
    }
  },
};

configureLogger({
  sink: multiSink(consoleSink(), httpSink),
});
```

## What we don't do

- **No environment-variable reads.** Apps are responsible for
  mapping their CLI flags / wizard config / settings panel onto
  `configureLogger(…)`. Keeps the library portable and
  predictable.
- **No printf-style formatting.** Use template literals or
  bindings:
  ```ts
  log.debug({ a, b }, 'compared');                   // ✅ bindings
  log.debug(`compared ${a} vs ${b}`);                // ✅ template literal
  log.debug({}, 'compared %s vs %s', a, b);          // ❌ not supported
  ```
- **No async sinks.** All sinks are sync. If you need network or
  storage shipping, wrap a sync sink that enqueues to your own
  async pipeline.

## Migration from `@emdzej/ediabasx-logger` / `@emdzej/inpax-logger`

Those packages will be retired once the codebases here are migrated.
The shapes are similar — `configureLogger({...})` plus
`getLogger("module")` — so most call sites need only an import path
change:

```ts
// old
import { getLogger, configureLogger } from '@emdzej/ediabasx-logger';
// new
import { getLogger, configureLogger } from '@emdzej/bimmerz-logger';
```

Behavioural differences worth knowing:

- `configureLogger` now takes effect on **existing** logger handles.
  ediabasx-logger only affected new ones.
- pino types are no longer in the public surface. `Logger` is our own
  interface (same shape). If you typed something as `pino.Logger`,
  swap to `Logger` from this package.
- `pretty` / `destination` options moved off the package-level config
  and into the pino sink. Get them by switching the sink:
  ```ts
  import { pinoSink } from '@emdzej/bimmerz-logger/sinks/pino';
  configureLogger({ sink: pinoSink({ pretty: true }) });
  ```
