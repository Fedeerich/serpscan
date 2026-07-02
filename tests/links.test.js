import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { analyzeLinks } from '../src/analyzers/links.js';

const PAGE = 'https://example.com/page';

describe('analyzeLinks', () => {
  it('separates internal and external links', async () => {
    const $ = cheerio.load(`
      <a href="/about">Sobre nosotros</a>
      <a href="https://example.com/contact">Contacto</a>
      <a href="https://other.com">Externo</a>
    `);
    const result = await analyzeLinks($, PAGE);
    expect(result.data.internal).toBe(2);
    expect(result.data.external).toBe(1);
  });

  it('ignores anchors, javascript: and mailto: links', async () => {
    const $ = cheerio.load(`
      <a href="#section">Ancla</a>
      <a href="javascript:void(0)">JS</a>
      <a href="mailto:a@b.com">Mail</a>
    `);
    const result = await analyzeLinks($, PAGE);
    expect(result.data.internal).toBe(0);
    expect(result.data.external).toBe(0);
  });

  it('warns when there are no internal links', async () => {
    const $ = cheerio.load('<a href="https://other.com">Externo</a>');
    const result = await analyzeLinks($, PAGE);
    expect(result.issues.some(i => i.message.includes('internal'))).toBe(true);
  });

  it('flags links without anchor text', async () => {
    const $ = cheerio.load('<a href="/x"></a><a href="/y">Texto</a>');
    const result = await analyzeLinks($, PAGE);
    expect(result.issues.some(i => i.message.includes('anchor text'))).toBe(true);
  });

  it('does not perform network checks unless checkBroken is enabled', async () => {
    const $ = cheerio.load('<a href="/a">A</a>');
    const result = await analyzeLinks($, PAGE);
    expect(result.data.broken).toBe(0);
  });
});
