/**
 * Hierarchical category resolution.
 *
 * Categories are dot-separated paths (`EDIABASX.parser.lexer`).
 * `resolveLevel("EDIABASX.parser.lexer", rules, fallback)` walks up
 * the path looking for a matching rule — `EDIABASX.parser.lexer`
 * first, then `EDIABASX.parser`, then `EDIABASX`, then the
 * fallback. First match wins.
 *
 * This is what makes "set INPAX to info, EDIABASX to debug, but
 * EDIABASX.parser to trace" work without having to enumerate every
 * subsystem in the rules.
 */

import { LEVEL_VALUES } from './levels.js';
import type { LogLevel } from './types.js';

/**
 * Resolve the effective level for `category` given a rule map
 * and a fallback. The root category — `null` or `''` — always
 * gets the fallback (no rule can match an unnamed category).
 */
export function resolveLevel(
  category: string | null,
  rules: Readonly<Record<string, LogLevel>> | undefined,
  fallback: LogLevel,
): LogLevel {
  if (!rules || !category) return fallback;
  // Walk up dot segments: foo.bar.baz → foo.bar → foo → (fallback)
  let path = category;
  while (path.length > 0) {
    const hit = rules[path];
    if (hit !== undefined && hit in LEVEL_VALUES) return hit;
    const dot = path.lastIndexOf('.');
    if (dot < 0) break;
    path = path.slice(0, dot);
  }
  return fallback;
}
