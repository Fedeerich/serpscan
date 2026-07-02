export function analyzeImages($) {
  const issues = [];
  const passed = [];

  const images = $('img').map((_, el) => ({
    src: $(el).attr('src') ?? '',
    alt: $(el).attr('alt'),
    loading: $(el).attr('loading') ?? '',
    width: $(el).attr('width') ?? '',
    height: $(el).attr('height') ?? '',
  })).get();

  if (images.length === 0) {
    passed.push('No images found on the page');
    return { score: 100, issues, passed, data: { total: 0 } };
  }

  const missingAlt = images.filter(img => img.alt === undefined);
  const emptyAlt = images.filter(img => img.alt === '');
  const missingDimensions = images.filter(img => !img.width || !img.height);
  const noLazyLoad = images.filter(img => img.loading !== 'lazy');
  const nonWebp = images.filter(img => img.src && !img.src.includes('.webp') && !img.src.includes('.avif'));

  if (missingAlt.length > 0) {
    issues.push({
      severity: 'critical',
      message: `${missingAlt.length} image(s) missing alt attribute — required for accessibility and SEO`,
    });
  } else {
    passed.push('All images have alt attributes');
  }

  if (emptyAlt.length > 0) {
    passed.push(`${emptyAlt.length} decorative image(s) with empty alt (correct for decorative images)`);
  }

  if (missingDimensions.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${missingDimensions.length} image(s) missing width/height attributes — causes layout shift (CLS)`,
    });
  } else {
    passed.push('All images have width and height attributes');
  }

  if (noLazyLoad.length > 3) {
    issues.push({
      severity: 'info',
      message: `${noLazyLoad.length} images lack loading="lazy" — consider lazy loading off-screen images`,
    });
  } else {
    passed.push('Images use lazy loading');
  }

  if (nonWebp.length > 0) {
    issues.push({
      severity: 'info',
      message: `${nonWebp.length} image(s) are not in WebP/AVIF format — modern formats improve load speed`,
    });
  }

  const score = computeScore(issues, passed, images.length);
  return { score, issues, passed, data: { total: images.length, missingAlt: missingAlt.length } };
}

function computeScore(issues, _passed, _total) {
  const criticals = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const deduction = criticals * 20 + warnings * 10;
  return Math.max(0, 100 - deduction);
}
