/**
 * Level ordering + threshold helpers. Numeric values mirror pino's
 * so a wrapping pino sink (or anyone comparing against pino's
 * `logger.levels.values`) gets the same numbers back.
 */

import type { LogLevel } from './types.js';

/**
 * Numeric weight of each level. Higher = more severe. `silent` is
 * `Infinity` so no record ever beats the threshold when the
 * effective level is `silent`.
 */
export const LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: Number.POSITIVE_INFINITY,
};

/**
 * `true` when a record at `record` severity passes a `threshold`
 * filter — i.e. the line should be emitted.
 *
 * Example: `levelPasses('debug', 'info')` → `false` (debug is below
 * info). `levelPasses('error', 'info')` → `true`.
 */
export function levelPasses(record: LogLevel, threshold: LogLevel): boolean {
  return LEVEL_VALUES[record] >= LEVEL_VALUES[threshold];
}
