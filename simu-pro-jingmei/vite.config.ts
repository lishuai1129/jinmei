import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import cesium from 'vite-plugin-cesium'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 使用vite-plugin-cesium插件（zb分支）
    cesium(),
    // 复制Cesium资源到public目录（zxy分支，保留以防cesium插件配置有问题时使用）
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/cesium/Build/Cesium/Workers',
          dest: 'cesium'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/ThirdParty',
          dest: 'cesium'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Assets',
          dest: 'cesium'
        },
        {
          src: 'node_modules/cesium/Build/Cesium/Widgets',
          dest: 'cesium'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  server: {
    open: true,
    host: '0.0.0.0',
    port: 5178,
    proxy: {
      // 配置代理
      '/api': {
        target: 'http://10.16.37.102:7777/', // 实际后端服务器地址
        changeOrigin: true,//允许跨域
        rewrite: (path) => path.replace(/^\/api/, '') // 可选：移除/api前缀
      },
      '/router': {
        target: 'http://10.16.37.102:7780/', // 路由协议和测试服务
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/router/, '')
      },

      '/dockerTest/':{
        target: 'http://10.16.37.102:7780/', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dockerTest/, '')
      },
      // 新增配置：认证服务
      '/auth-api': {
        target: 'http://10.16.37.102:7776/', // 认证服务器地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-api/, '') // 移除/auth-api前缀
      },
      //流量模型
      '/trafficWork':{
        target: 'http://10.16.37.102:7780/', //流量模型服务器地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/trafficWork/, '')
      },
      '/connect':{
        target: 'ws://10.16.37.102:10202',
        changeOrigin: true,
        ws: true,
      },
      // 地图影像代理
      '/map-tiles': {
        target: 'http://10.16.37.102',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/map-tiles/,'/map-tiles')
      },
      // DSSS信道模型代理 短波
       '/dsss-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (path) => '/latest'
      },
      '/dsss': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (path) => '/sw/process'
      },
      '/fhss-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (path) => '/latest'
      },
      // FHSS信道模型代理 中长波
      '/fhss': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (path) => '/mlw/process'
      },
      // GMSK信道模型代理  
      '/gmsk': {
        target: 'http://10.16.10.39:9002',
        changeOrigin: true,
        rewrite: (path) => '/gmsk/process'
      },
      
      // GFSK信道模型代理
      // GFSK/卫星模型计算结果拉取（GET）—— 必须在 /gfsk 之前
      '/gfsk-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (path) => '/latest'
      },
      '/gfsk': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (path) => '/satellite/process'
      },
      // 测控链计算结果拉取（GET）—— 必须在 /ttc 之前
      '/ttc-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (_path) => '/latest'
      },
      // 测控链信道模型代理
      '/ttc': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (_path) => '/ckl/process'
      },
      // 自组网计算结果拉取（GET）—— 必须在 /adhoc 之前
      '/adhoc-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (_path) => '/latest'
      },
      // 自组网信道模型代理
      '/adhoc': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (_path) => '/zzw/process'
      },
      // 协同链计算结果拉取（GET）—— 必须在 /coordination 之前
      '/coordination-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (_path) => '/latest'
      },
      // 协同链信道模型代理
      '/coordination': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (_path) => '/xtl/process'
      },
      // VHF计算结果拉取（GET）—— 必须在 /vhf 之前，避免前缀被 /vhf 拦截
      '/vhf-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (path) => '/latest'
      },
      // VHF信道模型代理
      '/vhf': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (path) => '/vhf/process'
      },
      // UHF计算结果拉取（GET）—— 必须在 /uhf 之前，避免前缀被 /uhf 拦截
      '/uhf-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (path) => '/latest'
      },
      '/uhf': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (path) => '/uhf/process'
      },
      // 5G计算结果拉取（GET）—— 必须在 /5g 之前，避免前缀被 /5g 拦截
      '/5g-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (path) => '/latest'
      },
      '/5g': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (path) => '/5g/process'
      },
      '/choose-latest': {
        target: 'http://10.16.10.39:8080',
        changeOrigin: true,
        rewrite: (path) => '/latest'
      },
      // 散射UDP转发代理 - HTTP请求通过后端中继到UDP
      '/custom-udp': {
        target: 'http://10.16.73.55:9010',
        changeOrigin: true,
        rewrite: (path) => '/udp'  // 后端在/udp路由中处理UDP转发
      },
      '/choose': {
        target: 'http://10.16.10.39:9000',
        changeOrigin: true,
        rewrite: (path) => '/choose/process'
      }
    }
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium/')
  } 
})
