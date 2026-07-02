import { URL } from 'url';
import axios from 'axios';

const BROKEN_CHECK_SAMPLE = 10;
const BROKEN_CHECK_CONCURRENCY = 5;

async function checkBrokenLinks(urls) {
  const sample = urls.slice(0, BROKEN_CHECK_SAMPLE);
  const broken = [];

  for (let i = 0; i < sample.length; i += BROKEN_CHECK_CONCURRENCY) {
    const batch = sample.slice(i, i + BROKEN_CHECK_CONCURRENCY);
    const results = await Promise.all(batch.map(async (u) => {
      try {
        const res = await axios.head(u, {
          timeout: 5000,
          maxRedirects: 5,
          validateStatus: () => true,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KlaraSEO/1.0)' },
        });
        // Some servers reject HEAD — don't count that as broken
        if (res.status === 405 || res.status === 501) return null;
        return res.status >= 400 ? { url: u, status: res.status } : null;
      } catch {
        return { url: u, status: null };
      }
    }));
    broken.push(...results.filter(Boolean));
  }

  return broken;
}

export async function analyzeLinks($, pageUrl, { checkBroken = false } = {}) {
  const issues = [];
  const passed = [];

  const base = new URL(pageUrl);
  const internal = [];
  const external = [];
  const nofollow = [];
  const missingText = [];

  const internalUrls = new Set();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() ?? '';
    const text = $(el).text().trim();
    const rel = $(el).attr('rel') ?? '';

    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

    if (!text) missingText.push(href);
    if (rel.includes('nofollow')) nofollow.push(href);

    try {
      const resolved = new URL(href, base);
      // Strip fragment and normalize
      resolved.hash = '';
      if (resolved.hostname === base.hostname) {
        internal.push(href);
        internalUrls.add(resolved.href);
      } else {
        external.push(href);
      }
    } catch {
      // malformed href, skip
    }
  });

  if (internal.length === 0) {
    issues.push({ severity: 'warning', message: 'No internal links found — internal linking helps distribute PageRank' });
  } else {
    passed.push(`${internal.length} internal link(s) found`);
  }

  if (external.length > 0) {
    passed.push(`${external.length} external link(s) found`);
  }

  if (missingText.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${missingText.length} link(s) have no anchor text — always add descriptive text to links`,
    });
  } else {
    passed.push('All links have anchor text');
  }

  if (external.length > 0 && nofollow.length === external.length) {
    issues.push({ severity: 'info', message: 'All external links are nofollow — verify this is intentional' });
  }

  let broken = [];
  if (checkBroken && internalUrls.size > 0) {
    broken = await checkBrokenLinks([...internalUrls]);
    const checked = Math.min(internalUrls.size, BROKEN_CHECK_SAMPLE);
    if (broken.length > 0) {
      const list = broken.slice(0, 3).map(b => `${b.url}${b.status ? ` (HTTP ${b.status})` : ' (unreachable)'}`).join(', ');
      issues.push({
        severity: 'critical',
        message: `${broken.length} broken internal link(s) found (checked ${checked}): ${list}`,
      });
    } else {
      passed.push(`No broken internal links (checked ${checked})`);
    }
  }

  const score = computeScore(issues, passed);
  return {
    score,
    issues,
    passed,
    data: { internal: internal.length, external: external.length, nofollow: nofollow.length, missingText: missingText.length, broken: broken.length, internalUrls: [...internalUrls] },
  };
}

function computeScore(issues, _passed) {
  const criticals = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const deduction = criticals * 15 + warnings * 8;
  return Math.max(0, 100 - deduction);
}
