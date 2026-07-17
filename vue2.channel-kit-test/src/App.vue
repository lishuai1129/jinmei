<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>channel-model-kit Vue2 测试页</h1>
        <p>每个模型都可以单独打开配置弹窗，也可以直接请求 latest 打开链路监控。</p>
      </div>
      <button class="outline-btn" @click="closeAll">关闭所有面板</button>
    </header>

    <section class="model-grid">
      <article v-for="model in models" :key="model.type" class="model-card">
        <div>
          <h2>{{ model.label }}</h2>
          <p>{{ model.type }}</p>
        </div>
        <div class="actions">
          <button @click="openConfig(model.type)">打开配置</button>
          <button class="secondary" @click="openMonitor(model.type)">链路监控</button>
        </div>
      </article>
    </section>

    <pre v-if="logText" class="log-box">{{ logText }}</pre>

    <div ref="dialogRoot"></div>
    <div ref="panelRoot"></div>
  </div>
</template>

<script>
const LINK_CONTEXT = {
  node_id: 1,
  tx: { lat: 30, lon: 100, alt: 0 },
  rx: { lat: 30.18, lon: 100, alt: 0 },
  payload: [72, 101, 108, 108, 111]
}

export default {
  data() {
    return {
      dialogHandle: null,
      monitorHandle: null,
      logText: '',
      models: [
        { type: 'ttc', label: '测控链' },
        { type: 'coordination', label: '协同链' },
        { type: 'adhoc', label: '自组网' },
        { type: 'vhf', label: 'VHF' },
        { type: 'uhf', label: 'UHF' },
        { type: 'fiveG', label: '5G通信' },
        { type: 'dss', label: '短波' },
        { type: 'fhss', label: '中长波' },
        { type: 'gfsk', label: '卫星' },
        { type: 'custom', label: '散射' }
      ]
    }
  },
  methods: {
    getModelLabel(modelType) {
      const model = this.models.find(item => item.type === modelType)
      return model ? model.label : modelType
    },

    log(message) {
      this.logText = '[' + new Date().toLocaleTimeString() + '] ' + message
      console.log(message)
    },

    openConfig(modelType) {
      if (this.dialogHandle) {
        this.dialogHandle.unmount()
        this.dialogHandle = null
      }

      const mount = modelType === 'custom'
        ? this.$channelModelKit.mountCustomConfigDialog
        : this.$channelModelKit.mountModelConfigDialog

      this.dialogHandle = mount(this.$refs.dialogRoot, {
        visible: true,
        modelType,
        position: LINK_CONTEXT.tx,
        onConfirm: async config => {
          this.log('配置确认：' + this.getModelLabel(modelType))
          this.dialogHandle.update({ visible: false })

          try {
            await this.postConfigAndOpenMonitor(modelType, config)
          } catch (error) {
            this.log('请求失败：' + (error && error.message ? error.message : String(error)))
          }
        },
        onCancel: () => {
          this.log('已取消配置：' + this.getModelLabel(modelType))
          this.dialogHandle.update({ visible: false })
        }
      })
    },

    async postConfigAndOpenMonitor(modelType, config) {
      const api = this.$channelModelKit.api
      const payload = api.buildRequestPayload(modelType, config, LINK_CONTEXT)

      this.log('POST 配置：' + this.getModelLabel(modelType))
      await api.postModel(modelType, payload)

      this.log('POST 完成，等待 latest 刷新：' + this.getModelLabel(modelType))
      const latest = await this.waitForLatest(modelType)
      this.mountMonitor(modelType, latest)
    },

    async openMonitor(modelType) {
      try {
        this.log('请求 latest：' + this.getModelLabel(modelType))
        const latest = await this.waitForLatest(modelType)
        this.mountMonitor(modelType, latest)
      } catch (error) {
        this.log('latest 请求失败：' + (error && error.message ? error.message : String(error)))
      }
    },

    async waitForLatest(modelType) {
      let lastData = null
      for (let i = 1; i <= 10; i++) {
        lastData = await this.$channelModelKit.api.getLatest(modelType)
        if (this.hasUsefulData(lastData, modelType)) return lastData
        await this.sleep(300)
      }
      return lastData || { model: modelType, channel_metrics: {}, data: {} }
    },

    hasUsefulData(data, modelType) {
      if (!data || typeof data !== 'object') return false
      if (Object.keys(data).length === 0) return false

      const directModel = this.normalizeBackendModel(data.model || data.modelType || data.phy_type)
      if (directModel && directModel !== modelType) return false

      if (data.channel_metrics && Object.keys(data.channel_metrics).length > 0) return true
      if (data.data && Object.keys(data.data).length > 0) return true
      if (Array.isArray(data.spectrum_data) && data.spectrum_data.length > 0) return true

      return !!this.pickNestedModelData(data, modelType)
    },

    pickNestedModelData(data, modelType) {
      if (!data || typeof data !== 'object') return null
      const target = this.normalizeBackendModel(modelType)
      const key = Object.keys(data).find(item => this.normalizeBackendModel(item) === target)
      return key ? data[key] : null
    },

    normalizeBackendModel(model) {
      if (model == null) return ''
      const map = {
        ckl: 'ttc',
        ttc: 'ttc',
        xtl: 'coordination',
        coordination: 'coordination',
        zzw: 'adhoc',
        adhoc: 'adhoc',
        vhf: 'vhf',
        uhf: 'uhf',
        '5g': 'fiveG',
        fiveg: 'fiveG',
        sw: 'dss',
        dss: 'dss',
        dsss: 'dss',
        mlw: 'fhss',
        fhss: 'fhss',
        satellite: 'gfsk',
        gfsk: 'gfsk',
        choose: 'custom',
        custom: 'custom'
      }
      return map[String(model).trim().toLowerCase()] || String(model)
    },

    mountMonitor(modelType, data) {
      if (this.monitorHandle) this.monitorHandle.unmount()

      const options = {
        visible: true,
        model: modelType,
        title: this.getModelLabel(modelType) + '链路监控',
        onClose: () => {
          this.monitorHandle.update({ visible: false })
        }
      }

      if (this.pickNestedModelData(data, modelType) && !data.model && !data.channel_metrics && !data.data) {
        options.dataByModel = data
      } else {
        options.data = data
      }

      this.monitorHandle = this.$channelModelKit.mountLinkMonitor(this.$refs.panelRoot, options)
      this.log('已打开链路监控：' + this.getModelLabel(modelType))
    },

    closeAll() {
      if (this.dialogHandle) {
        this.dialogHandle.unmount()
        this.dialogHandle = null
      }
      if (this.monitorHandle) {
        this.monitorHandle.unmount()
        this.monitorHandle = null
      }
      this.log('已关闭所有面板')
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
  },

  beforeDestroy() {
    this.closeAll()
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #07111f;
  color: #d8ffe6;
  padding: 24px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
}

.page-header p {
  margin: 0;
  color: #8fb7a8;
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  max-width: 1180px;
}

.model-card {
  border: 1px solid rgba(54, 211, 153, 0.28);
  background: #0c1b2f;
  border-radius: 8px;
  padding: 16px;
}

.model-card h2 {
  margin: 0;
  font-size: 18px;
}

.model-card p {
  margin: 6px 0 14px;
  color: #80a89a;
}

.actions {
  display: flex;
  gap: 10px;
}

button {
  border: 0;
  border-radius: 6px;
  background: #1f8f3a;
  color: #fff;
  cursor: pointer;
  padding: 10px 14px;
  font-weight: 700;
}

button:hover {
  background: #2f9e44;
}

.secondary {
  background: #17518f;
}

.secondary:hover {
  background: #1f6fbf;
}

.outline-btn {
  border: 1px solid rgba(115, 181, 255, 0.45);
  background: #10243f;
}

.log-box {
  max-width: 1180px;
  margin: 18px 0 0;
  border: 1px solid rgba(54, 211, 153, 0.24);
  border-radius: 8px;
  background: #06101d;
  color: #b9ffd2;
  padding: 12px;
  white-space: pre-wrap;
}
</style>
