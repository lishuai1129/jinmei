<template>
  <div v-if="dialogVisible" class="custom-dialog-overlay" @click.self="handleCancel">
    <div class="custom-dialog">
      <!-- 对话框标题栏 -->
      <div class="custom-dialog-header">
        <div class="custom-dialog-title">散射配置</div>
        <button class="custom-dialog-close" @click="handleCancel">
          <span class="close-icon">×</span>
        </button>
      </div>

      <!-- 对话框内容区 -->
      <div class="custom-dialog-body">
        <el-form :model="formData" label-width="140px" class="config-form">
          <!-- 基础参数 -->
          <div class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">基础参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">调制方式</div>
                <div class="form-input">
                  <el-select
                    v-model="formData.modulation"
                    placeholder="选择调制方式"
                    filterable
                  >
                    <el-option label="BPSK" value="1" />
                    <el-option label="QPSK" value="2" />
                    <el-option label="16QAM" value="3" />
                    <el-option label="64QAM" value="4" />
                  </el-select>
                </div>
              </div>

            </div>
          </div>

          <!-- 频率和采样参数 -->
          <div class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">频率参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">中心频率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.centerFreq"
                    :min="0"
                    :max="100000"
                    :step="1"
                    controls-position="right"
                    placeholder="0-100000"
                  />
                  <span class="unit-label">MHz</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">采样率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.samplingRate"
                    :min="0.1"
                    :max="100000"
                    :step="0.1"
                    controls-position="right"
                    placeholder="0.1-100000"
                  />
                  <span class="unit-label">MHz</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">背景SNR</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.snr_db"
                    :min="-20"
                    :max="50"
                    :step="0.5"
                    controls-position="right"
                    placeholder="-20-50"
                  />
                  <span class="unit-label">dB</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">速度</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.speed"
                    :min="0"
                    :max="10000"
                    :step="1"
                    controls-position="right"
                    placeholder="0-10000"
                  />
                  <span class="unit-label">速度 m/s</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">节点高度</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.height"
                    :min="0"
                    :max="10000"
                    :step="1"
                    controls-position="right"
                    placeholder="0-10000"
                  />
                  <span class="unit-label">米</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 多径衰落参数 -->
          <div class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">多径衰落配置</div>
              <button class="add-multipath-btn" @click="addMultipathRow" type="button">
                + 添加路径
              </button>
            </div>

            <div class="form-content">
              <div v-if="formData.multipath.length === 0" class="empty-multipath">
                暂无多径配置，请点击"添加路径"创建
              </div>

              <div v-for="(path, index) in formData.multipath" :key="index" class="multipath-row">
                <div class="multipath-index">路径 {{ index + 1 }}</div>
                <div class="multipath-fields">
                  <div class="multipath-field">
                    <label>功率</label>
                    <el-input-number
                      v-model="path.power_db"
                      :min="0"
                      :max="5000"
                      :step="0.5"
                      :precision="1"
                      controls-position="right"
                      placeholder="-50-0"
                    />
                    <span class="field-unit">dB</span>
                  </div>

                  <div class="multipath-field">
                    <label>时延</label>
                    <el-input-number
                      v-model="path.delay_us"
                      :min="0"
                      :max="1000"
                      :step="0.1"
                      :precision="1"
                      controls-position="right"
                      placeholder="0-1000"
                    />
                    <span class="field-unit">µs</span>
                  </div>

                  <div class="multipath-field">
                    <label>频偏</label>
                    <el-input-number
                      v-model="path.freq_offset"
                      :min="-10000"
                      :max="10000"
                      :step="10"
                      controls-position="right"
                      placeholder="-10000-10000"
                    />
                    <span class="field-unit">Hz</span>
                  </div>


                  <button
                    v-if="formData.multipath.length > 1"
                    class="remove-btn"
                    @click="removeMultipathRow(index)"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </el-form>
      </div>

      <!-- 对话框底部 -->
      <div class="custom-dialog-footer">
        <button class="dialog-btn cancel-btn" @click="handleCancel">取消</button>
        <button class="dialog-btn confirm-btn" @click="handleConfirm">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

interface MultipathConfig {
  power_db: number
  delay_us: number
  freq_offset: number
}

interface CustomConfig {
  modulation: string
  centerFreq: number
  samplingRate: number
  snr_db: number
  speed: number
  multipath: MultipathConfig[]
  height: number
}

const props = defineProps<{
  visible: boolean
  position: { lat: number; lon: number; alt: number }
}>()

const emit = defineEmits<{
  confirm: [data: CustomConfig]
  cancel: []
}>()

const dialogVisible = ref(false)

const formData = ref<CustomConfig>({
  modulation: '2',      // 默认QPSK
  centerFreq: 2400,     // 默认2.4 GHz
  samplingRate: 1,      // 默认1 MHz
  snr_db: 25.0,         // 默认25 dB
  speed: 10.0,
  multipath: [
    {
      power_db: 15.0,
      delay_us: 0.0,
      freq_offset: 0.0,
    },
    {
      power_db: 10.0,
      delay_us: 1.5,
      freq_offset: 50.0,
    },
    {
      power_db: 5.0,
      delay_us: 3.0,
      freq_offset: 100.0,
    }
  ],
  height: 0,            // 默认节点高度0米
})

watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal
    if (newVal) {
      formData.value.height = props.position.alt || 0
    }
  }
)

const addMultipathRow = () => {
  formData.value.multipath.push({
    power_db: -10.0,
    delay_us: 2.0,
    freq_offset: 0.0,
  })
}

const removeMultipathRow = (index: number) => {
  if (formData.value.multipath.length > 1) {
    formData.value.multipath.splice(index, 1)
  } else {
    ElMessage.warning('至少保留一个多径路径')
  }
}

const handleConfirm = () => {
  if (!formData.value.modulation) {
    ElMessage.warning('请选择调制方式')
    return
  }

  if (formData.value.centerFreq === null || formData.value.centerFreq === undefined) {
    ElMessage.warning('请输入中心频率')
    return
  }

  if (formData.value.centerFreq < 0) {
    ElMessage.warning('中心频率必须大于等于0')
    return
  }

  if (formData.value.samplingRate === null || formData.value.samplingRate === undefined) {
    ElMessage.warning('请输入采样率')
    return
  }

  if (formData.value.samplingRate < 0) {
    ElMessage.warning('采样率必须大于等于0')
    return
  }

  if (formData.value.snr_db === null || formData.value.snr_db === undefined) {
    ElMessage.warning('请输入背景SNR')
    return
  }

  if (formData.value.speed === null || formData.value.speed === undefined || !Number.isFinite(formData.value.speed) || formData.value.speed < 0) {
    ElMessage.warning('请输入有效速度')
    return
  }

  if (formData.value.multipath.length === 0) {
    ElMessage.warning('至少需要一个多径路径')
    return
  }


  emit('confirm', { ...formData.value })
  dialogVisible.value = false
}

const handleCancel = () => {
  dialogVisible.value = false
  emit('cancel')
}
</script>

<style scoped>
/* 对话框蒙层 */
.custom-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

/* 对话框容器 */
.custom-dialog {
  width: 750px;
  background: linear-gradient(135deg, rgba(30, 39, 54, 0.98) 0%, rgba(35, 45, 62, 0.98) 100%);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: 16px;
  animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  max-height: 85vh;
}

.custom-dialog::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.6), transparent);
}

.custom-dialog::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #4caf50, rgba(76, 175, 80, 0.3));
  opacity: 0.6;
}

/* 对话框标题栏 */
.custom-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(76, 175, 80, 0.15);
  background: linear-gradient(90deg, rgba(30, 39, 54, 0.9), rgba(35, 45, 62, 0.9));
  position: relative;
}

.custom-dialog-header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.3), transparent);
}

.custom-dialog-title {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  position: relative;
  padding-left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-dialog-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: linear-gradient(180deg, #4caf50, #81c784);
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.4);
}

.custom-dialog-close {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(76, 175, 80, 0.1);
  color: #a0aec0;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.custom-dialog-close:hover {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  transform: rotate(90deg) scale(1.1);
  border-color: rgba(76, 175, 80, 0.3);
  box-shadow: 0 0 16px rgba(76, 175, 80, 0.2);
}

.close-icon {
  font-style: normal;
  font-weight: 300;
}

/* 对话框内容区 */
.custom-dialog-body {
  padding: 28px;
  max-height: calc(85vh - 180px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(76, 175, 80, 0.4) transparent;
}

.custom-dialog-body::-webkit-scrollbar {
  width: 8px;
}

.custom-dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.custom-dialog-body::-webkit-scrollbar-thumb {
  background-color: rgba(76, 175, 80, 0.4);
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.custom-dialog-body::-webkit-scrollbar-thumb:hover {
  background-color: rgba(76, 175, 80, 0.6);
}

/* 表单样式 */
.config-form {
  margin: 0;
}

.config-section {
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(40, 57, 80, 0.25) 0%, rgba(45, 63, 88, 0.25) 100%);
  border-radius: 12px;
  padding: 18px;
  border: 1px solid rgba(76, 175, 80, 0.12);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.config-section:hover {
  border-color: rgba(76, 175, 80, 0.25);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.08), inset 0 1px 0 rgba(76, 175, 80, 0.1);
  background: linear-gradient(135deg, rgba(40, 57, 80, 0.35) 0%, rgba(45, 63, 88, 0.35) 100%);
  transform: translateY(-2px);
}

.section-title-block {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  justify-content: space-between;
}

.title-indicator {
  width: 4px;
  height: 18px;
  background: linear-gradient(180deg, #4caf50, #81c784);
  margin-right: 12px;
  border-radius: 2px;
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.3);
  animation: glow 2s ease-in-out infinite;
}

.section-title {
  font-size: 15px;
  color: #4caf50;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  flex: 1;
}

.add-multipath-btn {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05));
  color: #4caf50;
  border: 1.5px solid rgba(76, 175, 80, 0.4);
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-multipath-btn:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.25), rgba(76, 175, 80, 0.15));
  border-color: rgba(76, 175, 80, 0.6);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.15);
  transform: translateY(-2px);
}

.add-multipath-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.1);
}

.form-content {
  display: flex;
  flex-direction: column;
  padding: 2px 0;
  gap: 4px;
}

.form-row {
  display: flex;
  margin-bottom: 14px;
  align-items: center;
  transition: all 0.3s ease;
  padding: 6px 8px;
  border-radius: 6px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-row:hover {
  background: rgba(76, 175, 80, 0.06);
  border-radius: 8px;
}

.form-label {
  width: 140px;
  text-align: right;
  padding-right: 12px;
  color: #b0bcc8;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  min-width: 0;
}

.form-input-with-unit {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-label {
  color: #8894a6;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  padding: 0 4px;
  letter-spacing: 0.3px;
}

/* 多径路径行样式 */
.multipath-row {
  background: linear-gradient(135deg, rgba(40, 57, 80, 0.4) 0%, rgba(40, 57, 80, 0.25) 100%);
  border: 1px solid rgba(76, 175, 80, 0.15);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.multipath-row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, rgba(76, 175, 80, 0.6), rgba(76, 175, 80, 0.2));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.multipath-row:hover {
  border-color: rgba(76, 175, 80, 0.35);
  background: linear-gradient(135deg, rgba(40, 57, 80, 0.55) 0%, rgba(40, 57, 80, 0.4) 100%);
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.1), inset 0 1px 0 rgba(76, 175, 80, 0.15);
  transform: translateY(-2px);
}

.multipath-row:hover::before {
  opacity: 1;
}

.multipath-index {
  color: #4caf50;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.multipath-index::before {
  content: "";
  width: 6px;
  height: 6px;
  background: #4caf50;
  border-radius: 50%;
  opacity: 0.8;
}

.multipath-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  align-items: flex-end;
}

.multipath-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.multipath-field label {
  color: #b0bcc8;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.multipath-field :deep(.el-input-number) {
  width: 100%;
}

.field-unit {
  color: #8894a6;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
  opacity: 0.8;
}

.remove-btn {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(244, 67, 54, 0.05));
  color: #ff6b6b;
  border: 1.5px solid rgba(244, 67, 54, 0.2);
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  grid-column: 1 / -1;
}

.remove-btn::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(244, 67, 54, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.remove-btn:hover {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.25), rgba(244, 67, 54, 0.15));
  border-color: rgba(244, 67, 54, 0.4);
  color: #fff;
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.15);
  transform: translateY(-2px);
}

.remove-btn:hover::before {
  width: 80px;
  height: 80px;
}

.remove-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.1);
}

.empty-multipath {
  color: #8894a6;
  font-size: 14px;
  text-align: center;
  padding: 32px 20px;
  background: rgba(76, 175, 80, 0.03);
  border: 1px dashed rgba(76, 175, 80, 0.15);
  border-radius: 8px;
  font-style: italic;
  letter-spacing: 0.3px;
}

/* 对话框底部 */
.custom-dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 20px 28px;
  background: linear-gradient(90deg, rgba(30, 39, 54, 0.9), rgba(35, 45, 62, 0.9));
  border-top: 1px solid rgba(76, 175, 80, 0.15);
  gap: 10px;
}

/* 按钮样式 */
.dialog-btn {
  min-width: 110px;
  height: 40px;
  font-size: 15px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transition: left 0.6s ease;
  z-index: 1;
}

.dialog-btn:hover::before {
  left: 100%;
}

.dialog-btn > * {
  position: relative;
  z-index: 2;
}

.cancel-btn {
  background: linear-gradient(135deg, rgba(40, 57, 80, 0.8), rgba(50, 67, 92, 0.8));
  color: #cbd5e0;
  border: 1.5px solid rgba(76, 175, 80, 0.1);
}

.cancel-btn:hover {
  background: linear-gradient(135deg, rgba(50, 67, 92, 0.9), rgba(60, 77, 102, 0.9));
  color: #fff;
  border-color: rgba(76, 175, 80, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.cancel-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.confirm-btn {
  background: linear-gradient(135deg, #388e3c, #4caf50);
  color: #fff;
  box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
  border: 1.5px solid rgba(76, 175, 80, 0.3);
  font-weight: 700;
}

.confirm-btn:hover {
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(76, 175, 80, 0.4);
  border-color: rgba(76, 175, 80, 0.5);
}

.confirm-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

/* Element Plus样式覆盖 */
:deep(.el-input__wrapper) {
  background-color: rgba(40, 57, 80, 0.5) !important;
  box-shadow: none !important;
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.15);
  transition: all 0.3s ease;
  backdrop-filter: blur(2px);
}

:deep(.el-input__wrapper:hover) {
  border-color: rgba(76, 175, 80, 0.35);
  background-color: rgba(40, 57, 80, 0.65) !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2) !important;
  background-color: rgba(40, 57, 80, 0.75) !important;
}

:deep(.el-input__inner) {
  color: #fff;
  height: 36px;
  font-size: 14px;
  letter-spacing: 0.3px;
}

:deep(.el-select__wrapper) {
  background-color: rgba(40, 57, 80, 0.5) !important;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-select__popper) {
  z-index: 10000 !important;
  backdrop-filter: blur(4px);
}

:deep(.el-select-dropdown__item) {
  color: #cbd5e0;
  background: transparent;
  font-size: 14px;
}

:deep(.el-select-dropdown__item.hover),
:deep(.el-select-dropdown__item:hover) {
  background-color: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  font-weight: 500;
}

:deep(.el-select-dropdown__item.selected) {
  color: #66bb6a !important;
  background-color: rgba(76, 175, 80, 0.25) !important;
  font-weight: 700;
}

:deep(.el-input-number__decrease),
:deep(.el-input-number__increase) {
  color: #8894a6;
  background: rgba(76, 175, 80, 0.08);
  border: none;
  transition: all 0.3s ease;
}

:deep(.el-input-number__decrease:hover),
:deep(.el-input-number__increase:hover) {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.form-input-with-unit :deep(.el-input-number),
.multipath-field :deep(.el-input-number) {
  flex: 1;
  min-width: 0;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 12px rgba(76, 175, 80, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
  }
}
</style>
