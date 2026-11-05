import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // The server rewrites data/rag/embeddings_cache.json on every chat request; watching data/
      // made Tailwind send a full page reload each time, wiping the conversation.
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : { ignored: ['**/data/**', '**/python_service/**', '**/dist/**', '**/*.pdf', '**/*.txt'] },
    },
  };
});
