/**
 * Unified build for the Creator Intelligence AI Chrome extension.
 *
 * Outputs into dist/ (MV3 load-unpacked ready):
 *  - manifest.json + icons (copied from public/)
 *  - background/index.js      (esbuild, ESM service worker)
 *  - content/index.js         (esbuild, IIFE bootstrap)
 *  - content/panel.js         (esbuild, ESM, dynamically imported on demand)
 *  - content/panel.css        (postcss + Tailwind, referenced by the panel)
 *  - popup/ sidepanel/ dashboard/ (Vite + React + Tailwind)
 *
 * Usage: node scripts/build.mjs [--watch]
 */

import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { viteBuild } from './vite-build.mjs';
import { buildPanelCss } from './build-css.mjs';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const dist = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

const define = { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' };

async function esbuildOnce(options) {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  } else {
    await esbuild.build(options);
  }
}

async function buildWorkers() {
  // Background service worker (ESM - manifest declares type: module)
  await esbuildOnce({
    entryPoints: [path.join(root, 'src/background/index.ts')],
    bundle: true,
    outfile: path.join(dist, 'background/index.js'),
    format: 'esm',
    target: 'chrome116',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    define,
    logLevel: 'warning',
  });

  // Content-script bootstrap (IIFE, no imports)
  await esbuildOnce({
    entryPoints: [path.join(root, 'src/content/index.ts')],
    bundle: true,
    outfile: path.join(dist, 'content/index.js'),
    format: 'iife',
    target: 'chrome116',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    define,
    logLevel: 'warning',
  });

  // Watch-page intelligence panel (ESM, lazily imported by the bootstrap).
  // CSS is stripped here and compiled with Tailwind separately.
  await esbuildOnce({
    entryPoints: [path.join(root, 'src/content/panel.tsx')],
    bundle: true,
    outfile: path.join(dist, 'content/panel.js'),
    format: 'esm',
    target: 'chrome116',
    jsx: 'automatic',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    define,
    loader: { '.css': 'empty' },
    logLevel: 'warning',
  });
}

async function copyStatic() {
  fs.mkdirSync(dist, { recursive: true });
  fs.cpSync(path.join(root, 'public'), dist, { recursive: true });
}

async function main() {
  if (!watch) fs.rmSync(dist, { recursive: true, force: true });
  await copyStatic();
  await buildWorkers();
  await buildPanelCss(watch);
  await viteBuild({ watch });

  if (!watch) {
    console.log(`\nExtension build complete: ${dist}`);
    console.log('Load it via chrome://extensions -> Developer mode -> Load unpacked.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
