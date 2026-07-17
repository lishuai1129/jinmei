<template>
  <div v-if="dialogVisible" class="custom-dialog-overlay" @click.self="handleCancel">
    <div class="custom-dialog" :style="themeVars">
      <!-- 对话框标题栏 -->
      <div class="custom-dialog-header">
        <div class="custom-dialog-title">{{ config.title }}</div>
        <button class="custom-dialog-close" @click="handleCancel">
          <span class="close-icon">&times;</span>
        </button>
      </div>

      <!-- 对话框内容区 -->
      <div class="custom-dialog-body">
        <el-form :model="formData" label-width="120px" class="config-form">
          <!-- Section 1: 工作模式 或 调制参数 -->
          <div class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">
                {{ config.firstSection === 'mode' ? '工作模式' : '调制参数' }}
              </div>
            </div>

            <div class="form-content">
              <!-- 频率模式 (TTC, Coordination, AdHoc) -->
              <div v-if="config.firstSection === 'mode'" class="form-row">
                <div class="form-label">频率模式</div>
                <div class="form-input">
                  <el-select v-model="formData.mode" placeholder="选择频率模式">
                    <el-option label="跳频模式" value="hopping" />
                    <el-option label="定频模式" value="fixed" />
                  </el-select>
                </div>
              </div>

              <!-- 调制方式 (VHF, UHF, 5G, DSS, FHSS, GMSK, GFSK) -->
              <div v-if="isDss" class="form-row">
                <div class="form-label">工作模式</div>
                <div class="form-input">
                  <el-select v-model="formData.mode" placeholder="选择工作模式">
                    <el-option label="定频" value="fixed" />
                    <el-option label="跳频" value="hopping" />
                  </el-select>
                </div>
              </div>

              <div v-if="config.firstSection !== 'mode'" class="form-row">
                <div class="form-label">调制方式</div>
                <div class="form-input">
                  <el-select
                    v-model="formData.modulation_type"
                    placeholder="选择调制方式"
                    filterable
                  >
                    <el-option
                      v-for="opt in config.modulationOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: 编码参数 -->
          <div class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">编码参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">编码方式</div>
                <div class="form-input">
                  <el-select
                    v-model="formData.codingScheme"
                    placeholder="选择编码方式"
                    filterable
                  >
                    <el-option
                      v-for="opt in config.codingOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">码率</div>
                <div class="form-input">
                  <el-select
                    v-model="formData.codeRate"
                    placeholder="选择码率"
                    filterable
                  >
                    <el-option label="1/2" value="1/2" />
                    <el-option label="2/3" value="2/3" />
                    <el-option label="3/4" value="3/4" />
                    <el-option label="5/6" value="5/6" />
                  </el-select>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: 频率参数 -->
          <div class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">频率参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">{{ isGfsk ? '上行发射功率' : '发射功率' }}</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.txPower"
                    :min="-50"
                    :max="isFhss ? 100 : 50"
                    :step="0.5"
                    controls-position="right"
                    :placeholder="isGfsk ? '单位: dBW' : '单位: dBm'"
                  />
                  <span class="unit-label">{{ isGfsk ? 'dBW' : 'dB' }}</span>
                </div>
              </div>

              <div class="form-row" v-if="isGfsk">
                <div class="form-label">下行发射功率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.downlinkTxPowerDbw"
                    :min="-50"
                    :max="50"
                    :step="0.5"
                    controls-position="right"
                    placeholder="单位: dBW"
                  />
                  <span class="unit-label">dBW</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">{{ isGfsk ? '载波频率' : '工作频率' }}</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.centerFreq"
                    :min="config.freqRange.min"
                    :max="config.freqRange.max"
                    :step="1"
                    controls-position="right"
                    :placeholder="config.freqPlaceholder"
                  />
                  <span class="unit-label">{{ frequencyUnitLabel }}</span>
                </div>
              </div>

              <div class="form-row" v-if="formData.k_factor !== undefined">
                <div class="form-label">K因子</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.k_factor"
                    :min="isGfsk ? -20 : 0"
                    :max="40"
                    :step="0.5"
                    :precision="1"
                    controls-position="right"
                    :placeholder="isGfsk ? '-20-40' : '0-40'"
                  />
                  <span class="unit-label">dB</span>
                </div>
              </div>

              <div class="form-row" v-if="isDss || isFhss || isUhf || isFiveG || isTtcLike">
                <div class="form-label">速度</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.speed"
                    :min="0"
                    :max="100000"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    :placeholder="isDss ? '7000' : (isFhss ? '30' : (isFiveG ? '10' : '20'))"
                  />
                  <span class="unit-label">m/s</span>
                </div>
              </div>

              <div class="form-row" v-if="!isGfsk">
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

          <div v-if="isDss" class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">网络模拟</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">时延</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.transmissionDelay"
                    :min="0"
                    :max="10000"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="10"
                  />
                  <span class="unit-label">ms</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">传输速率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.networkTransmissionRateBps"
                    :min="0"
                    :max="1000000000"
                    :step="100"
                    :precision="1"
                    controls-position="right"
                    placeholder="1000"
                  />
                  <span class="unit-label">bps</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isFhss" class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">中长波信道参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">热噪声系数</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.noiseFigureDb"
                    :min="0"
                    :max="50"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="7.0"
                  />
                  <span class="unit-label">dB</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">阴影损耗</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.shadowFadingDb"
                    :min="0"
                    :max="50"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="2.5"
                  />
                  <span class="unit-label">dB</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">随机数种子</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.seed"
                    :min="0"
                    :max="2147483647"
                    :step="1"
                    :precision="0"
                    controls-position="right"
                    placeholder="1234"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3.1: UHF信道参数 -->
          <div v-if="isUhf" class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">信道参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">采样率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.samplingRate"
                    :min="1"
                    :max="100000000"
                    :step="1000"
                    controls-position="right"
                    placeholder="200000"
                  />
                  <span class="unit-label">Hz</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">背景SNR</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.snr_db"
                    :min="-50"
                    :max="50"
                    :step="0.5"
                    :precision="1"
                    controls-position="right"
                    placeholder="20"
                  />
                  <span class="unit-label">dB</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">传输速率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.dataRateKbps"
                    :min="0.1"
                    :max="1000000"
                    :step="1"
                    :precision="1"
                    controls-position="right"
                    placeholder="13"
                  />
                  <span class="unit-label">Kbps</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">传输时延</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.transmissionDelay"
                    :min="0"
                    :max="10000"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="0"
                  />
                  <span class="unit-label">ms</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3.2: UHF多径衰落配置 -->
          <div v-if="isUhf" class="config-section">
            <div class="section-title-block multipath-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">多径衰落配置</div>
              <button class="add-multipath-btn" @click="addMultipathRow" type="button">
                + 添加路径
              </button>
            </div>

            <div class="form-content">
              <div v-if="!formData.multipath || formData.multipath.length === 0" class="empty-multipath">
                暂无多径配置，请点击"添加路径"创建
              </div>

              <div v-for="(path, index) in formData.multipath || []" :key="index" class="multipath-row">
                <div class="multipath-index">路径 {{ index + 1 }}</div>
                <div class="multipath-fields">
                  <div class="multipath-field">
                    <label>功率</label>
                    <el-input-number
                      v-model="path.power_db"
                      :min="-100"
                      :max="50"
                      :step="0.5"
                      :precision="1"
                      controls-position="right"
                    />
                    <span class="field-unit">dB</span>
                  </div>

                  <div class="multipath-field">
                    <label>时延</label>
                    <el-input-number
                      v-model="path.delay_us"
                      :min="0"
                      :max="100000"
                      :step="0.1"
                      :precision="1"
                      controls-position="right"
                    />
                    <span class="field-unit">us</span>
                  </div>

                  <div class="multipath-field">
                    <label>频偏</label>
                    <el-input-number
                      v-model="path.freq_offset"
                      :min="-100000"
                      :max="100000"
                      :step="1"
                      controls-position="right"
                    />
                    <span class="field-unit">Hz</span>
                  </div>

                  <button
                    v-if="(formData.multipath || []).length > 1"
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

          <!-- Section 3.3: 5G信道参数 -->
          <div v-if="isFiveG" class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">信道参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">采样率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.samplingRate"
                    :min="1"
                    :max="200000000"
                    :step="1000"
                    controls-position="right"
                    placeholder="30720000"
                  />
                  <span class="unit-label">Hz</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">传输速率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.dataRateKbps"
                    :min="0.1"
                    :max="10000000"
                    :step="1"
                    :precision="1"
                    controls-position="right"
                    placeholder="130000"
                  />
                  <span class="unit-label">Kbps</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">传输时延</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.transmissionDelay"
                    :min="0"
                    :max="10000"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="5"
                  />
                  <span class="unit-label">ms</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3.4: 5G多径衰落配置 -->
          <div v-if="isFiveG" class="config-section">
            <div class="section-title-block multipath-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">多径衰落配置</div>
              <button class="add-multipath-btn" @click="addMultipathRow" type="button">
                + 添加路径
              </button>
            </div>

            <div class="form-content">
              <div v-if="!formData.multipath || formData.multipath.length === 0" class="empty-multipath">
                暂无多径配置，请点击"添加路径"创建
              </div>

              <div v-for="(path, index) in formData.multipath || []" :key="index" class="multipath-row">
                <div class="multipath-index">路径 {{ index + 1 }}</div>
                <div class="multipath-fields">
                  <div class="multipath-field">
                    <label>功率</label>
                    <el-input-number
                      v-model="path.power_db"
                      :min="-100"
                      :max="50"
                      :step="0.5"
                      :precision="1"
                      controls-position="right"
                    />
                    <span class="field-unit">dB</span>
                  </div>

                  <div class="multipath-field">
                    <label>时延</label>
                    <el-input-number
                      v-model="path.delay_us"
                      :min="0"
                      :max="100000"
                      :step="0.1"
                      :precision="1"
                      controls-position="right"
                    />
                    <span class="field-unit">μs</span>
                  </div>

                  <div class="multipath-field">
                    <label>频偏</label>
                    <el-input-number
                      v-model="path.freq_offset"
                      :min="-100000"
                      :max="100000"
                      :step="1"
                      controls-position="right"
                    />
                    <span class="field-unit">Hz</span>
                  </div>

                  <button
                    v-if="(formData.multipath || []).length > 1"
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

          <!-- Section 3.5: 测控链/协同链/自组网信道参数 -->
          <div v-if="isTtcLike" class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">信道参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">采样率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.samplingRate"
                    :min="1"
                    :max="100000000"
                    :step="1000"
                    controls-position="right"
                    placeholder="4000000"
                  />
                  <span class="unit-label">Hz</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">传输速率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.dataRateKbps"
                    :min="0.1"
                    :max="1000000"
                    :step="1"
                    :precision="1"
                    controls-position="right"
                    placeholder="2000"
                  />
                  <span class="unit-label">Kbps</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">传输时延</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.transmissionDelay"
                    :min="0"
                    :max="10000"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="5"
                  />
                  <span class="unit-label">ms</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3.6: 测控链/协同链/自组网多径衰落配置 -->
          <div v-if="isTtcLike" class="config-section">
            <div class="section-title-block multipath-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">多径衰落配置</div>
              <button class="add-multipath-btn" @click="addMultipathRow" type="button">
                + 添加路径
              </button>
            </div>

            <div class="form-content">
              <div v-if="!formData.multipath || formData.multipath.length === 0" class="empty-multipath">
                暂无多径配置，请点击"添加路径"创建
              </div>

              <div v-for="(path, index) in formData.multipath || []" :key="index" class="multipath-row">
                <div class="multipath-index">路径 {{ index + 1 }}</div>
                <div class="multipath-fields">
                  <div class="multipath-field">
                    <label>功率</label>
                    <el-input-number
                      v-model="path.power_db"
                      :min="-100"
                      :max="50"
                      :step="0.5"
                      :precision="1"
                      controls-position="right"
                    />
                    <span class="field-unit">dB</span>
                  </div>

                  <div class="multipath-field">
                    <label>时延</label>
                    <el-input-number
                      v-model="path.delay_us"
                      :min="0"
                      :max="100000"
                      :step="0.1"
                      :precision="1"
                      controls-position="right"
                    />
                    <span class="field-unit">μs</span>
                  </div>

                  <div class="multipath-field">
                    <label>频偏</label>
                    <el-input-number
                      v-model="path.freq_offset"
                      :min="-100000"
                      :max="100000"
                      :step="1"
                      controls-position="right"
                    />
                    <span class="field-unit">Hz</span>
                  </div>

                  <button
                    v-if="(formData.multipath || []).length > 1"
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

          <!-- Section 4: 卫星链路参数 (GFSK) -->
          <div v-if="isGfsk" class="config-section">
            <div class="section-title-block">
              <div class="title-indicator"></div>
              <div class="section-title">卫星链路参数</div>
            </div>

            <div class="form-content">
              <div class="form-row">
                <div class="form-label">卫星高度</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.satAltKm"
                    :min="0"
                    :max="50000"
                    :step="1"
                    controls-position="right"
                    placeholder="0-50000"
                  />
                  <span class="unit-label">km</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">径向速度</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.radialVelocityMps"
                    :min="-20000"
                    :max="20000"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="-20000-20000"
                  />
                  <span class="unit-label">m/s</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">带宽</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.bandwidthMHz"
                    :min="0"
                    :max="1000"
                    :step="1"
                    controls-position="right"
                    placeholder="0-1000"
                  />
                  <span class="unit-label">MHz</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">降雨率</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.rainRateMmh"
                    :min="0"
                    :max="200"
                    :step="0.1"
                    :precision="1"
                    controls-position="right"
                    placeholder="0-200"
                  />
                  <span class="unit-label">mm/h</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-label">最大重传次数</div>
                <div class="form-input-with-unit">
                  <el-input-number
                    v-model="formData.maxRetransmissions"
                    :min="0"
                    :max="16"
                    :step="1"
                    controls-position="right"
                    placeholder="0-16"
                  />
                  <span class="unit-label">次</span>
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
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'
import {
  getDialogConfig,
  type ChannelModelDialogConfig,
  type ChannelModelFormData,
} from '@/config/channelModelDialogConfig'

const props = defineProps<{
  visible: boolean
  position: { lat: number; lon: number; alt: number }
  modelType: string
  nodeId?: number
}>()

const emit = defineEmits<{
  confirm: [data: ChannelModelFormData & { modelType: string }]
  cancel: []
}>()

const dialogVisible = ref(false)

const config = computed<ChannelModelDialogConfig>(() => {
  return getDialogConfig(props.modelType) || getDialogConfig('vhf')!
})

const isGfsk = computed(() => config.value.modelType === 'gfsk')
const isDss = computed(() => config.value.modelType === 'dss')
const isFhss = computed(() => config.value.modelType === 'fhss')
const isUhf = computed(() => config.value.modelType === 'uhf' || config.value.modelType === 'vhf')
const isFiveG = computed(() => config.value.modelType === 'fiveG')
const isTtcLike = computed(() =>
  config.value.modelType === 'ttc' ||
  config.value.modelType === 'coordination' ||
  config.value.modelType === 'adhoc'
)
const frequencyUnitLabel = computed(() => isFhss.value ? 'kHz' : 'MHz')

const getCenterFreqDisplayValue = (centerFreq: number | undefined, cfg: ChannelModelDialogConfig) => {
  if (centerFreq === undefined || centerFreq === null) {
    return cfg.defaults.centerFreq
  }

  if (!isFhss.value) {
    return centerFreq / 1000000
  }

  const maxFhssKHz = cfg.freqRange.max
  const maxFhssHz = maxFhssKHz * 1000
  if (centerFreq <= maxFhssKHz) {
    return centerFreq
  }
  if (centerFreq <= maxFhssHz) {
    return centerFreq / 1000
  }

  // 兼容旧版本按 MHz 保存的 FHSS 数据，例如 2437 * 1_000_000。
  return centerFreq / 1000000
}

const themeVars = computed(() => ({
  '--theme-color': config.value.themeColor,
  '--theme-color-secondary': config.value.themeColorSecondary,
  '--confirm-color-dark': config.value.confirmColorDark,
}))

const DEFAULT_UHF_MULTIPATH = [
  { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
  { power_db: -3.0, delay_us: 5.0, freq_offset: 50.0 },
  { power_db: -6.0, delay_us: 10.0, freq_offset: -20.0 },
]

const DEFAULT_5G_MULTIPATH = [
  { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0, snr_db: 0 },
  { power_db: -3.0, delay_us: 0.2, freq_offset: 80.0, snr_db: 0 },
  { power_db: -8.0, delay_us: 0.8, freq_offset: -120.0, snr_db: 0 },
]

const normalizeMultipath = (value?: Array<{ power_db: number; delay_us: number; freq_offset: number; snr_db?: number }>) => {
  const base = Array.isArray(value) && value.length > 0 ? value : DEFAULT_UHF_MULTIPATH
  const normalized = base.slice(0, 3).map((path, index) => ({
    power_db: Number.isFinite(path?.power_db) ? path.power_db : DEFAULT_UHF_MULTIPATH[index].power_db,
    delay_us: Number.isFinite(path?.delay_us) ? path.delay_us : DEFAULT_UHF_MULTIPATH[index].delay_us,
    freq_offset: Number.isFinite(path?.freq_offset) ? path.freq_offset : DEFAULT_UHF_MULTIPATH[index].freq_offset,
    snr_db: Number.isFinite(path?.snr_db) ? path.snr_db : undefined,
  }))

  while (normalized.length < 3) {
    const index = normalized.length
    normalized.push({ ...DEFAULT_UHF_MULTIPATH[index] })
  }

  return normalized
}

const DEFAULT_TTCLIKE_MULTIPATH = [
  { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0, snr_db: 0 },
  { power_db: -3.0, delay_us: 0.5, freq_offset: 30.0, snr_db: 0 },
  { power_db: -8.0, delay_us: 2.0, freq_offset: -50.0, snr_db: 0 },
]

const addMultipathRow = () => {
  if (!isUhf.value && !isFiveG.value && !isTtcLike.value) return
  if (!formData.value.multipath) {
    formData.value.multipath = []
  }
  if (formData.value.multipath.length >= 3) {
    ElMessage.warning(isUhf.value ? 'UHF多径路径固定为3条' : '多径路径最多为3条')
    return
  }
  const index = formData.value.multipath.length
  if (isTtcLike.value) {
    const preset = DEFAULT_TTCLIKE_MULTIPATH[index] || DEFAULT_TTCLIKE_MULTIPATH[DEFAULT_TTCLIKE_MULTIPATH.length - 1]
    formData.value.multipath.push({ ...preset })
  } else if (isFiveG.value) {
    const preset = DEFAULT_5G_MULTIPATH[index] || DEFAULT_5G_MULTIPATH[DEFAULT_5G_MULTIPATH.length - 1]
    formData.value.multipath.push({ ...preset })
  } else {
    const preset = DEFAULT_UHF_MULTIPATH[index] || DEFAULT_UHF_MULTIPATH[DEFAULT_UHF_MULTIPATH.length - 1]
    formData.value.multipath.push({ ...preset })
  }
}

const removeMultipathRow = (index: number) => {
  if ((!isUhf.value && !isFiveG.value && !isTtcLike.value) || !formData.value.multipath) return
  if (formData.value.multipath.length <= 1) {
    ElMessage.warning('至少保留一个多径路径')
    return
  }
  formData.value.multipath.splice(index, 1)
}

function createDefaultFormData(cfg: ChannelModelDialogConfig, alt: number): ChannelModelFormData {
  return {
    mode: cfg.defaults.mode,
    adaptive: cfg.defaults.adaptive,
    modulation_type: cfg.defaults.modulation_type,
    txPower: cfg.defaults.txPower,
    centerFreq: cfg.defaults.centerFreq,
    k_factor: cfg.defaults.k_factor,
    speed: cfg.defaults.speed,
    samplingRate: cfg.defaults.samplingRate,
    snr_db: cfg.defaults.snr_db,
    noiseFigureDb: cfg.defaults.noiseFigureDb,
    shadowFadingDb: cfg.defaults.shadowFadingDb,
    seed: cfg.defaults.seed,
    multipath: cfg.defaults.multipath ? normalizeMultipath(cfg.defaults.multipath) : undefined,
    satAltKm: cfg.defaults.satAltKm,
    radialVelocityMps: cfg.defaults.radialVelocityMps,
    downlinkTxPowerDbw: cfg.defaults.downlinkTxPowerDbw,
    bandwidthMHz: cfg.defaults.bandwidthMHz,
    rainRateMmh: cfg.defaults.rainRateMmh,
    maxRetransmissions: cfg.defaults.maxRetransmissions,
    transmissionDelay: cfg.defaults.transmissionDelay ?? 0.0,
    networkTransmissionRateBps: cfg.defaults.networkTransmissionRateBps,
    dataRateKbps: cfg.defaults.dataRateKbps ?? 13.0,
    codingScheme: cfg.defaults.codingScheme,
    codeRate: cfg.defaults.codeRate,
    height: alt || 0,
  }
}

const formData = ref<ChannelModelFormData>(
  createDefaultFormData(config.value, 0)
)

watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal
    if (!newVal) return

    const cfg = config.value

    // 尝试从持久化存储中读取已保存的配置
    if (props.nodeId) {
      const channelModelDataStore = useChannelModelDataStore()
      const savedNodeData = channelModelDataStore.getNodeData(props.nodeId)

      if (savedNodeData && savedNodeData.modelType === cfg.modelType) {
        const centerFreqDisplayValue = getCenterFreqDisplayValue(savedNodeData.centerFreq, cfg)
        formData.value = {
          mode: savedNodeData.mode || cfg.defaults.mode,
          adaptive: savedNodeData.adaptive ?? cfg.defaults.adaptive,
          modulation_type: savedNodeData.modulation_type || cfg.defaults.modulation_type,
          txPower: savedNodeData.txPower ?? cfg.defaults.txPower,
          centerFreq: centerFreqDisplayValue,
          k_factor: savedNodeData.k_factor ?? cfg.defaults.k_factor,
          speed: savedNodeData.speed ?? savedNodeData.phy?.speed ?? cfg.defaults.speed,
          samplingRate: savedNodeData.samplingRate ?? savedNodeData.phy?.samplingRate ?? cfg.defaults.samplingRate,
          snr_db: savedNodeData.snr_db ?? savedNodeData.phy?.snr_db ?? cfg.defaults.snr_db,
          noiseFigureDb: savedNodeData.noiseFigureDb ?? savedNodeData.phy?.noiseFigureDb ?? cfg.defaults.noiseFigureDb,
          shadowFadingDb: savedNodeData.shadowFadingDb ?? savedNodeData.phy?.shadowFadingDb ?? cfg.defaults.shadowFadingDb,
          seed: savedNodeData.seed ?? savedNodeData.phy?.seed ?? cfg.defaults.seed,
          multipath: (isUhf.value || isFiveG.value || isTtcLike.value)
            ? normalizeMultipath(savedNodeData.multipath ?? savedNodeData.phy?.multipath ?? cfg.defaults.multipath)
            : undefined,
          satAltKm: savedNodeData.satAltKm ?? cfg.defaults.satAltKm,
          radialVelocityMps: savedNodeData.radialVelocityMps ?? cfg.defaults.radialVelocityMps,
          downlinkTxPowerDbw: savedNodeData.downlinkTxPowerDbw ?? cfg.defaults.downlinkTxPowerDbw,
          bandwidthMHz: (savedNodeData.bandwidthHz ?? (cfg.defaults.bandwidthMHz ?? 0) * 1000000) / 1000000,
          rainRateMmh: savedNodeData.rainRateMmh ?? cfg.defaults.rainRateMmh,
          maxRetransmissions: savedNodeData.maxRetransmissions ?? cfg.defaults.maxRetransmissions,
          transmissionDelay: savedNodeData.transmissionDelay ?? cfg.defaults.transmissionDelay ?? 0.0,
          networkTransmissionRateBps: savedNodeData.networkTransmissionRateBps ?? cfg.defaults.networkTransmissionRateBps,
          dataRateKbps: savedNodeData.dataRateKbps ?? cfg.defaults.dataRateKbps ?? 13.0,
          codingScheme: savedNodeData.codingScheme || cfg.defaults.codingScheme,
          codeRate: savedNodeData.codeRate || cfg.defaults.codeRate,
          height: savedNodeData.height ?? (props.position.alt || 0),
        }
        return
      }
    }

    // 新建节点，使用默认值
    formData.value = createDefaultFormData(cfg, props.position.alt)
  }
)

const handleConfirm = () => {
  const cfg = config.value

  // 验证第一个 section
  if (cfg.firstSection === 'mode' || isDss.value) {
    if (!formData.value.mode) {
      ElMessage.warning('请选择频率模式')
      return
    }
  }

  if (cfg.firstSection !== 'mode') {
    if (formData.value.modulation_type === null || formData.value.modulation_type === undefined || formData.value.modulation_type === '') {
      ElMessage.warning('请选择调制方式')
      return
    }
  }

  if (formData.value.txPower === null || formData.value.txPower === undefined) {
    ElMessage.warning('请输入发射功率')
    return
  }

  if (formData.value.centerFreq === null || formData.value.centerFreq === undefined) {
    ElMessage.warning('请输入工作频率')
    return
  }

  // 频率范围校验
  if (cfg.freqValidationMsg) {
    if (
      formData.value.centerFreq < cfg.freqRange.min ||
      formData.value.centerFreq > cfg.freqRange.max
    ) {
      ElMessage.warning(cfg.freqValidationMsg)
      return
    }
  }

  if (formData.value.transmissionDelay === null || formData.value.transmissionDelay === undefined) {
    ElMessage.warning('请输入传输时延')
    return
  }

  if (formData.value.transmissionDelay < 0 || formData.value.transmissionDelay > 1000) {
    ElMessage.warning('传输时延必须在0-1000ms范围内')
    return
  }

  if (!formData.value.codingScheme) {
    ElMessage.warning('请选择编码方式')
    return
  }

  if (!formData.value.codeRate) {
    ElMessage.warning('请选择码率')
    return
  }

  if (isDss.value) {
    if (formData.value.speed === null || formData.value.speed === undefined) {
      ElMessage.warning('请输入速度')
      return
    }

    if (formData.value.networkTransmissionRateBps === null || formData.value.networkTransmissionRateBps === undefined) {
      ElMessage.warning('请输入传输速率')
      return
    }
  }

  if (isGfsk.value) {
    if (formData.value.satAltKm === null || formData.value.satAltKm === undefined) {
      ElMessage.warning('请输入卫星高度')
      return
    }

    if (formData.value.radialVelocityMps === null || formData.value.radialVelocityMps === undefined) {
      ElMessage.warning('请输入径向速度')
      return
    }

    if (formData.value.downlinkTxPowerDbw === null || formData.value.downlinkTxPowerDbw === undefined) {
      ElMessage.warning('请输入下行发射功率')
      return
    }

    if (formData.value.bandwidthMHz === null || formData.value.bandwidthMHz === undefined) {
      ElMessage.warning('请输入带宽')
      return
    }

    if (formData.value.rainRateMmh === null || formData.value.rainRateMmh === undefined) {
      ElMessage.warning('请输入降雨率')
      return
    }

    if (formData.value.maxRetransmissions === null || formData.value.maxRetransmissions === undefined) {
      ElMessage.warning('请输入最大重传次数')
      return
    }

    if (formData.value.maxRetransmissions < 0 || formData.value.maxRetransmissions > 16) {
      ElMessage.warning('最大重传次数必须在0-16范围内')
      return
    }
  }

  if (isFhss.value) {
    if (formData.value.speed === null || formData.value.speed === undefined) {
      ElMessage.warning('请输入速度')
      return
    }

    if (formData.value.noiseFigureDb === null || formData.value.noiseFigureDb === undefined) {
      ElMessage.warning('请输入热噪声系数')
      return
    }

    if (formData.value.shadowFadingDb === null || formData.value.shadowFadingDb === undefined) {
      ElMessage.warning('请输入阴影损耗')
      return
    }

    if (formData.value.seed === null || formData.value.seed === undefined) {
      ElMessage.warning('请输入随机数种子')
      return
    }

    if (formData.value.seed < 0 || formData.value.seed > 2147483647) {
      ElMessage.warning('随机数种子必须在0-2147483647范围内')
      return
    }
  }

  if (isUhf.value) {
    if (formData.value.speed === null || formData.value.speed === undefined) {
      ElMessage.warning('请输入速度')
      return
    }

    if (formData.value.samplingRate === null || formData.value.samplingRate === undefined) {
      ElMessage.warning('请输入采样率')
      return
    }

    if (formData.value.snr_db === null || formData.value.snr_db === undefined) {
      ElMessage.warning('请输入背景SNR')
      return
    }

    formData.value.multipath = normalizeMultipath(formData.value.multipath)

    if (!formData.value.multipath || formData.value.multipath.length !== 3) {
      ElMessage.warning('多径参数必须为3条')
      return
    }

    for (const [index, path] of formData.value.multipath.entries()) {
      if (!Number.isFinite(path.power_db) || !Number.isFinite(path.delay_us) ||
          !Number.isFinite(path.freq_offset)) {
        ElMessage.warning(`多径路径${index + 1}参数无效`)
        return
      }
    }
  }

  if (isFiveG.value) {
    if (formData.value.speed === null || formData.value.speed === undefined) {
      ElMessage.warning('请输入速度')
      return
    }

    if (formData.value.samplingRate === null || formData.value.samplingRate === undefined) {
      ElMessage.warning('请输入采样率')
      return
    }

    if (formData.value.dataRateKbps === null || formData.value.dataRateKbps === undefined) {
      ElMessage.warning('请输入传输速率')
      return
    }

    formData.value.multipath = normalizeMultipath(formData.value.multipath)

    if (!formData.value.multipath || formData.value.multipath.length < 1 || formData.value.multipath.length > 3) {
      ElMessage.warning('5G多径路径数量必须为1-3条')
      return
    }

    for (const [index, path] of formData.value.multipath.entries()) {
      if (!Number.isFinite(path.power_db) || !Number.isFinite(path.delay_us) ||
          !Number.isFinite(path.freq_offset)) {
        ElMessage.warning(`多径路径${index + 1}参数无效`)
        return
      }
    }
  }

  if (isTtcLike.value) {
    if (formData.value.speed === null || formData.value.speed === undefined) {
      ElMessage.warning('请输入速度')
      return
    }

    if (formData.value.samplingRate === null || formData.value.samplingRate === undefined) {
      ElMessage.warning('请输入采样率')
      return
    }

    if (formData.value.dataRateKbps === null || formData.value.dataRateKbps === undefined) {
      ElMessage.warning('请输入传输速率')
      return
    }

    formData.value.multipath = normalizeMultipath(formData.value.multipath)

    if (!formData.value.multipath || formData.value.multipath.length < 1 || formData.value.multipath.length > 3) {
      ElMessage.warning('多径路径数量必须为1-3条')
      return
    }

    for (const [index, path] of formData.value.multipath.entries()) {
      if (!Number.isFinite(path.power_db) || !Number.isFinite(path.delay_us) ||
          !Number.isFinite(path.freq_offset)) {
        ElMessage.warning(`多径路径${index + 1}参数无效`)
        return
      }
    }
  }

  const submitData = { ...formData.value, modelType: cfg.modelType }
  if (isUhf.value && Array.isArray(submitData.multipath)) {
    submitData.multipath = submitData.multipath.map(({ power_db, delay_us, freq_offset }) => ({
      power_db,
      delay_us,
      freq_offset,
    }))
  }

  emit('confirm', submitData)
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
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

/* 对话框容器 */
.custom-dialog {
  width: 600px;
  background: rgba(30, 39, 54, 0.95);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  font-family: "Microsoft YaHei", sans-serif;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  animation: slideIn 0.3s ease;
  position: relative;
  overflow: hidden;
  max-height: 90vh;
}

.custom-dialog::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--theme-color, #4caf50), transparent);
  opacity: 0.5;
}

/* 对话框标题栏 */
.custom-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(41, 54, 73, 0.8);
  background: rgba(30, 39, 54, 0.8);
}

.custom-dialog-title {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.5px;
  position: relative;
  padding-left: 12px;
}

.custom-dialog-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background: var(--theme-color, #4caf50);
  border-radius: 2px;
}

.custom-dialog-close {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #7f8c9d;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  padding: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.custom-dialog-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: rotate(90deg);
}

.close-icon {
  font-style: normal;
}

/* 对话框内容区 */
.custom-dialog-body {
  padding: 24px;
  max-height: 65vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--theme-color, #4caf50) 30%, transparent) transparent;
}

.custom-dialog-body::-webkit-scrollbar {
  width: 6px;
}

.custom-dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.custom-dialog-body::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--theme-color, #4caf50) 30%, transparent);
  border-radius: 3px;
}

/* 表单样式 */
.config-form {
  margin: 0;
}

.config-section {
  margin-bottom: 20px;
  background: rgba(40, 57, 80, 0.3);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid color-mix(in srgb, var(--theme-color, #4caf50) 10%, transparent);
  transition: all 0.3s ease;
}

.config-section:hover {
  border-color: color-mix(in srgb, var(--theme-color, #4caf50) 30%, transparent);
  box-shadow: 0 0 20px color-mix(in srgb, var(--theme-color, #4caf50) 10%, transparent);
}

.section-title-block {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.title-indicator {
  width: 4px;
  height: 16px;
  background: linear-gradient(
    180deg,
    var(--theme-color, #4caf50),
    var(--theme-color-secondary, #81c784)
  );
  margin-right: 10px;
  border-radius: 2px;
  box-shadow: 0 0 10px color-mix(in srgb, var(--theme-color, #4caf50) 30%, transparent);
}

.section-title {
  font-size: 14px;
  color: var(--theme-color, #4caf50);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.form-content {
  display: flex;
  flex-direction: column;
  padding: 5px 0;
}

.form-row {
  display: flex;
  margin-bottom: 12px;
  align-items: center;
  transition: all 0.3s ease;
  padding: 4px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-row:hover {
  background: color-mix(in srgb, var(--theme-color, #4caf50) 5%, transparent);
  border-radius: 6px;
}

.form-label {
  width: 100px;
  text-align: right;
  padding-right: 10px;
  color: #a0aec0;
  font-size: 13px;
  font-weight: 500;
}

.form-input {
  flex: 1;
  min-width: 0;
}

.form-input-with-unit {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
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

.multipath-title-block {
  justify-content: space-between;
}

.multipath-title-block .section-title {
  flex: 1;
}

.add-multipath-btn:hover {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.25), rgba(76, 175, 80, 0.15));
  border-color: rgba(76, 175, 80, 0.6);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.15);
  transform: translateY(-2px);
}

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

.remove-btn:hover {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.25), rgba(244, 67, 54, 0.15));
  border-color: rgba(244, 67, 54, 0.4);
  color: #fff;
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.15);
  transform: translateY(-2px);
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

.unit-label {
  color: #a0aec0;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  padding: 0 4px;
}

/* 对话框底部 */
.custom-dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px 24px;
  background: rgba(30, 39, 54, 0.8);
  border-top: 1px solid rgba(41, 54, 73, 0.8);
  gap: 8px;
}

/* 按钮样式 */
.dialog-btn {
  min-width: 90px;
  height: 36px;
  font-size: 14px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.dialog-btn::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.dialog-btn:hover::after {
  transform: translateX(100%);
}

.cancel-btn {
  background: rgba(40, 57, 80, 0.8);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-btn:hover {
  background: rgba(53, 70, 92, 0.8);
  transform: translateY(-1px);
}

.confirm-btn {
  background: linear-gradient(
    135deg,
    var(--confirm-color-dark, #388e3c),
    var(--theme-color, #4caf50)
  );
  color: #fff;
  box-shadow: 0 4px 15px color-mix(in srgb, var(--theme-color, #4caf50) 30%, transparent);
}

.confirm-btn:hover {
  background: linear-gradient(
    135deg,
    var(--theme-color, #4caf50),
    var(--confirm-color-dark, #388e3c)
  );
  transform: translateY(-1px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--theme-color, #4caf50) 40%, transparent);
}

/* Element Plus 样式覆盖 */
:deep(.el-input__wrapper) {
  background-color: rgba(40, 57, 80, 0.5) !important;
  box-shadow: none !important;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  border-color: color-mix(in srgb, var(--theme-color, #4caf50) 30%, transparent);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: var(--theme-color, #4caf50);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--theme-color, #4caf50) 20%, transparent) !important;
}

:deep(.el-input__inner) {
  color: #fff;
  height: 32px;
  font-size: 13px;
}

:deep(.el-select__wrapper) {
  background-color: rgba(40, 57, 80, 0.5) !important;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-select__popper) {
  z-index: 10000 !important;
}

:deep(.el-select-dropdown__item) {
  color: #fff;
  background: transparent;
}

:deep(.el-select-dropdown__item.hover),
:deep(.el-select-dropdown__item:hover) {
  background-color: color-mix(in srgb, var(--theme-color, #4caf50) 10%, transparent);
  color: var(--theme-color, #4caf50);
}

:deep(.el-select-dropdown__item.selected) {
  color: var(--theme-color, #4caf50) !important;
  background-color: color-mix(in srgb, var(--theme-color, #4caf50) 20%, transparent) !important;
  font-weight: bold;
}

:deep(.el-input-number__decrease),
:deep(.el-input-number__increase) {
  color: #a0aec0;
  background: color-mix(in srgb, var(--theme-color, #4caf50) 10%, transparent);
}

:deep(.el-input-number__decrease:hover),
:deep(.el-input-number__increase:hover) {
  color: var(--theme-color, #4caf50);
  background: color-mix(in srgb, var(--theme-color, #4caf50) 20%, transparent);
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--theme-color, #4caf50);
  border-color: var(--theme-color, #4caf50);
}

.form-input-with-unit :deep(.el-input-number) {
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
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
