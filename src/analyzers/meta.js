export function analyzeMeta($, _url) {
  const issues = [];
  const passed = [];

  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? '';
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? '';
  const robots = $('meta[name="robots"]').attr('content')?.trim() ?? '';
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() ?? '';
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() ?? '';
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() ?? '';
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() ?? '';
  const viewport = $('meta[name="viewport"]').attr('content')?.trim() ?? '';
  const lang = $('html').attr('lang')?.trim() ?? '';

  // Title checks
  if (!title) {
    issues.push({ severity: 'critical', message: 'Missing <title> tag' });
  } else if (title.length < 30) {
    issues.push({ severity: 'warning', message: `Title too short (${title.length} chars) — aim for 30–60` });
  } else if (title.length > 60) {
    issues.push({ severity: 'warning', message: `Title too long (${title.length} chars) — may be truncated in SERPs (max 60)` });
  } else {
    passed.push(`Title looks good (${title.length} chars)`);
  }

  // Meta description checks
  if (!metaDesc) {
    issues.push({ severity: 'critical', message: 'Missing meta description' });
  } else if (metaDesc.length < 70) {
    issues.push({ severity: 'warning', message: `Meta description too short (${metaDesc.length} chars) — aim for 70–160` });
  } else if (metaDesc.length > 160) {
    issues.push({ severity: 'warning', message: `Meta description too long (${metaDesc.length} chars) — may be truncated (max 160)` });
  } else {
    passed.push(`Meta description looks good (${metaDesc.length} chars)`);
  }

  // Canonical
  if (!canonical) {
    issues.push({ severity: 'warning', message: 'No canonical URL defined — risk of duplicate content' });
  } else {
    passed.push('Canonical URL present');
  }

  // Robots
  if (robots.includes('noindex')) {
    issues.push({ severity: 'critical', message: 'Page is set to noindex — search engines will not index this page' });
  } else {
    passed.push('Page is indexable (no noindex directive)');
  }

  // Open Graph
  if (!ogTitle) issues.push({ severity: 'info', message: 'Missing og:title — social previews will use the page title' });
  else passed.push('og:title present');

  if (!ogDesc) issues.push({ severity: 'info', message: 'Missing og:description — social previews may look incomplete' });
  else passed.push('og:description present');

  if (!ogImage) issues.push({ severity: 'warning', message: 'Missing og:image — social shares will have no image' });
  else passed.push('og:image present');

  // Twitter card
  if (!twitterCard) issues.push({ severity: 'info', message: 'Missing twitter:card meta tag' });
  else passed.push('Twitter card meta present');

  // Viewport
  if (!viewport) {
    issues.push({ severity: 'critical', message: 'Missing viewport meta tag — page may not be mobile-friendly' });
  } else {
    passed.push('Viewport meta tag present');
  }

  // Language
  if (!lang) {
    issues.push({ severity: 'warning', message: 'Missing lang attribute on <html> — important for accessibility and SEO' });
  } else {
    passed.push(`Language declared: "${lang}"`);
  }

  // hreflang alternates (only meaningful when present — not every site is multilingual)
  const hreflangs = $('link[rel="alternate"][hreflang]').map((_, el) => $(el).attr('hreflang')?.trim()).get();
  if (hreflangs.length > 0) {
    passed.push(`${hreflangs.length} hreflang alternate(s) declared`);
    if (!hreflangs.some(h => h?.toLowerCase() === 'x-default')) {
      issues.push({ severity: 'info', message: 'hreflang alternates found but no x-default — add one as fallback for unmatched languages' });
    }
  }

  // Favicon
  const hasFavicon = $('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').length > 0;
  if (!hasFavicon) {
    issues.push({ severity: 'info', message: 'No favicon <link> tag found — favicons appear in SERPs and browser tabs' });
  } else {
    passed.push('Favicon declared');
  }

  const score = computeScore(issues, passed);

  return {
    score,
    issues,
    passed,
    data: { title, metaDesc, canonical, robots, ogTitle, ogDesc, ogImage, twitterCard, viewport, lang, hreflangs, hasFavicon },
  };
}

function computeScore(issues, passed) {
  const criticals = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const total = issues.length + passed.length;
  if (total === 0) return 100;
  const deduction = criticals * 15 + warnings * 7;
  return Math.max(0, Math.min(100, 100 - deduction));
}
