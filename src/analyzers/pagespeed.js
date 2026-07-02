import axios from 'axios';

const API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const CORE_VITALS = [
  { key: 'first-contentful-paint',   label: 'FCP', unit: 's'  },
  { key: 'largest-contentful-paint', label: 'LCP', unit: 's'  },
  { key: 'total-blocking-time',      label: 'TBT', unit: 'ms' },
  { key: 'cumulative-layout-shift',  label: 'CLS', unit: ''   },
  { key: 'speed-index',              label: 'SI',  unit: 's'  },
  { key: 'interactive',              label: 'TTI', unit: 's'  },
];

const OPPORTUNITY_KEYS = [
  'render-blocking-resources',
  'uses-optimized-images',
  'uses-webp-images',
  'uses-text-compression',
  'uses-responsive-images',
  'efficient-animated-content',
  'unused-javascript',
  'unused-css-rules',
  'uses-long-cache-ttl',
  'offscreen-images',
];

// Build the query string manually so `category` repeats correctly:
// category=performance&category=accessibility&...
// Axios default serializes arrays as category[0]=... which Google rejects.
function buildQueryString(url, strategy, apiKey) {
  const sp = new URLSearchParams();
  sp.append('url', url);
  sp.append('strategy', strategy);
  sp.append('locale', 'es');        // Spanish titles & descriptions
  CATEGORIES.forEach(c => sp.append('category', c));
  if (apiKey) sp.append('key', apiKey);
  return sp.toString();
}

export async function fetchPageSpeed(url, strategy, apiKey) {
  const qs = buildQueryString(url, strategy, apiKey);
  const response = await axios.get(`${API_URL}?${qs}`, { timeout: 30000 });
  const lhr = response.data.lighthouseResult;

  const categories = {
    performance:   Math.round((lhr.categories.performance?.score          ?? 0) * 100),
    accessibility: Math.round((lhr.categories.accessibility?.score        ?? 0) * 100),
    bestPractices: Math.round((lhr.categories['best-practices']?.score    ?? 0) * 100),
    seo:           Math.round((lhr.categories.seo?.score                  ?? 0) * 100),
  };

  const vitals = CORE_VITALS.map(({ key, label }) => {
    const audit = lhr.audits[key];
    return {
      label,
      displayValue: audit?.displayValue ?? '—',
      score:        audit?.score        ?? null,
    };
  });

  const opportunities = OPPORTUNITY_KEYS
    .map(key => lhr.audits[key])
    .filter(a => a && a.score !== null && a.score < 0.9 && a.details?.type !== 'debugdata')
    .map(a => ({
      title:        a.title,
      description:  a.description?.replace(/\[.*?\]\(.*?\)/g, '').split('.')[0] + '.',
      displayValue: a.displayValue ?? '',
      score:        a.score,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  return { strategy, categories, vitals, opportunities };
}
