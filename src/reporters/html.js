import { writeFile } from 'fs/promises';

const K_BLUE = '#0947F8';
const K_PURPLE = '#6300C4';

const CAT_LABELS = {
  meta: 'Meta Tags y Social',
  headings: 'Encabezados',
  images: 'Imágenes',
  links: 'Enlaces',
  performance: 'Rendimiento',
  structuredData: 'Datos Estructurados',
  robots: 'Robots y Sitemap',
};

const SEVERITY = {
  critical: { label: 'Crítico', color: '#DC2626', icon: '✖' },
  warning:  { label: 'Aviso',   color: '#F5A623', icon: '⚠' },
  info:     { label: 'Info',    color: K_BLUE,    icon: 'ℹ' },
};

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scoreColor(score) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F5A623';
  return '#DC2626';
}

function categorySection(key, cat) {
  const issues = (cat.issues ?? []).map(i => {
    const sev = SEVERITY[i.severity] ?? SEVERITY.info;
    return `<li><span class="sev" style="color:${sev.color}">${sev.icon} ${sev.label}</span> ${escapeHtml(i.message)}</li>`;
  }).join('\n');

  const passed = (cat.passed ?? []).map(p =>
    `<li><span class="sev" style="color:#22C55E">✔</span> ${escapeHtml(p)}</li>`
  ).join('\n');

  return `
  <section class="category">
    <div class="cat-header">
      <h2>${escapeHtml(CAT_LABELS[key] ?? key)}</h2>
      <div class="cat-score" style="color:${scoreColor(cat.score)}">${cat.score}<small>/100</small></div>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${cat.score}%;background:${scoreColor(cat.score)}"></div></div>
    ${issues ? `<ul class="issues">${issues}</ul>` : ''}
    ${passed ? `<details><summary>Qué funciona bien (${(cat.passed ?? []).length})</summary><ul class="issues">${passed}</ul></details>` : ''}
  </section>`;
}

export function renderHtmlReport(report) {
  const date = new Date(report.analyzedAt).toLocaleString('es-ES');
  const sections = Object.entries(report.categories).map(([k, c]) => categorySection(k, c)).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe SEO — ${escapeHtml(report.url)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background: #F6F7FB; color: #1a1a2e; line-height: 1.55; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 60px; }
  header.hero { background: linear-gradient(90deg, ${K_BLUE}, ${K_PURPLE}); color: #fff; border-radius: 14px; padding: 28px 32px; margin-bottom: 28px; }
  header.hero h1 { font-size: 1.5rem; letter-spacing: .5px; }
  header.hero .meta { margin-top: 10px; font-size: .9rem; opacity: .9; word-break: break-all; }
  .score-card { display: flex; align-items: center; gap: 24px; background: #fff; border-radius: 14px; padding: 24px 32px; margin-bottom: 28px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  .score-ring { width: 110px; height: 110px; border-radius: 50%; display: grid; place-items: center; font-size: 2rem; font-weight: 700; flex-shrink: 0; }
  .score-ring small { font-size: .85rem; font-weight: 400; opacity: .6; }
  .score-note { font-size: .95rem; color: #444; }
  section.category { background: #fff; border-radius: 14px; padding: 22px 28px; margin-bottom: 18px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  .cat-header { display: flex; justify-content: space-between; align-items: baseline; }
  .cat-header h2 { font-size: 1.05rem; }
  .cat-score { font-size: 1.3rem; font-weight: 700; }
  .cat-score small { font-size: .8rem; font-weight: 400; opacity: .5; }
  .bar { height: 8px; background: #ECEEF4; border-radius: 4px; margin: 10px 0 14px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  ul.issues { list-style: none; }
  ul.issues li { padding: 5px 0; font-size: .92rem; border-bottom: 1px solid #F0F1F6; }
  ul.issues li:last-child { border-bottom: none; }
  .sev { font-weight: 600; font-size: .82rem; margin-right: 6px; white-space: nowrap; }
  details { margin-top: 10px; }
  details summary { cursor: pointer; font-size: .88rem; color: #666; }
  footer { text-align: center; margin-top: 36px; font-size: .85rem; color: #888; }
  footer a { color: ${K_BLUE}; text-decoration: none; }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <h1>Informe SEO — SerpScan</h1>
    <div class="meta">
      ${escapeHtml(report.url)}<br>
      ${escapeHtml(date)} · HTTP ${report.statusCode} · ${report.responseTime}ms
    </div>
  </header>

  <div class="score-card">
    <div class="score-ring" style="background: conic-gradient(${scoreColor(report.score)} ${report.score * 3.6}deg, #ECEEF4 0); ">
      <div style="background:#fff;width:86px;height:86px;border-radius:50%;display:grid;place-items:center;color:${scoreColor(report.score)}">${report.score}<small>/100</small></div>
    </div>
    <div class="score-note">
      <strong>Puntuación SEO global.</strong><br>
      Ponderada por categoría: meta (25%), rendimiento (20%), encabezados (15%),
      imágenes, enlaces, datos estructurados y robots/sitemap (10% cada una).
    </div>
  </div>

  ${sections}

  <footer>
    Generado con SerpScan · Creado por <a href="https://www.linkedin.com/in/marcos-gongora-carriedo/">Carriedo</a>
    · Patrocinador: <a href="https://klara-automation.com">Klara Automation</a>
  </footer>
</div>
</body>
</html>`;
}

export async function saveHtmlReport(report, outputPath) {
  await writeFile(outputPath, renderHtmlReport(report), 'utf8');
}
