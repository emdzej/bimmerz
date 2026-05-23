/**
 * Logger implementation + central config.
 *
 * Logger handles are thin proxies that consult the live module-
 * scoped config on every call. That's what makes
 * `configureLogger({ categories: { EDIABASX: 'debug' } })` flip
 * existing handles' behaviour instantly — no need to refetch
 * loggers from callers.
 *
 * Performance: level resolution is a Map lookup + at most ~3 dot-
 * segment slices for typical category paths. Both happen *before*
 * any binding merge or sink dispatch, so a `log.debug({…}, 'msg')`
 * call that's below threshold spends about as much time as a
 * branch + Map.get. Same shape as pino's "no-op below level"
 * pattern.
 */

import { resolveLevel } from './categories.js';
import { levelPasses } from './levels.js';
import type {
  LogBindings,
  LogLevel,
  LogRecord,
  Logger,
  LoggerConfig,
  Sink,
} from './types.js';

/**
 * Default sink — lazily installed on the active config when no
 * `sink` is explicitly supplied. Set via `setDefaultSink()` from
 * the sink-side init so we don't have a circular dep.
 */
let DEFAULT_SINK: Sink | null = null;

/** @internal — called from index.ts after sink modules load. */
export function setDefaultSink(sink: Sink): void {
  DEFAULT_SINK = sink;
}

/** Module-scoped live config. Initialized to a sensible "info, console" default. */
const active: LoggerConfig = {
  level: 'info',
};

/**
 * Replace or merge into the active configuration. The merge is
 * shallow — `categories` and `sink` are replaced wholesale when
 * present in the partial. Pass `categories: {}` to clear all
 * per-category overrides.
 *
 * Effective immediately for every logger handle, including ones
 * already returned by `getLogger()`.
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  if (config.level !== undefined) active.level = config.level;
  if (config.categories !== undefined) active.categories = config.categories;
  if (config.sink !== undefined) active.sink = config.sink;
}

/**
 * Snapshot of the active configuration. Returned object is a copy
 * — mutating it doesn't affect the live config (use
 * `configureLogger()` for that).
 */
export function getLoggerConfig(): Readonly<LoggerConfig> {
  return {
    level: active.level,
    categories: active.categories ? { ...active.categories } : undefined,
    sink: active.sink,
  };
}

class LoggerImpl implements Logger {
  readonly category: string | null;
  private readonly bindings: LogBindings;

  constructor(category: string | null, bindings: LogBindings = {}) {
    this.category = category;
    this.bindings = bindings;
  }

  get level(): LogLevel {
    return resolveLevel(this.category, active.categories, active.level);
  }

  trace(a: string | LogBindings, b?: string): void {
    this.emit('trace', a, b);
  }
  debug(a: string | LogBindings, b?: string): void {
    this.emit('debug', a, b);
  }
  info(a: string | LogBindings, b?: string): void {
    this.emit('info', a, b);
  }
  warn(a: string | LogBindings, b?: string): void {
    this.emit('warn', a, b);
  }
  error(a: string | LogBindings, b?: string): void {
    this.emit('error', a, b);
  }
  fatal(a: string | LogBindings, b?: string): void {
    this.emit('fatal', a, b);
  }

  child(bindings: LogBindings): Logger {
    return new LoggerImpl(this.category, { ...this.bindings, ...bindings });
  }

  private emit(level: LogLevel, a: string | LogBindings, b?: string): void {
    const threshold = resolveLevel(this.category, active.categories, active.level);
    if (!levelPasses(level, threshold)) return;
    let msg: string;
    let callBindings: LogBindings | undefined;
    if (typeof a === 'string') {
      msg = a;
    } else {
      callBindings = a;
      msg = b ?? '';
    }
    const mergedBindings: LogBindings =
      callBindings === undefined
        ? this.bindings
        : { ...this.bindings, ...callBindings };
    const record: LogRecord = {
      level,
      category: this.category,
      bindings: mergedBindings,
      msg,
      time: Date.now(),
    };
    const sink = active.sink ?? DEFAULT_SINK;
    if (sink) sink.write(record);
  }
}

/**
 * Get a logger handle. Call with no arguments for the root logger
 * (category = `null`); pass a dot-separated string to scope under
 * a category. Re-calling with the same category does NOT return
 * the same instance — handles are cheap, and shared identity would
 * make `child()` bindings spill across callers.
 *
 * Examples:
 *   const log = getLogger();
 *   const parser = getLogger("EDIABASX.parser");
 *   const job = parser.child({ jobId: "C_S_LESEN" });
 */
export function getLogger(category?: string): Logger {
  return new LoggerImpl(category ?? null);
}
