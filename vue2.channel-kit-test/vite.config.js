import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'

const latestTarget = 'http://10.16.10.39:8080'
const processTarget = 'http://10.16.10.39:9000'

export default defineConfig({
  plugins: [vue2()],
  server: {
    host: '0.0.0.0',
    port: 5190,
    proxy: {
      // latest endpoints
      '/ttc-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/coordination-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/adhoc-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/vhf-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/uhf-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/5g-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/dsss-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/fhss-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/gfsk-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },
      '/choose-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest',
      },

      // post endpoints
      '/ttc': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/ckl/process',
      },
      '/coordination': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/xtl/process',
      },
      '/adhoc': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/zzw/process',
      },
      '/vhf': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/vhf/process',
      },
      '/uhf': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/uhf/process',
      },
      '/5g': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/5g/process',
      },
      '/dsss': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/sw/process',
      },
      '/fhss': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/mlw/process',
      },
      '/gfsk': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/satellite/process',
      },
      '/choose': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/choose/process',
      },
    },
  },
})
