import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; KlaraSEO/1.0)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

export async function analyzeCompetitorPage(url, keyword) {
  const kw = keyword.toLowerCase();

  try {
    const start = Date.now();
    const res = await axios.get(url.startsWith('http') ? url : `https://${url}`, {
      timeout: 12000,
      headers: HEADERS,
      maxRedirects: 5,
    });
    const ms = Date.now() - start;
    const $ = cheerio.load(res.data);

    // Remove non-content nodes
    $('script, style, noscript, header, footer, nav, aside, [aria-hidden="true"]').remove();

    const title      = $('title').first().text().trim();
    const metaDesc   = $('meta[name="description"]').attr('content')?.trim() ?? '';
    const h1         = $('h1').first().text().trim();
    const h2s        = $('h2').map((_, el) => $(el).text().trim()).get();
    const h3s        = $('h3').map((_, el) => $(el).text().trim()).get();
    const images     = $('img').length;
    const imgAlt     = $('img[alt]').length;
    const hasSchema  = $('script[type="application/ld+json"]').length > 0;
    const hasOg      = $('meta[property^="og:"]').length > 0;
    const canonical  = $('link[rel="canonical"]').attr('href')?.trim() ?? '';
    const lang       = $('html').attr('lang')?.trim() ?? '';

    // Detect JavaScript-rendered SPA before removing scripts
    const rootSelectors = ['#root', '#app', '#__next', '#gatsby-focus-wrapper', '[data-reactroot]'];
    const looksLikeSpa  = rootSelectors.some(sel => $(sel).length > 0);

    // Word count from body text
    const bodyText   = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount  = bodyText.split(' ').filter(w => w.length > 2).length;

    // A page with a SPA root but fewer than 50 words is almost certainly client-rendered
    const isSpa = looksLikeSpa && wordCount < 50;

    // Keyword density
    const kwOccurrences = wordCount > 0
      ? (bodyText.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length
      : 0;
    const kwDensity = wordCount > 0 ? ((kwOccurrences / wordCount) * 100).toFixed(1) : '0';

    return {
      url,
      ok: true,
      isSpa,
      loadMs: ms,
      title,
      titleLen: title.length,
      titleHasKw: title.toLowerCase().includes(kw),
      metaDesc,
      metaDescLen: metaDesc.length,
      metaDescHasKw: metaDesc.toLowerCase().includes(kw),
      h1,
      h1HasKw: h1.toLowerCase().includes(kw),
      h2Count: h2s.length,
      h3Count: h3s.length,
      h2WithKw: h2s.filter(h => h.toLowerCase().includes(kw)).length,
      wordCount,
      kwOccurrences,
      kwDensity,
      images,
      imgAlt,
      hasSchema,
      hasOg,
      canonical: !!canonical,
      lang,
    };
  } catch (err) {
    return { url, ok: false, error: err.code ?? err.message };
  }
}
