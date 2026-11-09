/**
 * Compiles src/styles/globals.css (Tailwind) to dist/content/panel.css for the
 * dynamically-imported watch-page panel. Vite handles CSS for the UI pages.
 */

import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';

export async function buildPanelCss(_watch) {
  const cssPath = path.join(root, 'src/styles/globals.css');
  const outPath = path.join(root, 'dist/content/panel.css');
  const source = fs.readFileSync(cssPath, 'utf8');

  // No inline config: let Tailwind resolve tailwind.config.js from the package
  // root (custom `ink`/`brand` palette lives there).
  const result = await postcss([tailwindcss(), autoprefixer()]).process(source, {
    from: cssPath,
  });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, result.css);
}
