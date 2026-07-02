export function analyzeStructuredData($) {
  const issues = [];
  const passed = [];
  const schemas = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html() ?? '';
    try {
      const parsed = JSON.parse(raw);
      const type = parsed['@type'] ?? (Array.isArray(parsed) ? parsed.map(p => p['@type']).join(', ') : 'Unknown');
      schemas.push(type);
    } catch {
      issues.push({ severity: 'warning', message: 'Found invalid JSON-LD structured data — fix the syntax' });
    }
  });

  if (schemas.length === 0) {
    issues.push({
      severity: 'warning',
      message: 'No structured data (JSON-LD) found — add Schema.org markup to enable rich results in Google',
    });
  } else {
    passed.push(`${schemas.length} structured data block(s) found: ${schemas.join(', ')}`);
  }

  // Check for microdata as a fallback signal
  const microdataItems = $('[itemscope]').length;
  if (microdataItems > 0) {
    passed.push(`${microdataItems} microdata item(s) found (itemscope)`);
  }

  const score = computeScore(issues, passed);
  return { score, issues, passed, data: { schemas, microdataItems } };
}

function computeScore(issues, _passed) {
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const deduction = warnings * 15;
  return Math.max(0, 100 - deduction);
}
