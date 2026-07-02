import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import axios from 'axios';
import ora from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import { loadConfig } from '../config.js';
import { showSectionHeader, K_BLUE, K_PURPLE, klaraGradient } from './banner.js';
import { analyzeCompetitorPage } from '../analyzers/competitor.js';
import { t } from '../i18n.js';
import { sym } from './glyphs.js';

const blue   = chalk.hex(K_BLUE);
const purple = chalk.hex(K_PURPLE);
const K_GREEN = '#22C55E';
const K_AMBER = '#F5A623';

function printRankingTips(rank, results, domain, keyword, serpData) {
  // ── Top 3 competitors ────────────────────────────────────────────
  const top3 = results.slice(0, 3);
  if (top3.length > 0) {
    console.log('\n' + klaraGradient('  ' + t('rankCompetitors')));
    console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(50)));
    top3.forEach((r, i) => {
      const d = extractDomain(r.link ?? '');
      const isMine = d.includes(domain) || domain.includes(d);
      const medal = [sym('🥇'), sym('🥈'), sym('🥉')][i];
      const kwLower = keyword.toLowerCase();
      const titleHasKw = (r.title ?? '').toLowerCase().includes(kwLower);
      const titleStr = (r.title ?? '').substring(0, 50);
      const kwTag = titleHasKw ? chalk.hex(K_GREEN)(` ${sym('✔')} kw`) : chalk.red(` ${sym('✖')} kw`);
      if (isMine) {
        console.log(`  ${medal} ${blue.bold(d.padEnd(26))} ${chalk.hex(K_GREEN)('← tú')}${kwTag}`);
      } else {
        console.log(`  ${medal} ${chalk.white(d.padEnd(26))} ${chalk.gray(titleStr.substring(0, 30))}${kwTag}`);
      }
    });

    // Check if any top-3 title lacks the keyword (insight)
    const kwInTop3 = top3.filter(r => (r.title ?? '').toLowerCase().includes(keyword.toLowerCase())).length;
    if (kwInTop3 === 3) {
      console.log(chalk.gray('\n  → Los 3 primeros incluyen la keyword en el título — tú también deberías.'));
    } else if (kwInTop3 === 0) {
      console.log(chalk.gray('\n  → Ningún top-3 usa la keyword exacta en el título — oportunidad de diferenciarte.'));
    }
  }

  // ── People Also Ask ───────────────────────────────────────────────
  const paa = serpData?.related_questions ?? [];
  if (paa.length > 0) {
    console.log('\n' + klaraGradient('  Preguntas que la gente también busca'));
    console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(50)));
    console.log(chalk.gray('  Responde estas preguntas en tu página para ganar más visibilidad:\n'));
    paa.slice(0, 5).forEach(q => {
      console.log(`  ${blue('?')} ${chalk.white(q.question)}`);
    });
  }

  // ── Related searches ──────────────────────────────────────────────
  const related = serpData?.related_searches ?? [];
  if (related.length > 0) {
    console.log('\n' + klaraGradient('  Búsquedas relacionadas'));
    console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(50)));
    console.log(chalk.gray('  Keywords long-tail para crear contenido adicional:\n'));
    related.slice(0, 6).forEach(r => {
      console.log(`  ${purple('›')} ${chalk.white(r.query)}`);
    });
  }

  // ── Actionable tips per tier ──────────────────────────────────────
  let tips;
  let tierLabel;
  if (!rank) {
    tips = t('rankTipsNotFound');
    tierLabel = chalk.red.bold('  Sin posición en top 100');
  } else if (rank > 10) {
    tips = t('rankTipsPage2');
    tierLabel = chalk.hex(K_AMBER).bold(`  Posición #${rank} — Página ${Math.ceil(rank / 10)}`);
  } else if (rank > 3) {
    tips = t('rankTipsTop10');
    tierLabel = chalk.hex(K_AMBER).bold(`  Posición #${rank} — Primera página`);
  } else {
    tips = t('rankTipsTop3');
    tierLabel = chalk.hex(K_GREEN).bold(`  Posición #${rank} — Top 3`);
  }

  const tipsBody = tips.map((tip, i) => {
    const num = chalk.hex(K_BLUE).bold(`${i + 1}.`);
    return `  ${num} ${chalk.white(tip)}`;
  }).join('\n');

  console.log('\n' + klaraGradient('  ' + t('rankHowToImprove')));
  console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(50)));
  console.log(tierLabel);
  console.log();
  console.log(tipsBody);
  console.log();
}

async function runCompetitiveAnalysis(myUrl, competitors, keyword) {
  const K_GREEN = '#22C55E';
  const K_AMBER = '#F5A623';

  const urls = [myUrl, ...competitors.slice(0, 3).map(r => r.link)];
  const labels = ['TÚ', '#1', '#2', '#3'].slice(0, urls.length);

  const spinner = ora('Analizando páginas de la competencia…').start();

  // Stagger request starts (400ms apart) to avoid hammering third-party sites
  const pages = await Promise.all(
    urls.map((u, i) =>
      new Promise(resolve => setTimeout(resolve, i * 400)).then(() => analyzeCompetitorPage(u, keyword))
    )
  );

  spinner.succeed('Análisis completado');

  const [mine, ...rivals] = pages;
  const all = pages;

  // Warn if the user's page is a client-rendered SPA
  if (mine.ok && mine.isSpa) {
    console.log('\n' + boxen(
      chalk.yellow.bold('  Tu página es una SPA (JavaScript)\n\n') +
      chalk.white('  El contenido se renderiza en el navegador, no en el servidor.\n') +
      chalk.white('  Esta herramienta no puede ejecutar JavaScript, así que los datos\n') +
      chalk.white('  de ') + blue.bold('TU') + chalk.white(' página (palabras, headings, imágenes) no son precisos.\n\n') +
      chalk.gray('  Los datos del top 3 sí son reales — son páginas SSR.\n') +
      chalk.gray('  Para tu página, usa Google Search Console o PageSpeed Insights.'),
      { padding: 1, borderStyle: 'round', borderColor: 'yellow' }
    ));
  }

  console.log('\n' + klaraGradient('  Análisis comparativo'));
  console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(60)));

  // ── Comparison table ────────────────────────────────────────────
  const colW = [22, ...Array(urls.length).fill(12)];
  const table = new Table({
    head: ['', ...labels.map((l, i) => i === 0 ? blue.bold(l) : chalk.gray(l))],
    style: { head: [], border: ['gray'] },
    colWidths: colW,
  });

  function cell(val, good, mine = false) {
    const color = good ? chalk.hex(K_GREEN) : chalk.red;
    return mine ? color.bold(val) : color(val);
  }

  function num(n, best, isMe) {
    const color = n >= best ? chalk.hex(K_GREEN) : n >= best * 0.6 ? chalk.hex(K_AMBER) : chalk.red;
    return isMe ? color.bold(n) : color(n);
  }

  const maxWords  = Math.max(...all.filter(p => p.ok).map(p => p.wordCount));
  const maxH2     = Math.max(...all.filter(p => p.ok).map(p => p.h2Count));
  const maxImages = Math.max(...all.filter(p => p.ok).map(p => p.images));

  const spaPlaceholder = chalk.yellow(`${sym('⚠')} SPA`);

  function row(label, fn) {
    return [chalk.gray(label), ...pages.map((p, i) => {
      if (!p.ok) return chalk.gray('—');
      if (i === 0 && p.isSpa && ['Palabras','Keyword en título','Keyword en H1','H2 con keyword','Headings H2','Imágenes','Densidad keyword'].includes(label)) {
        return spaPlaceholder;
      }
      return fn(p, i === 0);
    })];
  }

  table.push(
    row('Palabras',         (p, m) => num(p.wordCount,  maxWords,  m)),
    row('Keyword en título', (p, m) => cell(p.titleHasKw ? sym('✔') : sym('✖'), p.titleHasKw, m)),
    row('Keyword en H1',    (p, m) => cell(p.h1HasKw    ? sym('✔') : sym('✖'), p.h1HasKw,    m)),
    row('H2 con keyword',   (p, m) => num(p.h2WithKw,  Math.max(...all.filter(x=>x.ok).map(x=>x.h2WithKw)), m)),
    row('Headings H2',      (p, m) => num(p.h2Count,   maxH2,     m)),
    row('Imágenes',         (p, m) => num(p.images,    maxImages, m)),
    row('Densidad keyword', (p, _m) => chalk.gray(p.kwDensity + '%')),
    row('Schema markup',    (p, m) => cell(p.hasSchema ? sym('✔') : sym('✖'), p.hasSchema,   m)),
    row('Open Graph',       (p, m) => cell(p.hasOg     ? sym('✔') : sym('✖'), p.hasOg,       m)),
    row('Velocidad fetch',  (p, m) => {
      if (!p.ok) return chalk.gray('—');
      const ms = p.loadMs;
      const c  = ms < 1000 ? chalk.hex(K_GREEN) : ms < 3000 ? chalk.hex(K_AMBER) : chalk.red;
      return m ? c.bold(ms + 'ms') : c(ms + 'ms');
    }),
  );

  console.log('\n' + table.toString());

  // ── Gap analysis ─────────────────────────────────────────────────
  if (!mine.ok) {
    console.log(chalk.red(`\n  No se pudo analizar tu página: ${mine.error}\n`));
    return;
  }

  const gaps = [];
  const rivalOk = rivals.filter(r => r.ok);
  if (rivalOk.length === 0) return;

  const avgWords  = Math.round(rivalOk.reduce((s, r) => s + r.wordCount, 0) / rivalOk.length);
  const avgH2     = Math.round(rivalOk.reduce((s, r) => s + r.h2Count,   0) / rivalOk.length);
  const avgImages = Math.round(rivalOk.reduce((s, r) => s + r.images,    0) / rivalOk.length);

  // Only compare content metrics if user's page is not a SPA (otherwise data is unreliable)
  if (!mine.isSpa) {
    if (mine.wordCount < avgWords * 0.7) {
      gaps.push(`Tu página tiene ${mine.wordCount} palabras — los rivales tienen ~${avgWords}. Añade más contenido de valor.`);
    }
    if (!mine.titleHasKw && rivalOk.filter(r => r.titleHasKw).length >= 2) {
      gaps.push(`Los rivales incluyen la keyword en el título y tú no. Añádela al principio del title tag.`);
    }
    if (!mine.h1HasKw && rivalOk.filter(r => r.h1HasKw).length >= 2) {
      gaps.push(`Los rivales tienen la keyword en el H1 y tú no. El H1 es la señal on-page más importante.`);
    }
    if (mine.h2Count < avgH2 * 0.6) {
      gaps.push(`Tienes ${mine.h2Count} H2 frente a ~${avgH2} de media. Estructura mejor el contenido con más secciones.`);
    }
    if (mine.h2WithKw === 0 && rivalOk.some(r => r.h2WithKw > 0)) {
      gaps.push(`Los rivales usan la keyword en sus subtítulos H2. Añádela en al menos un H2 relevante.`);
    }
    if (mine.images < avgImages * 0.5 && avgImages > 2) {
      gaps.push(`Tienes ${mine.images} imágenes frente a ~${avgImages} de media. Las imágenes mejoran el engagement y el tiempo en página.`);
    }
  } else {
    gaps.push(`Tu página usa JavaScript para renderizar el contenido (SPA). Google puede tardar más en indexarla — activa SSR o SSG (Next.js, Nuxt, Astro) para mejorar la indexación.`);
  }

  // These work even on SPAs (checked from the initial HTML shell)
  if (!mine.hasSchema && rivalOk.filter(r => r.hasSchema).length >= 2) {
    gaps.push(`Los rivales tienen Schema markup (datos estructurados) y tú no. Añade JSON-LD para mejorar los rich snippets.`);
  }
  if (!mine.hasOg && rivalOk.filter(r => r.hasOg).length >= 2) {
    gaps.push(`Faltan etiquetas Open Graph. Cuando se comparte en redes sociales tu página no tendrá preview atractivo.`);
  }

  if (gaps.length === 0) {
    console.log('\n' + chalk.hex(K_GREEN)(`  ${sym('✔')} Tu página está bien optimizada frente a la competencia.\n`));
  } else {
    console.log('\n' + klaraGradient('  Brechas detectadas vs competencia'));
    console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(60)));
    gaps.forEach((g, i) => {
      console.log(`\n  ${blue.bold((i + 1) + '.')} ${chalk.white(g)}`);
    });
    console.log();
  }
}

export async function rankCheckFlow() {
  showSectionHeader(t('rankHeader'));

  const config = await loadConfig();

  if (!config.serpApiKey) {
    console.log(boxen(
      chalk.yellow.bold(`  ${t('rankNoKey')}\n\n`) +
      chalk.white(`  ${t('rankNoKeyBody')}\n`) +
      chalk.white(`  ${t('rankNoKeyLink')}`) + blue('https://serpapi.com\n\n') +
      chalk.gray(`  ${t('rankNoKeyTip')}`),
      { padding: 1, borderStyle: 'round', borderColor: 'yellow' }
    ));
    console.log();

    const action = await select({
      message: t('rankContinue'),
      choices: [
        { name: t('rankGoSettings'), value: 'settings' },
        { name: t('rankBackMenu'),   value: 'back'     },
      ],
    });

    if (action === 'settings') {
      const { settingsFlow } = await import('./settings-flow.js');
      await settingsFlow();
    }
    return;
  }

  const keyword = await input({
    message: chalk.white(t('rankKeyword')),
    validate: v => v.trim() ? true : t('rankKeywordRequired'),
  });

  const url = await input({
    message: chalk.white(t('rankUrlPrompt')),
    default: config.defaultUrl || undefined,
    validate: v => v.trim() ? true : t('rankUrlRequired'),
  });

  const domain = extractDomain(url);
  const spinner = ora(t('rankSearching', keyword)).start();

  try {
    let response = null;
    // 2 attempts with 30s timeout each
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await axios.get('https://serpapi.com/search', {
          params: { q: keyword, api_key: config.serpApiKey, num: 100, hl: 'es', gl: 'es' },
          timeout: 30000,
        });
        break;
      } catch (err) {
        if (attempt === 2 || err.response) throw err;
        spinner.text = `${t('rankSearching', keyword)} (reintentando…)`;
      }
    }

    spinner.succeed(t('rankFetched'));

    const results = response.data?.organic_results ?? [];
    const position = findPosition(results, domain);

    console.log();

    if (position) {
      const posColor = position.rank <= 3 ? chalk.hex(K_GREEN) : position.rank <= 10 ? chalk.hex(K_AMBER) : chalk.red;
      const borderColor = position.rank <= 3 ? K_GREEN : position.rank <= 10 ? K_AMBER : 'red';
      console.log(boxen(
        chalk.white.bold(`  "${keyword}"\n\n`) +
        `  ${chalk.gray('Posición:')}  ${posColor.bold(`#${position.rank}`)}\n` +
        `  ${chalk.gray('URL:')}       ${blue(position.link)}\n` +
        `  ${chalk.gray('Título:')}    ${chalk.gray(position.title?.substring(0, 60) ?? '')}`,
        { padding: 1, borderStyle: 'round', borderColor }
      ));
    } else {
      console.log(boxen(
        chalk.red.bold(`  ${t('rankNotFound')}\n\n`) +
        chalk.white(`  ${t('rankNotFoundBody', domain, keyword)}`),
        { padding: 1, borderStyle: 'round', borderColor: 'red' }
      ));
    }

    printRankingTips(position?.rank ?? null, results, domain, keyword, response.data);

    // Offer competitive analysis if there are competitors to compare against
    if (results.length >= 1) {
      const myUrl = position?.link ?? (url.startsWith('http') ? url : `https://${url}`);
      const doAnalyze = await select({
        message: chalk.white('¿Analizar tu página vs la competencia?'),
        choices: [
          { name: `${blue('Sí')} — ver qué hace el top 3 mejor que tú`, value: true  },
          { name: chalk.gray('No — volver al menú'),                     value: false },
        ],
      }).catch(() => false);

      if (doAnalyze) {
        await runCompetitiveAnalysis(myUrl, results, keyword);
      }
    }
  } catch (err) {
    spinner.fail(t('rankFailed'));

    const status = err.response?.status;
    if (status === 401 || status === 403) {
      console.log(boxen(
        chalk.red.bold('  Clave SerpAPI inválida\n\n') +
        chalk.white('  Ve a Ajustes y revisa tu clave SerpAPI.'),
        { padding: 1, borderStyle: 'round', borderColor: 'red' }
      ));
    } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      console.log(boxen(
        chalk.yellow.bold('  Timeout — SerpAPI tardó demasiado\n\n') +
        chalk.white('  Posibles causas:\n') +
        chalk.gray('  · Conexión a internet lenta o inestable\n') +
        chalk.gray('  · SerpAPI con alta carga en este momento\n\n') +
        chalk.white('  Prueba de nuevo en unos segundos.'),
        { padding: 1, borderStyle: 'round', borderColor: 'yellow' }
      ));
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.log(boxen(
        chalk.yellow.bold('  Sin conexión a internet\n\n') +
        chalk.white('  Comprueba tu conexión y vuelve a intentarlo.'),
        { padding: 1, borderStyle: 'round', borderColor: 'yellow' }
      ));
    } else {
      console.log(chalk.red(`\n  Error inesperado: ${err.message}\n`));
    }
  }

  await select({
    message: t('rankContinue'),
    choices: [
      { name: t('rankAgain'),   value: 'again' },
      { name: t('rankBackMenu'), value: 'back'  },
    ],
  }).then(action => {
    if (action === 'again') return rankCheckFlow();
  }).catch(() => {});
}

function extractDomain(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function findPosition(results, domain) {
  for (let i = 0; i < results.length; i++) {
    const resultDomain = extractDomain(results[i].link ?? '');
    if (resultDomain.includes(domain) || domain.includes(resultDomain)) {
      return { rank: i + 1, link: results[i].link, title: results[i].title };
    }
  }
  return null;
}
