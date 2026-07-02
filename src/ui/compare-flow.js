import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table3';
import { analyzeUrl } from '../index.js';
import { showSectionHeader, K_BLUE, K_PURPLE } from './banner.js';
import { t } from '../i18n.js';

const K_GREEN = '#22C55E';
const K_AMBER = '#F5A623';

const blue   = chalk.hex(K_BLUE);
const purple = chalk.hex(K_PURPLE);

function categoryLabel(key) {
  const map = {
    meta: 'catMeta', headings: 'catHeadings', images: 'catImages',
    links: 'catLinks', performance: 'catPerformance', structuredData: 'catStructuredData',
    robots: 'catRobots',
  };
  return t(map[key] ?? key);
}

function scoreColor(score) {
  if (score >= 80) return chalk.hex(K_GREEN)(score);
  if (score >= 50) return chalk.hex(K_AMBER)(score);
  return chalk.red(score);
}

function scoreBar(score) {
  const filled = Math.round(score / 10);
  const empty  = 10 - filled;
  return blue('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

export async function compareFlow() {
  showSectionHeader(t('compareHeader'));

  const url1 = await input({
    message: chalk.white(t('compareUrl1')),
    validate: v => v.trim() ? true : t('compareRequired'),
  });

  const url2 = await input({
    message: chalk.white(t('compareUrl2')),
    validate: v => v.trim() ? true : t('compareRequired'),
  });

  const normalize = u => u.startsWith('http') ? u : `https://${u}`;

  try {
    console.log();
    const [r1, r2] = await Promise.all([
      analyzeUrl(normalize(url1)),
      analyzeUrl(normalize(url2)),
    ]);

    console.log('\n' + chalk.bold(t('compareOverall')));

    const winner = r1.score >= r2.score ? 1 : 2;

    const overallTable = new Table({
      head: [chalk.gray(''), blue(shorten(url1)), purple(shorten(url2))],
      style: { head: [], border: ['gray'] },
      colWidths: [22, 30, 30],
    });

    overallTable.push([
      chalk.white.bold('Score'),
      `${scoreBar(r1.score)} ${scoreColor(r1.score)}${winner === 1 ? chalk.hex(K_GREEN)(t('compareWinner')) : ''}`,
      `${scoreBar(r2.score)} ${scoreColor(r2.score)}${winner === 2 ? chalk.hex(K_GREEN)(t('compareWinner')) : ''}`,
    ]);

    console.log(overallTable.toString());
    console.log('\n  ' + chalk.bold(t('compareCategories')));

    const catTable = new Table({
      head: [chalk.gray(''), blue(shorten(url1)), purple(shorten(url2)), chalk.gray('')],
      style: { head: [], border: ['gray'] },
      colWidths: [22, 16, 16, 14],
    });

    for (const key of Object.keys(r1.categories)) {
      const s1 = r1.categories[key]?.score ?? 0;
      const s2 = r2.categories[key]?.score ?? 0;
      const w = s1 > s2 ? blue(t('compareUrl1Label')) : s2 > s1 ? purple(t('compareUrl2Label')) : chalk.gray(t('compareTie'));
      catTable.push([categoryLabel(key), scoreColor(s1), scoreColor(s2), w]);
    }

    console.log(catTable.toString());

    console.log('\n  ' + blue.bold(t('compareIssuesOn', shorten(url1))));
    printTopIssues(r1);

    console.log('\n  ' + purple.bold(t('compareIssuesOn', shorten(url2))));
    printTopIssues(r2);

    console.log();
  } catch (err) {
    console.log(chalk.red(`\n  Error: ${err.message}\n`));
  }

  await select({
    message: t('compareContinue'),
    choices: [
      { name: t('compareAgain'), value: 'again' },
      { name: t('compareBack'),  value: 'back'  },
    ],
  }).then(a => { if (a === 'again') return compareFlow(); }).catch(() => {});
}

function shorten(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 22);
}

function printTopIssues(report) {
  const all = Object.values(report.categories).flatMap(c => c.issues ?? []);
  const top = [...all.filter(i => i.severity === 'critical'), ...all.filter(i => i.severity === 'warning')].slice(0, 4);

  if (top.length === 0) {
    console.log(chalk.hex(K_GREEN)(t('compareNone')));
    return;
  }

  for (const issue of top) {
    const color = issue.severity === 'critical' ? chalk.red : chalk.hex(K_AMBER);
    const icon  = issue.severity === 'critical' ? '✖' : '⚠';
    console.log(`    ${color(icon)} ${issue.message}`);
  }
}
