import figlet from 'figlet';
import gradient from 'gradient-string';
import chalk from 'chalk';
import { t } from '../i18n.js';

export const K_BLUE   = '#0947F8';
export const K_PURPLE = '#6300C4';

export const klaraGradient = gradient([K_BLUE, K_PURPLE]);

function figletAsync(text, opts) {
  return new Promise((resolve, reject) =>
    figlet(text, opts, (err, result) => (err ? reject(err) : resolve(result)))
  );
}

// OSC 8 terminal hyperlink escape sequence — clickable in most modern terminals
function hyperlink(text, url) {
  return `\x1B]8;;${url}\x07${text}\x1B]8;;\x07`;
}

const AUTHOR_NAME  = 'Carriedo';
const AUTHOR_URL   = 'https://www.linkedin.com/in/marcos-gongora-carriedo/';
const SPONSOR_NAME = 'klara-automation.com';
const SPONSOR_URL  = 'https://klara-automation.com';

export async function showBanner() {
  console.clear();
  console.log('\n\n');

  const art = await figletAsync('SerpScan', { font: 'ANSI Shadow' });
  console.log(klaraGradient(art));

  const width = 62;
  const line = chalk.hex(K_BLUE).dim('─'.repeat(width));

  console.log(line);

  const subtitle  = t('bannerSubtitle');
  const tagline   = t('bannerTagline');

  console.log(
    chalk.white.bold(subtitle.padStart(Math.floor((width + subtitle.length) / 2)).padEnd(width))
  );
  console.log(
    chalk.gray(tagline.padStart(Math.floor((width + tagline.length) / 2)).padEnd(width))
  );

  console.log(line);

  const creditLine = `Creado por ${AUTHOR_NAME}`;
  const creditColored = chalk.gray('Creado por ') + chalk.hex(K_BLUE)(hyperlink(AUTHOR_NAME, AUTHOR_URL));
  const creditPad = ' '.repeat(Math.max(0, Math.floor((width - creditLine.length) / 2)));
  console.log(creditPad + creditColored);

  const sponsorLine = `Patrocinador: ${SPONSOR_NAME}`;
  const sponsorColored = chalk.gray('Patrocinador: ') + chalk.hex(K_PURPLE)(hyperlink(SPONSOR_NAME, SPONSOR_URL));
  const sponsorPad = ' '.repeat(Math.max(0, Math.floor((width - sponsorLine.length) / 2)));
  console.log(sponsorPad + sponsorColored);

  console.log();
}

export function showSectionHeader(title) {
  console.log();
  console.log(klaraGradient(`  ▸ ${title}`));
  console.log(chalk.hex(K_BLUE).dim('  ' + '─'.repeat(title.length + 4)));
}
