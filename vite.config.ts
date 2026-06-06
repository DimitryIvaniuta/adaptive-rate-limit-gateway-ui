import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration keeps local development CORS-free by proxying gateway paths.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_DEV_BACKEND_TARGET || 'http://localhost:8080';

  return {
    plugins: react(),
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/admin': backendTarget,
        '/actuator': backendTarget,
        '/api': backendTarget,
        '/auth': backendTarget
      }
    },
    preview: {
      port: 4173,
      strictPort: true
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setupTests.ts',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
    },
    build: {
      sourcemap: true,
      target: 'es2022',
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react';
            }
            return undefined;
          }
        }
      }
    }
  };
});
