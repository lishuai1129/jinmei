<template>
  <div v-if="dialogVisible" class="cmk-overlay" @click.self="handleCancel">
    <div class="cmk-dialog" :style="{ '--cmk-theme': definition.themeColor }">
      <header class="cmk-dialog__header">
        <strong>{{ definition.title }}</strong>
        <button type="button" class="cmk-icon-btn" @click="handleCancel">×</button>
      </header>

      <main class="cmk-dialog__body">
        <section class="cmk-section">
          <h3>调制参数</h3>
          <div class="cmk-grid">
            <label v-if="definition.supportsMode" class="cmk-field">
              <span>工作模式</span>
              <select v-model="form.mode">
                <option value="fixed">定频</option>
                <option value="hopping">跳频</option>
              </select>
            </label>

            <label v-if="definition.supportsAdaptive" class="cmk-field">
              <span>自适应</span>
              <select v-model="adaptiveValue">
                <option :value="'false'">关闭</option>
                <option :value="'true'">开启</option>
              </select>
            </label>

            <label v-if="definition.modulationOptions.length" class="cmk-field">
              <span>调制方式</span>
              <select v-model="form.modulation_type">
                <option
                  v-for="item in definition.modulationOptions"
                  :key="String(item.value)"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <section class="cmk-section">
          <h3>编码参数</h3>
          <div class="cmk-grid">
            <label class="cmk-field">
              <span>编码方式</span>
              <select v-model="form.codingScheme">
                <option
                  v-for="item in definition.codingOptions"
                  :key="String(item.value)"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>

            <label class="cmk-field">
              <span>码率</span>
              <select v-model="form.codeRate">
                <option value="1/2">1/2</option>
                <option value="2/3">2/3</option>
                <option value="3/4">3/4</option>
                <option value="5/6">5/6</option>
              </select>
            </label>
          </div>
        </section>

        <section class="cmk-section">
          <h3>频率参数</h3>
          <div class="cmk-grid">
            <NumberField v-model="form.txPower" :label="definition.type === 'gfsk' ? '上行发射功率' : '发射功率'" :unit="definition.type === 'gfsk' ? 'dBW' : 'dB'" />
            <NumberField v-if="definition.type === 'gfsk'" v-model="form.downlinkTxPowerDbw" label="下行发射功率" unit="dBW" />
            <NumberField v-model="form.centerFreq" label="工作频率" :unit="definition.frequencyUnit" :min="definition.frequencyRange.min" :max="definition.frequencyRange.max" />
            <NumberField v-if="form.k_factor !== undefined" v-model="form.k_factor" label="K因子" unit="dB" />
            <NumberField v-if="form.speed !== undefined" v-model="form.speed" label="速度" unit="m/s" />
            <NumberField v-model="form.height" label="节点高度" unit="米" />
          </div>
        </section>

        <section v-if="definition.supportsSampling || form.snr_db !== undefined" class="cmk-section">
          <h3>采样与链路参数</h3>
          <div class="cmk-grid">
            <NumberField v-if="form.samplingRate !== undefined" v-model="form.samplingRate" label="采样率" unit="Hz" />
            <NumberField v-if="form.dataRateKbps !== undefined" v-model="form.dataRateKbps" label="传输速率" unit="kbps" />
            <NumberField v-if="form.snr_db !== undefined" v-model="form.snr_db" label="背景SNR" unit="dB" />
          </div>
        </section>

        <section v-if="definition.supportsNetwork" class="cmk-section">
          <h3>网络模拟</h3>
          <div class="cmk-grid">
            <NumberField v-model="form.transmissionDelay" label="时延" unit="ms" />
            <NumberField v-model="form.networkTransmissionRateBps" label="传输速率门限" unit="bps" />
          </div>
        </section>

        <section v-if="definition.supportsNoiseSeed" class="cmk-section">
          <h3>中长波信道参数</h3>
          <div class="cmk-grid">
            <NumberField v-model="form.noiseFigureDb" label="热噪声系数" unit="dB" />
            <NumberField v-model="form.shadowFadingDb" label="阴影损耗" unit="dB" />
            <NumberField v-model="form.seed" label="随机数种子" />
          </div>
        </section>

        <section v-if="definition.supportsSatellite" class="cmk-section">
          <h3>卫星链路参数</h3>
          <div class="cmk-grid">
            <NumberField v-model="form.satAltKm" label="卫星高度" unit="km" />
            <NumberField v-model="form.radialVelocityMps" label="径向速度" unit="m/s" />
            <NumberField v-model="form.bandwidthMHz" label="带宽" unit="MHz" />
            <NumberField v-model="form.rainRateMmh" label="降雨率" unit="mm/h" />
            <NumberField v-model="form.maxRetransmissions" label="最大重传次数" />
          </div>
        </section>

        <section v-if="definition.supportsMultipath" class="cmk-section">
          <div class="cmk-section__title-row">
            <h3>多径衰落配置</h3>
            <button type="button" class="cmk-small-btn" @click="addMultipath">添加路径</button>
          </div>
          <div class="cmk-paths">
            <div v-for="(path, index) in form.multipath" :key="index" class="cmk-path">
              <div class="cmk-path__title">路径 {{ index + 1 }}</div>
              <NumberField v-model="path.power_db" label="功率" unit="dB" />
              <NumberField v-model="path.delay_us" label="时延" unit="us" />
              <NumberField v-model="path.freq_offset" label="频偏" unit="Hz" />
              <button type="button" class="cmk-danger-btn" @click="removeMultipath(index)">删除</button>
            </div>
          </div>
        </section>
      </main>

      <footer class="cmk-dialog__footer">
        <button type="button" class="cmk-btn cmk-btn--ghost" @click="handleCancel">取消</button>
        <button type="button" class="cmk-btn" @click="handleConfirm">确认</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'
import {
  createDefaultConfig,
  getModelDefinition,
  type ChannelModelFormData,
  type MultipathConfig,
} from '../config/models'

const NumberField = defineComponent({
  name: 'NumberField',
  props: {
    modelValue: { type: Number as PropType<number | undefined>, default: undefined },
    label: { type: String, required: true },
    unit: { type: String, default: '' },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('label', { class: 'cmk-field' }, [
        h('span', props.label),
        h('div', { class: 'cmk-number' }, [
          h('input', {
            type: 'number',
            value: props.modelValue ?? '',
            min: props.min,
            max: props.max,
            step: 'any',
            onInput: (event: Event) => {
              const value = Number((event.target as HTMLInputElement).value)
              emit('update:modelValue', Number.isFinite(value) ? value : undefined)
            },
          }),
          props.unit ? h('em', props.unit) : null,
        ]),
      ])
  },
})

const props = withDefaults(
  defineProps<{
    visible?: boolean
    modelType?: string
    position?: { lat?: number; lon?: number; alt?: number }
    nodeId?: number
    initialConfig?: Partial<ChannelModelFormData>
  }>(),
  {
    visible: true,
    modelType: 'vhf',
    position: () => ({ lat: 0, lon: 0, alt: 0 }),
    initialConfig: () => ({}),
  },
)

const emit = defineEmits<{
  confirm: [data: ChannelModelFormData & { modelType: string; nodeId?: number }]
  cancel: []
  'update:visible': [visible: boolean]
}>()

const dialogVisible = ref(props.visible)
const definition = computed(() => getModelDefinition(props.modelType))
const form = ref<ChannelModelFormData>(createDefaultConfig(props.modelType, props.position))

const adaptiveValue = computed({
  get: () => String(!!form.value.adaptive),
  set: (value: string) => {
    form.value.adaptive = value === 'true'
  },
})

function resetForm() {
  form.value = {
    ...createDefaultConfig(props.modelType, props.position),
    ...props.initialConfig,
  }
  if (definition.value.supportsMultipath) {
    form.value.multipath = normalizeMultipath(form.value.multipath)
  }
}

function normalizeMultipath(value?: MultipathConfig[]) {
  const fallback = definition.value.defaults.multipath || [{ power_db: 0, delay_us: 0, freq_offset: 0 }]
  const source = Array.isArray(value) && value.length ? value : fallback
  return source.map((path) => ({
    power_db: Number(path.power_db ?? 0),
    delay_us: Number(path.delay_us ?? 0),
    freq_offset: Number(path.freq_offset ?? 0),
  }))
}

function addMultipath() {
  if (!form.value.multipath) form.value.multipath = []
  form.value.multipath.push({ power_db: -3, delay_us: 0, freq_offset: 0 })
}

function removeMultipath(index: number) {
  if (!form.value.multipath || form.value.multipath.length <= 1) return
  form.value.multipath.splice(index, 1)
}

function handleCancel() {
  dialogVisible.value = false
  emit('update:visible', false)
  emit('cancel')
}

function handleConfirm() {
  const payload = {
    ...form.value,
    modelType: definition.value.type,
    nodeId: props.nodeId,
  }
  dialogVisible.value = false
  emit('update:visible', false)
  emit('confirm', payload)
}

watch(
  () => props.visible,
  (visible) => {
    dialogVisible.value = visible
    if (visible) resetForm()
  },
  { immediate: true },
)

watch(
  () => [props.modelType, props.initialConfig],
  () => {
    if (dialogVisible.value) resetForm()
  },
)
</script>

<style>
.cmk-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(2, 8, 23, 0.72);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
}

.cmk-dialog {
  width: min(760px, calc(100vw - 32px));
  max-height: min(860px, calc(100vh - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #d8ffe6;
  background: linear-gradient(145deg, rgba(31, 43, 62, 0.98), rgba(24, 34, 51, 0.98));
  border: 1px solid color-mix(in srgb, var(--cmk-theme, #4caf50) 45%, rgba(255, 255, 255, 0.14));
  border-radius: 10px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  font-family: "Microsoft YaHei", "Segoe UI", Arial, sans-serif;
}

.cmk-dialog__header,
.cmk-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.03);
}

.cmk-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.cmk-dialog__header strong {
  position: relative;
  padding-left: 14px;
  color: #f5fff9;
  font-size: 16px;
  font-weight: 700;
}

.cmk-dialog__header strong::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 4px;
  height: 17px;
  border-radius: 2px;
  background: var(--cmk-theme, #4caf50);
  transform: translateY(-50%);
}

.cmk-dialog__footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.cmk-dialog__body {
  padding: 22px 26px;
  overflow: auto;
  scrollbar-color: color-mix(in srgb, var(--cmk-theme, #4caf50) 45%, transparent) rgba(255, 255, 255, 0.04);
  scrollbar-width: thin;
}

.cmk-dialog__body::-webkit-scrollbar {
  width: 8px;
}

.cmk-dialog__body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}

.cmk-dialog__body::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: color-mix(in srgb, var(--cmk-theme, #4caf50) 45%, rgba(255, 255, 255, 0.16));
}

.cmk-icon-btn,
.cmk-small-btn,
.cmk-danger-btn,
.cmk-btn {
  border: 0;
  color: #fff;
  cursor: pointer;
  border-radius: 6px;
  background: var(--cmk-theme, #4caf50);
  font-family: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.cmk-icon-btn {
  width: 32px;
  height: 32px;
  font-size: 20px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.1);
}

.cmk-icon-btn:hover,
.cmk-small-btn:hover,
.cmk-danger-btn:hover,
.cmk-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

.cmk-section {
  padding: 18px 18px 20px;
  margin-bottom: 18px;
  border: 1px solid color-mix(in srgb, var(--cmk-theme, #4caf50) 20%, transparent);
  border-radius: 8px;
  background: rgba(40, 57, 80, 0.34);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.cmk-section:hover {
  border-color: color-mix(in srgb, var(--cmk-theme, #4caf50) 42%, transparent);
  background: rgba(40, 57, 80, 0.42);
  box-shadow: 0 0 20px color-mix(in srgb, var(--cmk-theme, #4caf50) 9%, transparent);
}

.cmk-section h3 {
  position: relative;
  margin: 0 0 18px;
  padding-left: 14px;
  color: var(--cmk-theme, #4caf50);
  font-size: 15px;
  font-weight: 700;
}

.cmk-section h3::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--cmk-theme, #4caf50);
  transform: translateY(-50%);
}

.cmk-section__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cmk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 22px;
}

.cmk-field {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.cmk-field > span {
  color: #aeb9c8;
  text-align: right;
  font-weight: 500;
}

.cmk-field select,
.cmk-number input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  color: #f8fffb;
  background: rgba(40, 57, 80, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.cmk-field select:hover,
.cmk-number input:hover {
  border-color: color-mix(in srgb, var(--cmk-theme, #4caf50) 36%, rgba(255, 255, 255, 0.12));
}

.cmk-field select:focus,
.cmk-number input:focus {
  border-color: var(--cmk-theme, #4caf50);
  background: rgba(43, 62, 89, 0.86);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--cmk-theme, #4caf50) 22%, transparent);
}

.cmk-field select {
  appearance: none;
  padding-right: 34px;
  background-image:
    linear-gradient(45deg, transparent 50%, #b7c5d8 50%),
    linear-gradient(135deg, #b7c5d8 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 15px,
    calc(100% - 13px) 15px;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.cmk-number {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.cmk-number em {
  min-width: 34px;
  color: #a8bdd8;
  font-style: normal;
  font-weight: 600;
}

.cmk-paths {
  display: grid;
  gap: 12px;
}

.cmk-path {
  display: grid;
  grid-template-columns: 74px repeat(3, minmax(0, 1fr)) 60px;
  gap: 10px;
  align-items: center;
  padding: 12px 12px 14px;
  background: rgba(10, 22, 42, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 7px;
}

.cmk-path .cmk-field {
  grid-template-columns: 42px minmax(0, 1fr);
}

.cmk-path__title {
  color: var(--cmk-theme, #4caf50);
  font-size: 13px;
  font-weight: 700;
}

.cmk-small-btn {
  height: 30px;
  padding: 0 14px;
  background: linear-gradient(135deg, var(--cmk-theme, #4caf50), color-mix(in srgb, var(--cmk-theme, #4caf50) 70%, #ffb000));
}

.cmk-danger-btn {
  height: 32px;
  background: linear-gradient(135deg, #f45f74, #d94354);
}

.cmk-btn {
  min-width: 92px;
  height: 38px;
  padding: 0 18px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--cmk-theme, #4caf50), color-mix(in srgb, var(--cmk-theme, #4caf50) 70%, #17c9df));
}

.cmk-btn--ghost {
  color: #d9e7ff;
  background: rgba(42, 58, 85, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 720px) {
  .cmk-grid,
  .cmk-path {
    grid-template-columns: 1fr;
  }

  .cmk-field,
  .cmk-path .cmk-field {
    grid-template-columns: 96px minmax(0, 1fr);
  }
}
</style>
