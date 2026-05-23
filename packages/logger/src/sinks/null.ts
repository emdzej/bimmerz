/**
 * Null sink — drops every record. Use in tests so logging code
 * doesn't pollute the test runner output, or in production code
 * paths where you want to disable logging entirely without going
 * through `silent` level (e.g. a "verbose" CLI flag that controls
 * level but a separate "quiet" flag that controls the sink).
 */

import type { Sink } from '../types.js';

export function nullSink(): Sink {
  return {
    write(): void {
      /* no-op */
    },
  };
}
