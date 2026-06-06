import { describe, expect, it } from 'vitest';
import { formatPercent, toLocalDateTimeInputValue } from './format';

describe('formatPercent', () => {
  it('renders ratios as percentages', () => {
    expect(formatPercent(0.2)).toBe('20%');
  });
});

describe('toLocalDateTimeInputValue', () => {
  it('returns blank for null values', () => {
    expect(toLocalDateTimeInputValue(null)).toBe('');
  });
});
