import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { showBanner, showSectionHeader, K_BLUE, K_PURPLE } from './banner.js';
import { t } from '../i18n.js';
import { seoAuditFlow } from './seo-flow.js';
import { rankCheckFlow } from './rank-flow.js';
import { compareFlow } from './compare-flow.js';
import { pageSpeedFlow } from './pagespeed-flow.js';
import { bulkFlow } from './bulk-flow.js';
import { historyFlow } from './history-flow.js';
import { settingsFlow } from './settings-flow.js';
import { helpFlow } from './help-flow.js';
import { sym } from './glyphs.js';

const blue   = chalk.hex(K_BLUE);
const purple = chalk.hex(K_PURPLE);

const ICONS = {
  seo:       sym('🔍'),
  rank:      sym('📍'),
  pagespeed: sym('🚀'),
  compare:   sym('📊'),
  bulk:      sym('📦'),
  history:   sym('📋'),
  settings:  sym('🔧'),
  help:      sym('❓'),
  exit:      sym('✕') + ' ',
};

const COL = 32;

function item(icon, nameKey, descKey, iconColor = blue) {
  const name = t(nameKey);
  const desc = t(descKey);
  const pad  = ' '.repeat(Math.max(2, COL - name.length));
  return {
    // Full display in the list (icon + name + description)
    name:  `${iconColor(icon)}  ${chalk.white.bold(name)}${pad}${chalk.gray(desc)}`,
    // Short display shown after selection on the same line — just icon + name
    short: `${icon}  ${name}`,
  };
}

function buildMenuItems() {
  return [
    { ...item(ICONS.seo,       'menuSeo',       'menuSeoDesc'),                   value: 'seo'       },
    { ...item(ICONS.rank,      'menuRank',      'menuRankDesc'),                  value: 'rank'      },
    { ...item(ICONS.pagespeed, 'menuPageSpeed', 'menuPageSpeedDesc', purple),     value: 'pagespeed' },
    { ...item(ICONS.compare,   'menuCompare',   'menuCompareDesc',   purple),     value: 'compare'   },
    { ...item(ICONS.bulk,      'menuBulk',      'menuBulkDesc',      purple),     value: 'bulk'      },
    { ...item(ICONS.history,   'menuHistory',   'menuHistoryDesc',   purple),     value: 'history'   },
    { ...item(ICONS.settings,  'menuSettings',  'menuSettingsDesc',  chalk.gray), value: 'settings'  },
    { ...item(ICONS.help,      'menuHelp',      'menuHelpDesc',      chalk.gray), value: 'help'      },
    {
      name:  `${chalk.gray(ICONS.exit)}  ${chalk.gray(t('menuExit'))}`,
      short: `${ICONS.exit}  ${t('menuExit')}`,
      value: 'exit',
    },
  ];
}

// Maps value → display label for the "selected" line printed below
function selectedLabel(value) {
  const map = {
    seo:       `${ICONS.seo}  ${t('menuSeo')}`,
    rank:      `${ICONS.rank}  ${t('menuRank')}`,
    pagespeed: `${ICONS.pagespeed}  ${t('menuPageSpeed')}`,
    compare:   `${ICONS.compare}  ${t('menuCompare')}`,
    bulk:      `${ICONS.bulk}  ${t('menuBulk')}`,
    history:   `${ICONS.history}  ${t('menuHistory')}`,
    settings:  `${ICONS.settings}  ${t('menuSettings')}`,
    help:      `${ICONS.help}  ${t('menuHelp')}`,
    exit:      `${sym('✕')}  ${t('menuExit')}`,
  };
  return map[value] ?? value;
}

export async function mainMenu() {
  while (true) {
    showSectionHeader(t('menuHeader'));

    const choice = await select({
      message: chalk.white(t('menuPrompt')),
      choices: buildMenuItems(),
      pageSize: 9,
    }).catch(() => 'exit');

    // Print selected option below the prompt on its own line
    console.log(blue(`\n  ▸ ${selectedLabel(choice)}\n`));

    switch (choice) {
      case 'seo':       await seoAuditFlow();   break;
      case 'rank':      await rankCheckFlow();  break;
      case 'pagespeed': await pageSpeedFlow();  break;
      case 'compare':   await compareFlow();    break;
      case 'bulk':      await bulkFlow();       break;
      case 'history':   await historyFlow();    break;
      case 'settings':  await settingsFlow();   break;
      case 'help':      await helpFlow();       break;
      case 'exit':
      default:
        console.log(purple(t('menuBye')));
        process.exit(0);
    }

    await showBanner();
  }
}
