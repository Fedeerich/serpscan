import { writeFile } from 'fs/promises';

function esc(value) {
  const s = String(value ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function saveCsvReport(report, outputPath) {
  const rows = [['url', 'category', 'type', 'severity', 'message', 'category_score']];

  for (const [key, cat] of Object.entries(report.categories)) {
    for (const issue of cat.issues ?? []) {
      rows.push([report.url, key, 'issue', issue.severity, issue.message, cat.score]);
    }
    for (const p of cat.passed ?? []) {
      rows.push([report.url, key, 'ok', '', p, cat.score]);
    }
  }

  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  // BOM so Excel opens it with correct UTF-8 encoding
  await writeFile(outputPath, '\uFEFF' + csv, 'utf8');
}

export async function saveBulkSummaryCsv(entries, outputPath) {
  const rows = [['url', 'score', 'critical_issues', 'warnings', 'error']];
  for (const e of entries) {
    rows.push([e.url, e.score ?? '', e.criticals ?? '', e.warnings ?? '', e.error ?? '']);
  }
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  await writeFile(outputPath, '\uFEFF' + csv, 'utf8');
}
