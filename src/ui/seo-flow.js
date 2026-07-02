import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { analyzeUrl } from '../index.js';
import { printReport } from '../reporters/console.js';
import { saveJsonReport } from '../reporters/json.js';
import { saveCsvReport } from '../reporters/csv.js';
import { saveHtmlReport } from '../reporters/html.js';
import { addToHistory, loadConfig } from '../config.js';
import { showSectionHeader, K_BLUE } from './banner.js';
import { t } from '../i18n.js';

const blue = chalk.hex(K_BLUE);

function formatSubpageChoice(url, baseUrl) {
  try {
    const base    = new URL(baseUrl);
    const parsed  = new URL(url);
    const path    = parsed.pathname + (parsed.search || '');
    const display = path.length > 60 ? path.slice(0, 58) + '…' : path;
    return { name: `${chalk.gray(base.hostname)}${blue(display)}`, short: display, value: url };
  } catch {
    return { name: url, short: url, value: url };
  }
}

async function pickSubpage(internalLinks, currentUrl) {
  if (internalLinks.length === 0) return null;

  // Deduplicate and exclude the current page itself
  const unique = [...new Set(internalLinks)]
    .filter(u => u !== currentUrl && u !== currentUrl + '/')
    .sort();

  if (unique.length === 0) return null;

  const choices = [
    ...unique.slice(0, 20).map(u => formatSubpageChoice(u, currentUrl)),
    { name: chalk.gray('← Volver al menú'), short: 'Volver', value: '__back__' },
  ];

  const chosen = await select({
    message: chalk.white('¿Qué subpágina quieres analizar?'),
    choices,
    pageSize: 12,
  }).catch(() => '__back__');

  return chosen === '__back__' ? null : chosen;
}

async function runAnalysis(url) {
  try {
    const report = await analyzeUrl(url);
    printReport(report);
    await addToHistory(report);

    const hasSubpages = report.internalLinks && report.internalLinks.length > 0;

    const choices = [
      { name: `${chalk.hex('#22C55E')('✔')}  ${t('seoDone')}`,    value: 'done'     },
      { name: `${blue('💾')}  ${t('seoSaveReport')}`,              value: 'save'     },
      ...(hasSubpages ? [{ name: `${blue('📄')}  Analizar una subpágina (${report.internalLinks.length} encontradas)`, value: 'subpage' }] : []),
      { name: `${blue('🔄')}  ${t('seoAgain')}`,                   value: 'again'    },
    ];

    const action = await select({
      message: chalk.white(t('seoAfterReport')),
      choices,
    }).catch(() => 'done');

    if (action === 'save') {
      const format = await select({
        message: chalk.white(t('seoFormatPrompt')),
        choices: [
          { name: `HTML  ${chalk.gray(t('seoFormatHtmlDesc'))}`, value: 'html' },
          { name: `CSV   ${chalk.gray(t('seoFormatCsvDesc'))}`,  value: 'csv'  },
          { name: `JSON  ${chalk.gray(t('seoFormatJsonDesc'))}`, value: 'json' },
        ],
      }).catch(() => null);

      if (format) {
        const filename = await input({
          message: chalk.white(t('seoFilename')),
          default: `seo-report-${new Date().toISOString().slice(0, 10)}.${format}`,
        });
        if (format === 'json')      await saveJsonReport(report, filename);
        else if (format === 'csv')  await saveCsvReport(report, filename);
        else                        await saveHtmlReport(report, filename);
        console.log(chalk.green(t('seoSaved', filename)));
      }

    } else if (action === 'subpage') {
      const subUrl = await pickSubpage(report.internalLinks, url);
      if (subUrl) {
        console.log(blue(`\n  ▸ Analizando ${subUrl}\n`));
        await runAnalysis(subUrl);
      }

    } else if (action === 'again') {
      return false; // signal to re-ask for URL
    }

    return true;
  } catch (err) {
    console.log(chalk.red(t('seoError', err.message)));
    const retry = await select({
      message: t('seoContinue'),
      choices: [
        { name: t('seoRetry'), value: 'retry' },
        { name: t('seoBack'),  value: 'back'  },
      ],
    }).catch(() => 'back');
    return retry !== 'retry';
  }
}

export async function seoAuditFlow() {
  showSectionHeader(t('seoHeader'));

  const config = await loadConfig();

  const url = await input({
    message: chalk.white(t('seoUrlPrompt')),
    default: config.defaultUrl || undefined,
    validate: (v) => v.trim() ? true : t('seoUrlRequired'),
  });

  const normalized = url.startsWith('http') ? url : `https://${url}`;

  const done = await runAnalysis(normalized);
  if (!done) return seoAuditFlow();
}
