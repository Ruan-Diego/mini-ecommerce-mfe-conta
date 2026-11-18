import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfe_conta',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.tsx' },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
      },
    }),
  ],
  server: { port: 5177, strictPort: true, origin: 'http://localhost:5177' },
  preview: { port: 5177, strictPort: true },
  build: { target: 'chrome89' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // O design-system 0.2.0 tem imports sem ".js" no dist, que o Node ESM não resolve.
    // Processar os pacotes @ruan-diego pelo Vite contorna isso; pode sair quando o MFE usar o 0.2.1.
    server: { deps: { inline: [/@ruan-diego\//] } },
  },
});
