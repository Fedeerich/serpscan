import { describe, it, expect } from 'vitest';
import { calculateScore, WEIGHTS } from '../src/score.js';

function categoriesWithScore(score) {
  return Object.fromEntries(Object.keys(WEIGHTS).map(k => [k, { score }]));
}

describe('calculateScore', () => {
  it('weights sum to exactly 100', () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('returns 100 when every category scores 100', () => {
    expect(calculateScore(categoriesWithScore(100))).toBe(100);
  });

  it('returns 0 when every category scores 0', () => {
    expect(calculateScore(categoriesWithScore(0))).toBe(0);
  });

  it('returns 50 when every category scores 50', () => {
    expect(calculateScore(categoriesWithScore(50))).toBe(50);
  });

  it('ignores unknown categories', () => {
    const cats = { ...categoriesWithScore(100), unknown: { score: 0 } };
    expect(calculateScore(cats)).toBe(100);
  });
});
