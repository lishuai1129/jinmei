import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@kit': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'index.ts'),
      name: 'ChannelModelKit',
      formats: ['es', 'iife'],
      fileName: (format) => `channel-model-kit.${format === 'es' ? 'es' : 'iife'}.js`,
      cssFileName: 'style',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        exports: 'named',
      },
    },
  },
})
