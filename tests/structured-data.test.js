import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { analyzeStructuredData } from '../src/analyzers/structured-data.js';

describe('analyzeStructuredData', () => {
  it('detects valid JSON-LD blocks and their type', () => {
    const $ = cheerio.load(`
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"}</script>
    `);
    const result = analyzeStructuredData($);
    expect(result.data.schemas).toContain('Article');
    expect(result.score).toBe(100);
  });

  it('flags invalid JSON-LD syntax', () => {
    const $ = cheerio.load('<script type="application/ld+json">{not valid json</script>');
    const result = analyzeStructuredData($);
    expect(result.issues.some(i => i.message.includes('invalid'))).toBe(true);
  });

  it('warns when no structured data exists', () => {
    const $ = cheerio.load('<body></body>');
    const result = analyzeStructuredData($);
    expect(result.issues.some(i => i.message.includes('No structured data'))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });
});
