/**
 * Fan out one record to every wrapped sink. Common pairing:
 * `multiSink(consoleSink(), bufferSink({ capacity: 10_000 }))` —
 * see lines in devtools while also accumulating them for an
 * end-user "Download log" button.
 *
 * Failures in one sink don't stop later sinks — each `write` is
 * wrapped in try/catch and errors are swallowed (logging
 * recursively from a logging error would loop).
 */

import type { LogRecord, Sink } from '../types.js';

export function multiSink(...sinks: Sink[]): Sink {
  return {
    write(record: LogRecord): void {
      for (const s of sinks) {
        try {
          s.write(record);
        } catch {
          // Intentional: don't let one bad sink kill the others, and
          // don't log the failure (that would re-enter `write`).
        }
      }
    },
  };
}
