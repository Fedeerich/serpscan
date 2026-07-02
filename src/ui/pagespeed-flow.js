import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import boxen from 'boxen';
import { fetchPageSpeed } from '../analyzers/pagespeed.js';
import { loadConfig } from '../config.js';
import { showSectionHeader, K_BLUE, klaraGradient } from './banner.js';
import { t } from '../i18n.js';

const K_GREEN = '#22C55E';
const K_AMBER = '#F5A623';
const K_RED   = '#EF4444';

const blue   = chalk.hex(K_BLUE);
const green  = chalk.hex(K_GREEN);
const amber  = chalk.hex(K_AMBER);
const red    = chalk.hex(K_RED);

function scoreColor(score) {
  if (score >= 90) return green.bold(score);
  if (score >= 50) return amber.bold(score);
  return red.bold(score);
}

function scoreBar(score) {
  const filled = Math.round(score / 5);
  const empty  = 20 - filled;
  const color  = score >= 90 ? green : score >= 50 ? amber : red;
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function vitalColor(score) {
  if (score === null) return chalk.gray('—');
  if (score >= 0.9)  return green;
  if (score >= 0.5)  return amber;
  return red;
}

function vitalLabel(score) {
  if (score === null) return chalk.gray('—');
  if (score >= 0.9)  return green(t('psGood'));
  if (score >= 0.5)  return amber(t('psNeeds'));
  return red(t('psPoor'));
}

function printStrategyReport(result) {
  const stratLabel = result.strategy === 'mobile' ? t('psMobile') : t('psDesktop');
  const divider = klaraGradient('─'.repeat(56));

  console.log('\n' + divider);
  console.log(klaraGradient(`  ${stratLabel.toUpperCase()}`));
  console.log(divider);

  // Lighthouse scores — each category as its own row
  console.log('\n  ' + chalk.bold(t('psScores')));
  const { performance, accessibility, bestPractices, seo } = result.categories;

  const scoreRows = [
    [t('psCatPerf'),  performance],
    [t('psCatA11y'),  accessibility],
    [t('psCatBP'),    bestPractices],
    [t('psCatSeo'),   seo],
  ];

  const scoreTable = new Table({
    style: { head: [], border: ['gray'] },
    colWidths: [22, 26, 8],
  });

  for (const [label, score] of scoreRows) {
    scoreTable.push([chalk.gray(label), scoreBar(score), scoreColor(score)]);
  }
  console.log(scoreTable.toString());

  // Core Web Vitals
  console.log('\n  ' + chalk.bold(t('psVitals')));
  const vitalsTable = new Table({
    head: result.vitals.map(v => chalk.gray(v.label)),
    style: { head: [], border: ['gray'] },
    colWidths: result.vitals.map(() => 14),
  });

  vitalsTable.push(
    result.vitals.map(v => vitalColor(v.score)(v.displayValue)),
    result.vitals.map(v => vitalLabel(v.score)),
  );
  console.log(vitalsTable.toString());

  // Opportunities
  console.log('\n  ' + chalk.bold(t('psOpportunities')));
  if (result.opportunities.length === 0) {
    console.log('  ' + green('✔ ' + t('psNoOpportunities')));
  } else {
    for (const opp of result.opportunities) {
      const icon = opp.score < 0.5 ? red('✖') : amber('⚠');
      const saving = opp.displayValue ? chalk.gray(` — ${opp.displayValue}`) : '';
      console.log(`  ${icon} ${chalk.white(opp.title)}${saving}`);
      if (opp.description) {
        const shortDesc = opp.description.split('.')[0] + '.';
        console.log(`     ${chalk.gray(shortDesc)}`);
      }
    }
  }

  console.log();
}

export async function pageSpeedFlow() {
  showSectionHeader(t('psHeader'));

  const config = await loadConfig();

  if (!config.googleApiKey) {
    console.log(boxen(
      blue.bold(`  Google API Key requerida\n\n`) +
      chalk.white(`  La API de PageSpeed necesita una clave gratuita de Google.\n`) +
      chalk.white(`  Es gratis y tarda 2 minutos en configurarse:\n\n`) +
      chalk.white(`  1. Ve a: `) + blue('console.cloud.google.com') + '\n' +
      chalk.white(`  2. Crea un proyecto → Habilita "PageSpeed Insights API"\n`) +
      chalk.white(`  3. Crea una clave API (sin coste)\n`) +
      chalk.white(`  4. Pégala en `) + chalk.white.bold('Ajustes → Configurar clave Google API'),
      { padding: 1, borderStyle: 'round', borderColor: K_BLUE }
    ));
    console.log();

    const action = await select({
      message: t('psContinue'),
      choices: [
        { name: `⚙️  Ir a Ajustes para añadir la clave Google API`, value: 'settings' },
        { name: t('psBack'), value: 'back' },
      ],
    }).catch(() => 'back');

    if (action === 'settings') {
      const { settingsFlow } = await import('./settings-flow.js');
      await settingsFlow();
    }
    return;
  }

  const url = await input({
    message: chalk.white(t('psUrlPrompt')),
    default: config.defaultUrl || undefined,
    validate: v => v.trim() ? true : t('psUrlRequired'),
  });

  const normalized = url.startsWith('http') ? url : `https://${url}`;

  const strategyChoice = await select({
    message: chalk.white(t('psStrategyPrompt')),
    choices: [
      { name: t('psStrategyBoth'),    value: 'both'    },
      { name: t('psStrategyMobile'),  value: 'mobile'  },
      { name: t('psStrategyDesktop'), value: 'desktop' },
    ],
  });

  const strategies = strategyChoice === 'both' ? ['mobile', 'desktop'] : [strategyChoice];

  const results = [];

  for (const strategy of strategies) {
    const label = strategy === 'mobile' ? t('psMobile') : t('psDesktop');
    const spinner = ora(t('psFetching', label)).start();
    try {
      const result = await fetchPageSpeed(normalized, strategy, config.googleApiKey || undefined);
      spinner.succeed(`${label} — ${t('psDone')}`);
      results.push(result);
    } catch (err) {
      spinner.fail(`${label} — ${t('psFailed')}`);
      if (err.response?.status === 400) {
        console.log(red(`\n  URL inválida o no accesible: ${normalized}`));
      } else if (err.response?.status === 429) {
        console.log(amber('\n  Límite de peticiones alcanzado. Añade una Google API Key en Ajustes.'));
      } else {
        console.log(red(`\n  Error: ${err.message}`));
      }
    }
  }

  for (const result of results) {
    printStrategyReport(result);
  }

  if (results.length > 0) {
    // Summary box if both strategies
    if (results.length === 2) {
      const m = results.find(r => r.strategy === 'mobile');
      const d = results.find(r => r.strategy === 'desktop');
      console.log(boxen(
        `  ${chalk.gray(t('psMobile') + ':')}   ${scoreColor(m.categories.performance)}/100  ${scoreBar(m.categories.performance)}\n` +
        `  ${chalk.gray(t('psDesktop') + ':')} ${scoreColor(d.categories.performance)}/100  ${scoreBar(d.categories.performance)}`,
        { padding: 1, title: chalk.white.bold('Performance Summary'), titleAlignment: 'center', borderStyle: 'round', borderColor: K_BLUE }
      ));
      console.log();
    }
  }

  await select({
    message: t('psContinue'),
    choices: [
      { name: t('psAgain'), value: 'again' },
      { name: t('psBack'),  value: 'back'  },
    ],
  }).then(a => { if (a === 'again') return pageSpeedFlow(); }).catch(() => {});
}
