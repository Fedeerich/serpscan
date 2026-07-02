import chalk from 'chalk';
import Table from 'cli-table3';
import gradient from 'gradient-string';
import { t } from '../i18n.js';
import { sym } from '../ui/glyphs.js';

const K_BLUE   = '#0947F8';
const K_PURPLE = '#6300C4';
const K_GREEN  = '#22C55E';
const K_AMBER  = '#F5A623';

const klaraGradient = gradient([K_BLUE, K_PURPLE]);

const SEVERITY_COLOR = {
  critical: chalk.red,
  warning:  chalk.hex(K_AMBER),
  info:     chalk.hex(K_BLUE),
};

const SEVERITY_ICON = {
  critical: sym('✖'),
  warning:  sym('⚠'),
  info:     sym('ℹ'),
};

const CAT_KEY_MAP = {
  meta:           'catMeta',
  headings:       'catHeadings',
  images:         'catImages',
  links:          'catLinks',
  performance:    'catPerformance',
  structuredData: 'catStructuredData',
  robots:         'catRobots',
};

function scoreColor(score) {
  if (score >= 80) return chalk.hex(K_GREEN)(score);
  if (score >= 50) return chalk.hex(K_AMBER)(score);
  return chalk.red(score);
}

function scoreBar(score) {
  const filled = Math.round(score / 5);
  const empty  = 20 - filled;
  return chalk.hex(K_BLUE)('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

export function printReport(report) {
  const divider = klaraGradient('━'.repeat(60));

  console.log('\n' + divider);
  console.log(klaraGradient(` ${t('reportTitle')}`));
  console.log(divider);

  console.log(`  ${chalk.gray(t('reportUrl'))}    ${report.url}`);
  console.log(`  ${chalk.gray(t('reportDate'))}   ${new Date(report.analyzedAt).toLocaleString()}`);
  console.log(`  ${chalk.gray(t('reportStatus'))} HTTP ${report.statusCode}  ${chalk.gray('|')}  ${t('reportResponse')} ${report.responseTime}ms`);

  console.log('\n' + chalk.bold(t('reportOverall')));
  const overall = report.score;
  console.log(`  ${scoreBar(overall)}  ${scoreColor(overall)}/100`);

  console.log('\n' + chalk.bold(t('reportCategories')));
  const table = new Table({
    head: [chalk.gray(''), chalk.gray('Score'), chalk.gray('Bar')],
    style: { head: [], border: ['gray'] },
    colWidths: [24, 8, 24],
  });

  for (const [key, category] of Object.entries(report.categories)) {
    const label = t(CAT_KEY_MAP[key] ?? key);
    const s = category.score;
    table.push([label, scoreColor(s), scoreBar(s)]);
  }

  console.log(table.toString());

  for (const [key, category] of Object.entries(report.categories)) {
    const allIssues = category.issues ?? [];
    if (allIssues.length === 0) continue;

    console.log('\n' + chalk.hex(K_PURPLE).bold(t(CAT_KEY_MAP[key] ?? key)));

    for (const issue of allIssues) {
      const color = SEVERITY_COLOR[issue.severity] ?? chalk.white;
      const icon  = SEVERITY_ICON[issue.severity]  ?? '·';
      console.log(`  ${color(icon)} ${issue.message}`);
    }
  }

  const allPassed = Object.values(report.categories).flatMap(c => c.passed ?? []);
  if (allPassed.length > 0) {
    console.log('\n' + chalk.hex(K_GREEN).bold(t('reportWorking')));
    for (const p of allPassed) {
      console.log(`  ${chalk.hex(K_GREEN)(sym('✔'))} ${p}`);
    }
  }

  console.log('\n' + divider);
  if (overall >= 80) {
    console.log(chalk.hex(K_GREEN).bold(t('reportGreat')));
  } else if (overall >= 50) {
    console.log(chalk.hex(K_AMBER).bold(t('reportDecent')));
  } else {
    console.log(chalk.red.bold(t('reportNeedsWork')));
  }
  console.log(divider + '\n');
}
