import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.serpscan');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const HISTORY_FILE = join(CONFIG_DIR, 'history.json');

const DEFAULTS = {
  serpApiKey: '',
  googleApiKey: '',
  defaultUrl: '',
  language: 'es',
};

async function ensureDir() {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

// Env vars take priority over the config file — safer for CI or shared machines
function applyEnvOverrides(config) {
  if (process.env.SERPSCAN_SERP_API_KEY) config.serpApiKey = process.env.SERPSCAN_SERP_API_KEY;
  if (process.env.SERPSCAN_GOOGLE_API_KEY) config.googleApiKey = process.env.SERPSCAN_GOOGLE_API_KEY;
  return config;
}

export async function loadConfig() {
  await ensureDir();
  try {
    const raw = await readFile(CONFIG_FILE, 'utf8');
    return applyEnvOverrides({ ...DEFAULTS, ...JSON.parse(raw) });
  } catch {
    return applyEnvOverrides({ ...DEFAULTS });
  }
}

export async function saveConfig(config) {
  await ensureDir();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export async function loadHistory() {
  await ensureDir();
  try {
    const raw = await readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addToHistory(entry) {
  const history = await loadHistory();
  // Keep latest 20, deduplicate by url
  const filtered = history.filter(h => h.url !== entry.url);
  filtered.unshift({ url: entry.url, score: entry.score, date: entry.analyzedAt });
  await writeFile(HISTORY_FILE, JSON.stringify(filtered.slice(0, 20), null, 2), 'utf8');
}
