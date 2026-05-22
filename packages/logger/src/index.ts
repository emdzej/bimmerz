/**
 * Shared pino logger wrapper for the bimmerz family.
 *
 * Apps that consume this package get a single root logger plus a
 * `getLogger(module)` factory for per-module child loggers. Level is
 * env-driven (`BIMMERZ_LOG_LEVEL` overrides the default) so test runs
 * can crank up to `debug` without code changes; production builds
 * default to `info` with no pretty transport (lean bundle).
 *
 * Isomorphic — guards `process` so the module imports cleanly inside
 * a browser bundle where `process.env` may be a stub.
 */

import pino from "pino";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";

export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  pretty?: boolean;
  /** File path for headless / TUI flows; ignored in the browser. */
  destination?: string;
}

const envLevel =
  typeof process !== "undefined" && process.env?.BIMMERZ_LOG_LEVEL
    ? (process.env.BIMMERZ_LOG_LEVEL as LogLevel)
    : undefined;

const envIsProd =
  typeof process !== "undefined" && process.env?.NODE_ENV === "production";

const defaultLevel: LogLevel = envLevel ?? "info";
const isPretty = !envIsProd;

export function createLogger(options: LoggerOptions = {}): pino.Logger {
  const level = options.level ?? defaultLevel;

  const transport = options.destination
    ? { target: "pino/file", options: { destination: options.destination } }
    : (options.pretty ?? isPretty)
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined;

  return pino({
    level,
    name: options.name,
    transport,
  });
}

/** Root logger — child loggers inherit its level. */
export const logger = createLogger({ name: "bimmerz" });

/** Child-logger factory keyed by module name (`getLogger("transport")`). */
export function getLogger(module: string): pino.Logger {
  return logger.child({ module });
}

export type { Logger } from "pino";
