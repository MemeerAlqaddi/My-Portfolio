import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const excluded = new Set([
  '.git', '.github', 'node_modules', 'dist', 'api', 'scripts',
  'package-lock.json', 'package.json', 'vercel.json',
  'AL-MAJLIS-VERCEL-STRIPE-SETUP.txt'
]);

const { readdir } = await import('node:fs/promises');
for (const name of await readdir(root)) {
  if (excluded.has(name)) continue;
  await cp(path.join(root, name), path.join(out, name), { recursive: true });
}

const indexPath = path.join(root, 'index.html');
if (!existsSync(indexPath)) throw new Error('index.html was not found.');

let html = await readFile(indexPath, 'utf8');

const styleTag = '<link rel="stylesheet" href="./monetization.css?v=1">';
const scriptTag = '<script src="./monetization.js?v=1"></script>';

if (!html.includes('monetization.css')) {
  html = html.replace('</head>', `${styleTag}</head>`);
}
if (!html.includes('monetization.js')) {
  html = html.replace('</body>', `${scriptTag}</body>`);
}

await writeFile(path.join(out, 'index.html'), html);
console.log('Built Al Majlis without changing the original app files.');
