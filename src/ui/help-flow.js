import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import { showSectionHeader, K_BLUE, K_PURPLE, klaraGradient } from './banner.js';
import { t } from '../i18n.js';
import { sym } from './glyphs.js';

const purple = chalk.hex(K_PURPLE);
const K_GREEN = '#22C55E';

function section(icon, titleKey, bodyKey) {
  console.log('\n' + klaraGradient(`  ${sym(icon)}  ${t(titleKey)}`));
  console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(56)));
  for (const line of t(bodyKey)) {
    console.log(`  ${chalk.hex(K_GREEN)('›')} ${chalk.white(line)}`);
  }
}

export async function helpFlow() {
  showSectionHeader(t('helpHeader'));

  console.log(boxen(
    chalk.white(t('helpIntro')),
    { padding: 1, borderStyle: 'round', borderColor: 'gray' }
  ));

  section('🔍', 'menuSeo',       'helpSeo');
  section('📍', 'menuRank',      'helpRank');
  section('🚀', 'menuPageSpeed', 'helpPageSpeed');
  section('📊', 'menuCompare',   'helpCompare');
  section('📦', 'menuBulk',      'helpBulk');
  section('📋', 'menuHistory',   'helpHistory');
  section('🔧', 'menuSettings',  'helpSettings');

  console.log('\n' + chalk.gray('  ' + t('helpFooter')));
  console.log();

  await select({
    message: purple(t('helpContinue')),
    choices: [{ name: t('helpBack'), value: 'back' }],
  }).catch(() => {});
}
