import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { analyzeMeta } from '../src/analyzers/meta.js';

const FULL_PAGE = `
<html lang="es">
<head>
  <title>Un título perfectamente optimizado para SEO aquí</title>
  <meta name="description" content="Una meta descripción con la longitud ideal para aparecer completa en los resultados de búsqueda de Google sin cortes.">
  <link rel="canonical" href="https://example.com/">
  <meta property="og:title" content="Título OG">
  <meta property="og:description" content="Descripción OG">
  <meta property="og:image" content="https://example.com/img.png">
  <meta name="twitter:card" content="summary">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/favicon.ico">
  <link rel="alternate" hreflang="es" href="https://example.com/es">
  <link rel="alternate" hreflang="x-default" href="https://example.com/">
</head>
<body></body>
</html>`;

describe('analyzeMeta', () => {
  it('gives a perfect page a high score with no critical issues', () => {
    const $ = cheerio.load(FULL_PAGE);
    const result = analyzeMeta($, 'https://example.com/');
    expect(result.issues.filter(i => i.severity === 'critical')).toHaveLength(0);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.data.hasFavicon).toBe(true);
    expect(result.data.hreflangs).toContain('x-default');
  });

  it('flags missing title, description and viewport as critical', () => {
    const $ = cheerio.load('<html><head></head><body></body></html>');
    const result = analyzeMeta($, 'https://example.com/');
    const criticals = result.issues.filter(i => i.severity === 'critical').map(i => i.message);
    expect(criticals.some(m => m.includes('<title>'))).toBe(true);
    expect(criticals.some(m => m.includes('meta description'))).toBe(true);
    expect(criticals.some(m => m.includes('viewport'))).toBe(true);
  });

  it('flags noindex as critical', () => {
    const $ = cheerio.load('<html><head><meta name="robots" content="noindex"></head></html>');
    const result = analyzeMeta($, 'https://example.com/');
    expect(result.issues.some(i => i.severity === 'critical' && i.message.includes('noindex'))).toBe(true);
  });

  it('warns about missing x-default when hreflangs exist', () => {
    const $ = cheerio.load('<html><head><link rel="alternate" hreflang="es" href="/es"></head></html>');
    const result = analyzeMeta($, 'https://example.com/');
    expect(result.issues.some(i => i.message.includes('x-default'))).toBe(true);
  });

  it('reports missing favicon as info issue', () => {
    const $ = cheerio.load('<html><head><title>x</title></head></html>');
    const result = analyzeMeta($, 'https://example.com/');
    expect(result.issues.some(i => i.severity === 'info' && i.message.toLowerCase().includes('favicon'))).toBe(true);
  });
});
