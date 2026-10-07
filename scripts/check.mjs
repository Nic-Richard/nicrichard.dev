import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = spawnSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  {
    cwd: root,
    encoding: 'utf8',
  },
);
if (git.error || git.status !== 0) throw git.error || new Error(git.stderr);
const files = [...new Set(git.stdout.split('\0').filter(Boolean))];
const errors = [];
let scripts = 0;
let references = 0;

function checkScript(label, source, type = 'commonjs') {
  const result = spawnSync(
    process.execPath,
    ['--check', `--input-type=${type}`],
    {
      input: source,
      encoding: 'utf8',
    },
  );
  scripts++;
  if (result.error || result.status !== 0)
    errors.push(`${label}: ${result.error || result.stderr}`);
}

function checkReference(file, reference) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return;
  references++;
  try {
    const path = decodeURIComponent(reference.split(/[?#]/)[0]);
    if (!path) return;
    const target = path.startsWith('/')
      ? resolve(root, `.${path}`)
      : resolve(root, dirname(file), path);
    const local = relative(root, target);
    if (local.startsWith('..') || !statSync(target).isFile())
      throw new Error('Not a local file');
  } catch {
    errors.push(`${file}: missing local asset ${reference}`);
  }
}

for (const file of files) {
  if (!/\.(?:html|css|js|mjs)$/.test(file)) continue;
  const source = readFileSync(resolve(root, file), 'utf8');
  if (/\.m?js$/.test(file))
    checkScript(file, source, file.endsWith('.mjs') ? 'module' : 'commonjs');
  if (file.endsWith('.html')) {
    for (const match of source.matchAll(
      /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi,
    )) {
      checkReference(file, match[2]);
    }
    let inline = 0;
    for (const match of source.matchAll(
      /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    )) {
      if (/\bsrc\s*=/i.test(match[1])) continue;
      const label = `${file} inline script ${++inline}`;
      if (/application\/ld\+json/i.test(match[1])) {
        try {
          JSON.parse(match[2]);
        } catch (error) {
          errors.push(`${label}: ${error.message}`);
        }
      } else {
        checkScript(
          label,
          match[2],
          /\btype\s*=\s*["']module["']/i.test(match[1]) ? 'module' : 'commonjs',
        );
      }
    }
  }
  if (file.endsWith('.css')) {
    for (const match of source.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
      checkReference(file, match[2]);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${scripts} scripts and ${references} local asset references.`,
  );
}
