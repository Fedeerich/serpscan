export function analyzePerformance(html, responseTime) {
  const issues = [];
  const passed = [];

  const htmlSize = Buffer.byteLength(html, 'utf8');
  const htmlSizeKb = Math.round(htmlSize / 1024);

  // Response time
  if (responseTime > 3000) {
    issues.push({ severity: 'critical', message: `Slow server response: ${responseTime}ms — aim for under 600ms (TTFB)` });
  } else if (responseTime > 1500) {
    issues.push({ severity: 'warning', message: `Server response time is ${responseTime}ms — aim for under 600ms (TTFB)` });
  } else {
    passed.push(`Fast server response: ${responseTime}ms`);
  }

  // HTML size
  if (htmlSizeKb > 100) {
    issues.push({ severity: 'warning', message: `HTML document is large (${htmlSizeKb}KB) — aim for under 100KB` });
  } else {
    passed.push(`HTML size is reasonable (${htmlSizeKb}KB)`);
  }

  // Check for render-blocking resources in <head>
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? '';
  const blockingScripts = (headMatch.match(/<script(?![^>]*\b(defer|async)\b)[^>]*src=/gi) ?? []).length;
  if (blockingScripts > 0) {
    issues.push({
      severity: 'warning',
      message: `${blockingScripts} render-blocking <script> tag(s) in <head> without defer/async`,
    });
  } else {
    passed.push('No render-blocking scripts detected in <head>');
  }

  // Inline styles (large amounts can slow parsing)
  const inlineStyles = (html.match(/<style[\s\S]*?<\/style>/gi) ?? []).length;
  if (inlineStyles > 3) {
    issues.push({ severity: 'info', message: `${inlineStyles} inline <style> blocks — consider consolidating into external stylesheets` });
  }

  // Check for HTTPS in resource URLs (mixed content hint)
  const httpResources = (html.match(/(?:src|href)="http:\/\//gi) ?? []).length;
  if (httpResources > 0) {
    issues.push({ severity: 'critical', message: `${httpResources} resource(s) loaded over HTTP (mixed content) — use HTTPS for all assets` });
  } else {
    passed.push('No mixed content detected');
  }

  const score = computeScore(issues);
  return { score, issues, passed, data: { responseTime, htmlSizeKb, blockingScripts } };
}

function computeScore(issues) {
  const criticals = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const deduction = criticals * 20 + warnings * 10;
  return Math.max(0, 100 - deduction);
}
