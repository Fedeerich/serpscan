#!/usr/bin/env node
import { loadConfig } from '../src/config.js';
import { setLang } from '../src/i18n.js';
import { showBanner } from '../src/ui/banner.js';
import { mainMenu } from '../src/ui/menu.js';

async function main() {
  process.stdout.write('\x1Bc'); // hard clear — resets scroll buffer too

  const config = await loadConfig();
  setLang(config.language ?? 'es');

  await showBanner();
  await mainMenu();
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
