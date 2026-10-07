import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  process.env.CHROME_PATH,
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const chrome = candidates.find(candidate => candidate && existsSync(candidate));
if (!chrome) throw new Error('Chrome not found. Set CHROME_PATH to the browser executable.');

const output = join(root, 'assets/images/miscellary/landscape/october-2026');
mkdirSync(output, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'portfolio-mobile-export-'));
try {
  for (let set = 1; set <= 3; set++) {
    const page = pathToFileURL(join(root, 'scripts/mobile-sets.html'));
    page.searchParams.set('set', String(set));
    const file = join(output, `miscellary-phones-${set}.png`);
    execFileSync(chrome, [
      '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--no-default-browser-check', '--disable-background-networking',
      '--force-device-scale-factor=1', '--window-size=1914,945', '--virtual-time-budget=3000',
      `--user-data-dir=${profile}`, `--screenshot=${file}`, page.href,
    ], { stdio: 'pipe', timeout: 30000 });
    const png = readFileSync(file);
    if (png.readUInt32BE(16) !== 1914 || png.readUInt32BE(20) !== 945) {
      throw new Error(`Unexpected export size: ${file}`);
    }
    console.log(file);
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}
