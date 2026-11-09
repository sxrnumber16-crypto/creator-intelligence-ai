/**
 * Package the built extension (dist/) into a Web Store-ready zip.
 * Usage: node scripts/package.mjs [output.zip]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const out = process.argv[2] || path.join(root, `${pkg.name.replace('@cia/', '')}-v${pkg.version}.zip`);

if (!fs.existsSync(path.join(dist, 'manifest.json'))) {
  console.error('dist/manifest.json not found - run `npm run build` first.');
  process.exit(1);
}

execSync(`cd "${dist}" && zip -r -q "${out}" .`, { stdio: 'inherit' });
console.log(`Packaged: ${out}`);
