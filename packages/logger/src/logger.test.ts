import { afterEach, describe, expect, it } from 'vitest';
import { configureLogger, getLogger, getLoggerConfig } from './logger.js';
import { resolveLevel } from './categories.js';
import { levelPasses } from './levels.js';
import { bufferSink } from './sinks/buffer.js';
import { multiSink } from './sinks/multi.js';
import { nullSink } from './sinks/null.js';
import type { LogRecord } from './types.js';

/** Reset to a known state after each test so tests don't leak config. */
afterEach(() => {
  configureLogger({ level: 'info', categories: {}, sink: nullSink() });
});

describe('levelPasses', () => {
  it('matches pino ordering', () => {
    expect(levelPasses('debug', 'info')).toBe(false);
    expect(levelPasses('info', 'info')).toBe(true);
    expect(levelPasses('error', 'info')).toBe(true);
  });
  it('silent blocks everything', () => {
    expect(levelPasses('fatal', 'silent')).toBe(false);
    expect(levelPasses('trace', 'silent')).toBe(false);
  });
});

describe('resolveLevel hierarchy', () => {
  const rules = { EDIABASX: 'debug', 'EDIABASX.parser': 'trace', INPAX: 'info' } as const;

  it('returns fallback for null category', () => {
    expect(resolveLevel(null, rules, 'warn')).toBe('warn');
  });
  it('uses exact match when present', () => {
    expect(resolveLevel('EDIABASX', rules, 'warn')).toBe('debug');
  });
  it('walks up dot segments', () => {
    expect(resolveLevel('EDIABASX.parser.lexer', rules, 'warn')).toBe('trace');
    expect(resolveLevel('EDIABASX.runner', rules, 'warn')).toBe('debug');
  });
  it('falls back when no segment matches', () => {
    expect(resolveLevel('OTHER.subsystem', rules, 'warn')).toBe('warn');
  });
  it('ignores rules with bad level values', () => {
    expect(resolveLevel('FOO', { FOO: 'bogus' as never }, 'warn')).toBe('warn');
  });
});

describe('Logger basic dispatch', () => {
  it('emits records at or above the threshold', () => {
    const buf = bufferSink();
    configureLogger({ level: 'info', sink: buf });
    const log = getLogger();
    log.debug('skipped');
    log.info('kept');
    log.warn('kept too');
    const recs = buf.snapshot();
    expect(recs.map((r: LogRecord) => r.msg)).toEqual(['kept', 'kept too']);
    expect(recs[0]?.level).toBe('info');
  });

  it('attaches bindings when called with (obj, msg)', () => {
    const buf = bufferSink();
    configureLogger({ level: 'trace', sink: buf });
    getLogger('A').info({ id: 7, tag: 'x' }, 'with bindings');
    expect(buf.snapshot()[0]).toMatchObject({
      level: 'info',
      category: 'A',
      bindings: { id: 7, tag: 'x' },
      msg: 'with bindings',
    });
  });

  it('emits empty bindings when called with (msg) only', () => {
    const buf = bufferSink();
    configureLogger({ level: 'trace', sink: buf });
    getLogger().info('bare');
    expect(buf.snapshot()[0]?.bindings).toEqual({});
  });

  it('attaches a `time` epoch ms', () => {
    const buf = bufferSink();
    configureLogger({ level: 'trace', sink: buf });
    const before = Date.now();
    getLogger().info('t');
    const after = Date.now();
    const rec = buf.snapshot()[0]!;
    expect(rec.time).toBeGreaterThanOrEqual(before);
    expect(rec.time).toBeLessThanOrEqual(after);
  });
});

describe('Logger category resolution', () => {
  it('applies per-category levels', () => {
    const buf = bufferSink();
    configureLogger({
      level: 'warn',
      categories: { EDIABASX: 'debug' },
      sink: buf,
    });
    getLogger('EDIABASX').debug('kept');
    getLogger('INPAX').debug('dropped');
    getLogger().debug('dropped too');
    expect(buf.snapshot().map((r: LogRecord) => r.msg)).toEqual(['kept']);
  });

  it('hierarchical override beats parent', () => {
    const buf = bufferSink();
    configureLogger({
      level: 'warn',
      categories: { EDIABASX: 'debug', 'EDIABASX.parser': 'trace' },
      sink: buf,
    });
    getLogger('EDIABASX.parser').trace('kept');
    getLogger('EDIABASX.runner').trace('dropped');
    expect(buf.snapshot().map((r: LogRecord) => r.msg)).toEqual(['kept']);
  });

  it('logger.level reflects the live effective threshold', () => {
    configureLogger({ level: 'warn', categories: { FOO: 'trace' } });
    expect(getLogger('FOO').level).toBe('trace');
    expect(getLogger('BAR').level).toBe('warn');
  });
});

describe('runtime reconfigure', () => {
  it('affects existing logger handles', () => {
    const buf = bufferSink();
    configureLogger({ level: 'info', sink: buf });
    const log = getLogger('X');
    log.debug('dropped #1');
    configureLogger({ level: 'debug' });
    log.debug('kept after reconfigure');
    expect(buf.snapshot().map((r: LogRecord) => r.msg)).toEqual(['kept after reconfigure']);
  });

  it('partial reconfigure merges with existing config', () => {
    configureLogger({ level: 'error', categories: { A: 'debug' } });
    configureLogger({ level: 'info' }); // categories should remain
    const cfg = getLoggerConfig();
    expect(cfg.level).toBe('info');
    expect(cfg.categories).toEqual({ A: 'debug' });
  });

  it('explicit empty categories clears overrides', () => {
    configureLogger({ level: 'warn', categories: { A: 'debug' } });
    configureLogger({ categories: {} });
    expect(getLoggerConfig().categories).toEqual({});
  });
});

describe('child loggers', () => {
  it('carry permanent bindings on every call', () => {
    const buf = bufferSink();
    configureLogger({ level: 'trace', sink: buf });
    const log = getLogger('X').child({ tenant: 'acme' });
    log.info('one');
    log.info({ extra: 1 }, 'two');
    expect(buf.snapshot().map((r: LogRecord) => r.bindings)).toEqual([
      { tenant: 'acme' },
      { tenant: 'acme', extra: 1 },
    ]);
  });

  it('call-binding overrides child binding on key conflict', () => {
    const buf = bufferSink();
    configureLogger({ level: 'trace', sink: buf });
    const log = getLogger().child({ tenant: 'acme' });
    log.info({ tenant: 'override' }, 'x');
    expect(buf.snapshot()[0]?.bindings).toEqual({ tenant: 'override' });
  });

  it('child inherits category + level resolution', () => {
    configureLogger({ level: 'warn', categories: { Y: 'trace' } });
    const log = getLogger('Y').child({ a: 1 });
    expect(log.level).toBe('trace');
  });
});

describe('bufferSink', () => {
  it('keeps records up to capacity', () => {
    const buf = bufferSink({ capacity: 3 });
    configureLogger({ level: 'trace', sink: buf });
    for (let i = 0; i < 5; i++) getLogger().info(`m${i}`);
    expect(buf.snapshot().map((r: LogRecord) => r.msg)).toEqual(['m2', 'm3', 'm4']);
    expect(buf.size()).toBe(3);
  });

  it('clear() empties the buffer', () => {
    const buf = bufferSink();
    configureLogger({ level: 'trace', sink: buf });
    getLogger().info('a');
    buf.clear();
    expect(buf.size()).toBe(0);
    expect(buf.snapshot()).toEqual([]);
  });
});

describe('multiSink', () => {
  it('fans out to every wrapped sink', () => {
    const a = bufferSink();
    const b = bufferSink();
    configureLogger({ level: 'trace', sink: multiSink(a, b) });
    getLogger().info('hi');
    expect(a.snapshot().map((r: LogRecord) => r.msg)).toEqual(['hi']);
    expect(b.snapshot().map((r: LogRecord) => r.msg)).toEqual(['hi']);
  });

  it('isolates failing sinks from healthy ones', () => {
    const angry = {
      write(): void {
        throw new Error('boom');
      },
    };
    const calm = bufferSink();
    configureLogger({ level: 'trace', sink: multiSink(angry, calm) });
    expect(() => getLogger().info('hi')).not.toThrow();
    expect(calm.snapshot().map((r: LogRecord) => r.msg)).toEqual(['hi']);
  });
});
