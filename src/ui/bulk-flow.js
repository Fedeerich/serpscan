import { input, select } from '@inquirer/prompts';
import { readFile } from 'fs/promises';
import chalk from 'chalk';
import Table from 'cli-table3';
import { analyzeUrl } from '../index.js';
import { addToHistory } from '../config.js';
import { saveBulkSummaryCsv } from '../reporters/csv.js';
import { showSectionHeader, K_BLUE, klaraGradient } from './banner.js';
import { t } from '../i18n.js';
import { sym } from './glyphs.js';

const blue = chalk.hex(K_BLUE);
const K_GREEN = '#22C55E';
const K_AMBER = '#F5A623';

const MAX_URLS = 30;

function scoreColor(score) {
  if (score >= 80) return chalk.hex(K_GREEN).bold(score);
  if (score >= 50) return chalk.hex(K_AMBER).bold(score);
  return chalk.red.bold(score);
}

function parseUrls(content) {
  const urls = content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(u => (u.startsWith('http') ? u : `https://${u}`));
  return [...new Set(urls)];
}

function countBySeverity(report, severity) {
  return Object.values(report.categories)
    .flatMap(c => c.issues ?? [])
    .filter(i => i.severity === severity).length;
}

export async function bulkFlow() {
  showSectionHeader(t('bulkHeader'));

  const path = await input({
    message: chalk.white(t('bulkFilePrompt')),
    validate: v => (v.trim() ? true : t('bulkFileRequired')),
  }).catch(() => null);
  if (!path) return;

  let content;
  try {
    content = await readFile(path.trim(), 'utf8');
  } catch (err) {
    console.log(chalk.red(`\n  ${t('bulkFileError', err.message)}\n`));
    return;
  }

  let urls = parseUrls(content);
  if (urls.length === 0) {
    console.log(chalk.red(`\n  ${t('bulkNoUrls')}\n`));
    return;
  }
  if (urls.length > MAX_URLS) {
    console.log(chalk.yellow(`\n  ${t('bulkCapped', MAX_URLS, urls.length)}`));
    urls = urls.slice(0, MAX_URLS);
  }

  console.log(blue(`\n  ${t('bulkStart', urls.length)}\n`));

  const entries = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(chalk.gray(`  [${i + 1}/${urls.length}] `) + chalk.white(url));
    try {
      const report = await analyzeUrl(url);
      await addToHistory(report);
      entries.push({
        url,
        score: report.score,
        criticals: countBySeverity(report, 'critical'),
        warnings: countBySeverity(report, 'warning'),
      });
    } catch (err) {
      entries.push({ url, score: null, criticals: null, warnings: null, error: err.message });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log('\n' + klaraGradient(`  ${t('bulkSummary')}`));
  console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(60)));

  const table = new Table({
    head: [chalk.gray('URL'), chalk.gray('Score'), chalk.gray('Críticos'), chalk.gray('Avisos')],
    style: { head: [], border: ['gray'] },
    colWidths: [44, 9, 11, 9],
  });

  for (const e of entries) {
    if (e.error) {
      table.push([e.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42), chalk.red('—'), chalk.gray('error'), '']);
    } else {
      table.push([
        e.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42),
        scoreColor(e.score),
        e.criticals > 0 ? chalk.red(e.criticals) : chalk.hex(K_GREEN)(e.criticals),
        e.warnings > 0 ? chalk.hex(K_AMBER)(e.warnings) : chalk.hex(K_GREEN)(e.warnings),
      ]);
    }
  }

  console.log(table.toString());
  console.log();

  const action = await select({
    message: t('bulkContinue'),
    choices: [
      { name: `${blue(sym('💾'))}  ${t('bulkExport')}`, value: 'export' },
      { name: t('bulkBack'), value: 'back' },
    ],
  }).catch(() => 'back');

  if (action === 'export') {
    const filename = await input({
      message: chalk.white(t('seoFilename')),
      default: `bulk-summary-${new Date().toISOString().slice(0, 10)}.csv`,
    }).catch(() => null);
    if (filename) {
      await saveBulkSummaryCsv(entries, filename);
      console.log(chalk.green(t('bulkSaved', filename)));
    }
  }
}
