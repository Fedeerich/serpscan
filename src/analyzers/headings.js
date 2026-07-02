export function analyzeHeadings($) {
  const issues = [];
  const passed = [];

  const h1s = $('h1').map((_, el) => $(el).text().trim()).get();
  const h2s = $('h2').map((_, el) => $(el).text().trim()).get();
  const h3s = $('h3').map((_, el) => $(el).text().trim()).get();

  // H1 checks
  if (h1s.length === 0) {
    issues.push({ severity: 'critical', message: 'No <h1> tag found — every page should have exactly one H1' });
  } else if (h1s.length > 1) {
    issues.push({ severity: 'warning', message: `Multiple <h1> tags found (${h1s.length}) — use only one per page` });
  } else {
    const h1 = h1s[0];
    if (h1.length < 10) {
      issues.push({ severity: 'warning', message: `H1 is very short ("${h1}") — be more descriptive` });
    } else {
      passed.push(`H1 present: "${h1.substring(0, 60)}${h1.length > 60 ? '…' : ''}"` );
    }
  }

  // H2 checks
  if (h2s.length === 0) {
    issues.push({ severity: 'info', message: 'No <h2> tags — consider using them to structure your content' });
  } else {
    passed.push(`${h2s.length} H2 heading(s) found`);
  }

  // Heading hierarchy — check for skipped levels
  const allHeadings = [];
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    allHeadings.push(parseInt(el.tagName.replace('h', ''), 10));
  });

  for (let i = 1; i < allHeadings.length; i++) {
    if (allHeadings[i] - allHeadings[i - 1] > 1) {
      issues.push({
        severity: 'warning',
        message: `Heading hierarchy skips from H${allHeadings[i - 1]} to H${allHeadings[i]} — keep a logical order`,
      });
      break;
    }
  }

  if (!issues.some(i => i.message.includes('hierarchy'))) {
    passed.push('Heading hierarchy is logical');
  }

  const score = computeScore(issues, passed);
  return { score, issues, passed, data: { h1s, h2Count: h2s.length, h3Count: h3s.length } };
}

function computeScore(issues, _passed) {
  const criticals = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const deduction = criticals * 20 + warnings * 10;
  return Math.max(0, 100 - deduction);
}
