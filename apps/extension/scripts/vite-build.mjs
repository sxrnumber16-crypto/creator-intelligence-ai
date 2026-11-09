/**
 * Vite build for the extension UI pages (popup, side panel, dashboard).
 * Inputs are the source HTML files; outputs land at dist/<page>/index.html
 * (paths referenced by manifest.json).
 */

import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const dist = path.join(root, 'dist');

export async function viteBuild({ watch }) {
  const config = {
    root,
    configFile: path.join(root, 'vite.config.ts'),
    plugins: [react()],
    build: {
      outDir: dist,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: path.join(root, 'src/popup/index.html'),
          sidepanel: path.join(root, 'src/sidepanel/index.html'),
          dashboard: path.join(root, 'src/dashboard/index.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
      target: 'chrome116',
      minify: !watch,
      sourcemap: watch ? 'inline' : false,
    },
    define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  };

  if (watch) {
    await build({ ...config, build: { ...config.build, watch: {} } });
  } else {
    await build(config);
  }
}
