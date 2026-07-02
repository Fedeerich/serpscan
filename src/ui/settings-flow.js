import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import { loadConfig, saveConfig } from '../config.js';
import { showSectionHeader, K_BLUE } from './banner.js';
import { t, setLang, getLang, SUPPORTED_LANGS } from '../i18n.js';
import { sym } from './glyphs.js';

const blue = chalk.hex(K_BLUE);

export async function settingsFlow() {
  showSectionHeader(t('settingsHeader'));

  const config = await loadConfig();

  while (true) {
    const serpStatus = config.serpApiKey
      ? chalk.green(`${sym('✔')} ${config.serpApiKey.slice(0, 6)}…`)
      : chalk.red(`${sym('✖')} ${t('settingsNotSet')}`);

    const googleStatus = config.googleApiKey
      ? chalk.green(`${sym('✔')} ${config.googleApiKey.slice(0, 6)}…`)
      : chalk.gray(t('settingsNone'));

    const defaultUrlStatus = config.defaultUrl
      ? chalk.green(config.defaultUrl)
      : chalk.gray(t('settingsNone'));

    const langLabel = SUPPORTED_LANGS[getLang()] ?? getLang();

    console.log(boxen(
      `  ${chalk.gray(t('settingsLabelSerp'))}    ${serpStatus}\n` +
      `  ${chalk.gray(t('settingsLabelGoogle'))}  ${googleStatus}\n` +
      `  ${chalk.gray(t('settingsLabelUrl'))}     ${defaultUrlStatus}\n` +
      `  ${chalk.gray(t('settingsLabelLang'))}    ${chalk.white(langLabel)}`,
      { padding: { top: 1, bottom: 1, left: 1, right: 1 }, borderStyle: 'round', borderColor: 'gray' }
    ));
    console.log();

    const action = await select({
      message: chalk.white(t('settingsPrompt')),
      choices: [
        {
          name: `${blue(sym('🔑'))}  ${t('settingsSerpKey')}        ${chalk.gray(t('settingsSerpDesc'))}`,
          value: 'serp',
        },
        {
          name: `${blue(sym('⚡'))}  ${t('settingsGoogleKey')}  ${chalk.gray(t('settingsGoogleDesc'))}`,
          value: 'google',
        },
        {
          name: `${blue(sym('🌐'))}  ${t('settingsUrl')}        ${chalk.gray(t('settingsUrlDesc'))}`,
          value: 'url',
        },
        {
          name: `${blue(sym('🌍'))}  ${t('settingsLang')}       ${chalk.gray(t('settingsLangDesc'))}`,
          value: 'lang',
        },
        {
          name: `${chalk.red(sym('🗑'))}   ${t('settingsClear')}`,
          value: 'clear',
        },
        {
          name: t('settingsBack'),
          value: 'back',
        },
      ],
    }).catch(() => 'back');

    if (action === 'back') break;

    if (action === 'serp') {
      const key = await input({
        message: chalk.white(t('settingsSerpPrompt')),
        default: config.serpApiKey || undefined,
      });
      config.serpApiKey = key.trim();
      await saveConfig(config);
      console.log(chalk.green(t('settingsSerpSaved')));
    }

    if (action === 'google') {
      const key = await input({
        message: chalk.white(t('settingsGooglePrompt')),
        default: config.googleApiKey || undefined,
      });
      config.googleApiKey = key.trim();
      await saveConfig(config);
      console.log(chalk.green(t('settingsGoogleSaved')));
    }

    if (action === 'url') {
      const url = await input({
        message: chalk.white(t('settingsUrlPrompt')),
        default: config.defaultUrl || undefined,
      });
      config.defaultUrl = url.trim();
      await saveConfig(config);
      console.log(chalk.green(t('settingsUrlSaved')));
    }

    if (action === 'lang') {
      const chosen = await select({
        message: chalk.white(t('settingsLangPrompt')),
        choices: Object.entries(SUPPORTED_LANGS).map(([value, name]) => ({ name, value })),
      });
      config.language = chosen;
      await saveConfig(config);
      setLang(chosen);
      console.log(chalk.green(t('settingsLangSaved', SUPPORTED_LANGS[chosen])));
      // Redraw header in new language
      showSectionHeader(t('settingsHeader'));
    }

    if (action === 'clear') {
      const confirm = await select({
        message: chalk.red(t('settingsClearConfirm')),
        choices: [
          { name: t('settingsClearYes'), value: true  },
          { name: t('settingsClearNo'),  value: false },
        ],
      });
      if (confirm) {
        await saveConfig({ serpApiKey: '', googleApiKey: '', defaultUrl: '', language: getLang() });
        config.serpApiKey = '';
        config.defaultUrl = '';
        console.log(chalk.yellow(t('settingsCleared')));
      }
    }
  }
}
