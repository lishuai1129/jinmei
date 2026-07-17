# channel-model-kit 接入说明
## 1. 安装

把 `channel-model-kit-1.0.2.tgz` 放到 Vue2 项目里，然后执行：

```bash
npm install ./channel-model-kit-1.0.2.tgz
```

`1.0.2` 是离线包，安装时不会再下载 `vue`、`echarts`。

## 2. 在 main.js 注册

```js
import Vue from 'vue'
import App from './App.vue'

import ChannelModelKit from 'channel-model-kit'
import 'channel-model-kit/style.css'

Vue.use(ChannelModelKit, {
  endpoints: {
    ttc: { post: '/ttc', latest: '/ttc-latest' },
    coordination: { post: '/coordination', latest: '/coordination-latest' },
    adhoc: { post: '/adhoc', latest: '/adhoc-latest' },
    vhf: { post: '/vhf', latest: '/vhf-latest' },
    uhf: { post: '/uhf', latest: '/uhf-latest' },
    fiveG: { post: '/5g', latest: '/5g-latest' },
    dss: { post: '/dsss', latest: '/dsss-latest' },
    fhss: { post: '/fhss', latest: '/fhss-latest' },
    gfsk: { post: '/gfsk', latest: '/gfsk-latest' },
    custom: { post: '/choose', latest: '/choose-latest' }
  }
})

new Vue({
  render: h => h(App)
}).$mount('#app')
```

注意：下面这行必须保留，否则弹窗和面板没有样式。

```js
import 'channel-model-kit/style.css'
```

## 3. 配置后端代理

Vue2 项目里建议只写 `/vhf`、`/vhf-latest` 这种前端路径。

真实后端 IP 和端口写在代理配置里。

Vite 示例：

```js
const latestTarget = 'http://10.16.55.140:8080'
const processTarget = 'http://10.16.55.140:9000'

export default {
  server: {
    proxy: {
      '/vhf-latest': {
        target: latestTarget,
        changeOrigin: true,
        rewrite: () => '/latest'
      },
      '/vhf': {
        target: processTarget,
        changeOrigin: true,
        rewrite: () => '/vhf/process'
      }
    }
  }
}
```

其他模型对应关系：

| 前端路径 | 后端路径 |
| --- | --- |
| `/ttc` | `/ckl/process` |
| `/coordination` | `/xtl/process` |
| `/adhoc` | `/zzw/process` |
| `/vhf` | `/vhf/process` |
| `/uhf` | `/uhf/process` |
| `/5g` | `/5g/process` |
| `/dsss` | `/sw/process` |
| `/fhss` | `/mlw/process` |
| `/gfsk` | `/satellite/process` |
| `/choose` | `/choose/process` |

所有 `xxx-latest` 都代理到：

```text
/latest
```

## 4. 页面里准备两个挂载点

```vue
<template>
  <div>
    <button @click="openConfig('vhf')">打开 VHF 配置</button>

    <div ref="dialogRoot"></div>
    <div ref="monitorRoot"></div>
  </div>
</template>
```

说明：

- `dialogRoot`：配置弹窗挂载位置
- `monitorRoot`：链路监控面板挂载位置

## 5. 打开配置弹窗

```js
openConfig(modelType) {
  this.dialogHandle = this.$channelModelKit.mountModelConfigDialog(this.$refs.dialogRoot, {
    visible: true,
    modelType,
    position: { lat: 30, lon: 100, alt: 0 },
    nodeId: 1,
    onConfirm: async config => {
      this.dialogHandle.update({ visible: false })
      await this.postConfig(modelType, config)
    },
    onCancel: () => {
      this.dialogHandle.update({ visible: false })
    }
  })
}
```

散射使用：

```js
this.$channelModelKit.mountCustomConfigDialog(...)
```

其他模型使用：

```js
this.$channelModelKit.mountModelConfigDialog(...)
```

## 6. 配置确认后发给后端

甲方项目需要传当前链路信息：

```js
const extra = {
  node_id: 1,
  tx: { lat: 30, lon: 100, alt: 1000 },
  rx: { lat: 30.18, lon: 100, alt: 0 }
}
```

完整流程：

```js
async postConfig(modelType, config) {
  const extra = {
    node_id: 1,
    tx: { lat: 30, lon: 100, alt: 1000 },
    rx: { lat: 30.18, lon: 100, alt: 0 }
  }

  const api = this.$channelModelKit.api

  const payload = api.buildRequestPayload(modelType, config, extra)

  await api.postModel(modelType, payload)

  const latest = await api.getLatest(modelType)

  this.openMonitor(modelType, latest)
}
```

`payload` 和 `original_bits` 默认会随机生成，甲方不传也可以。

如果甲方想固定数据，也可以覆盖：

```js
const extra = {
  node_id: 1,
  tx: { lat: 30, lon: 100, alt: 1000 },
  rx: { lat: 30.18, lon: 100, alt: 0 },
  payload: [1, 0, 1, 0, 1, 0, 1, 0],
  original_bits: [1, 0, 1, 0, 1, 0, 1, 0]
}
```

## 7. 打开链路监控

```js
openMonitor(modelType, data) {
  if (this.monitorHandle) {
    this.monitorHandle.unmount()
  }

  this.monitorHandle = this.$channelModelKit.mountLinkMonitor(this.$refs.monitorRoot, {
    visible: true,
    model: modelType,
    data,
    title: '链路监控',
    onClose: () => {
      this.monitorHandle.update({ visible: false })
    }
  })
}
```

如果只想直接查看 latest：

```js
async openMonitorFromLatest(modelType) {
  const data = await this.$channelModelKit.api.getLatest(modelType)
  this.openMonitor(modelType, data)
}
```

## 8. 支持的模型

```js
ttc           // 测控链
coordination  // 协同链
adhoc         // 自组网
vhf           // VHF
uhf           // UHF
fiveG         // 5G通信
dss           // 短波
fhss          // 中长波
gfsk          // 卫星
custom        // 散射
```

## 9. 页面销毁时清理

```js
beforeDestroy() {
  if (this.dialogHandle) this.dialogHandle.unmount()
  if (this.monitorHandle) this.monitorHandle.unmount()
}
```

## 10. 常见问题

### 样式不生效

检查是否引入：

```js
import 'channel-model-kit/style.css'
```

### POST 404

一般是代理写错。

例如 `/adhoc` 应该转到：

```text
http://后端:9000/zzw/process
```

不要转到：

```text
http://后端:8080/zzw/process
```

`8080` 通常只用于 `/latest`。

### latest 返回空

如果后端返回：

```json
{}
```

说明后端还没有最新数据。可以 POST 后等一下再请求 latest，或者轮询几次。

## 11. 重新打包

如果工具包源码改了，在包目录执行：

```bash
cd src/chanel-model-kit
npm run pack:local
```

会生成新的：

```text
channel-model-kit-1.0.2.tgz
```
