module.exports = {
  server: {
    host: '0.0.0.0',
    port: 5188,
    proxy: {
      '/dsss-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/dsss': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/sw/process'
      },

      '/fhss-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/fhss': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/mlw/process'
      },

      '/gfsk-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/gfsk': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/satellite/process'
      },

      '/ttc-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/ttc': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/ckl/process'
      },

      '/adhoc-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/adhoc': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/zzw/process'
      },

      '/coordination-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/coordination': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/xtl/process'
      },

      '/vhf-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/vhf': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/vhf/process'
      },

      '/uhf-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/uhf': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/uhf/process'
      },

      '/5g-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/5g': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/5g/process'
      },

      '/choose-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/choose': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: () => '/choose/process'
      }
    }
  }
}
