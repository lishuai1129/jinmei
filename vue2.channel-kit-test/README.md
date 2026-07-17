# channel-model-kit Vue2 接入说明

这个项目演示了 Vue2 如何接入 `channel-model-kit` 工具包。

工具包提供 10 个信道模型的：

- 配置弹窗
- 后端请求 payload 构造
- latest 数据获取
- 链路监控面板渲染

甲方项目负责：地图、节点、链路、经纬度高度、节点 ID。

工具包负责：模型配置界面、请求格式、图表和指标展示。

## 1. 安装工具包

把 `channel-model-kit-1.0.1.tgz` 放到 Vue2 项目里，然后执行：

```bash
npm install ./channel-model-kit-1.0.1.tgz
```

也可以使用完整路径：

```bash
npm install "E:\jinmei\simu-pro-jingmei\src\chanel-model-kit\channel-model-kit-1.0.1.tgz"
```

## 2. 在 main.js 注册

文件位置：`src/main.js`

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

注意：

```js
import 'channel-model-kit/style.css'
```

这行必须保留，否则弹窗和链路监控面板没有样式。

## 3. 配置后端代理

文件位置：`vite.config.js`

这个测试项目里使用两个后端地址：

```js
const latestTarget = 'http://10.16.10.39:8080'
const processTarget = 'http://10.16.10.39:9000'
```

含义：

- `latestTarget`：获取最新计算结果，统一请求 `/latest`
- `processTarget`：提交模型配置，触发后端计算

示例：

```js
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
```

常用模型路径：

| 模型 | 前端 POST | 后端 process |
| --- | --- | --- |
| 测控链 | `/ttc` | `/ckl/process` |
| 协同链 | `/coordination` | `/xtl/process` |
| 自组网 | `/adhoc` | `/zzw/process` |
| VHF | `/vhf` | `/vhf/process` |
| UHF | `/uhf` | `/uhf/process` |
| 5G | `/5g` | `/5g/process` |
| 短波 | `/dsss` | `/sw/process` |
| 中长波 | `/fhss` | `/mlw/process` |
| 卫星 | `/gfsk` | `/satellite/process` |
| 自定义 | `/choose` | `/choose/process` |

所有 `xxx-latest` 都代理到 `/latest`。

## 4. 页面中准备挂载点

在需要使用工具包的 Vue 页面里放两个容器：

```vue
<template>
  <div>
    <div ref="dialogRoot"></div>
    <div ref="panelRoot"></div>
  </div>
</template>
```

含义：

- `dialogRoot`：配置弹窗挂载位置
- `panelRoot`：链路监控面板挂载位置

## 5. 打开配置弹窗

普通模型使用：

```js
this.$channelModelKit.mountModelConfigDialog(...)
```

散射使用：

```js
this.$channelModelKit.mountCustomConfigDialog(...)
```

示例：

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

## 6. 配置确认后请求后端

配置弹窗确认后，会返回 `config`。

Vue2 项目需要把当前链路信息传给工具包，例如：

```js
const extra = {
  node_id: 1,
  tx: { lat: 30, lon: 100, alt: 1000 },
  rx: { lat: 30.18, lon: 100, alt: 0 },
  payload: [72, 101, 108, 108, 111]
}
```

然后生成请求 payload，发给后端，再拿 latest：

```js
async postConfig(modelType, config) {
  const extra = {
    node_id: 1,
    tx: { lat: 30, lon: 100, alt: 1000 },
    rx: { lat: 30.18, lon: 100, alt: 0 },
    payload: [72, 101, 108, 108, 111]
  }

  const api = this.$channelModelKit.api
  const payload = api.buildRequestPayload(modelType, config, extra)

  await api.postModel(modelType, payload)

  const latest = await api.getLatest(modelType)

  this.openMonitor(modelType, latest)
}
```

## 7. 打开链路监控面板

```js
openMonitor(modelType, data) {
  if (this.monitorHandle) {
    this.monitorHandle.unmount()
  }

  this.monitorHandle = this.$channelModelKit.mountLinkMonitor(this.$refs.panelRoot, {
    visible: true,
    model: modelType,
    title: '链路监控',
    data,
    onClose: () => {
      this.monitorHandle.update({ visible: false })
    }
  })
}
```

如果只想直接请求 latest 并打开面板：

```js
async openMonitorFromLatest(modelType) {
  const data = await this.$channelModelKit.api.getLatest(modelType)
  this.openMonitor(modelType, data)
}
```

## 8. 支持的模型 key

```js
ttc          // 测控链
coordination // 协同链
adhoc        // 自组网
vhf          // VHF
uhf          // UHF
fiveG        // 5G通信
dss          // 短波
fhss         // 中长波
gfsk         // 卫星
custom       // 散射
```

## 9. 经纬度和节点由谁负责

由甲方 Vue2 项目负责。

工具包不会负责：

- 地图上放节点
- 选择发射端和接收端
- 保存节点经纬度
- 判断当前链路关系

甲方项目需要在调用时传入：

```js
{
  node_id: 1,
  tx: { lat: 30, lon: 100, alt: 1000 },
  rx: { lat: 30.18, lon: 100, alt: 0 }
}
```

## 10. 页面销毁时清理

```js
beforeDestroy() {
  if (this.dialogHandle) this.dialogHandle.unmount()
  if (this.monitorHandle) this.monitorHandle.unmount()
}
```

## 11. 常见问题

### 样式没有生效

确认 `main.js` 里有：

```js
import 'channel-model-kit/style.css'
```

### POST 返回 404

检查 `vite.config.js` 里的代理地址和 rewrite。

例如 `/adhoc` 应该代理到：

```text
http://后端:9000/zzw/process
```

不要代理到：

```text
http://后端:8080/zzw/process
```

### latest 返回空对象

如果 Network 里 latest 返回：

```json
{}
```

说明后端暂时没有最新数据。可以 POST 后等待一小会儿再 GET latest，或者轮询几次。

### 页面关闭后还有弹窗

需要在 `beforeDestroy` 中调用：

```js
handle.unmount()
```

