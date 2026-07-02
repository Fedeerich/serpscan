import axios from 'axios';
import robotsParser from 'robots-parser';

const FETCH_OPTS = {
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KlaraSEO/1.0; +https://klara.ai)' },
  validateStatus: () => true,
};

async function fetchRobotsTxt(origin) {
  try {
    const res = await axios.get(`${origin}/robots.txt`, { ...FETCH_OPTS, responseType: 'text' });
    if (res.status === 200 && typeof res.data === 'string') return res.data;
    return null;
  } catch {
    return null;
  }
}

async function sitemapResponds(sitemapUrl) {
  try {
    const res = await axios.head(sitemapUrl, FETCH_OPTS);
    if (res.status === 405 || res.status === 501) {
      // Server rejects HEAD — retry with GET
      const res2 = await axios.get(sitemapUrl, { ...FETCH_OPTS, maxContentLength: 512 * 1024 });
      return res2.status >= 200 && res2.status < 400;
    }
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

export async function analyzeRobots(url) {
  const issues = [];
  const passed = [];

  const origin = new URL(url).origin;
  const robotsUrl = `${origin}/robots.txt`;
  const robotsTxt = await fetchRobotsTxt(origin);

  let declaredSitemaps = [];
  let blocked = false;

  if (robotsTxt === null) {
    issues.push({
      severity: 'info',
      message: 'No robots.txt found — not required, but recommended to guide crawlers and declare your sitemap',
    });
  } else {
    passed.push('robots.txt is present');

    const robots = robotsParser(robotsUrl, robotsTxt);
    blocked = robots.isAllowed(url, 'Googlebot') === false;

    if (blocked) {
      issues.push({
        severity: 'critical',
        message: 'This URL is blocked by robots.txt for Googlebot — search engines cannot crawl it',
      });
    } else {
      passed.push('URL is crawlable (not blocked by robots.txt)');
    }

    declaredSitemaps = robots.getSitemaps();
  }

  // Sitemap: prefer the one declared in robots.txt, fall back to /sitemap.xml
  let sitemapUrl = declaredSitemaps[0] ?? null;
  let sitemapOk;

  if (sitemapUrl) {
    sitemapOk = await sitemapResponds(sitemapUrl);
    if (sitemapOk) {
      passed.push(`Sitemap declared in robots.txt and reachable (${sitemapUrl})`);
    } else {
      issues.push({
        severity: 'warning',
        message: `Sitemap declared in robots.txt but not reachable: ${sitemapUrl}`,
      });
    }
  } else {
    sitemapUrl = `${origin}/sitemap.xml`;
    sitemapOk = await sitemapResponds(sitemapUrl);
    if (sitemapOk) {
      passed.push('sitemap.xml found at the default location');
      issues.push({
        severity: 'info',
        message: 'Sitemap exists but is not declared in robots.txt — add a "Sitemap:" line so crawlers find it faster',
      });
    } else {
      issues.push({
        severity: 'warning',
        message: 'No sitemap found — create a sitemap.xml and declare it in robots.txt to help search engines index your site',
      });
    }
  }

  const score = computeScore(issues);
  return {
    score,
    issues,
    passed,
    data: { hasRobotsTxt: robotsTxt !== null, blocked, sitemapUrl: sitemapOk ? sitemapUrl : null, declaredSitemaps },
  };
}

function computeScore(issues) {
  const criticals = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const deduction = criticals * 40 + warnings * 15;
  return Math.max(0, 100 - deduction);
}
