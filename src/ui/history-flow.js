import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { loadHistory } from '../config.js';
import { showSectionHeader, K_BLUE, klaraGradient } from './banner.js';
import { t } from '../i18n.js';

const blue   = chalk.hex(K_BLUE);
const K_GREEN = '#22C55E';
const K_AMBER = '#F5A623';

function scoreColor(score) {
  if (score >= 80) return chalk.hex(K_GREEN).bold(score);
  if (score >= 50) return chalk.hex(K_AMBER).bold(score);
  return chalk.red.bold(score);
}

function scoreBar(score, width = 12) {
  const filled = Math.round((score / 100) * width);
  const empty  = width - filled;
  const color  = score >= 80 ? chalk.hex(K_GREEN) : score >= 50 ? chalk.hex(K_AMBER) : chalk.red;
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function printRecentSummary(history) {
  const recent = history.slice(0, 3);

  console.log('\n' + klaraGradient('  Últimos análisis'));
  console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(50)));

  for (const entry of recent) {
    const url   = entry.url.replace(/^https?:\/\/(www\.)?/, '');
    const date  = new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const score = entry.score ?? 0;

    console.log(
      `  ${scoreBar(score)}  ${scoreColor(score)}/100  ` +
      `${chalk.white(url.slice(0, 34).padEnd(34))}  ${chalk.gray(date)}`
    );
  }
  console.log();
}

export async function historyFlow() {
  showSectionHeader(t('historyHeader'));

  const history = await loadHistory();

  if (history.length === 0) {
    console.log(boxen(
      chalk.gray('  Sin análisis guardados aún.\n') +
      chalk.gray('  Realiza una ') + blue('Auditoría SEO') + chalk.gray(' para empezar.'),
      { padding: 1, borderStyle: 'round', borderColor: 'gray' }
    ));
    console.log();
    await select({
      message: t('historyContinue'),
      choices: [{ name: t('historyBack'), value: 'back' }],
    }).catch(() => {});
    return;
  }

  // Recent summary at the top
  printRecentSummary(history);

  // Full history table
  console.log(chalk.gray('  ' + '─'.repeat(50)));
  const table = new Table({
    head: [chalk.gray('#'), chalk.gray('URL'), chalk.gray('Score'), chalk.gray('Fecha')],
    style: { head: [], border: ['gray'] },
    colWidths: [4, 44, 9, 14],
  });

  history.forEach((h, i) => {
    const url  = h.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42);
    const date = new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    table.push([
      chalk.gray(i + 1),
      i < 3 ? blue(url) : url,
      scoreColor(h.score ?? 0),
      chalk.gray(date),
    ]);
  });

  console.log(table.toString());
  console.log();

  const choices = [
    ...history.map((h, i) => ({
      name:  `${i < 3 ? blue('#' + (i + 1)) : chalk.gray('#' + (i + 1))}  ${h.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48)}`,
      short: h.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40),
      value: h.url,
    })),
    { name: t('historyBack'), short: 'Menú', value: '__back__' },
  ];

  const chosen = await select({
    message: chalk.white(t('historyReanalyze')),
    choices,
    pageSize: 10,
  }).catch(() => '__back__');

  if (chosen && chosen !== '__back__') {
    console.log(blue(`\n  ▸ Re-analizando ${chosen.replace(/^https?:\/\/(www\.)?/, '')}\n`));
    const { analyzeUrl } = await import('../index.js');
    const { printReport } = await import('../reporters/console.js');
    const { addToHistory } = await import('../config.js');
    try {
      const report = await analyzeUrl(chosen);
      printReport(report);
      await addToHistory(report);
    } catch (err) {
      console.log(chalk.red(`\n  Error: ${err.message}\n`));
    }
    await select({
      message: t('historyContinue'),
      choices: [{ name: t('historyBack'), value: 'back' }],
    }).catch(() => {});
  }
}
