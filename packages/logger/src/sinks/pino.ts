/**
 * pino-backed sink — Node-only entry point. Exposed under the
 * subpath `@emdzej/bimmerz-logger/sinks/pino` so web bundles
 * tree-shake out pino entirely. Apps that want JSON logs, file
 * destinations, or pino-pretty render through this.
 *
 * Maps each `LogRecord` onto a single pino call, preserving the
 * level, bindings, message, and category (carried as the
 * `category` field in the pino object). We re-create the pino
 * instance on every config-applying call rather than caching one —
 * cheap, and keeps the API simple ("here's pino's options, build
 * me a sink").
 */

import pino from 'pino';
import type { LogRecord, Sink } from '../types.js';

export interface PinoSinkOptions {
  /**
   * Render through pino-pretty when set. Node-only; ignored if
   * `destination` is also set (pino-pretty + file requires its
   * own transport stack).
   */
  pretty?: boolean;
  /** Write to a file path instead of stdout. */
  destination?: string;
  /**
   * Optional name attached to every record as `name` — pino's
   * convention. Defaults to "bimmerz".
   */
  name?: string;
  /**
   * Any extra pino options. Merged AFTER the ones we set, so
   * callers can override anything.
   */
  pinoOptions?: pino.LoggerOptions;
}

export function pinoSink(opts: PinoSinkOptions = {}): Sink {
  const transport = opts.destination
    ? { target: 'pino/file' as const, options: { destination: opts.destination } }
    : opts.pretty
      ? { target: 'pino-pretty' as const, options: { colorize: true } }
      : undefined;
  const logger = pino({
    name: opts.name ?? 'bimmerz',
    // We do our own threshold filtering upstream; pino should
    // accept everything and just format. Avoids double-checking
    // the level threshold.
    level: 'trace',
    transport,
    ...opts.pinoOptions,
  });
  return {
    write(record: LogRecord): void {
      const bindings = { ...record.bindings };
      if (record.category) bindings.category = record.category;
      logger[record.level](bindings, record.msg);
    },
  };
}
