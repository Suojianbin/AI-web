import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createDevMockPlugin } from './mock/devServer.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useDevMock = mode === 'development' && (env.VITE_USE_MOCK === 'true' || !env.VITE_API_URL)

  return {
    plugins: [vue(), createDevMockPlugin({ enabled: useDevMock })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      ...(useDevMock
        ? {}
        : {
            proxy: {
              '^/api': {
                target: env.VITE_API_URL || 'http://api:5050',
                changeOrigin: true
              }
            }
          }),
      watch: {
        usePolling: true,
        ignored: ['**/node_modules/**', '**/dist/**']
      },
      host: '0.0.0.0'
    }
  }
})
