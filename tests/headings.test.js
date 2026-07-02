import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { analyzeHeadings } from '../src/analyzers/headings.js';

describe('analyzeHeadings', () => {
  it('accepts a single descriptive H1 with logical hierarchy', () => {
    const $ = cheerio.load('<h1>Guía completa de SEO técnico</h1><h2>Sección</h2><h3>Subsección</h3>');
    const result = analyzeHeadings($);
    expect(result.issues).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  it('flags a missing H1 as critical', () => {
    const $ = cheerio.load('<h2>Solo un h2</h2>');
    const result = analyzeHeadings($);
    expect(result.issues.some(i => i.severity === 'critical')).toBe(true);
  });

  it('warns about multiple H1 tags', () => {
    const $ = cheerio.load('<h1>Uno</h1><h1>Dos</h1>');
    const result = analyzeHeadings($);
    expect(result.issues.some(i => i.message.includes('Multiple'))).toBe(true);
  });

  it('detects skipped heading levels', () => {
    const $ = cheerio.load('<h1>Título principal largo</h1><h4>Salto directo a h4</h4>');
    const result = analyzeHeadings($);
    expect(result.issues.some(i => i.message.includes('hierarchy'))).toBe(true);
  });
});
