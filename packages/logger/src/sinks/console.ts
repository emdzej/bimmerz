/**
 * Default sink — works in Node and the browser, no dependencies.
 *
 * Routes through `console.{trace|debug|info|warn|error}` per level
 * so browser devtools' level-filter sidebar works correctly. In
 * Node, console.* writes to stderr (warn/error) or stdout (rest)
 * — same as bare `console.log`. For Node CLIs that want
 * pino-pretty / file destinations, switch to
 * `@emdzej/bimmerz-logger/sinks/pino`.
 *
 * Line format:
 *   2026-05-23T19:14:32.123Z DEBUG [EDIABASX.parser] msg {jobId:"C_S_LESEN"}
 *
 * Bindings render as compact JSON. ANSI colours are added when the
 * environment looks like a TTY (best-effort: `process.stdout.isTTY`
 * in Node, never in the browser).
 */

import type { LogLevel, LogRecord, Sink } from '../types.js';

export interface ConsoleSinkOptions {
  /**
   * Force colour on/off. Defaults to "on if Node TTY, off otherwise".
   * Browser devtools renders ANSI literally, so we leave it off there
   * unless explicitly requested.
   */
  colors?: boolean;
  /**
   * Render `time` as a relative `+12ms` offset from the sink's
   * creation moment instead of an absolute ISO timestamp. Handy for
   * spotting time gaps between adjacent calls.
   */
  relativeTime?: boolean;
}

const ANSI = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bgRed: '\x1b[41m',
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  trace: ANSI.gray,
  debug: ANSI.cyan,
  info: ANSI.green,
  warn: ANSI.yellow,
  error: ANSI.red,
  fatal: ANSI.bgRed,
  silent: '',
};

const LEVEL_TAG: Record<LogLevel, string> = {
  trace: 'TRACE',
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
  fatal: 'FATAL',
  silent: '',
};

const LEVEL_METHOD: Record<LogLevel, 'log' | 'debug' | 'info' | 'warn' | 'error'> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
  silent: 'log',
};

function detectTty(): boolean {
  // Node: process.stdout.isTTY → typically true under terminals.
  // Avoid `process` in a way that bundlers can't tree-shake out
  // gracefully — `globalThis` access is cheap.
  const g = globalThis as { process?: { stdout?: { isTTY?: boolean } } };
  return !!g.process?.stdout?.isTTY;
}

export function consoleSink(opts: ConsoleSinkOptions = {}): Sink {
  const colors = opts.colors ?? detectTty();
  const t0 = opts.relativeTime ? Date.now() : 0;
  return {
    write(record: LogRecord): void {
      const tag = LEVEL_TAG[record.level];
      const tagColored = colors ? `${LEVEL_COLOR[record.level]}${tag}${ANSI.reset}` : tag;
      const time = opts.relativeTime
        ? `+${(record.time - t0).toString().padStart(4)}ms`
        : new Date(record.time).toISOString();
      const cat = record.category ? ` [${record.category}]` : '';
      const bindings = Object.keys(record.bindings).length > 0
        ? ` ${safeStringify(record.bindings)}`
        : '';
      const line = `${time} ${tagColored}${cat} ${record.msg}${bindings}`;
      const method = LEVEL_METHOD[record.level];
      console[method](line);
    },
  };
}

/**
 * JSON.stringify with circular-ref guard and Error → {name, message,
 * stack} expansion. Bindings often carry Error instances or shared
 * state objects; we don't want a circular ref or a "[object Object]"
 * to drop information.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_, v: unknown) => {
      if (v instanceof Error) {
        return { name: v.name, message: v.message, stack: v.stack };
      }
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    });
  } catch {
    return '[unserializable]';
  }
}
