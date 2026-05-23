/**
 * In-memory ring-buffer sink. Holds the last `capacity` records and
 * lets UI code snapshot them on demand — drives "Download log"
 * buttons in web apps without having to also intercept the console.
 *
 * Capacity defaults to 5000 (~1MB if records average 200 bytes).
 * Older records are dropped silently as new ones arrive.
 */

import type { LogRecord, Sink } from '../types.js';

export interface BufferSink extends Sink {
  /** Records currently held, oldest → newest. */
  snapshot(): LogRecord[];
  /** Drop every held record. */
  clear(): void;
  /** Number of records currently held (≤ capacity). */
  size(): number;
}

export interface BufferSinkOptions {
  /** Max records held; older ones drop. Default 5000. */
  capacity?: number;
}

export function bufferSink(opts: BufferSinkOptions = {}): BufferSink {
  const capacity = Math.max(1, opts.capacity ?? 5000);
  // Plain array is fine — pop+shift would be O(N); we use an
  // index-based ring so push is O(1) and snapshot is O(N) only on
  // demand.
  const ring: (LogRecord | undefined)[] = new Array(capacity);
  let head = 0; // next write position
  let count = 0;
  return {
    write(record: LogRecord): void {
      ring[head] = record;
      head = (head + 1) % capacity;
      if (count < capacity) count++;
    },
    snapshot(): LogRecord[] {
      const out: LogRecord[] = [];
      const start = count < capacity ? 0 : head;
      for (let i = 0; i < count; i++) {
        const r = ring[(start + i) % capacity];
        if (r) out.push(r);
      }
      return out;
    },
    clear(): void {
      ring.fill(undefined);
      head = 0;
      count = 0;
    },
    size(): number {
      return count;
    },
  };
}
