import axios from 'axios';
import * as cheerio from 'cheerio';
import ora from 'ora';
import { analyzeMeta } from './analyzers/meta.js';
import { analyzeHeadings } from './analyzers/headings.js';
import { analyzeImages } from './analyzers/images.js';
import { analyzeLinks } from './analyzers/links.js';
import { analyzePerformance } from './analyzers/performance.js';
import { analyzeStructuredData } from './analyzers/structured-data.js';
import { analyzeRobots } from './analyzers/robots.js';
import { calculateScore } from './score.js';
import { getCachedReport, setCachedReport } from './cache.js';

export async function analyzeUrl(url, { useCache = true } = {}) {
  if (useCache) {
    const cached = await getCachedReport(url);
    if (cached) {
      ora().info(`Using cached result for ${url} (less than 10 min old)`);
      return { ...cached, fromCache: true };
    }
  }

  const spinner = ora(`Fetching ${url}`).start();

  let html, responseTime, statusCode;

  try {
    const start = Date.now();
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KlaraSEO/1.0; +https://klara.ai)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
    });
    responseTime = Date.now() - start;
    statusCode = response.status;
    html = response.data;
    spinner.succeed(`Fetched in ${responseTime}ms (HTTP ${statusCode})`);
  } catch (err) {
    spinner.fail(`Failed to fetch URL`);
    throw new Error(`Could not fetch ${url}: ${err.message}`, { cause: err });
  }

  const $ = cheerio.load(html);

  spinner.start('Running SEO checks...');

  const [meta, headings, images, links, performance, structuredData, robots] = await Promise.all([
    analyzeMeta($, url),
    analyzeHeadings($),
    analyzeImages($),
    analyzeLinks($, url, { checkBroken: true }),
    analyzePerformance(html, responseTime),
    analyzeStructuredData($),
    analyzeRobots(url),
  ]);

  spinner.succeed('Analysis complete');

  const categories = { meta, headings, images, links, performance, structuredData, robots };
  const score = calculateScore(categories);

  const report = {
    url,
    analyzedAt: new Date().toISOString(),
    statusCode,
    responseTime,
    score,
    categories,
    internalLinks: links.data.internalUrls ?? [],
  };

  await setCachedReport(url, report);

  return report;
}
