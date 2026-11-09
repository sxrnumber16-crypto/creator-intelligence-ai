import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
      '@shared': path.join(root, '../../packages/shared/src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'zustand'],
  },
});
