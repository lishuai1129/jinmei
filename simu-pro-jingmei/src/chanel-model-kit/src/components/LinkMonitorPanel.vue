<template>
  <section v-if="visible" class="cmk-monitor">
    <header class="cmk-monitor__header">
      <strong>{{ title || '链路监控' }}</strong>
      <button type="button" class="cmk-monitor__close" @click="emit('close')">×</button>
    </header>

    <div class="cmk-monitor__summary">
      <div class="cmk-summary-card">
        <span>当前模型</span>
        <strong>{{ modelTitle }}</strong>
      </div>
      <div class="cmk-summary-card">
        <span>更新时间</span>
        <strong>{{ displayTimestamp }}</strong>
      </div>
    </div>

    <div class="cmk-monitor__body">
      <section class="cmk-metrics">
        <template v-if="metricGroups.length">
          <div v-for="group in metricGroups" :key="group.key" class="cmk-metric-group">
            <h4>{{ group.title }}</h4>
            <div class="cmk-metric-grid">
              <div v-for="item in group.items" :key="item.key" class="cmk-metric-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="cmk-empty">暂无信道指标数据</div>
      </section>

      <section class="cmk-chart-panel">
        <div class="cmk-tabs" v-if="tabs.length">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            type="button"
            :class="{ active: activeTab === tab.name }"
            @click="activeTab = tab.name"
          >
            {{ tab.label }}
          </button>
        </div>
        <div ref="chartRef" class="cmk-chart"></div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { getModelDefinition, normalizeModelType, type ModelType } from '../config/models'
import {
  formatMetric,
  getBitArray,
  getComplexArray,
  getDecodedBits,
  getOriginalBits,
  getRecoveredPoints,
  getRxPoints,
  getSpectrumData,
  getTxPoints,
  isResponseForModel,
  normalizeResponse,
  pickDataForModel,
  type NormalizedResponse,
} from '../runtime/dataNormalizer'
import {
  buildBitCompareOption,
  buildCloudComparisonOption,
  buildConstellationOption,
  buildEmptyOption,
  buildIqWaveformOption,
  buildSpectrumOption,
} from '../runtime/chartBuilders'

const props = withDefaults(
  defineProps<{
    visible?: boolean
    title?: string
    model?: string
    link?: Record<string, any>
    data?: Record<string, any>
    dataByModel?: Record<string, any>
  }>(),
  {
    visible: true,
    title: '',
    model: '',
    link: undefined,
    data: undefined,
    dataByModel: undefined,
  },
)

const emit = defineEmits<{
  close: []
}>()

const chartRef = ref<HTMLElement | null>(null)
const activeTab = ref('')
let chart: echarts.ECharts | null = null

const normalized = computed<NormalizedResponse | null>(() => {
  if (props.data && isResponseForModel(props.data, props.model)) {
    return normalizeResponse(props.data)
  }
  return pickDataForModel(props.dataByModel, props.model)
})

const currentModel = computed<ModelType | null>(() => {
  return normalizeModelType(props.model) || normalized.value?.model || null
})

const modelTitle = computed(() => {
  return currentModel.value ? getModelDefinition(currentModel.value).displayName : '未知模型'
})

const displayTimestamp = computed(() => {
  const timestamp = normalized.value?.timestamp
  if (!timestamp) return 'N/A'
  const date = new Date(Number(timestamp) < 10000000000 ? Number(timestamp) * 1000 : Number(timestamp))
  return Number.isNaN(date.getTime()) ? String(timestamp) : date.toLocaleTimeString()
})

const metricLabelMap: Record<string, string> = {
  distance_m: '距离',
  path_loss_db: '路径损耗',
  shadowing_loss_db: '阴影衰落',
  total_loss_db: '总衰减损耗',
  total_path_loss_db: '总路径损耗',
  fspl_db: '自由空间路径损耗',
  atm_loss_db: '大气损耗',
  delay_spread_s: '时延扩展度',
  rician_k_db: '莱斯因子K值',
  k_factor: 'K因子',
  fading_loss_db: '快衰落损耗',
  doppler_hz: '多普勒频移',
  snr_db: '信噪比',
  bit_error_rate: '误码率',
  ber: '误码率',
  receiver_noise_figure_db: '噪声系数',
  effective_noise_figure_db: '等效热噪声系数',
  delay_ms: '时延',
  transmission_delay_ms: '单向传播时延',
  bandwidth_limit_hz: '带宽',
  channel_bandwidth_limit_hz: '可用带宽限制',
  transmission_rate_bps: '吞吐率',
  actual_transmission_rate_bps: '有效净吞吐速率',
  packet_loss_rate: '丢包率',
  packet_drop_rate: '最终丢包率',
  interference_ratio: '干扰噪声比',
  jamming_ratio: '压制干扰比',
}

const metricUnitMap: Record<string, string> = {
  distance_m: 'm',
  path_loss_db: 'dB',
  shadowing_loss_db: 'dB',
  total_loss_db: 'dB',
  total_path_loss_db: 'dB',
  fspl_db: 'dB',
  atm_loss_db: 'dB',
  delay_spread_s: 's',
  rician_k_db: 'dB',
  k_factor: 'dB',
  fading_loss_db: 'dB',
  doppler_hz: 'Hz',
  snr_db: 'dB',
  receiver_noise_figure_db: 'dB',
  effective_noise_figure_db: 'dB',
  delay_ms: 'ms',
  transmission_delay_ms: 'ms',
  bandwidth_limit_hz: 'Hz',
  channel_bandwidth_limit_hz: 'Hz',
  transmission_rate_bps: 'bps',
  actual_transmission_rate_bps: 'bps',
  bit_error_rate: '%',
  ber: '%',
  packet_loss_rate: '%',
  packet_drop_rate: '%',
}

const groupTitles: Record<string, string> = {
  large_scale: '大尺度衰落',
  small_scale: '小尺度衰落',
  link_quality: '链路质量',
  performance: '链路质量',
  network_characteristics: '网络特性',
}

const metricGroups = computed(() => {
  const metrics = normalized.value?.channelMetrics || {}
  return Object.entries(groupTitles)
    .map(([key, title]) => {
      const group = metrics[key]
      const items = group && typeof group === 'object'
        ? Object.entries(group).map(([itemKey, value]) => ({
            key: itemKey,
            label: metricLabelMap[itemKey] || itemKey,
            value: formatMetric(value, metricUnitMap[itemKey] || ''),
          }))
        : []
      return { key, title, items }
    })
    .filter((group) => group.items.length)
})

const tabs = computed(() => {
  const data = normalized.value?.data || {}
  const raw = normalized.value?.raw || {}
  const list: Array<{ name: string; label: string }> = []
  const original = getOriginalBits(data)
  const decoded = getDecodedBits(data)
  const tx = getTxPoints(data)
  const rx = getRxPoints(data)
  const recovered = getRecoveredPoints(data)
  const spectrum = getSpectrumData(raw, data)
  const channelIq = getComplexArray(data, ['channel_iq'])
  const recoveredIq = getComplexArray(data, ['recovered_iq'])
  const fiveGCloudA = getComplexArray(data, ['de_interFrq_out'])
  const fiveGCloudB = getComplexArray(data, ['de_sfo_comp'])
  const fiveGDigitalA = getBitArray(data, ['num_in_240_200'])
  const fiveGDigitalB = getBitArray(data, ['de_scram_out_240_200'])

  if (original.length && decoded.length) list.push({ name: 'bitstream', label: '比特流' })
  if (tx.length) list.push({ name: 'txConstellation', label: '星座图(TX)' })
  if (tx.length && rx.length) list.push({ name: 'iqComparison', label: '收发IQ对比' })
  if (recovered.length) list.push({ name: 'recoveredConstellation', label: '恢复星座图' })
  if (tx.length) list.push({ name: 'txWaveform', label: '发送IQ波形' })
  if (rx.length) list.push({ name: 'rxWaveform', label: '接收IQ波形' })
  if (channelIq.length) list.push({ name: 'channelIqWaveform', label: '信道IQ波形' })
  if (recoveredIq.length) list.push({ name: 'recoveredIqWaveform', label: '恢复IQ波形' })
  if (spectrum.length) list.push({ name: 'spectrum', label: '频谱图' })
  if (fiveGCloudA.length && fiveGCloudB.length) list.push({ name: 'fiveGCloud', label: '5G云图对比' })
  if (fiveGDigitalA.length && fiveGDigitalB.length) list.push({ name: 'fiveGDigital', label: '5G数字波形' })
  return list
})

function optionForActiveTab() {
  const response = normalized.value
  if (!response) return buildEmptyOption('暂无模型数据')
  const data = response.data || {}
  const raw = response.raw || {}

  switch (activeTab.value) {
    case 'bitstream':
      return buildBitCompareOption(getOriginalBits(data), getDecodedBits(data))
    case 'txConstellation':
      return buildConstellationOption([{ name: '发送端星座', points: getTxPoints(data) }], '发送端星座图')
    case 'iqComparison':
      return buildConstellationOption(
        [
          { name: '发送IQ', points: getTxPoints(data) },
          { name: '接收IQ', points: getRxPoints(data) },
        ],
        '发送IQ vs 接收IQ',
      )
    case 'recoveredConstellation':
      return buildConstellationOption([{ name: '恢复星座', points: getRecoveredPoints(data) }], '恢复后星座图')
    case 'txWaveform':
      return buildIqWaveformOption(getTxPoints(data), '发送IQ波形')
    case 'rxWaveform':
      return buildIqWaveformOption(getRxPoints(data), '接收IQ波形')
    case 'channelIqWaveform':
      return buildIqWaveformOption(getComplexArray(data, ['channel_iq']), '信道IQ波形')
    case 'recoveredIqWaveform':
      return buildIqWaveformOption(getComplexArray(data, ['recovered_iq']), '恢复IQ波形')
    case 'spectrum':
      return buildSpectrumOption(getSpectrumData(raw, data), '频谱图')
    case 'fiveGCloud':
      return buildCloudComparisonOption(
        getComplexArray(data, ['de_interFrq_out']),
        getComplexArray(data, ['de_sfo_comp']),
      )
    case 'fiveGDigital':
      return buildBitCompareOption(
        getBitArray(data, ['num_in_240_200']),
        getBitArray(data, ['de_scram_out_240_200']),
      )
    default:
      return buildEmptyOption(tabs.value.length ? '请选择图表' : '暂无图表数据')
  }
}

function renderChart() {
  nextTick(() => {
    if (!chartRef.value) return
    if (!chart) chart = echarts.init(chartRef.value)
    chart.setOption(optionForActiveTab(), true)
    chart.resize()
  })
}

watch(
  tabs,
  (nextTabs) => {
    if (!nextTabs.length) {
      activeTab.value = ''
      renderChart()
      return
    }
    if (!nextTabs.some((tab) => tab.name === activeTab.value)) {
      activeTab.value = nextTabs[0].name
    }
    renderChart()
  },
  { immediate: true },
)

watch([activeTab, normalized], renderChart, { deep: true })

onMounted(() => {
  renderChart()
  globalThis.addEventListener?.('resize', renderChart)
})

onBeforeUnmount(() => {
  globalThis.removeEventListener?.('resize', renderChart)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.cmk-monitor {
  width: min(560px, 100%);
  max-height: min(860px, 100vh);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #d8ffe6;
  background: linear-gradient(160deg, rgba(13, 22, 48, 0.98), rgba(18, 30, 66, 0.98));
  border: 1px solid rgba(41, 140, 255, 0.35);
  border-radius: 8px;
  box-shadow: 0 18px 70px rgba(0, 0, 0, 0.35);
  font-family: "Microsoft YaHei", "Segoe UI", Arial, sans-serif;
}

.cmk-monitor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  color: #57d86b;
  background: linear-gradient(90deg, rgba(42, 110, 67, 0.72), rgba(27, 74, 86, 0.72));
}

.cmk-monitor__close {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  color: #a8f5b8;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 22px;
}

.cmk-monitor__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 16px 8px;
}

.cmk-summary-card,
.cmk-metric-card {
  padding: 12px;
  text-align: center;
  border-radius: 7px;
  background: rgba(38, 51, 87, 0.78);
}

.cmk-summary-card span,
.cmk-metric-card span {
  display: block;
  margin-bottom: 6px;
  color: #a8f5b8;
  font-size: 13px;
}

.cmk-summary-card strong,
.cmk-metric-card strong {
  color: #fff;
  font-size: 15px;
}

.cmk-monitor__body {
  overflow: auto;
  padding: 10px 16px 16px;
}

.cmk-metric-group {
  padding: 12px 0;
  border-bottom: 1px solid rgba(82, 128, 255, 0.16);
}

.cmk-metric-group h4 {
  margin: 0 0 10px;
  color: #33c65f;
  text-align: center;
  font-size: 14px;
}

.cmk-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.cmk-chart-panel {
  margin-top: 16px;
}

.cmk-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(35, 135, 255, 0.35);
}

.cmk-tabs button {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 12px;
  color: #bdf5ca;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.cmk-tabs button.active {
  color: #2eb7ff;
  border-bottom-color: #2eb7ff;
}

.cmk-chart {
  height: 360px;
  margin-top: 12px;
  border: 1px solid rgba(35, 135, 255, 0.25);
  border-radius: 8px;
  background: rgba(8, 16, 39, 0.64);
}

.cmk-empty {
  padding: 28px;
  color: #a8f5b8;
  text-align: center;
}

@media (max-width: 620px) {
  .cmk-monitor__summary,
  .cmk-metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
