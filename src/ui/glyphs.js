// Legacy Windows consoles (cmd.exe, plain PowerShell) use fonts without color-emoji
// glyphs and often a non-UTF8 codepage, so emoji render as tofu boxes. Windows Terminal,
// VS Code's integrated terminal and ConEmu/Cmder all handle emoji fine.
function detectEmojiSupport() {
  if (process.env.SERPSCAN_NO_EMOJI) return false;
  if (process.env.SERPSCAN_FORCE_EMOJI) return true;
  if (process.platform !== 'win32') return true;
  return Boolean(
    process.env.WT_SESSION ||
    process.env.TERM_PROGRAM === 'vscode' ||
    process.env.ConEmuANSI === 'ON'
  );
}

export const EMOJI_SUPPORTED = detectEmojiSupport();

// Every emoji/pictographic glyph used across the UI, mapped to an ASCII-safe fallback.
const FALLBACK = {
  '🔍': '>',
  '📍': '@',
  '🚀': '^',
  '📊': '=',
  '📦': '#',
  '📋': '~',
  '🔧': '+',
  '❓': '?',
  '✕': 'x',
  '✔': '+',
  '✖': 'x',
  '⚠': '!',
  'ℹ': 'i',
  '💾': '[S]',
  '📄': '[P]',
  '🔄': '[R]',
  '🥇': '#1',
  '🥈': '#2',
  '🥉': '#3',
  '👋': '',
  '⚙️': '*',
  '⚙': '*',
  '🔑': '*',
  '⚡': '*',
  '🌐': '*',
  '🌍': '*',
  '🗑': 'x',
};

// Wraps a string built with emoji literals — returns it unchanged when the
// terminal supports emoji, or swaps in ASCII-safe equivalents otherwise.
export function sym(str) {
  if (EMOJI_SUPPORTED || typeof str !== 'string') return str;
  let out = str;
  for (const [emoji, fallback] of Object.entries(FALLBACK)) {
    out = out.split(emoji).join(fallback);
  }
  return out;
}
