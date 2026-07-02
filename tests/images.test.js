import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { analyzeImages } from '../src/analyzers/images.js';

describe('analyzeImages', () => {
  it('returns 100 for a page without images', () => {
    const $ = cheerio.load('<body><p>Sin imágenes</p></body>');
    const result = analyzeImages($);
    expect(result.score).toBe(100);
    expect(result.data.total).toBe(0);
  });

  it('flags images without alt as critical', () => {
    const $ = cheerio.load('<img src="a.png"><img src="b.png" alt="ok">');
    const result = analyzeImages($);
    expect(result.issues.some(i => i.severity === 'critical' && i.message.includes('alt'))).toBe(true);
    expect(result.data.missingAlt).toBe(1);
  });

  it('treats empty alt as decorative (not an issue)', () => {
    const $ = cheerio.load('<img src="a.webp" alt="" width="10" height="10" loading="lazy">');
    const result = analyzeImages($);
    expect(result.issues.filter(i => i.severity === 'critical')).toHaveLength(0);
  });

  it('warns about missing width/height', () => {
    const $ = cheerio.load('<img src="a.webp" alt="x" loading="lazy">');
    const result = analyzeImages($);
    expect(result.issues.some(i => i.message.includes('width/height'))).toBe(true);
  });
});
