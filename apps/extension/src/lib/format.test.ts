import { describe, expect, it } from 'vitest';
import { formatCompact, formatDuration, scoreColor, toCsv, formatRelative } from './format';

describe('extension formatters', () => {
  it('formats compact numbers like analytics platforms', () => {
    expect(formatCompact(1234)).toBe('1.2K');
    expect(formatCompact(2_500_000)).toBe('2.5M');
    expect(formatCompact(1_200_000_000)).toBe('1.2B');
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(null)).toBe('-');
  });

  it('formats durations', () => {
    expect(formatDuration(253)).toBe('4:13');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(null)).toBe('-');
  });

  it('maps score thresholds to colors', () => {
    expect(scoreColor(90)).toBe('text-good');
    expect(scoreColor(60)).toBe('text-warn');
    expect(scoreColor(20)).toBe('text-bad');
  });

  it('escapes CSV values', () => {
    const csv = toCsv([{ title: 'Say "hello", world', views: 5 }]);
    expect(csv).toContain('"Say ""hello"", world"');
  });

  it('formats relative dates', () => {
    expect(formatRelative(new Date(Date.now() - 30_000).toISOString())).toBe('just now');
    expect(formatRelative(new Date(Date.now() - 3 * 3600_000).toISOString())).toBe('3h ago');
  });
});
