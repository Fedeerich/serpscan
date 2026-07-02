import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CACHE_DIR = join(homedir(), '.serpscan', 'cache');
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cachePath(url) {
  return join(CACHE_DIR, createHash('sha1').update(url).digest('hex') + '.json');
}

export async function getCachedReport(url) {
  try {
    const raw = await readFile(cachePath(url), 'utf8');
    const entry = JSON.parse(raw);
    if (Date.now() - entry.savedAt > TTL_MS) return null;
    return entry.report;
  } catch {
    return null;
  }
}

export async function setCachedReport(url, report) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath(url), JSON.stringify({ savedAt: Date.now(), report }), 'utf8');
  } catch {
    // cache is best-effort — never break an analysis because of it
  }
}
