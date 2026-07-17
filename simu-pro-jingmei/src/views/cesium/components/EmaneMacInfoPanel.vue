00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008<template>
  <div class="neo-infobox emane-panel" :class="{'chart-mode': currentView === 'chart', 'channel-mode': currentView === 'channel', 'is-dragging': isDragging}" :style="panelStyle">
    <div class="neo-infobox-header" @mousedown="onHeaderMousedown">
      <span class="neo-infobox-title">
        <svg class="panel-icon" width="18" height="18" viewBox="0 0 18 18">
          <rect x="2" y="2" width="14" height="14" rx="2" fill="#4caf50" fill-opacity="0.3" />
          <circle cx="9" cy="9" r="4" fill="#4caf50" fill-opacity="0.6" />
          <circle cx="9" cy="9" r="2" fill="#4caf50" fill-opacity="0.8" />
        </svg> 
        链路监控
      </span>
      <span class="neo-infobox-close" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <line x1="5" y1="5" x2="15" y2="15" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round"/>
          <line x1="15" y1="5" x2="5" y2="15" stroke="#a5d6a7" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
    </div>
    <div class="neo-infobox-content" ref="panelContentRef">
      <div v-if="loading" class="loading-indicator">
        <div class="loading-spinner"></div>
        <span>加载数据中...</span>
      </div>
      
      <div v-else-if="!hasData" class="no-data-message">
        <div class="info-icon">!</div>
        <span class="info-message">暂无数据，等待消息更新...</span>
      </div>
      
      <template v-else>

        <div class="link-info" v-if="link">
          <div class="node-info-block">
            <div class="node-info-title">链路信息</div>
            <div class="neo-grid">
              <div class="neo-grid-item">
                <div class="item-label">源节点</div>
                <div class="item-value">{{ sourceNodeName }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">目标节点</div>
                <div class="item-value">{{ targetNodeName }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">当前视角</div>
                <div class="item-value highlight">{{ currentPerspective === 'source' ? sourceNodeName : targetNodeName }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">监控的NEM ID</div>
                <div class="item-value highlight">{{ selectedNemId }}</div>
              </div>
            </div>
            

            <div class="model-type-info" v-if="false">
              <div class="model-status" :class="[modelStatusClass]">
                <div class="model-label">子网模型:</div>
                <div class="model-value">{{ formattedModelType }}</div>
              </div>
            </div>
            

            <div class="perspective-toggle">
              <div class="toggle-label">选择监控视角:</div>
              <div class="toggle-buttons">
                <button 
                  class="perspective-btn" 
                  :class="{active: currentPerspective === 'source'}"
                  @click="switchPerspective('source')"
                >
                  {{ sourceNodeName }}
                </button>
                <button 
                  class="perspective-btn" 
                  :class="{active: currentPerspective === 'target'}"
                  @click="switchPerspective('target')"
                >
                  {{ targetNodeName }}
                </button>
              </div>
            </div>


            <div class="dual-perspective-stats" v-if="showDualPerspective && sourceNodeNemId && targetNodeNemId">
              <div class="dual-stats-header">双视角数据对比</div>
              <div class="dual-stats-grid">
                <div class="perspective-column">
                  <div class="perspective-title">{{ sourceNodeName }} 视角</div>
                  <div class="stat-row">
                    <div class="stat-label">平均SINR</div>
                    <div class="stat-value">{{ sourcePerspectiveStats?.sinrAvg?.toFixed(2) || 'N/A' }} dB</div>
                  </div>
                  <div class="stat-row" v-if="isRfPipeModel">
                    <div class="stat-label">平均接收功率</div>
                    <div class="stat-value">{{ sourcePerspectiveStats?.avgRxPower?.toFixed(2) || 'N/A' }} dBm</div>
                  </div>
                  <div class="stat-row">
                    <div class="stat-label">平均噪声基底</div>
                    <div class="stat-value">{{ sourcePerspectiveStats?.avgNoiseFloor?.toFixed(2) || 'N/A' }} dBm</div>
                  </div>
                </div>
                
                <div class="perspective-column">
                  <div class="perspective-title">{{ targetNodeName }} 视角</div>
                  <div class="stat-row">
                    <div class="stat-label">平均SINR</div>
                    <div class="stat-value">{{ targetPerspectiveStats?.sinrAvg?.toFixed(2) || 'N/A' }} dB</div>
                  </div>
                  <div class="stat-row" v-if="isRfPipeModel">
                    <div class="stat-label">平均接收功率</div>
                    <div class="stat-value">{{ targetPerspectiveStats?.avgRxPower?.toFixed(2) || 'N/A' }} dBm</div>
                  </div>
                  <div class="stat-row">
                    <div class="stat-label">平均噪声基底</div>
                    <div class="stat-value">{{ targetPerspectiveStats?.avgNoiseFloor?.toFixed(2) || 'N/A' }} dBm</div>
                  </div>
                </div>
              </div>
              
              <div class="link-quality-indicator">
                <div class="link-quality-label">链路质量评估:</div>
                <div class="link-quality-value" :class="linkQualityClass">{{ linkQualityText }}</div>
              </div>
            </div>
            
            <div class="toggle-dual-perspective">
              <el-switch
                v-model="showDualPerspective"
                active-text="显示双视角数据"
                inactive-text="关闭双视角数据"
                size="small"
              />
            </div>

            <!-- 调试按钮 -->
            <div class="debug-section" style="margin-top: 10px; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 4px;">
              <div style="color: #ff6b6b; font-size: 12px; margin-bottom: 5px;">调试工具</div>
              <button @click="debugTransmissionConfig" style="padding: 4px 8px; font-size: 11px; background: #ff6b6b; color: white; border: none; border-radius: 3px; cursor: pointer;">
                查看传输时延配置
              </button>
            </div>
          </div>
        </div>
        

        <div class="node-selector" v-if="!link">
          <span class="selector-label">选择视角NEM:</span>
          <el-select 
            v-model="viewpointNemId" 
            placeholder="选择视角" 
            size="small"
            class="nem-selector"
            @change="handleViewpointChange"
          >
            <el-option
              v-for="nemId in availableViewpoints"
              :key="nemId"
              :label="nemId"
              :value="nemId"
            />
          </el-select>

          <span class="selector-label" style="margin-left: 10px;">邻居NEM:</span>
          <el-select 
            v-model="selectedNemId" 
            placeholder="选择邻居" 
            size="small"
            class="nem-selector"
            :disabled="!viewpointNemId"
          >
            <el-option
              v-for="nemId in neighborNemIds"
              :key="nemId"
              :label="nemId"
              :value="nemId"
            />
          </el-select>

          <span class="last-updated" v-if="lastUpdated">
            最后更新: {{ formatTime(lastUpdated) }}
          </span>
        </div>
        

        <div class="cache-indicator" v-if="isUsingCachedData">
          <el-alert
            title="您正在查看缓存数据"
            type="warning"
            :closable="false"
            show-icon
            size="small"
          >
            <template #default>
              当前显示的是30秒内的历史数据，因为没有收到最新的EMANE数据更新。
            </template>
          </el-alert>
        </div>
        

        <div class="view-toggle">
          <el-radio-group v-model="currentView" size="small">
            <el-radio-button label="table">表格视图</el-radio-button>
            <el-radio-button label="chart">图表视图</el-radio-button>
            <el-radio-button label="channel" v-if="hasSimulationData">信道数据</el-radio-button>
          </el-radio-group>
        </div>
        

        <div v-if="currentView === 'table'">

          <div class="neo-section" v-if="tableMetricData">
            <div class="neo-section-title">
              <svg width="16" height="16" style="margin-right:4px;">
                <circle cx="8" cy="8" r="7" fill="#4caf50" fill-opacity="0.18"/>
              </svg>
              邻居节点指标
            </div>
            <div class="neo-grid">
              <div class="neo-grid-item">
                <div class="item-label">接收包数</div>
                <div class="item-value highlight">{{ tableMetricData.rxPkts }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">发送包数</div>
                <div class="item-value highlight">{{ tableMetricData.txPkts }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">丢失包数</div>
                <div class="item-value">{{ tableMetricData.missedPkts }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">带宽占用时间</div>
                <div class="item-value">{{ tableMetricData.bwUtil }} μs</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">最后接收时间戳</div>
                <div class="item-value">{{ tableMetricData.lastRx.toFixed(3) }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">最后发送时间戳</div>
                <div class="item-value">{{ tableMetricData.lastTx.toFixed(3) }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">平均SINR</div>
                <div class="item-value">{{ tableMetricData.sinrAvg.toFixed(2) }} dB</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">SINR标准差</div>
                <div class="item-value">{{ tableMetricData.sinrStdv.toFixed(2) }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">平均噪声基底</div>
                <div class="item-value">{{ tableMetricData.nfAvg.toFixed(2) }} dBm</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">噪声水平标准差</div>
                <div class="item-value">{{ tableMetricData.nfStdv.toFixed(2) }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">平均接收率</div>
                <div class="item-value">{{ tableMetricData.rxRateAvg.toFixed(2) }} bps</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">平均发送率</div>
                <div class="item-value">{{ tableMetricData.txRateAvg.toFixed(2) }} bps</div>
              </div>
            </div>
          </div>
          
          

          <div class="neo-section" v-if="tableStatusData">
            <div class="neo-section-title">
              <svg width="16" height="16" style="margin-right:4px;">
                <circle cx="8" cy="8" r="7" fill="#4caf50" fill-opacity="0.18"/>
              </svg>
              邻居节点状态
            </div>
            <div class="neo-grid">
              <div class="neo-grid-item">
                <div class="item-label">接收包数</div>
                <div class="item-value">{{ tableStatusData.rxPkts }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">发送包数</div>
                <div class="item-value">{{ tableStatusData.txPkts }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">丢失包数</div>
                <div class="item-value">{{ tableStatusData.missedPkts }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">平均SINR</div>
                <div class="item-value">{{ tableStatusData.sinrAvg.toFixed(2) }} dB</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">平均噪声基底</div>
                <div class="item-value">{{ tableStatusData.nfAvg.toFixed(2) }} dBm</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">自最后一次接收数据包以来的时间</div>
                <div class="item-value">{{ tableStatusData.rxRAge.toFixed(3) }} s</div>
              </div>
            </div>


            <div class="neo-section" v-if="tableRfSignalData && shouldShowRfSignalData">
              <div class="neo-section-title">
                <svg width="16" height="16" style="margin-right:4px;">
                  <circle cx="8" cy="8" r="7" fill="#4caf50" fill-opacity="0.18"/>
                </svg>
                RF信号数据
              </div>
              <div class="neo-grid">
              <div class="neo-grid-item">
                <div class="item-label">频率</div>
                <div class="item-value">{{ (tableRfSignalData.frequencyHz / 1000000).toFixed(2) }} Hz</div>
              </div>
                <div class="neo-grid-item">
                  <div class="item-label">样本数</div>
                  <div class="item-value">{{ tableRfSignalData.numSamples }}</div>
                </div>
                <div class="neo-grid-item">
                  <div class="item-label">平均接收功率</div>
                  <div class="item-value highlight">{{ tableRfSignalData.avgRxPower.toFixed(2) }} dBm</div>
                </div>
                <div class="neo-grid-item">
                  <div class="item-label">平均噪声基底</div>
                  <div class="item-value highlight">{{ tableRfSignalData.avgNoiseFloor.toFixed(2) }} dB</div>
                </div>
                <div class="neo-grid-item">
                  <div class="item-label">平均SINR</div>
                  <div class="item-value highlight">{{ tableRfSignalData.avgSINR.toFixed(2) }} dB</div>
                </div>
              </div>
            </div>
            

            <div class="neo-section rf-unavailable-section" v-else-if="props.link && formattedModelType && formattedModelType !== 'RF Pipe'">
              <div class="neo-section-title">
                <svg width="16" height="16" style="margin-right:4px;">
                  <circle cx="8" cy="8" r="7" fill="#ff9800" fill-opacity="0.18"/>
                </svg>
                RF信号数据
              </div>
              <div class="rf-unavailable-compact">
                <svg width="20" height="20" viewBox="0 0 20 20" class="info-icon-small">
                  <circle cx="10" cy="10" r="9" fill="none" stroke="#ff9800" stroke-width="1"/>
                  <text x="10" y="14" text-anchor="middle" fill="#ff9800" font-size="12">i</text>
                </svg>
                <span>当前模型无RF信号数据。</span>
              </div>
            </div>
          </div>

          <!-- 信道指标显示 -->
          <div class="neo-section channel-metrics-section" v-if="shouldShowChannelMetrics && displayChannelMetrics">
            <div class="neo-section-title">
              <svg width="16" height="16" style="margin-right:4px;">
                <circle cx="8" cy="8" r="7" fill="#2196f3" fill-opacity="0.18"/>
              </svg>
              信道指标数据
            </div>

            <!-- 暂无数据占位 -->
            <div v-if="!shouldShowChannelMetrics" style="padding: 12px 0; color: #7a8fa6; font-size: 12px; text-align: center;">暂无信道指标数据</div>

            <!-- 大尺度衰落 -->
            <div class="channel-metrics-group" v-if="displayChannelMetrics?.large_scale && Object.keys(displayChannelMetrics.large_scale).length > 0">
              <div class="group-title">大尺度衰落</div>
              <div class="neo-grid">
                <div class="neo-grid-item" v-if="displayChannelMetrics.large_scale?.total_loss_db !== undefined">
                  <div class="item-label">总衰减损耗</div>
                  <div class="item-value">{{ displayChannelMetrics.large_scale.total_loss_db.toFixed(2) }} dB</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.large_scale?.path_loss_db !== undefined">
                  <div class="item-label">路径损耗</div>
                  <div class="item-value">{{ displayChannelMetrics.large_scale.path_loss_db.toFixed(2) }} dB</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.large_scale?.shadowing_loss_db !== undefined">
                  <div class="item-label">阴影损耗</div>
                  <div class="item-value">{{ displayChannelMetrics.large_scale.shadowing_loss_db.toFixed(2) }} dB</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.large_scale?.distance_m !== undefined">
                  <div class="item-label">通信斜距</div>
                  <div class="item-value">{{ displayChannelMetrics.large_scale.distance_m.toFixed(2) }} m</div>
                </div>
              </div>
            </div>

            <!-- 小尺度衰落 -->
            <div class="channel-metrics-group" v-if="displayChannelMetrics?.small_scale && Object.keys(displayChannelMetrics.small_scale).length > 0">
              <div class="group-title">小尺度衰落</div>
              <div class="neo-grid">
                <div class="neo-grid-item" v-if="displayChannelMetrics.small_scale?.rician_k_db !== undefined">
                  <div class="item-label">莱斯因子K值</div>
                  <div class="item-value">{{ displayChannelMetrics.small_scale.rician_k_db === null ? 'N/A' : displayChannelMetrics.small_scale.rician_k_db.toFixed(2) + ' dB' }}</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.small_scale?.delay_spread_s !== undefined && displayChannelMetrics.small_scale?.delay_spread_s !== null">
                  <div class="item-label">时延扩展度</div>
                  <div class="item-value">{{ displayChannelMetrics.small_scale.delay_spread_s.toExponential(3) }} s</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.small_scale?.fading_loss_db !== undefined && displayChannelMetrics.small_scale?.fading_loss_db !== null">
                  <div class="item-label">瑞利/莱斯衰弱</div>
                  <div class="item-value">{{ displayChannelMetrics.small_scale.fading_loss_db.toFixed(2) }} dB</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.small_scale?.doppler_hz !== undefined && displayChannelMetrics.small_scale?.doppler_hz !== null">
                  <div class="item-label">多普勒频移</div>
                  <div class="item-value">{{ displayChannelMetrics.small_scale.doppler_hz.toFixed(4) }} Hz</div>
                </div>
              </div>
            </div>

            <!-- 链路质量 -->
<div class="channel-metrics-group" v-if="displayChannelMetrics?.link_quality && Object.keys(displayChannelMetrics.link_quality).length > 0">
              <div class="group-title">链路质量</div>
              <div class="neo-grid">
                <div class="neo-grid-item" v-if="displayChannelMetrics.link_quality?.snr_db !== undefined">
                  <div class="item-label">信噪比 (SNR)</div>
                  <div class="item-value highlight">{{ displayChannelMetrics.link_quality.snr_db.toFixed(2) }} dB</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.link_quality?.bit_error_rate !== undefined">
                  <div class="item-label">误码率</div>
                  <div class="item-value">{{ formatTinyNumber(displayChannelMetrics.link_quality.bit_error_rate) }}</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.link_quality?.receiver_noise_figure_db !== undefined && displayChannelMetrics.link_quality?.receiver_noise_figure_db !== null">
                  <div class="item-label">噪声系数</div>
                  <div class="item-value">{{ displayChannelMetrics.link_quality.receiver_noise_figure_db.toFixed(2) }} dB</div>
                </div>
                <div class="neo-grid-item" v-if="displayChannelMetrics.link_quality?.effective_noise_figure_db !== undefined && displayChannelMetrics.link_quality?.effective_noise_figure_db !== null">
                  <div class="item-label">等效本底噪声系数</div>
                  <div class="item-value">{{ displayChannelMetrics.link_quality.effective_noise_figure_db.toFixed(2) }} dB</div>
                </div>
              </div>
            </div>

            <!-- 网络特性 -->
<div class="channel-metrics-group" v-if="displayChannelMetrics?.network_characteristics && Object.keys(displayChannelMetrics.network_characteristics).length > 0">
              <div class="group-title">网络特性</div>
              <div class="neo-grid">
                <template v-if="isSatelliteChannelData">
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.transmission_delay_ms !== undefined">
                    <div class="item-label">单向传播时延</div>
                    <div class="item-value">{{ displayChannelMetrics.network_characteristics.transmission_delay_ms.toFixed(2) }} ms</div>
                  </div>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.bandwidth_limit_hz !== undefined">
                    <div class="item-label">可用带宽限制</div>
                    <div class="item-value">{{ displayChannelMetrics.network_characteristics.bandwidth_limit_hz.toFixed(0) }} Hz</div>
                  </div>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.transmission_rate_bps !== undefined">
                    <div class="item-label">有效净吞吐速率</div>
                    <div class="item-value">{{ displayChannelMetrics.network_characteristics.transmission_rate_bps.toFixed(0) }} bps</div>
                  </div>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.packet_loss_rate !== undefined">
                    <div class="item-label">最终丢包率</div>
                    <div class="item-value">{{ formatTinyNumber(displayChannelMetrics.network_characteristics.packet_loss_rate) }}</div>
                  </div>
                </template>
                <template v-else>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.packet_loss_rate !== undefined">
                    <div class="item-label">丢包率</div>
                    <div class="item-value">{{ formatTinyNumber(displayChannelMetrics.network_characteristics.packet_loss_rate) }}</div>
                  </div>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.delay_ms !== undefined">
                    <div class="item-label">传播时延</div>
                    <div class="item-value">{{ displayChannelMetrics.network_characteristics.delay_ms.toFixed(4) }} ms</div>
                  </div>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.bandwidth_limit_hz !== undefined">
                    <div class="item-label">信道带宽</div>
                    <div class="item-value">{{ (displayChannelMetrics.network_characteristics.bandwidth_limit_hz / 1000).toFixed(1) }} kHz</div>
                  </div>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.transmission_rate_bps !== undefined">
                    <div class="item-label">传输速率</div>
                    <div class="item-value">{{ (displayChannelMetrics.network_characteristics.transmission_rate_bps / 1000000).toFixed(2) }} Mbps</div>
                  </div>
                  <div class="neo-grid-item" v-if="displayChannelMetrics.network_characteristics?.transmission_delay_ms !== undefined">
                    <div class="item-label">传输时延</div>
                    <div class="item-value">{{ displayChannelMetrics.network_characteristics.transmission_delay_ms.toFixed(2) }} ms</div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
        

        <div v-if="currentView === 'chart'" class="chart-view">
          <!-- 图表类型选择 -->
          <div class="chart-type-selector">
            <el-radio-group v-model="chartType" size="small" @change="handleChartTypeChange">
              <el-radio-button label="line">折线图</el-radio-button>
              <el-radio-button label="bar">柱状图</el-radio-button>
            </el-radio-group>
          </div>

          <div class="chart-tabs">
            <el-tabs v-model="activeChartTab" @tab-click="handleChartTabChange">
              <el-tab-pane label="邻居节点指标" name="metric">
                <div ref="metricChartRef" class="chart-container"></div>
              </el-tab-pane>
              <el-tab-pane label="邻居节点状态" name="status">
                <div ref="statusChartRef" class="chart-container"></div>
              </el-tab-pane>

              <el-tab-pane v-if="shouldShowRfSignalData" label="RF信号数据" name="rfSignal">
                <div ref="rfSignalChartRef" class="chart-container"></div>
              </el-tab-pane>

              <el-tab-pane v-else label="RF信号数据" name="rfSignalUnavailable">
                <div class="rf-data-unavailable">
                  <div class="rf-icon">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="#a5d6a7" stroke-width="2"/>
                      <path d="M12,20 L28,20" stroke="#a5d6a7" stroke-width="2"/>
                      <path d="M12,14 L28,14" stroke="#a5d6a7" stroke-width="2" stroke-opacity="0.6"/>
                      <path d="M12,26 L28,26" stroke="#a5d6a7" stroke-width="2" stroke-opacity="0.6"/>
                    </svg>
                  </div>
                  <div class="rf-unavailable-title">RF信号数据不可用</div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>

        <!-- 新增：信道数据视图 -->
        <div v-if="currentView === 'channel'" class="channel-view">
          <div class="channel-header">
            <div class="channel-title">
              <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                <rect x="2" y="2" width="14" height="14" rx="2" fill="#2196f3" fill-opacity="0.3" />
                <circle cx="9" cy="9" r="4" fill="#2196f3" fill-opacity="0.6" />
                <circle cx="9" cy="9" r="2" fill="#2196f3" fill-opacity="0.8" />
              </svg>
              信道模型数据
            </div>
          </div>

          <div class="channel-tabs">
            <el-tabs v-model="activeChannelTab" @tab-click="handleChannelTabChange">
              <!-- 比特流标签页 -->
              <el-tab-pane v-if="currentModelName !== '5G'" :label="bitstreamTabLabel" name="bitstream">
                <div class="channel-chart-item">
                  <div ref="bitstreamChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 星座图标签页 -->
              <el-tab-pane v-if="!['5G', 'VHF', 'UHF'].includes(currentModelName)" :label="constellationTabLabel" name="constellation">
                <div class="channel-chart-item">
                  <div ref="constellationChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="currentModelName === 'DSSS' && hasTxSamplesData" label="发送IQ波形" name="dssTxIqWaveform">
                <div class="channel-chart-item">
                  <div ref="dssTxIqWaveformChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="currentModelName === 'DSSS' && hasRxSamplesData" label="接收IQ波形" name="dssRxIqWaveform">
                <div class="channel-chart-item">
                  <div ref="dssRxIqWaveformChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="currentModelName === 'FHSS'" label="信道IQ波形" name="fhssChannelIqWaveform">
                <div class="channel-chart-item">
                  <div ref="channelIqWaveformChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="currentModelName === 'FHSS'" label="恢复IQ波形" name="fhssRecoveredIqWaveform">
                <div class="channel-chart-item">
                  <div ref="recoveredIqWaveformChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- DSSS专用标签页 -->
              <el-tab-pane v-if="currentModelName === 'DSSS' && hasSpreadSamplesData" label="扩频后样本云图" name="spreadSamplesChart">
                <div class="channel-chart-item">
                  <div ref="spreadSamplesChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="currentModelName === 'DSSS' && hasDespreadSamplesData" label="解扩后样本云图" name="despreadSamplesChart">
                <div class="channel-chart-item">
                  <div ref="despreadSamplesChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- FHSS跳频序列图标签页 -->
              <el-tab-pane v-if="currentModelName === 'FHSS' && hasHopSequenceData" label="跳频序列" name="hopSequence">
                <div class="channel-chart-item">
                  <div ref="hopSequenceChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 云图标签页 -->
              <el-tab-pane v-if="!isRxIqWaveformModel && !['5G', 'VHF', 'UHF', 'DSSS', 'FHSS'].includes(currentModelName)" label="云图" name="cloudChart">
                <div class="channel-chart-item">
                  <div ref="cloudChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="supportsRxIqWaveform" label="RX IQ波形" name="rxIqWaveform">
                <div class="channel-chart-item">
                  <div ref="rxIqWaveformChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 发射机和接收机IQ对比 -->
              <el-tab-pane v-if="supportsIqComparison" label="收发IQ对比" name="iqComparison">
                <div class="channel-chart-item">
                  <div ref="iqComparisonChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="['VHF', 'UHF'].includes(currentModelName)" label="信道后星座图" name="constellationAfterChannel">
                <div class="channel-chart-item">
                  <div ref="constellationAfterChannelChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="['VHF', 'UHF', 'GFSK'].includes(currentModelName)" label="恢复星座图" name="restoredConstellation">
                <div class="channel-chart-item">
                  <div ref="restoredConstellationChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 5G通信数据标签页 -->
              <el-tab-pane v-if="currentModelName === '5G'" label="5G调制星座图" name="fiveGQamMapped">
                <div class="channel-chart-item">
                  <div ref="fiveGQamMappedChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <el-tab-pane v-if="currentModelName === '5G'" label="5G云图对比" name="fiveGCloudComparison">
                <div class="channel-chart-item">
                  <div ref="fiveGCloudComparisonChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 5G频谱图 -->
              <el-tab-pane v-if="currentModelName === '5G'" label="5G频谱图" name="fiveGSpectrum">
                <div class="channel-chart-item">
                  <div ref="fiveGSpectrumChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 5G数字波形（比特流） -->
              <el-tab-pane v-if="currentModelName === '5G'" label="5G数字波形" name="fiveGWaveform">
                <div class="channel-chart-item">
                  <div ref="fiveGWaveformChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 指标趋势标签页 -->
              <el-tab-pane label="指标趋势" name="trends">
                <div class="channel-chart-item">
                  <div ref="trendChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 频谱图标签页 -->
              <el-tab-pane v-if="currentModelName !== '5G' && hasSpectrumData" label="频谱图" name="spectrum">
                <div class="channel-chart-item">
                  <div ref="spectrumChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 载波频率图标签页（TTC/协同/自组网） -->
              <el-tab-pane v-if="['TTC', 'Coordination', 'AdHoc'].includes(currentModelName)" label="载波频率" name="carrierFreq">
                <div class="channel-chart-item">
                  <div ref="carrierFreqChartRef" style="width: 100%; height: 350px;"></div>
                </div>
              </el-tab-pane>

              <!-- 多径路径标签页 -->
              <el-tab-pane v-if="currentModelName !== '5G' && hasMultipathData" label="多径路径" name="multipath">
                <div class="channel-chart-item">
                  <div style="margin-bottom: 15px; padding: 10px; background: rgba(150, 100, 255, 0.1); border-radius: 6px;">
                    <div style="color: #a5d6a7; font-size: 13px; margin-bottom: 8px;">选择多径路径</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      <button
                        v-for="path in multipathDetails"
                        :key="path.id"
                        @click="selectedMultipathId = path.id"
                        :class="['multipath-btn', { active: selectedMultipathId === path.id }]"
                        :style="{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid rgba(150, 100, 255, 0.3)',
                          cursor: 'pointer',
                          background: selectedMultipathId === path.id ? 'rgba(150, 100, 255, 0.3)' : 'transparent',
                          color: selectedMultipathId === path.id ? '#9664ff' : '#a5d6a7',
                          transition: 'all 0.3s ease'
                        }"
                      >
                        路径#{{ path.id }} ({{ path.delay_us }}μs)
                      </button>
                    </div>
                    <div v-if="currentMultipathDetail" style="margin-top: 10px; color: #a5d6a7; font-size: 12px;">
                      <div>功率: {{ currentMultipathDetail.power_db }} dB | 延迟: {{ currentMultipathDetail.delay_us }} μs | 频偏: {{ currentMultipathDetail.freq_offset_hz ?? 0 }} Hz</div>
                    </div>
                  </div>

                  <div style="margin-bottom: 10px;">
                    <div style="color: #9664ff; font-size: 12px; margin-bottom: 8px;">频域数据（频谱）</div>
                    <div ref="multipathSpectrumChartRef" style="width: 100%; height: 250px;"></div>
                  </div>

                  <div>
                    <div style="color: #9664ff; font-size: 12px; margin-bottom: 8px;">时域数据（星座图）</div>
                    <div ref="multipathConstellationChartRef" style="width: 100%; height: 250px;"></div>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, onBeforeUnmount, nextTick, shallowRef, markRaw } from 'vue';
import { useEmaneStore } from '../../../store/modules/emane';
import { useTopoStore } from '../../../store/modules/topo';
import { useChannelModelDataStore } from '../../../store/modules/channelModelData';
import { useNemIdStore } from '../../../store/modules/nemId';
import { useTransmissionConfigStore } from '../../../store/modules/transmissionConfig';
import { storeToRefs } from 'pinia';
import * as echarts from 'echarts';
import type { Link, Node } from '../../../types/topo';
import type { NeighborMetricTable, NeighborStatusTable, RFSignalTable } from '../../../types/emane';

interface EnhancedLink extends Link {
  is_node_monitoring?: boolean;
  nem_id?: number;
  viewpoint_nem_id?: number;
  target_nem_id?: number;
}

interface EnhancedNode extends Node {
  displayModel?: string;
}

const props = defineProps<{
  link?: EnhancedLink;
  dssData?: any;
  fhssData?: any;
  gmskData?: any;
  gfskData?: any;
  uhfData?: any;
  vhfData?: any;
  fiveGData?: any;
  ttcData?: any;
  adhocData?: any;
  coordinationData?: any;
  customData?: any;
}>();

const emit = defineEmits(['close']);

// 导入仿真服务
import { dssSimulationService } from '@/services/dssSimulation'
import { fhssSimulationService } from '@/services/fhssSimulation'
import { gmskSimulationService } from '@/services/gmskSimulation'
import { gfskSimulationService } from '@/services/gfskSimulation'
import { ttcSimulationService } from '@/services/ttcSimulation'
import { adhocSimulationService } from '@/services/adhocSimulation'
import { coordinationSimulationService } from '@/services/coordinationSimulation'
import { vhfSimulationService } from '@/services/vhfSimulation'
import { uhfSimulationService } from '@/services/uhfSimulation'
import { fiveGSimulationService } from '@/services/fiveGSimulation'
import { customSimulationService } from '@/services/customSimulation'

const emaneStore = useEmaneStore();
const topoStore = useTopoStore();
const nemIdStore = useNemIdStore();
const transmissionConfigStore = useTransmissionConfigStore();
const { loading, lastUpdated } = storeToRefs(emaneStore);

// 格式化极小数字（用于丢包率和BER
const formatTinyNumber = (value: number | undefined, unit: string = '%'): string => {
  if (value === undefined || value === null) return 'N/A';

  // 对于极小的数字（小于1e-10），使用指数表示
  if (Math.abs(value) < 1e-10) {
    return value.toExponential(2) + unit;
  }

  // 对于较小但不极端的数字，乘以100后显
  const percentage = value * 100;
  if (percentage < 0.01) {
    // 仍然很小，使用指数表示法
    return percentage.toExponential(2) + unit;
  }

  // 正常显示为百分比
  return percentage.toFixed(2) + unit;
};

// 格式化延迟值（自动根据数值大小调整精度）
const formatDelay = (delayMs: number | undefined): string => {
  if (delayMs === undefined || delayMs === null) return 'N/A';

  // 对于极小的延迟（< 0.01ms），显示6位小
  if (delayMs < 0.01) {
    return delayMs.toFixed(6) + ' ms';
  }

  // 对于较小的延迟（0.01ms ~ 1ms），显示4位小
  if (delayMs < 1) {
    return delayMs.toFixed(4) + ' ms';
  }

  // 对于普通延迟（1ms ~ 100ms），显示2位小
  if (delayMs < 100) {
    return delayMs.toFixed(2) + ' ms';
  }

  // 对于较大延迟（≥100ms），显示1位小
  return delayMs.toFixed(1) + ' ms';
};

const getEmaneModelType = (nodeId: number): string | null => {
  if (!topoStore.topoData?.nodes || !topoStore.topoData?.links) return null;

  const nodeLinks = topoStore.topoData.links.filter(
    (link: Link) => link.node1_id === nodeId || link.node2_id === nodeId
  );

  for (const link of nodeLinks) {
    const otherNodeId = link.node1_id === nodeId ? link.node2_id : link.node1_id;
    const otherNode = topoStore.topoData.nodes.find((n: EnhancedNode) => n.id === otherNodeId);

    if (otherNode?.type === 'EMANE') {
      // 优先使用 phy_type（最准确
      if ((otherNode as any).phy_type) {
        return (otherNode as any).phy_type;
      }
      if (otherNode.displayModel) {
        return otherNode.displayModel;
      }

      if (otherNode.emane && otherNode.emane.startsWith('emane_')) {
        return otherNode.emane.substring(6);
      }
      return otherNode.emane || null;
    }
  }

  return null;
};

// 获取节点连接的EMANE模型节点ID
// targetModelType: 可选参数，指定要匹配的模型类型（如 'dss', 'fhss', 'gmsk', 'vhf' 等）
const getEmaneModelNodeId = (nodeId: number, targetModelType?: string | null): number | null => {
  if (!topoStore.topoData?.nodes || !topoStore.topoData?.links) return null;

  const nodeLinks = topoStore.topoData.links.filter(
    (link: Link) => link.node1_id === nodeId || link.node2_id === nodeId
  );

  // 如果指定了目标模型类型，优先查找匹配的EMANE节点
  if (targetModelType) {
    const normalizedTarget = targetModelType.toLowerCase();
    for (const link of nodeLinks) {
      const otherNodeId = link.node1_id === nodeId ? link.node2_id : link.node1_id;
      const otherNode = topoStore.topoData.nodes.find((n: EnhancedNode) => n.id === otherNodeId);

      if (otherNode?.type === 'EMANE') {
        const nodePhyType = ((otherNode as any).phy_type || '').toLowerCase();
        const nodeDisplayModel = (otherNode.displayModel || '').toLowerCase();

        if (nodePhyType === normalizedTarget || nodeDisplayModel === normalizedTarget) {
          return otherNode.id;
        }
      }
    }
  }

  // 回退：返回第一个EMANE节点
  for (const link of nodeLinks) {
    const otherNodeId = link.node1_id === nodeId ? link.node2_id : link.node1_id;
    const otherNode = topoStore.topoData.nodes.find((n: EnhancedNode) => n.id === otherNodeId);

    if (otherNode?.type === 'EMANE') {
      return otherNode.id;
    }
  }

  return null;
};

const shouldShowRfSignalData = computed(() => {
  if (!selectedNemId.value) return false;
  
  if (!tableRfSignalData.value) return false;
  
  if (props.link) {
    if (props.link.is_node_monitoring) {
      const nodeId = props.link.node1_id;
      const modelType = getEmaneModelType(nodeId);
      return modelType === 'rfpipe';
    }
    
    const sourceModelType = getEmaneModelType(props.link.node1_id);
    const targetModelType = getEmaneModelType(props.link.node2_id);
    
    return sourceModelType === 'rfpipe' || targetModelType === 'rfpipe';
  }
  
  return true;
});

const selectedNemId = ref<number | null>(null);

const viewpointNemId = ref<number | null>(null);

const dataCache = shallowRef<Map<number, {
  metric: NeighborMetricTable | null;
  status: NeighborStatusTable | null;
  rfSignal: RFSignalTable | null;
  timestamp: number;
}>>(new Map());

const isUsingCachedData = ref(false);

const CACHE_VALIDITY_PERIOD = 30000;

// 当前视角 - 源节点或目标节点
const currentPerspective = ref<'source' | 'target'>('source');

// 源节点和目标节点名称和ID
const sourceNodeId = computed(() => {
  if (!props.link) return null;
  return props.link.node1_id;
});

const targetNodeId = computed(() => {
  if (!props.link) return null;
  return props.link.node2_id;
});

const sourceNodeName = computed(() => {
  if (!props.link || !topoStore.topoData?.nodes) return '';
  const node = topoStore.topoData.nodes.find((n: any) => n.id === props.link?.node1_id);
  return node ? (node.alias || node.name) : '未知节点';
});

const targetNodeName = computed(() => {
  if (!props.link || !topoStore.topoData?.nodes) return '';
  const node = topoStore.topoData.nodes.find((n: any) => n.id === props.link?.node2_id);
  return node ? (node.alias || node.name) : '未知节点';
});

// 获取模型类型（DSSS、FHSS、GMSK
const sourceNodeModulationType = computed(() => {
  if (!props.link || !topoStore.topoData?.nodes) return null;
  const node = topoStore.topoData.nodes.find((n: any) => n.id === props.link?.node1_id);
  return node?.modulation_type || null;
});

const targetNodeModulationType = computed(() => {
  if (!props.link || !topoStore.topoData?.nodes) return null;
  const node = topoStore.topoData.nodes.find((n: any) => n.id === props.link?.node2_id);
  return node?.modulation_type || null;
});

// 获取所有可用的视角NEM ID
const availableViewpoints = computed(() => {
  return emaneStore.allViewpointNemIds;
});

// 根据当前选择的视角，获取其所有邻居NEM ID
const neighborNemIds = computed(() => {
  if (!viewpointNemId.value) return [];
  const viewpointData = emaneStore.getViewpointData(viewpointNemId.value);
  if (!viewpointData) return [];

  const nemIds = new Set<number>();
  viewpointData.neighborMetricTables?.forEach(item => nemIds.add(item.nem));
  viewpointData.neighborStatusTables?.forEach(item => nemIds.add(item.nem));
  viewpointData.rfSignalTables?.forEach(item => nemIds.add(item.nem));
  
  // 过滤掉无效的NEM ID
  return Array.from(nemIds).filter(id => id !== 65535).sort((a,b) => a - b);
});

// 当视角变化时，重置选中的邻居NEM ID
const handleViewpointChange = () => {
  selectedNemId.value = null;
  // 如果该视角下有邻居，默认选择第一
  if (neighborNemIds.value.length > 0) {
    selectedNemId.value = neighborNemIds.value[0];
  }
};

// 源节点和目标节点的NEM ID
const sourceNodeNemId = computed(() => {
  if (!sourceNodeId.value) return null;
  const nodeInfo = nemIdStore.getNemIdsByNodeId(sourceNodeId.value);
  if (!nodeInfo || !nodeInfo.ifaceNemMap) return null;
  
  // 获取第一个接口的NEM ID
  const firstIface = Object.keys(nodeInfo.ifaceNemMap)[0];
  return nodeInfo.ifaceNemMap[firstIface];
});

const targetNodeNemId = computed(() => {
  if (!targetNodeId.value) return null;
  const nodeInfo = nemIdStore.getNemIdsByNodeId(targetNodeId.value);
  if (!nodeInfo || !nodeInfo.ifaceNemMap) return null;
  
  // 获取第一个接口的NEM ID
  const firstIface = Object.keys(nodeInfo.ifaceNemMap)[0];
  return nodeInfo.ifaceNemMap[firstIface];
});

// 根据当前视角获取NEM ID - 始终为对端节点的NEM ID（邻居节点）
const perspectiveNemId = computed(() => {
  if (!props.link) return null;
  
  // 使用新的getNemIdForLink方法，根据视角获取正确的NEM ID
  return emaneStore.getNemIdForLink(
    props.link.node1_id, 
    props.link.node2_id, 
    currentPerspective.value
  );
});

// 使用新添加的方法获取视角NEM ID
const linkViewpointNemId = computed(() => {
  if (!props.link) return null;
  
  return emaneStore.getLinkViewpointNemId(
    props.link.node1_id,
    props.link.node2_id,
    currentPerspective.value
  );
});

// 切换视角函数
const switchPerspective = (perspective: 'source' | 'target') => {
  currentPerspective.value = perspective;
  // 更新选中的NEM ID为邻居节点的NEM ID
  if (perspectiveNemId.value !== null) {
    selectedNemId.value = perspectiveNemId.value;
    // 同时更新视角NEM ID
    viewpointNemId.value = linkViewpointNemId.value;
    
    // 立即更新表格数据
    nextTick(() => {
      // updateTableData();
    });
  }
};

// 调试传输时延配置
const debugTransmissionConfig = () => {
  console.log('=== 传输时延配置调试 ===');
  console.log('所有传输时延配', transmissionConfigStore.getAllTransmissionDelays());
  console.log('当前链路信息:', props.link);
  console.log('当前视角:', currentPerspective.value);
  
  if (props.link) {
    const currentNodeId = currentPerspective.value === 'source' ? props.link.node1_id : props.link.node2_id;
    const emaneModelNodeId = getEmaneModelNodeId(currentNodeId);
    const configuredDelay = emaneModelNodeId ? transmissionConfigStore.getNodeTransmissionDelay(emaneModelNodeId) : 0;
    
    console.log('当前节点ID:', currentNodeId);
    console.log('EMANE模型节点ID:', emaneModelNodeId);
    console.log('配置的传输时', configuredDelay);
    
    const originalDelay = displayChannelMetrics.value?.network_characteristics?.delay_ms || 0;
    console.log('原始延迟:', originalDelay);
    console.log('计算后的总延', originalDelay + configuredDelay);
  }
  console.log('========================');
};

// 视图切换
const currentView = ref<'table' | 'chart' | 'channel'>('table');

// 多径路径选择状
const selectedMultipathId = ref<number>(0);

// 图表相关
const activeChartTab = ref('metric');
const activeChannelTab = ref('bitstream'); // 新增：信道数据标签页状
const panelContentRef = ref<HTMLElement | null>(null);
const chartType = ref<'line' | 'bar'>('line');
const metricChartRef = ref<HTMLElement | null>(null);
const statusChartRef = ref<HTMLElement | null>(null);
const rfSignalChartRef = ref<HTMLElement | null>(null);

// 统一图表refs（用于扁平化标签页）
const bitstreamChartRef = ref<HTMLElement | null>(null);
const constellationChartRef = ref<HTMLElement | null>(null);
const hopSequenceChartRef = ref<HTMLElement | null>(null);
const cloudChartRef = ref<HTMLElement | null>(null);
const rxIqWaveformChartRef = ref<HTMLElement | null>(null);
const dssTxIqWaveformChartRef = ref<HTMLElement | null>(null);
const dssRxIqWaveformChartRef = ref<HTMLElement | null>(null);
const channelIqWaveformChartRef = ref<HTMLElement | null>(null);
const recoveredIqWaveformChartRef = ref<HTMLElement | null>(null);
const trendChartRef = ref<HTMLElement | null>(null);
const spectrumChartRef = ref<HTMLElement | null>(null);

// VHF新增图表refs
const iqComparisonChartRef = ref<HTMLElement | null>(null);
const constellationAfterChannelChartRef = ref<HTMLElement | null>(null);
const restoredConstellationChartRef = ref<HTMLElement | null>(null);
// 5G新增图表refs
const fiveGQamMappedChartRef = ref<HTMLElement | null>(null);
const fiveGCloudComparisonChartRef = ref<HTMLElement | null>(null);
const fiveGSpectrumChartRef = ref<HTMLElement | null>(null);
const fiveGWaveformChartRef = ref<HTMLElement | null>(null);

// DSSS专用图表refs
const spreadSamplesChartRef = ref<HTMLElement | null>(null);
const despreadSamplesChartRef = ref<HTMLElement | null>(null);
const demodulatedBitstreamChartRef = ref<HTMLElement | null>(null);

// 载波频率图表ref（用于TTC/协同自组网）
const carrierFreqChartRef = ref<HTMLElement | null>(null);

// 多径路径相关的图表refs
const multipathSpectrumChartRef = ref<HTMLElement | null>(null);
const multipathConstellationChartRef = ref<HTMLElement | null>(null);

// 使用shallowRef来保存echarts实例，防止它们变成响应式对象
let metricChart = shallowRef<echarts.ECharts | null>(null);
let statusChart = shallowRef<echarts.ECharts | null>(null);
let rfSignalChart = shallowRef<echarts.ECharts | null>(null);

// 统一图表实例（用于扁平化标签页）
let bitstreamChart = shallowRef<echarts.ECharts | null>(null);
let constellationChart = shallowRef<echarts.ECharts | null>(null);
let hopSequenceChart = shallowRef<echarts.ECharts | null>(null);
let cloudChart = shallowRef<echarts.ECharts | null>(null);
let rxIqWaveformChart = shallowRef<echarts.ECharts | null>(null);
let dssTxIqWaveformChart = shallowRef<echarts.ECharts | null>(null);
let dssRxIqWaveformChart = shallowRef<echarts.ECharts | null>(null);
let channelIqWaveformChart = shallowRef<echarts.ECharts | null>(null);
let recoveredIqWaveformChart = shallowRef<echarts.ECharts | null>(null);
let trendChart = shallowRef<echarts.ECharts | null>(null);
let spectrumChart = shallowRef<echarts.ECharts | null>(null);

// VHF新增图表instances
let iqComparisonChart = shallowRef<echarts.ECharts | null>(null);
let constellationAfterChannelChart = shallowRef<echarts.ECharts | null>(null);
let restoredConstellationChart = shallowRef<echarts.ECharts | null>(null);
// 5G新增图表instances
let fiveGQamMappedChart = shallowRef<echarts.ECharts | null>(null);
let fiveGCloudComparisonChart = shallowRef<echarts.ECharts | null>(null);
let fiveGSpectrumChart = shallowRef<echarts.ECharts | null>(null);
let fiveGWaveformChart = shallowRef<echarts.ECharts | null>(null);

// DSSS专用图表实例
let spreadSamplesChart = shallowRef<echarts.ECharts | null>(null);
let despreadSamplesChart = shallowRef<echarts.ECharts | null>(null);
let demodulatedBitstreamChart = shallowRef<echarts.ECharts | null>(null);

// 载波频率图表实例（用于TTC/协同自组网）
let carrierFreqChart = shallowRef<echarts.ECharts | null>(null);

// 多径路径图表实例
let multipathSpectrumChart = shallowRef<echarts.ECharts | null>(null);
let multipathConstellationChart = shallowRef<echarts.ECharts | null>(null);

// 历史数据存储 - 使用shallowRef减少深层响应式转
const historyData = shallowRef<{
  [nemId: number]: {
    timestamps: Date[];
    metrics: {
      rxPkts: number[];
      txPkts: number[];
      missedPkts: number[];
      sinrAvg: number[];
      nfAvg: number[];
    };
    status: {
      rxPkts: number[];
      txPkts: number[];
      missedPkts: number[];
      bwUtilRatio: number[];
      sinrAvg: number[];
      nfAvg: number[];
    };
    rfSignals: {
      avgRxPower: number[];
      avgNoiseFloor: number[];
      avgSINR: number[];
      avgINR: number[];
    };
  }
}>({});



// 获取所有NEM IDs，过滤掉无效的NEM ID (65535)
const nemIds = computed(() => {
  return emaneStore.allNemIds.filter(nemId => nemId !== 65535);
});

// 判断是否有数
const hasData = computed(() => {
  return emaneStore.hasEmaneData;
});

// 判断是否有DSSS数据
const hasDSSData = computed(() => {
  return props.dssData &&
         props.dssData.channel_metrics &&
         Object.keys(props.dssData.channel_metrics).length > 0;
});

// 获取显示的DSSS数据（确保数据可访问
const displayDSSData = computed(() => {
  if (!hasDSSData.value) return null;
  return JSON.parse(JSON.stringify(props.dssData));
});

// 判断是否有FHSS数据
const hasFHSSData = computed(() => {
  return props.fhssData &&
         props.fhssData.channel_metrics &&
         Object.keys(props.fhssData.channel_metrics).length > 0;
});

// 获取显示的FHSS数据（确保数据可访问
const displayFHSSData = computed(() => {
  if (!hasFHSSData.value) return null;
  return JSON.parse(JSON.stringify(props.fhssData));
});

// 判断是否有GMSK数据
const hasGMSKData = computed(() => {
  return props.gmskData &&
         props.gmskData.channel_metrics &&
         Object.keys(props.gmskData.channel_metrics).length > 0;
});

// 获取显示的GMSK数据（确保数据可访问
const displayGMSKData = computed(() => {
  if (!hasGMSKData.value) return null;
  return JSON.parse(JSON.stringify(props.gmskData));
});

const hasGFSKData = computed(() => {
  const data = unwrapData(props.gfskData);
  const dataModel = getNormalizedDataModel(data);
  return !!(data && 'channel_metrics' in data && (!dataModel || dataModel === 'gfsk'));
});

const displayGFSKData = computed(() => {
  if (!hasGFSKData.value) return null;
  return unwrapData(props.gfskData);
});

const getNormalizedDataModel = (rawData: any): string | null => {
  const data = unwrapData(rawData);
  const rawModel = data?.model ?? rawData?.model ?? rawData?.data?.model;
  if (rawModel === undefined || rawModel === null) return null;
  const key = String(rawModel).trim().toLowerCase();
  const modelMap: Record<string, string> = {
    ckl: 'ttc',
    zzw: 'adhoc',
    xtl: 'coordination',
    sw: 'dss',
    shortwave: 'dss',
    dsss: 'dss',
    mlw: 'fhss',
    satellite: 'gfsk',
    sat: 'gfsk',
    '5g': 'fiveG',
    fiveg: 'fiveG',
    choose: 'custom',
  };
  return modelMap[key] || key;
};

// 判断是否有UHF数据
const hasUHFData = computed(() => {
  const data = unwrapData(props.uhfData);
  const dataModel = getNormalizedDataModel(data);
  return !!(data && 'channel_metrics' in data && (!dataModel || dataModel === 'uhf'));
});

// 获取显示的UHF数据（确保数据可访问）
const displayUHFData = computed(() => {
  if (!hasUHFData.value) return null;
  return unwrapData(props.uhfData);
});

// 判断是否有VHF数据
const hasVHFData = computed(() => {
  const data = unwrapData(props.vhfData);
  const dataModel = getNormalizedDataModel(data);
  return !!(data && 'channel_metrics' in data && (!dataModel || dataModel === 'vhf'));
});

// 获取显示的VHF数据（确保数据可访问）
const displayVHFData = computed(() => {
  if (!hasVHFData.value) return null;
  return unwrapData(props.vhfData);
});

// 辅助函数：解包后端返回的数据（去除可能存在的 { code, msg, data } 外层包装）
function unwrapData(rawData: any) {
  if (!rawData) return null;
  const parsed = JSON.parse(JSON.stringify(rawData));
  if (parsed.data && parsed.code !== undefined && parsed.msg !== undefined) {
    return parsed.data;
  }
  // 兼容单层 { data: { ... } } 的包装结构
  if (parsed.data && !parsed.model && !parsed.channel_metrics) {
    return parsed.data;
  }
  return parsed;
};

// 获取显示5G数据（确保数据可访问）
const hasFiveGData = computed(() => {
  const data = unwrapData(props.fiveGData);
  const dataModel = getNormalizedDataModel(data);
  return !!(data && (!dataModel || dataModel === 'fiveG'));
});

const display5GData = computed(() => {
  if (!hasFiveGData.value) return null;
  return unwrapData(props.fiveGData);
});

// 获取显示的TTC数据
const displayTTCData = computed(() => {
  return unwrapData(props.ttcData);
});

// 获取显示的AdHoc数据
const displayAdHocData = computed(() => {
  return unwrapData(props.adhocData);
});

// 获取显示的Coordination数据
const displayCoordinationData = computed(() => {
  return unwrapData(props.coordinationData);
});

const displayCustomData = computed(() => {
  return unwrapData(props.customData);
});

// 规范化信道指标数- 支持两种格式
const getModelTypeFromNode = (node: any): string | null => {
  if (!node) return null;
  const rawModel = node.phy_type || node.displayModel ||
    (typeof node.emane === 'string' && node.emane.startsWith('emane_') ? node.emane.substring(6) : node.emane);
  return getNormalizedDataModel({ model: rawModel });
};

const getLinkModelTypeFromTopology = (): string | null => {
  if (!props.link || !topoStore.topoData?.nodes || !topoStore.topoData?.links) return null;

  const { node1_id, node2_id } = props.link;
  const nodes = topoStore.topoData.nodes;
  const links = topoStore.topoData.links;
  const node1 = nodes.find((n: any) => n.id === node1_id);
  const node2 = nodes.find((n: any) => n.id === node2_id);

  if (node1?.type === 'EMANE') return getModelTypeFromNode(node1);
  if (node2?.type === 'EMANE') return getModelTypeFromNode(node2);

  for (const checkNodeId of [node1_id, node2_id]) {
    const connectedLinks = links.filter(
      (l: any) => l.node1_id === checkNodeId || l.node2_id === checkNodeId
    );
    for (const link of connectedLinks) {
      const otherNodeId = link.node1_id === checkNodeId ? link.node2_id : link.node1_id;
      const otherNode = nodes.find((n: any) => n.id === otherNodeId);
      if (otherNode?.type === 'EMANE') return getModelTypeFromNode(otherNode);
    }
  }

  return null;
};

const getDisplayDataForModel = (modelType: string | null | undefined) => {
  if (!modelType) return null;
  const normalizedModel = getNormalizedDataModel({ model: modelType });
  const candidates: Record<string, any> = {
    gmsk: displayGMSKData.value,
    gfsk: displayGFSKData.value,
    fhss: displayFHSSData.value,
    dss: displayDSSData.value,
    uhf: displayUHFData.value,
    vhf: displayVHFData.value,
    fiveG: display5GData.value,
    ttc: displayTTCData.value,
    adhoc: displayAdHocData.value,
    coordination: displayCoordinationData.value,
    custom: displayCustomData.value,
  };
  return normalizedModel ? candidates[normalizedModel] || null : null;
};

const getModelDisplayName = (modelType: string | null | undefined): string => {
  if (!modelType) return '';
  const normalizedModel = getNormalizedDataModel({ model: modelType });
  const typeMap: Record<string, string> = {
    gmsk: 'GMSK',
    gfsk: 'GFSK',
    vhf: 'VHF',
    uhf: 'UHF',
    ttc: 'TTC',
    adhoc: 'AdHoc',
    coordination: 'Coordination',
    fiveG: '5G',
    dss: 'DSSS',
    fhss: 'FHSS',
    custom: 'Custom',
  };
  return normalizedModel ? typeMap[normalizedModel] || normalizedModel.toUpperCase() : '';
};

const normalizeChannelMetrics = (metrics: any) => {
  if (!metrics) return null;

  // 检查是否已是嵌套格式（拥有large_scale等顶级分类字段）
  const isNestedFormat = !!(
    metrics.large_scale ||
    metrics.small_scale ||
    metrics.link_quality ||
    metrics.network_characteristics
  );

  if (isNestedFormat) {
    const normalized = JSON.parse(JSON.stringify(metrics));

    // 卫星模型字段兼容：后端返回 performance / total_path_loss_db / channel_bandwidth_limit_hz 等命名
    if (normalized.large_scale) {
      if (normalized.large_scale.total_loss_db === undefined && normalized.large_scale.total_path_loss_db !== undefined) {
        normalized.large_scale.total_loss_db = normalized.large_scale.total_path_loss_db;
      }
      if (normalized.large_scale.path_loss_db === undefined && normalized.large_scale.fspl_db !== undefined) {
        normalized.large_scale.path_loss_db = normalized.large_scale.fspl_db;
      }
      if (normalized.large_scale.shadowing_loss_db === undefined && normalized.large_scale.shadowing_db !== undefined) {
        normalized.large_scale.shadowing_loss_db = normalized.large_scale.shadowing_db;
      }
    }

    if (normalized.network_characteristics) {
      if (normalized.network_characteristics.bandwidth_limit_hz === undefined && normalized.network_characteristics.channel_bandwidth_limit_hz !== undefined) {
        normalized.network_characteristics.bandwidth_limit_hz = normalized.network_characteristics.channel_bandwidth_limit_hz;
      }
      if (normalized.network_characteristics.transmission_rate_bps === undefined && normalized.network_characteristics.actual_transmission_rate_bps !== undefined) {
        normalized.network_characteristics.transmission_rate_bps = normalized.network_characteristics.actual_transmission_rate_bps;
      }
      if (normalized.network_characteristics.packet_loss_rate === undefined && normalized.network_characteristics.packet_drop_rate !== undefined) {
        normalized.network_characteristics.packet_loss_rate = normalized.network_characteristics.packet_drop_rate;
      }
      if (normalized.network_characteristics.delay_ms === undefined && normalized.network_characteristics.transmission_delay_ms !== undefined) {
        normalized.network_characteristics.delay_ms = normalized.network_characteristics.transmission_delay_ms;
      }
    }

    normalized.link_quality = normalized.link_quality || {};
    if (normalized.link_quality.bit_error_rate === undefined && normalized.link_quality.ber !== undefined) {
      normalized.link_quality.bit_error_rate = normalized.link_quality.ber;
    }
    if (normalized.link_quality.receiver_noise_figure_db === undefined && normalized.receiver_noise_figure_db !== undefined) {
      normalized.link_quality.receiver_noise_figure_db = normalized.receiver_noise_figure_db;
    }
    if (normalized.link_quality.effective_noise_figure_db === undefined && normalized.effective_noise_figure_db !== undefined) {
      normalized.link_quality.effective_noise_figure_db = normalized.effective_noise_figure_db;
    }

    if (normalized.performance) {
      if (normalized.link_quality.snr_db === undefined && normalized.performance.snr_db !== undefined) {
        normalized.link_quality.snr_db = normalized.performance.snr_db;
      }
      if (normalized.link_quality.bit_error_rate === undefined && normalized.performance.ber !== undefined) {
        normalized.link_quality.bit_error_rate = normalized.performance.ber;
      }
    }

    return normalized;
  }

  // 否则是扁平格式，需要规范化为嵌套格
  const normalized: any = {
    large_scale: {},
    small_scale: {},
    link_quality: {},
    network_characteristics: {},
  };

  // 大尺度衰落映
  if (metrics.large_scale_loss_db !== undefined) {
    normalized.large_scale.total_loss_db = metrics.large_scale_loss_db;
  }
  if (metrics.total_loss_db !== undefined) {
    normalized.large_scale.total_loss_db = metrics.total_loss_db;
  }
  if (metrics.path_loss_db !== undefined) {
    normalized.large_scale.path_loss_db = metrics.path_loss_db;
  }
  if (metrics.shadowing_loss_db !== undefined) {
    normalized.large_scale.shadowing_loss_db = metrics.shadowing_loss_db;
  }
  if (metrics.distance_m !== undefined) {
    normalized.large_scale.distance_m = metrics.distance_m;
  }

  // 小尺度衰落映
  if (metrics.small_scale_loss_db !== undefined) {
    normalized.small_scale.fading_loss_db = metrics.small_scale_loss_db;
  }
  if (metrics.delay_spread_s !== undefined) {
    normalized.small_scale.delay_spread_s = metrics.delay_spread_s;
  }
  if (metrics.fading_loss_db !== undefined) {
    normalized.small_scale.fading_loss_db = metrics.fading_loss_db;
  }
  if (metrics.doppler_hz !== undefined) {
    normalized.small_scale.doppler_hz = metrics.doppler_hz;
  }
  if (metrics.rician_k_db !== undefined) {
    normalized.small_scale.rician_k_db = metrics.rician_k_db;
  }

  // 链路质量映射
  if (metrics.snr_db !== undefined) {
    normalized.link_quality.snr_db = metrics.snr_db;
  }
  if (metrics.bit_error_rate !== undefined) {
    normalized.link_quality.bit_error_rate = metrics.bit_error_rate;
  }
  if (metrics.ber !== undefined) {
    normalized.link_quality.bit_error_rate = metrics.ber;
  }
  if (metrics.theoretical_ber !== undefined) {
    normalized.link_quality.bit_error_rate = metrics.theoretical_ber;
  }
  if (metrics.receiver_noise_figure_db !== undefined) {
    normalized.link_quality.receiver_noise_figure_db = metrics.receiver_noise_figure_db;
  }
  if (metrics.effective_noise_figure_db !== undefined) {
    normalized.link_quality.effective_noise_figure_db = metrics.effective_noise_figure_db;
  }

  // 网络特性映
  if (metrics.delay_ms !== undefined) {
    normalized.network_characteristics.delay_ms = metrics.delay_ms;
  }
  if (metrics.packet_loss_rate !== undefined) {
    normalized.network_characteristics.packet_loss_rate = metrics.packet_loss_rate;
  }
  if (metrics.bandwidth_limit_hz !== undefined) {
    normalized.network_characteristics.bandwidth_limit_hz = metrics.bandwidth_limit_hz;
  }
  if (metrics.transmission_rate_bps !== undefined) {
    normalized.network_characteristics.transmission_rate_bps = metrics.transmission_rate_bps;
  }

  return normalized;
};

// 检查channel_metrics对象中是否有实际数据（非空）
const hasActualChannelMetrics = (metrics: any): boolean => {
  if (!metrics || typeof metrics !== 'object') return false;
  if (Object.keys(metrics).length === 0) return false;
  for (const val of Object.values(metrics)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'object') {
      if (Object.keys(val as object).length > 0) return true;
    } else {
      return true;
    }
  }
  return false;
};

// 判断是否应该显示信道指标
const shouldShowChannelMetrics = computed(() => {
  const linkModelData = getDisplayDataForModel(getLinkModelTypeFromTopology());
  return [
    linkModelData?.channel_metrics,
    displayGMSKData.value?.channel_metrics,
    displayGFSKData.value?.channel_metrics,
    displayFHSSData.value?.channel_metrics,
    displayDSSData.value?.channel_metrics,
    displayUHFData.value?.channel_metrics,
    displayVHFData.value?.channel_metrics,
    display5GData.value?.channel_metrics,
    displayTTCData.value?.channel_metrics,
    displayAdHocData.value?.channel_metrics,
    displayCoordinationData.value?.channel_metrics,
    displayCustomData.value?.channel_metrics,
  ].some(m => hasActualChannelMetrics(m));
});

// 获取要显示的信道指标数据（跳过空对象，选第一个有实际数据的模型）
const displayChannelMetrics = computed(() => {
  const linkModelData = getDisplayDataForModel(getLinkModelTypeFromTopology());
  const candidates = [
    linkModelData?.channel_metrics,
    displayGMSKData.value?.channel_metrics,
    displayGFSKData.value?.channel_metrics,
    displayFHSSData.value?.channel_metrics,
    displayDSSData.value?.channel_metrics,
    displayUHFData.value?.channel_metrics,
    displayVHFData.value?.channel_metrics,
    display5GData.value?.channel_metrics,
    displayTTCData.value?.channel_metrics,
    displayAdHocData.value?.channel_metrics,
    displayCoordinationData.value?.channel_metrics,
    displayCustomData.value?.channel_metrics,
  ];
  const metrics = candidates.find(m => hasActualChannelMetrics(m));
  return metrics ? normalizeChannelMetrics(metrics) : null;
});

// 计算显示的延迟值（原始延迟 + 配置的传输时延）
const displayDelayMs = computed(() => {
  const originalDelay = displayChannelMetrics.value?.network_characteristics?.delay_ms || 0;
  
  // 获取EMANE模型节点的传输时延配
  // 在子网模型中，节接入到节（EMANE模型），应该使用节点3的配
  let emaneModelNodeId: number | null = null;
  if (props.link) {
    // 根据当前视角获取节点ID，然后找到其连接的EMANE模型节点
    const currentNodeId = currentPerspective.value === 'source' ? props.link.node1_id : props.link.node2_id;
    emaneModelNodeId = getEmaneModelNodeId(currentNodeId);
  }
  
  const configuredDelay = emaneModelNodeId ? transmissionConfigStore.getNodeTransmissionDelay(emaneModelNodeId) : 0;
  
  // 调试信息
  console.log('延迟计算调试:', {
    originalDelay,
    currentNodeId: props.link ? (currentPerspective.value === 'source' ? props.link.node1_id : props.link.node2_id) : null,
    emaneModelNodeId,
    currentPerspective: currentPerspective.value,
    configuredDelay,
    totalDelay: originalDelay + configuredDelay,
    linkInfo: props.link ? { node1_id: props.link.node1_id, node2_id: props.link.node2_id } : null
  });
  
  return originalDelay + configuredDelay;
});

// 统一仿真数据访问 - 用于扁平化的标签
const hasSimulationData = computed(() => hasDSSData.value || hasFHSSData.value || hasGMSKData.value || hasGFSKData.value || hasUHFData.value || hasVHFData.value || !!display5GData.value || !!displayTTCData.value || !!displayAdHocData.value || !!displayCoordinationData.value || !!displayCustomData.value);

const currentSimData = computed(() => {
  console.log('EmaneMacInfoPanel - 检查仿真数', {
    gmskData: !!displayGMSKData.value,
    gfskData: !!displayGFSKData.value,
    fhssData: !!displayFHSSData.value,
    dssData: !!displayDSSData.value,
    uhfData: !!displayUHFData.value,
    vhfData: !!displayVHFData.value,
    fiveGData: !!display5GData.value,
    ttcData: !!displayTTCData.value,
    adhocData: !!displayAdHocData.value,
    coordinationData: !!displayCoordinationData.value,
    customData: !!displayCustomData.value,
    linkInfo: props.link ? { node1_id: props.link.node1_id, node2_id: props.link.node2_id } : null
  });

  const linkModelType = getLinkModelTypeFromTopology();
  const linkModelData = getDisplayDataForModel(linkModelType);
  if (linkModelData) {
    console.log('使用当前链路模型数据:', getModelDisplayName(linkModelType), '节点ID:', linkModelData.node_id);
    return linkModelData;
  }
  
  if (displayTTCData.value) {
    return displayTTCData.value;
  }
  if (displayAdHocData.value) {
    return displayAdHocData.value;
  }
  if (displayCoordinationData.value) {
    return displayCoordinationData.value;
  }
  if (displayCustomData.value) {
    return displayCustomData.value;
  }
  if (displayGMSKData.value) {
    console.log('使用GMSK数据，节点ID:', displayGMSKData.value.node_id);
    return displayGMSKData.value;
  }
  if (displayGFSKData.value) {
    console.log('使用GFSK/卫星数据，节点ID:', displayGFSKData.value.node_id);
    return displayGFSKData.value;
  }
  if (displayFHSSData.value) {
    console.log('使用FHSS数据，节点ID:', displayFHSSData.value.node_id);
    return displayFHSSData.value;
  }
  if (displayDSSData.value) {
    console.log('使用DSSS数据，节点ID:', displayDSSData.value.node_id);
    return displayDSSData.value;
  }
  if (displayUHFData.value) {
    console.log('使用UHF数据，节点ID:', displayUHFData.value.node_id);
    return displayUHFData.value;
  }
  if (displayVHFData.value) {
    console.log('使用VHF数据，节点ID:', displayVHFData.value.node_id);
    return displayVHFData.value;
  }
  if (display5GData.value) {
    console.log('使用5G数据，节点ID:', display5GData.value.node_id);
    return display5GData.value;
  }
  return null;
});

const isSatelliteChannelData = computed(() => {
  const model = String(currentSimData.value?.model ?? currentSimData.value?.data?.model ?? '').trim().toLowerCase();
  return model === 'satellite' || model === 'sat';
});

const currentModelName = computed(() => {
  const linkModelType = getLinkModelTypeFromTopology();
  const linkModelData = getDisplayDataForModel(linkModelType);
  if (linkModelType && (!hasSimulationData.value || linkModelData)) {
    return getModelDisplayName(linkModelType);
  }

  // 【最可靠】从链路的EMANE模型节点直接获取类型
  const channelModelNode = getChannelModelNodeFromLink();
  if (channelModelNode) {
    const phyType = (channelModelNode as any).phy_type || channelModelNode.displayModel || '';
    if (phyType) {
      return getModelDisplayName(phyType);
    }
  }

  // 回退：根据数据类型判
  if (displayTTCData.value) return 'TTC';
  if (displayAdHocData.value) return 'AdHoc';
  if (displayCoordinationData.value) return 'Coordination';
  if (display5GData.value) return '5G';
  if (displayUHFData.value) return 'UHF';
  if (displayVHFData.value) return 'VHF';
  if (displayFHSSData.value) return 'FHSS';
  if (displayDSSData.value) return 'DSSS';
  if (displayGMSKData.value) return 'GMSK';
  if (displayGFSKData.value) return 'GFSK';
  if (displayCustomData.value) return 'Custom';
  return '';
});

const supportsIqComparison = computed(() =>
  !['TTC', 'Coordination', 'AdHoc'].includes(currentModelName.value)
  && ['VHF', 'UHF', 'GFSK', 'DSSS', 'Custom'].includes(currentModelName.value)
);

const isRxIqWaveformModel = computed(() =>
  ['TTC', 'Coordination', 'AdHoc'].includes(currentModelName.value)
);

// 基于数据结构的计算属- 用于控制标签页显// 为了防止轮询时某些字段间歇性缺失导致UI标签页乱跳，使用一个状态记录本周期内出现过的数据类
const discoveredDataTypes = reactive({
  spreadSamples: false,
  despreadSamples: false,
  hopSequence: false,
  rxSamples: false,
  txSamples: false,
  spectrum: false,
  carrierFreq: false,
  multipath: false,
  transmitterIQ: false,
  receiverIQ: false,
  constellationAfterChannel: false,
  restoredConstellation: false,
  fiveGOriginalBits: false,
  fiveGQamMapped: false,
  fiveGDeInterFrqOut: false,
  fiveGSfoComp: false,
  fiveGOutputBits: false,
  fiveGSpectrum: false,
  constellation: false
});

// 重置发现的数据类
const resetDiscoveredDataTypes = () => {
  for (const key in discoveredDataTypes) {
    (discoveredDataTypes as any)[key] = false;
  }
};

// 频谱数据检查（兼容顶层spectrum_data和嵌套data.spectrum_data两种路径）
const getSpectrumData = () => {
  const nested = currentSimData.value?.data?.spectrum_data;
  if (Array.isArray(nested) && nested.length > 0) return nested;
  const top = currentSimData.value?.spectrum_data;
  if (Array.isArray(top) && top.length > 0) return top;
  return null;
}

// 监听当前数据，一旦发现某种类型的数据就记录下来（使其永远显示直到模型切换
watch(() => currentSimData.value, (data) => {
  if (!data) return;
  
  // 兼容data包装和无.data包装的扁平数据结构（例如部分5G数据
  const d = data.data || data;
  if (!d) return;

  if (d.spread_samples !== undefined) discoveredDataTypes.spreadSamples = true;
  if (d.despread_samples !== undefined) discoveredDataTypes.despreadSamples = true;
  if (d.hop_sequence !== undefined) discoveredDataTypes.hopSequence = true;
  if (d.rx_samples !== undefined || d.channel_iq !== undefined) discoveredDataTypes.rxSamples = true;
  if (d.tx_samples !== undefined || d.modulated_iq !== undefined) discoveredDataTypes.txSamples = true;
  
  const spec = getSpectrumData();
  if (spec) discoveredDataTypes.spectrum = true;
  
  if (data.carrier_freq_mhz !== undefined) discoveredDataTypes.carrierFreq = true;
  if (Array.isArray(data.multipath_details) && data.multipath_details.length > 0) discoveredDataTypes.multipath = true;
  
  if (d.transmitter_iq !== undefined) discoveredDataTypes.transmitterIQ = true;
  if (d.receiver_iq !== undefined) discoveredDataTypes.receiverIQ = true;
  if (d.constellation_after_channel !== undefined) discoveredDataTypes.constellationAfterChannel = true;
  if (d.restored_constellation !== undefined || d.recovered_samples !== undefined || d.recovered_iq !== undefined) discoveredDataTypes.restoredConstellation = true;
  
  if (d.num_in_240_200 !== undefined) discoveredDataTypes.fiveGOriginalBits = true;
  if (d.qam_mapped !== undefined) discoveredDataTypes.fiveGQamMapped = true;
  if (d.de_interFrq_out !== undefined) discoveredDataTypes.fiveGDeInterFrqOut = true;
  if (d.de_sfo_comp !== undefined) discoveredDataTypes.fiveGSfoComp = true;
  if (d.de_scram_out_240_200 !== undefined) discoveredDataTypes.fiveGOutputBits = true;
  if (d.spectrum_data !== undefined) discoveredDataTypes.fiveGSpectrum = true;
  
  if (!!(d.modulated_symbols || (d.spread_samples && d.hop_sequence) || d.tx_samples || d.modulated_iq)) {
    discoveredDataTypes.constellation = true;
  }

  const tabHasData: Record<string, boolean> = {
    hopSequence: Array.isArray(d.hop_sequence) && d.hop_sequence.length > 0,
    spreadSamplesChart: Array.isArray(d.spread_samples) && d.spread_samples.length > 0,
    despreadSamplesChart: Array.isArray(d.despread_samples) && d.despread_samples.length > 0,
    spectrum: !!spec,
    multipath: Array.isArray(data.multipath_details) && data.multipath_details.length > 0,
  };
  if (activeChannelTab.value in tabHasData && !tabHasData[activeChannelTab.value]) {
    activeChannelTab.value = 'bitstream';
  }
}, { deep: true, immediate: true });

const hasSpreadSamplesData = computed(() => {
  const d = currentSimData.value?.data || currentSimData.value || {};
  return Array.isArray(d.spread_samples) && d.spread_samples.length > 0;
});
const hasDespreadSamplesData = computed(() => {
  const d = currentSimData.value?.data || currentSimData.value || {};
  return Array.isArray(d.despread_samples) && d.despread_samples.length > 0;
});
const hasHopSequenceData = computed(() => {
  const d = currentSimData.value?.data || currentSimData.value || {};
  return Array.isArray(d.hop_sequence) && d.hop_sequence.length > 0;
});
const hasRxSamplesData = computed(() => discoveredDataTypes.rxSamples);
const supportsRxIqWaveform = computed(() =>
  isRxIqWaveformModel.value
);
const hasTxSamplesData = computed(() => discoveredDataTypes.txSamples);
const hasSpectrumData = computed(() => !!getSpectrumData());
const hasCarrierFreqData = computed(() => discoveredDataTypes.carrierFreq);
const hasMultipathData = computed(() => multipathDetails.value.length > 0);

// 获取多径路径列表（增强频偏信息）
const multipathDetails = computed(() => {
  const rawData = currentSimData.value?.multipath_details || [];
  return enhanceMultipathDetails(rawData);
});

// 获取当前选中的多径路径详
const currentMultipathDetail = computed(() => {
  return multipathDetails.value.find(path => path.id === selectedMultipathId.value);
});

const hasTransmitterIQData = computed(() => discoveredDataTypes.transmitterIQ);
const hasReceiverIQData = computed(() => discoveredDataTypes.receiverIQ);
const hasConstellationAfterChannelData = computed(() => discoveredDataTypes.constellationAfterChannel);
const hasRestoredConstellationData = computed(() => discoveredDataTypes.restoredConstellation);
const has5GOriginalBits = computed(() => discoveredDataTypes.fiveGOriginalBits);
const has5GQamMapped = computed(() => discoveredDataTypes.fiveGQamMapped);
const has5GDeInterFrqOut = computed(() => discoveredDataTypes.fiveGDeInterFrqOut);
const has5GSfoComp = computed(() => discoveredDataTypes.fiveGSfoComp);
const has5GOutputBits = computed(() => discoveredDataTypes.fiveGOutputBits);
const has5GSpectrumData = computed(() => discoveredDataTypes.fiveGSpectrum);
const hasConstellationData = computed(() => discoveredDataTypes.constellation);

// 星座图标签的动态名称 - 根据数据结构判断
const constellationTabLabel = computed(() => {
  if (hasTxSamplesData.value) {
    return '星座图(TX)';
  }
  return '星座图';
});

// 比特流标签的动态名称 - 根据数据结构判断
const bitstreamTabLabel = computed(() => {
  if (hasSpreadSamplesData.value || hasDespreadSamplesData.value) {
    return '原始比特';
  }
  return '比特流';
});

// 从缓存获取数据，使用泛型以确保返回类型正
const getCachedData = <T>(nemId: number, type: 'metric' | 'status' | 'rfSignal'): T | null => {
  if (!nemId) {
    console.warn('尝试获取缓存时NEM ID为空');
    return null;
  }
  
  try {
    const cache = dataCache.value.get(nemId);
    if (cache && cache[type] && (Date.now() - cache.timestamp < CACHE_VALIDITY_PERIOD)) {
      return cache[type] as T;
    } else {
      if (cache) {
      } else {
      }
    }
  } catch (error) {
    console.error(`获取NEM ID ${nemId} 的缓存时出错:`, error);
  }
  return null;
};

// 修改selectedMetric computed属性，使用泛型函数
const tableData = computed(() => {
  if (selectedNemId.value !== null && viewpointNemId.value !== null) {
    const metric = emaneStore.getMetricByNem(selectedNemId.value, viewpointNemId.value);
    const status = emaneStore.getStatusByNem(selectedNemId.value, viewpointNemId.value);
    const rfSignal = emaneStore.getRFSignalByNem(selectedNemId.value, viewpointNemId.value);

    // 更新缓存
    if (metric) updateCache(selectedNemId.value, 'metric', metric);
    if (status) updateCache(selectedNemId.value, 'status', status);
    if (rfSignal) updateCache(selectedNemId.value, 'rfSignal', rfSignal);

    if (metric || status || rfSignal) {
      isUsingCachedData.value = false;
      return { metric, status, rfSignal };
    }
  }

  // 尝试从缓存获
  if (selectedNemId.value !== null) {
    const cachedMetric = getCachedData<NeighborMetricTable>(selectedNemId.value, 'metric');
    const cachedStatus = getCachedData<NeighborStatusTable>(selectedNemId.value, 'status');
    const cachedRfSignal = getCachedData<RFSignalTable>(selectedNemId.value, 'rfSignal');
    if (cachedMetric || cachedStatus || cachedRfSignal) {
      isUsingCachedData.value = true;
      return { metric: cachedMetric, status: cachedStatus, rfSignal: cachedRfSignal };
    }
  }
  
  return { metric: null, status: null, rfSignal: null };
});

// 从新tableData 计算属性中分离出各个部
const tableMetricData = computed(() => tableData.value.metric);
const tableStatusData = computed(() => tableData.value.status);
const tableRfSignalData = computed(() => tableData.value.rfSignal);

// 根据链路信息确定要显示的NEM ID
const findNemIdForLink = () => {
  // 如果没有提供链路，直接返
  if (!props.link) return;
  
  // 记录查找过程以便调试
  
  // 如果是从WirelessLinkInfoPanel传递过来的视角和目标NEM ID，优先使用它
  if (props.link.viewpoint_nem_id !== undefined && props.link.target_nem_id !== undefined) {
    viewpointNemId.value = props.link.viewpoint_nem_id;
    selectedNemId.value = props.link.target_nem_id;
    return;
  }

  // 如果是从WirelessLinkInfoPanel传递过来的视角NEM ID，优先使用它
  if (props.link.viewpoint_nem_id !== undefined && props.link.viewpoint_nem_id !== null) {
    viewpointNemId.value = props.link.viewpoint_nem_id;

    // 从该视角下的邻居中选择一个默认的selectedNemId
    const viewpointData = emaneStore.getViewpointData(viewpointNemId.value);
    if (viewpointData && viewpointData.neighborMetricTables.length > 0) {
      selectedNemId.value = viewpointData.neighborMetricTables[0].nem;
    }
    return;
  }
  
  // 如果是节点监控模式，直接使用传递的 NEM ID
  if (props.link.is_node_monitoring && props.link.nem_id) {
    selectedNemId.value = props.link.nem_id;
    // 初始化节点缓
    if (!dataCache.value.has(props.link.nem_id)) {
      dataCache.value.set(props.link.nem_id, {
        metric: null,
        status: null,
        rfSignal: null,
        timestamp: Date.now()
      });
    }
    return;
  }
  
  // 使用优化后的方法获取NEM ID
  const targetNemId = emaneStore.getNemIdForLink(
    props.link.node1_id, 
    props.link.node2_id, 
    currentPerspective.value
  );
  
  // 使用新方法获取视角NEM ID，如果之前没有设置的
  if (viewpointNemId.value === null) {
    const viewpointId = emaneStore.getLinkViewpointNemId(
      props.link.node1_id,
      props.link.node2_id,
      currentPerspective.value
    );
    viewpointNemId.value = viewpointId;
  }
  
  if (targetNemId !== null) {
    selectedNemId.value = targetNemId;
    
    // 立即初始化该NEM ID的缓
    if (!dataCache.value.has(targetNemId)) {
      dataCache.value.set(targetNemId, {
        metric: null,
        status: null,
        rfSignal: null,
        timestamp: Date.now()
      });
    }
    return;
  }
  
  // 尝试直接从源节点和目标节点获取NEM ID
  if (sourceNodeNemId.value) {
    selectedNemId.value = sourceNodeNemId.value;
    // 初始化缓
    if (!dataCache.value.has(sourceNodeNemId.value)) {
      dataCache.value.set(sourceNodeNemId.value, {
        metric: null,
        status: null,
        rfSignal: null,
        timestamp: Date.now()
      });
    }
    return;
  }
  
  if (targetNodeNemId.value) {
    selectedNemId.value = targetNodeNemId.value;
    // 初始化缓
    if (!dataCache.value.has(targetNodeNemId.value)) {
      dataCache.value.set(targetNodeNemId.value, {
        metric: null,
        status: null,
        rfSignal: null,
        timestamp: Date.now()
      });
    }
    return;
  }
  
  // 如果无法根据链路确定NEM ID，则使用第一个可用的NEM ID
  if (nemIds.value.length > 0 && !selectedNemId.value) {
    selectedNemId.value = nemIds.value[0];
    // 初始化缓
    if (!dataCache.value.has(nemIds.value[0])) {
      dataCache.value.set(nemIds.value[0], {
        metric: null,
        status: null,
        rfSignal: null,
        timestamp: Date.now()
      });
    }
  } else {
    console.warn('无法找到任何可用的NEM ID');
  }
};

// 更新历史数据，确保每种数据类型正确添加到对应数据
const updateHistoryData = () => {
  if (!selectedNemId.value) return;
  
  // 获取最新数据，确保非空
  const metric = tableMetricData.value;
  const status = tableStatusData.value;
  const rfSignal = tableRfSignalData.value;
  
  if (!metric && !status && !rfSignal) return;
  
  const nemId = selectedNemId.value;
  
  // 为该NEM初始化历史数据结构（如果不存在）
  if (!historyData.value[nemId]) {
    historyData.value[nemId] = {
      timestamps: [],
      metrics: { 
        rxPkts: [], 
        txPkts: [], 
        missedPkts: [],
        sinrAvg: [],
        nfAvg: []
      },
      status: { 
        rxPkts: [], 
        txPkts: [], 
        missedPkts: [],
        bwUtilRatio: [],
        sinrAvg: [],
        nfAvg: []
      },
      rfSignals: { 
        avgRxPower: [], 
        avgNoiseFloor: [], 
        avgSINR: [], 
        avgINR: [] 
      }
    };
  }
  
  const now = new Date();
  
  // 添加新的时间
  historyData.value[nemId].timestamps.push(now);
  
  // 添加指标数据 - 只有在有指标数据时添
  if (metric) {
    historyData.value[nemId].metrics.rxPkts.push(metric.rxPkts);
    historyData.value[nemId].metrics.txPkts.push(metric.txPkts);
    historyData.value[nemId].metrics.missedPkts.push(metric.missedPkts);
    historyData.value[nemId].metrics.sinrAvg.push(metric.sinrAvg);
    historyData.value[nemId].metrics.nfAvg.push(metric.nfAvg);
  }
  
  // 添加状态数- 只有在有状态数据时添加
  if (status) {
    historyData.value[nemId].status.rxPkts.push(status.rxPkts);
    historyData.value[nemId].status.txPkts.push(status.txPkts);
    historyData.value[nemId].status.missedPkts.push(status.missedPkts);
    historyData.value[nemId].status.bwUtilRatio.push(status.bwUtilRatio);
    historyData.value[nemId].status.sinrAvg.push(status.sinrAvg);
    historyData.value[nemId].status.nfAvg.push(status.nfAvg);
  }
  
  // 添加RF信号数据 - 只有在有RF信号数据时添
  if (rfSignal) {
    historyData.value[nemId].rfSignals.avgRxPower.push(rfSignal.avgRxPower);
    historyData.value[nemId].rfSignals.avgNoiseFloor.push(rfSignal.avgNoiseFloor);
    historyData.value[nemId].rfSignals.avgSINR.push(rfSignal.avgSINR);
    historyData.value[nemId].rfSignals.avgINR.push(rfSignal.avgINR);
  }
  
  // 限制历史数据长度，保留最新的30个数据点
  const MAX_HISTORY_POINTS = 30;
  if (historyData.value[nemId].timestamps.length > MAX_HISTORY_POINTS) {
    historyData.value[nemId].timestamps = historyData.value[nemId].timestamps.slice(-MAX_HISTORY_POINTS);
    
    // 指标数据裁剪
    historyData.value[nemId].metrics.rxPkts = historyData.value[nemId].metrics.rxPkts.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].metrics.txPkts = historyData.value[nemId].metrics.txPkts.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].metrics.missedPkts = historyData.value[nemId].metrics.missedPkts.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].metrics.sinrAvg = historyData.value[nemId].metrics.sinrAvg.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].metrics.nfAvg = historyData.value[nemId].metrics.nfAvg.slice(-MAX_HISTORY_POINTS);
    
    // 状态数据裁
    historyData.value[nemId].status.rxPkts = historyData.value[nemId].status.rxPkts.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].status.txPkts = historyData.value[nemId].status.txPkts.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].status.missedPkts = historyData.value[nemId].status.missedPkts.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].status.bwUtilRatio = historyData.value[nemId].status.bwUtilRatio.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].status.sinrAvg = historyData.value[nemId].status.sinrAvg.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].status.nfAvg = historyData.value[nemId].status.nfAvg.slice(-MAX_HISTORY_POINTS);
    
    // RF信号数据裁剪
    historyData.value[nemId].rfSignals.avgRxPower = historyData.value[nemId].rfSignals.avgRxPower.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].rfSignals.avgNoiseFloor = historyData.value[nemId].rfSignals.avgNoiseFloor.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].rfSignals.avgSINR = historyData.value[nemId].rfSignals.avgSINR.slice(-MAX_HISTORY_POINTS);
    historyData.value[nemId].rfSignals.avgINR = historyData.value[nemId].rfSignals.avgINR.slice(-MAX_HISTORY_POINTS);
  }
};

// 初始化邻居节点指标图
const initMetricChart = () => {
  if (!metricChartRef.value) return;

  // 确保先销毁现有实
  if (metricChart.value) {
    metricChart.value.dispose();
  }

  const chart = echarts.init(metricChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: '邻居节点指标变化趋势',
      left: 'center',
      textStyle: {
        color: '#eaf6ff',
        fontSize: 16,
        fontWeight: 'bold'
      },
      top: 5
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].axisValueLabel + '<br/>';
        params.forEach((item: any) => {
          let value = item.value;
          let unit = '';
          if (item.seriesName.includes('SINR')) unit = ' dB';
          else if (item.seriesName.includes('噪声')) unit = ' dBm';
          else if (item.seriesName.includes('包数')) unit = ' 个';
          result += `${item.marker} ${item.seriesName}: ${value}${unit}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['接收包数', '发送包数', '丢失包数', 'SINR平均值', '平均噪声基底'],
      textStyle: {
        color: '#eaf6ff',
        fontSize: 11
      },
      top: 35,
      itemGap: 10,
      itemWidth: 16,
      itemHeight: 10
    },
    grid: {
      left: '10%',
      right: '15%',
      top: '15%',
      bottom: '10%',
      containLabel: false
    },
    xAxis: {
      type: 'category',
      boundaryGap: chartType.value === 'bar',
      data: [],
      axisLabel: {
        color: '#eaf6ff',
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '包数',
        position: 'left',
        axisLabel: {
          color: '#eaf6ff',
          fontSize: 11
        },
        nameTextStyle: {
          color: '#a5d6a7',
          fontSize: 12,
          fontWeight: 'bold',
          padding: [0, 0, 0, 10]
        },
        nameLocation: 'end',
        nameGap: 10,
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      {
        type: 'value',
        name: 'SINR/噪声(dB)',
        position: 'right',
        axisLabel: {
          color: '#eaf6ff',
          fontSize: 11
        },
        nameTextStyle: {
          color: '#a5d6a7',
          fontSize: 12,
          fontWeight: 'bold',
          padding: [0, 10, 0, 0]
        },
        nameLocation: 'end',
        nameGap: 10,
        splitLine: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        }
      }
    ],
    series: [
      {
        name: '接收包数',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#47d147'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '发送包数',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#47b8e0'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '丢失包数',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#ff5733'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: 'SINR平均值',
        type: chartType.value,
        yAxisIndex: 1,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#00eaff'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '平均噪声基底',
        type: chartType.value,
        yAxisIndex: 1,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#ffcc00'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.6)'
  }));

  // 保存图表实例
  metricChart.value = chart;
};

// 初始化邻居节点状态图
const initStatusChart = () => {
  if (!statusChartRef.value) return;

  // 确保先销毁现有实
  if (statusChart.value) {
    statusChart.value.dispose();
  }

  const chart = echarts.init(statusChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: '邻居节点状态变化趋势',
      left: 'center',
      textStyle: {
        color: '#eaf6ff',
        fontSize: 16,
        fontWeight: 'bold'
      },
      top: 5
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].axisValueLabel + '<br/>';
        params.forEach((item: any) => {
          let value = item.value;
          let unit = '';
          if (item.seriesName.includes('SINR')) unit = ' dB';
          else if (item.seriesName.includes('噪声')) unit = ' dBm';
          else if (item.seriesName.includes('包数')) unit = ' 个';
          else if (item.seriesName.includes('带宽')) unit = ' %';
          result += `${item.marker} ${item.seriesName}: ${value}${unit}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['接收包数', '发送包数', '丢失包数', '带宽利用率', 'SINR平均值', '平均噪声基底'],
      textStyle: {
        color: '#eaf6ff',
        fontSize: 10
      },
      top: 35,
      itemGap: 8,
      itemWidth: 14,
      itemHeight: 8,
      orient: 'horizontal'
    },
    grid: {
      left: '10%',
      right: '20%',
      top: '18%',
      bottom: '10%',
      containLabel: false
    },
    xAxis: {
      type: 'category',
      boundaryGap: chartType.value === 'bar',
      data: [],
      axisLabel: {
        color: '#eaf6ff',
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '包数',
        position: 'left',
        axisLabel: {
          color: '#eaf6ff',
          fontSize: 11
        },
        nameTextStyle: {
          color: '#a5d6a7',
          fontSize: 12,
          fontWeight: 'bold',
          padding: [0, 0, 0, 10]
        },
        nameLocation: 'end',
        nameGap: 10,
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      {
        type: 'value',
        name: 'SINR/噪声(dB)',
        position: 'right',
        axisLabel: {
          color: '#eaf6ff',
          fontSize: 11
        },
        nameTextStyle: {
          color: '#a5d6a7',
          fontSize: 12,
          fontWeight: 'bold',
          padding: [0, 10, 0, 0]
        },
        nameLocation: 'end',
        nameGap: 10,
        splitLine: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        }
      },
      {
        type: 'value',
        name: '带宽利用率(%)',
        position: 'right',
        offset: 60,
        axisLabel: {
          color: '#eaf6ff',
          fontSize: 11,
          formatter: '{value}%'
        },
        nameTextStyle: {
          color: '#a5d6a7',
          fontSize: 12,
          fontWeight: 'bold',
          padding: [0, 5, 0, 0]
        },
        nameLocation: 'end',
        nameGap: 10,
        splitLine: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        }
      }
    ],
    series: [
      {
        name: '接收包数',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#47d147'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '发送包数',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#47b8e0'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '丢失包数',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#ff5733'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '带宽利用率比例',
        type: chartType.value,
        yAxisIndex: 2,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#80FFA5'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: 'SINR平均值',
        type: chartType.value,
        yAxisIndex: 1,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#00eaff'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '平均噪声基底',
        type: chartType.value,
        yAxisIndex: 1,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#ffcc00'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.6)'
  }));

  // 保存图表实例
  statusChart.value = chart;
};

// 初始化RF信号图表
const initRfSignalChart = () => {
  if (!rfSignalChartRef.value) return;

  // 确保先销毁现有实
  if (rfSignalChart.value) {
    rfSignalChart.value.dispose();
  }

  const chart = echarts.init(rfSignalChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: 'RF信号数据变化趋势',
      left: 'center',
      textStyle: {
        color: '#eaf6ff',
        fontSize: 16,
        fontWeight: 'bold'
      },
      top: 5
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].axisValueLabel + '<br/>';
        params.forEach((item: any) => {
          let value = item.value;
          let unit = item.seriesName.includes('SINR') || item.seriesName.includes('INR') ? ' dB' : ' dBm';
          result += `${item.marker} ${item.seriesName}: ${value.toFixed(2)}${unit}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['平均接收功率', '平均噪声基底', '平均SINR', '平均INR'],
      textStyle: {
        color: '#eaf6ff',
        fontSize: 11
      },
      top: 35,
      itemGap: 12,
      itemWidth: 16,
      itemHeight: 10
    },
    grid: {
      left: '10%',
      right: '15%',
      top: '15%',
      bottom: '10%',
      containLabel: false
    },
    xAxis: {
      type: 'category',
      boundaryGap: chartType.value === 'bar',
      data: [],
      axisLabel: {
        color: '#eaf6ff',
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '功率/噪声(dBm)',
        position: 'left',
        axisLabel: {
          color: '#eaf6ff',
          fontSize: 11
        },
        nameTextStyle: {
          color: '#a5d6a7',
          fontSize: 12,
          fontWeight: 'bold',
          padding: [0, 0, 0, 10]
        },
        nameLocation: 'end',
        nameGap: 15,
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      {
        type: 'value',
        name: 'SINR/INR(dB)',
        position: 'right',
        axisLabel: {
          color: '#eaf6ff',
          fontSize: 11
        },
        nameTextStyle: {
          color: '#a5d6a7',
          fontSize: 12,
          fontWeight: 'bold',
          padding: [0, 10, 0, 0]
        },
        nameLocation: 'end',
        nameGap: 15,
        splitLine: {
          show: false
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#a5d6a7'
          }
        }
      }
    ],
    series: [
      {
        name: '平均接收功率',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#ff5733'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '平均噪声基底',
        type: chartType.value,
        yAxisIndex: 0,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#ffcc00'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '平均SINR',
        type: chartType.value,
        yAxisIndex: 1,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#00eaff'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      },
      {
        name: '平均INR',
        type: chartType.value,
        yAxisIndex: 1,
        data: [],
        smooth: chartType.value === 'line',
        lineStyle: chartType.value === 'line' ? {
          width: 2
        } : undefined,
        itemStyle: {
          color: '#ff9900'
        },
        barWidth: chartType.value === 'bar' ? '60%' : undefined
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.6)'
  }));

  // 保存图表实例
  rfSignalChart.value = chart;
};


// 处理图表类型切换
const handleChartTypeChange = () => {
  // 重新初始化当前活跃的图表
  nextTick(() => {
    if (activeChartTab.value === 'metric') {
      initMetricChart();
    } else if (activeChartTab.value === 'status') {
      initStatusChart();
    } else if (activeChartTab.value === 'rfSignal') {
      initRfSignalChart();
    } else if (activeChartTab.value === 'bitstream' && hasSimulationData.value) {
      initUnifiedBitstreamChart();
    } else if (activeChartTab.value === 'constellation' && hasSimulationData.value) {
      initUnifiedConstellationChart();
    } else if (activeChartTab.value === 'hopSequence' && hasSimulationData.value) {
      initHopSequenceChart();
    } else if (activeChartTab.value === 'cloudChart' && hasSimulationData.value) {
      initCloudChart();
    } else if (activeChartTab.value === 'trends' && hasSimulationData.value) {
      initUnifiedTrendChart();
    }
    updateCharts();
  });
};

// 更新图表数据
const updateCharts = () => {
  if (!selectedNemId.value) return;

  // 确保历史数据存在
  if (!historyData.value[selectedNemId.value]) {
    historyData.value[selectedNemId.value] = {
      timestamps: [],
      metrics: {
        rxPkts: [],
        txPkts: [],
        missedPkts: [],
        sinrAvg: [],
        nfAvg: []
      },
      status: {
        rxPkts: [],
        txPkts: [],
        missedPkts: [],
        bwUtilRatio: [],
        sinrAvg: [],
        nfAvg: []
      },
      rfSignals: {
        avgRxPower: [],
        avgNoiseFloor: [],
        avgSINR: [],
        avgINR: []
      }
    };
    return; // 初始化数据后退出，等待下一次更
  }

  const nemId = selectedNemId.value;
  const nemData = historyData.value[nemId];

  // 更新邻居节点指标图表
  if (metricChart.value) {
    metricChart.value.setOption({
      xAxis: {
        data: nemData.timestamps
      },
      series: [
        {
          name: '接收包数',
          type: chartType.value,
          data: nemData.metrics.rxPkts
        },
        {
          name: '发送包数',
          type: chartType.value,
          data: nemData.metrics.txPkts
        },
        {
          name: '丢失包数',
          type: chartType.value,
          data: nemData.metrics.missedPkts
        },
        {
          name: 'SINR平均值',
          type: chartType.value,
          data: nemData.metrics.sinrAvg
        },
        {
          name: '平均噪声基底',
          type: chartType.value,
          data: nemData.metrics.nfAvg
        }
      ]
    });
  }

  // 更新邻居节点状态图表
  if (statusChart.value) {
    statusChart.value.setOption({
      xAxis: {
        data: nemData.timestamps
      },
      series: [
        {
          name: '接收包数',
          type: chartType.value,
          yAxisIndex: 0,
          data: nemData.status.rxPkts
        },
        {
          name: '发送包数',
          type: chartType.value,
          yAxisIndex: 0,
          data: nemData.status.txPkts
        },
        {
          name: '丢失包数',
          type: chartType.value,
          yAxisIndex: 0,
          data: nemData.status.missedPkts
        },
        {
          name: '带宽利用率',
          type: chartType.value,
          yAxisIndex: 2,
          data: nemData.status.bwUtilRatio.map(ratio => (ratio * 100).toFixed(2)) // 转换为百分比
        },
        {
          name: 'SINR平均值',
          type: chartType.value,
          yAxisIndex: 1,
          data: nemData.status.sinrAvg
        },
        {
          name: '平均噪声基底',
          type: chartType.value,
          yAxisIndex: 1,
          data: nemData.status.nfAvg
        }
      ]
    });
  }

  // 更新RF信号图表
  if (rfSignalChart.value) {
    rfSignalChart.value.setOption({
      xAxis: {
        data: nemData.timestamps
      },
      series: [
        {
          name: '平均接收功率',
          type: chartType.value,
          data: nemData.rfSignals.avgRxPower
        },
        {
          name: '平均噪声基底',
          type: chartType.value,
          data: nemData.rfSignals.avgNoiseFloor
        },
        {
          name: '平均SINR',
          type: chartType.value,
          data: nemData.rfSignals.avgSINR
        },
        {
          name: '平均INR',
          type: chartType.value,
          data: nemData.rfSignals.avgINR
        }
      ]
    });
  }
};

// 统一历史数据 - 汇聚到单一趋势数据源，支持连续累积
const unifiedHistoryData = shallowRef<{
  timestamps: number[];
  snr: number[];
  pathLoss: number[];
  delay: number[];
  carrierFreq: number[];  // 载波频率数据（MHz
  // 比特流连续数
  bitstreamData: {
    originalBits: number[];
    demodulatedBits: number[];
    timeLabels: string[];
  };
  // 星座图连续数
  constellationData: {
    points: Array<{x: number, y: number, time: number}>;
  };
  // FHSS跳频序列连续数据
  hopSequenceData: {
    frequencies: number[];
    timeLabels: string[];
  };
  // GMSK云图连续数据
  cloudData: {
    txPoints: Array<{x: number, y: number, time: number}>;
  };
}>({
  timestamps: [],
  snr: [],
  pathLoss: [],
  delay: [],
  carrierFreq: [],
  bitstreamData: {
    originalBits: [],
    demodulatedBits: [],
    timeLabels: []
  },
  constellationData: {
    points: []
  },
  hopSequenceData: {
    frequencies: [],
    timeLabels: []
  },
  cloudData: {
    txPoints: []
  }
});

const updateUnifiedHistoryData = () => {
  const data = currentSimData.value;
  if (!data?.channel_metrics) return;

  const currentTime = Date.now();
  // 先规范化channel_metrics，确保无论后端发送的是扁平格式还是嵌套格式都能正确访
  const metrics = normalizeChannelMetrics(data.channel_metrics);
  const snr = metrics?.link_quality?.snr_db || 0;
  const pathLoss = metrics?.large_scale?.path_loss_db || metrics?.large_scale?.total_loss_db || 0;
  const originalDelay = metrics?.network_characteristics?.delay_ms || 0;
  
  // 获取EMANE模型节点的传输时延配置并加到原始延迟
  let emaneModelNodeId: number | null = null;
  if (props.link) {
    const currentNodeId = currentPerspective.value === 'source' ? props.link.node1_id : props.link.node2_id;
    emaneModelNodeId = getEmaneModelNodeId(currentNodeId);
  }
  const configuredDelay = emaneModelNodeId ? transmissionConfigStore.getNodeTransmissionDelay(emaneModelNodeId) : 0;
  const delay = originalDelay + configuredDelay;

  // 调试信息
  console.log('趋势图延迟计算调', {
    originalDelay,
    currentNodeId: props.link ? (currentPerspective.value === 'source' ? props.link.node1_id : props.link.node2_id) : null,
    emaneModelNodeId,
    configuredDelay,
    totalDelay: delay
  });

  const hist = unifiedHistoryData.value;

  // 更新趋势数据
  hist.timestamps.push(currentTime);
  hist.snr.push(snr);
  hist.pathLoss.push(pathLoss);
  hist.delay.push(delay);

  // 更新载波频率数据（TTC/协同自组网）
  const carrierFreq = data.carrier_freq_mhz || 0;
  hist.carrierFreq.push(carrierFreq);

  // 更新比特流连续数
  // VHF: 只有original_bits
  // 其他模型: 有original_bits和demodulated_bits
  // 5G: 有num_in_240_200和de_scram_out_240_200
  if (data.data?.original_bits || data.data?.num_in_240_200) {
    const timeLabel = new Date(currentTime).toLocaleTimeString();

    // 累积比特流数据，保持连续
    const originalBits = data.data?.original_bits || data.data?.num_in_240_200 || [];
    hist.bitstreamData.originalBits.push(...originalBits);

    // 如果有demodulated_bits或de_scram_out_240_200，也添加到历史数
    const demodBits = data.data?.demodulated_bits || data.data?.recovered_bits || data.data?.recover_bits || data.data?.de_scram_out_240_200 || [];
    if (demodBits.length > 0) {
      hist.bitstreamData.demodulatedBits.push(...demodBits);
    }

    // 为每个比特添加时间标
    const bitsCount = originalBits.length;
    for (let i = 0; i < bitsCount; i++) {
      hist.bitstreamData.timeLabels.push(`${timeLabel}-${i}`);
    }
  }

  // 更新FHSS跳频序列数据
  if (hasHopSequenceData.value && data.data?.hop_sequence) {
    const timeLabel = new Date(currentTime).toLocaleTimeString();
    data.data.hop_sequence.forEach((freq: number) => {
      hist.hopSequenceData.frequencies.push(freq);
      hist.hopSequenceData.timeLabels.push(timeLabel);
    });
  }

  // 限制历史数据长度，保持性能
  const MAX_TREND_POINTS = 60;
  const MAX_STREAM_POINTS = 500; // 比特流等连续数据的最大点

  // 裁剪趋势数据
  if (hist.timestamps.length > MAX_TREND_POINTS) {
    hist.timestamps = hist.timestamps.slice(-MAX_TREND_POINTS);
    hist.snr = hist.snr.slice(-MAX_TREND_POINTS);
    hist.pathLoss = hist.pathLoss.slice(-MAX_TREND_POINTS);
    hist.delay = hist.delay.slice(-MAX_TREND_POINTS);
    hist.carrierFreq = hist.carrierFreq.slice(-MAX_TREND_POINTS);
  }

  // 裁剪比特流数
  if (hist.bitstreamData.originalBits.length > MAX_STREAM_POINTS) {
    hist.bitstreamData.originalBits = hist.bitstreamData.originalBits.slice(-MAX_STREAM_POINTS);
    hist.bitstreamData.demodulatedBits = hist.bitstreamData.demodulatedBits.slice(-MAX_STREAM_POINTS);
    hist.bitstreamData.timeLabels = hist.bitstreamData.timeLabels.slice(-MAX_STREAM_POINTS);
  }

  // 裁剪跳频序列数据
  if (hist.hopSequenceData.frequencies.length > MAX_STREAM_POINTS) {
    hist.hopSequenceData.frequencies = hist.hopSequenceData.frequencies.slice(-MAX_STREAM_POINTS);
    hist.hopSequenceData.timeLabels = hist.hopSequenceData.timeLabels.slice(-MAX_STREAM_POINTS);
  }
};

// 清空统一历史数据（仿真停止时调用
// 仅销毁图表实例，不清除历史数据（视图切换时调用）
const disposeAllChartInstances = () => {
  const charts = [
    bitstreamChart, constellationChart, hopSequenceChart, cloudChart,
    rxIqWaveformChart, dssTxIqWaveformChart, dssRxIqWaveformChart,
    channelIqWaveformChart, recoveredIqWaveformChart,
    trendChart, spectrumChart, carrierFreqChart,
    spreadSamplesChart, despreadSamplesChart, demodulatedBitstreamChart,
    iqComparisonChart, constellationAfterChannelChart, restoredConstellationChart,
    fiveGQamMappedChart, fiveGCloudComparisonChart, fiveGSpectrumChart, fiveGWaveformChart,
    multipathSpectrumChart, multipathConstellationChart,
    metricChart, statusChart, rfSignalChart,
  ];
  for (const chart of charts) {
    if (chart.value) {
      chart.value.dispose();
      chart.value = null;
    }
  }
};

const clearUnifiedHistoryData = () => {
  resetDiscoveredDataTypes();
  
  unifiedHistoryData.value = {
    timestamps: [],
    snr: [],
    pathLoss: [],
    delay: [],
    carrierFreq: [],
    bitstreamData: {
      originalBits: [],
      demodulatedBits: [],
      timeLabels: []
    },
    constellationData: {
      points: []
    },
    hopSequenceData: {
      frequencies: [],
      timeLabels: []
    },
    cloudData: {
      txPoints: []
    }
  };

  // 销毁所有图表实
  if (bitstreamChart.value) {
    bitstreamChart.value.dispose();
    bitstreamChart.value = null;
  }
  if (constellationChart.value) {
    constellationChart.value.dispose();
    constellationChart.value = null;
  }
  if (hopSequenceChart.value) {
    hopSequenceChart.value.dispose();
    hopSequenceChart.value = null;
  }
  if (cloudChart.value) {
    cloudChart.value.dispose();
    cloudChart.value = null;
  }
  if (rxIqWaveformChart.value) {
    rxIqWaveformChart.value.dispose();
    rxIqWaveformChart.value = null;
  }
  if (dssTxIqWaveformChart.value) {
    dssTxIqWaveformChart.value.dispose();
    dssTxIqWaveformChart.value = null;
  }
  if (dssRxIqWaveformChart.value) {
    dssRxIqWaveformChart.value.dispose();
    dssRxIqWaveformChart.value = null;
  }
  if (channelIqWaveformChart.value) {
    channelIqWaveformChart.value.dispose();
    channelIqWaveformChart.value = null;
  }
  if (recoveredIqWaveformChart.value) {
    recoveredIqWaveformChart.value.dispose();
    recoveredIqWaveformChart.value = null;
  }
  if (trendChart.value) {
    trendChart.value.dispose();
    trendChart.value = null;
  }
  if (carrierFreqChart.value) {
    carrierFreqChart.value.dispose();
    carrierFreqChart.value = null;
  }

  // 销毁DSSS专用图表实例
  if (spreadSamplesChart.value) {
    spreadSamplesChart.value.dispose();
    spreadSamplesChart.value = null;
  }
  if (despreadSamplesChart.value) {
    despreadSamplesChart.value.dispose();
    despreadSamplesChart.value = null;
  }
  if (demodulatedBitstreamChart.value) {
    demodulatedBitstreamChart.value.dispose();
    demodulatedBitstreamChart.value = null;
  }
  if (iqComparisonChart.value) {
    iqComparisonChart.value.dispose();
    iqComparisonChart.value = null;
  }
  if (constellationAfterChannelChart.value) {
    constellationAfterChannelChart.value.dispose();
    constellationAfterChannelChart.value = null;
  }
  if (restoredConstellationChart.value) {
    restoredConstellationChart.value.dispose();
    restoredConstellationChart.value = null;
  }
  if (fiveGQamMappedChart.value) {
    fiveGQamMappedChart.value.dispose();
    fiveGQamMappedChart.value = null;
  }
  if (fiveGCloudComparisonChart.value) {
    fiveGCloudComparisonChart.value.dispose();
    fiveGCloudComparisonChart.value = null;
  }
  if (fiveGSpectrumChart.value) {
    fiveGSpectrumChart.value.dispose();
    fiveGSpectrumChart.value = null;
  }
  if (fiveGWaveformChart.value) {
    fiveGWaveformChart.value.dispose();
    fiveGWaveformChart.value = null;
  }

  // 销毁多径路径图表实
  if (multipathSpectrumChart.value) {
    multipathSpectrumChart.value.dispose();
    multipathSpectrumChart.value = null;
  }
  if (multipathConstellationChart.value) {
    multipathConstellationChart.value.dispose();
    multipathConstellationChart.value = null;
  }
};

// 统一比特流图- 使用连续累积数据
const initUnifiedBitstreamChart = () => {
  if (!bitstreamChartRef.value) return;

  const hist = unifiedHistoryData.value.bitstreamData;

  // 如果没有累积数据，使用当前数据初始化
  if (hist.originalBits.length === 0) {
    const data = currentSimData.value;
    // VHF: 只有original_bits，没有demodulated_bits
    // 其他模型: 需要original_bits和demodulated_bits
    if (data?.data?.original_bits) {
      // 初始化时添加当前数据
      updateUnifiedHistoryData();
    } else {
      console.warn('比特流数据为空');
      return;
    }
  }

  // 显示最新的一段数据（滑动窗口
  const displayLen = Math.min(hist.originalBits.length, 200);
  const startIdx = Math.max(0, hist.originalBits.length - displayLen);

  const displayOriginal = hist.originalBits.slice(startIdx);
  const displayDemodulated = hist.demodulatedBits.slice(startIdx);
  const xAxisData = Array.from({ length: displayLen }, (_, i) => startIdx + i);

  if (bitstreamChart.value) {
    // 平滑更新数据
    const seriesData = [{ data: displayOriginal }];
    // 只有在有demodulated_bits时才添加第二条曲
    if (displayDemodulated.length > 0) {
      seriesData.push({ data: displayDemodulated });
    }

    bitstreamChart.value.setOption({
      xAxis: {
        data: xAxisData,
        name: `比特索引 (总计: ${hist.originalBits.length})`
      },
      series: seriesData
    });
    return;
  }

  const chart = echarts.init(bitstreamChartRef.value);

  // 构建series配置，根据是否有demodulated_bits来决定显示一条还是两条曲
  const seriesConfig = [
    {
      name: '原始比特', data: displayOriginal,
      type: 'line', smooth: false, symbol: 'circle', symbolSize: 3,
      lineStyle: { color: '#0cc4cc', width: 2 }, itemStyle: { color: '#0cc4cc' },
      animation: true, animationDuration: 300
    }
  ];

  // 只有在有解调比特时才添加第二条曲
  if (displayDemodulated.length > 0) {
    seriesConfig.push({
      name: '解调比特', data: displayDemodulated,
      type: 'line', smooth: false, symbol: 'square', symbolSize: 3,
      lineStyle: { color: '#ff7f50', width: 2, type: 'dashed' }, itemStyle: { color: '#ff7f50' },
      animation: true, animationDuration: 300
    });
  }

  chart.setOption(markRaw({
    title: {
      text: '连续比特流波形',
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        let result = `比特索引: ${params[0].dataIndex + startIdx}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker} ${item.seriesName}: ${item.value}<br/>`;
        });
        return result;
      }
    },
    legend: {
      top: 35,
      textStyle: { color: '#a5d6a7' },
      data: displayDemodulated.length > 0 ? ['原始比特', '解调比特'] : ['原始比特'],
      itemGap: 20
    },
    grid: { left: '12%', right: '12%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: `比特索引 (总计: ${hist.originalBits.length})`,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', min: -0.3, max: 1.3,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: seriesConfig,
    backgroundColor: 'rgba(8, 15, 39, 0.4)',
    animation: true
  }));
  bitstreamChart.value = chart;
};

// 统一星座- 直接使用当前数据，流畅变
const initUnifiedConstellationChart = () => {
  if (!constellationChartRef.value) return;

  const data = currentSimData.value;
  if (!data?.data) return;

  let chartTitle = '';
  let scatterData: number[][] = [];

  // 根据数据结构获取星座图数
  if (data.data.modulated_symbols) {
    scatterData = data.data.modulated_symbols.map(toIqPoint);
    chartTitle = '调制符号星座图';
  } else if (data.data.spread_samples && data.data.hop_sequence) {
    // FHSS数据有hop_sequence
    scatterData = data.data.spread_samples.map(toIqPoint);
    chartTitle = '扩频样本星座图';
  } else if (data.data.tx_samples) {
    scatterData = data.data.tx_samples.map(toIqPoint);
    chartTitle = '发送样本星座图';
  } else if (data.data.modulated_iq) {
    scatterData = data.data.modulated_iq.map(toIqPoint);
    chartTitle = '调制IQ星座图';
  }

  // 如果没有有效数据，不绘制图表
  if (scatterData.length === 0) {
    console.warn('星座图数据为空');
    return;
  }

  if (constellationChart.value) {
    constellationChart.value.setOption({
      title: { text: `${chartTitle} (点数: ${scatterData.length})` },
      series: [{
        data: scatterData
      }]
    });
    return;
  }

  const chart = echarts.init(constellationChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `${chartTitle} (点数: ${scatterData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: hasTxSamplesData.value ? '发送样本' : '调制符号',
      type: 'scatter',
      data: scatterData,
      symbolSize: 4,
      itemStyle: {
        color: hasTxSamplesData.value
          ? new echarts.graphic.LinearGradient(0, 0, 1, 1, [
              { offset: 0, color: '#95e1d3' }, { offset: 1, color: '#4ecdc4' }
            ], false)
          : new echarts.graphic.LinearGradient(0, 0, 1, 1, [
              { offset: 0, color: '#0cc4cc' }, { offset: 1, color: '#00d4ff' }
            ], false),
        opacity: 0.7
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  constellationChart.value = chart;
};

// FHSS跳频序列- 显示连续的跳频模
const initHopSequenceChart = () => {
  if (!hopSequenceChartRef.value) return;
  if (!hasHopSequenceData.value) return;

  const hist = unifiedHistoryData.value.hopSequenceData;
  
  // 如果没有累积数据，使用当前数据初始化
  if (hist.frequencies.length === 0) {
    updateUnifiedHistoryData();
  }

  if (hist.frequencies.length === 0) {
    console.warn('FHSS 跳频序列数据为空');
    return;
  }

  // 显示最新的跳频序列（滑动窗口）
  const displayLen = Math.min(hist.frequencies.length, 100);
  const startIdx = Math.max(0, hist.frequencies.length - displayLen);
  
  const displayFreqs = hist.frequencies.slice(startIdx);
  const xAxisData = Array.from({ length: displayLen }, (_, i) => startIdx + i);

  if (hopSequenceChart.value) {
    hopSequenceChart.value.setOption({
      xAxis: { 
        data: xAxisData,
        name: `跳频索引 (总计: ${hist.frequencies.length})`
      },
      series: [{ data: displayFreqs }]
    });
    return;
  }

  const chart = echarts.init(hopSequenceChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: '连续跳频序列',
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const index = params[0].dataIndex + startIdx;
        const freq = params[0].value;
        return `跳频索引: ${index}<br/>频率: ${freq}`;
      }
    },
    grid: { left: '12%', right: '12%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category', 
      data: xAxisData,
      name: `跳频索引 (总计: ${hist.frequencies.length})`,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', 
      name: '频率',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: '跳频序列',
      data: displayFreqs,
      type: 'line',
      step: 'end', // 阶梯线，表示频率跳变
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#ff9800', width: 3 },
      itemStyle: { color: '#ff9800' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255, 152, 0, 0.3)' },
          { offset: 1, color: 'rgba(255, 152, 0, 0.1)' }
        ])
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  hopSequenceChart.value = chart;
};

// 云图 - 直接使用当前数据，流畅变
const initCloudChart = () => {
  if (!cloudChartRef.value) return;
  if (!hasRxSamplesData.value) return;

  const data = currentSimData.value;
  const rxSource = data?.data?.rx_samples ?? data?.data?.channel_iq;
  if (!Array.isArray(rxSource) || rxSource.length === 0) {
    console.warn('云图数据为空');
    return;
  }

  // 直接从当前数据获取RX样本
  const scatterData = rxSource.map(toIqPoint);

  if (cloudChart.value) {
    cloudChart.value.setOption({
      title: { text: `接收样本云图 (点数: ${scatterData.length})` },
      series: [{ data: scatterData }]
    });
    return;
  }

  const chart = echarts.init(cloudChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `接收样本云图 (点数: ${scatterData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: '接收样本', 
      type: 'scatter', 
      data: scatterData,
      symbolSize: 4,
      itemStyle: { 
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#4ecdc4' }, { offset: 1, color: '#44a08d' }
        ], false), 
        opacity: 0.6
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  cloudChart.value = chart;
};

// 统一趋势- 使用累积的历史数据实现连续折
const initUnifiedTrendChart = () => {
  if (!trendChartRef.value) return;

  const hist = unifiedHistoryData.value;
  if (hist.timestamps.length === 0) return;

  const startTime = hist.timestamps[0];
  const xAxisData = hist.timestamps.map(t => {
    const elapsed = ((t - startTime) / 1000).toFixed(1);
    return `${elapsed}s`;
  });

  if (trendChart.value) {
    trendChart.value.setOption({
      xAxis: { data: xAxisData },
      series: [
        { data: [...hist.snr] },
        { data: [...hist.pathLoss] },
        { data: [...hist.delay] }
      ]
    });
    return;
  }

  const chart = echarts.init(trendChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: '关键指标趋势',
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'cross', label: { backgroundColor: '#6c7383' } }
    },
    legend: {
      top: 35, textStyle: { color: '#a5d6a7' },
      data: ['SNR (dB)', '路径损耗(dB)', '延迟 (ms)'], itemGap: 15
    },
    grid: { left: '12%', right: '12%', top: '25%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category', data: xAxisData,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: [
      {
        type: 'value', name: 'SNR / 路径损耗', position: 'left',
        nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
        axisLine: { lineStyle: { color: '#4a6fa5' } },
        axisLabel: { color: '#a5d6a7', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
      },
      {
        type: 'value', name: '延迟 (ms)', position: 'right',
        nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
        axisLine: { lineStyle: { color: '#4a6fa5' } },
        axisLabel: { color: '#a5d6a7', fontSize: 10 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'SNR (dB)', data: [...hist.snr], type: 'line', smooth: true,
        lineStyle: { color: '#0cc4cc', width: 2 }, itemStyle: { color: '#0cc4cc' },
        yAxisIndex: 0, symbolSize: 2
      },
      {
        name: '路径损耗(dB)', data: [...hist.pathLoss], type: 'line', smooth: true,
        lineStyle: { color: '#ff7f50', width: 2 }, itemStyle: { color: '#ff7f50' },
        yAxisIndex: 0, symbolSize: 2
      },
      {
        name: '延迟 (ms)', data: [...hist.delay], type: 'line', smooth: true,
        lineStyle: { color: '#4caf50', width: 2 }, itemStyle: { color: '#4caf50' },
        yAxisIndex: 1, symbolSize: 2
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  trendChart.value = chart;
};

// DSSS专用图表初始化函数

// 扩频后样本云图
const initSpreadSamplesChart = () => {
  if (!spreadSamplesChartRef.value) return;
  if (!hasSpreadSamplesData.value) return;

  const data = currentSimData.value;
  if (!data?.data?.spread_samples) {
    console.warn('扩频后样本数据为空');
    return;
  }

  // 直接从当前数据获取扩频后样本
  const scatterData = data.data.spread_samples.map((sample: any) => [
    sample.real || 0,
    sample.imag || 0
  ]);

  if (spreadSamplesChart.value) {
    spreadSamplesChart.value.setOption({
      title: { text: `扩频后样本云图(点数: ${scatterData.length})` },
      series: [{ data: scatterData }]
    });
    return;
  }

  const chart = echarts.init(spreadSamplesChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `扩频后样本云图(点数: ${scatterData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: '扩频后样本', 
      type: 'scatter', 
      data: scatterData,
      symbolSize: 4,
      itemStyle: { 
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#ff9800' }, { offset: 1, color: '#f57c00' }
        ], false), 
        opacity: 0.7
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  spreadSamplesChart.value = chart;
};

// 解扩后样本云图
const initDespreadSamplesChart = () => {
  if (!despreadSamplesChartRef.value) return;
  if (!hasDespreadSamplesData.value) return;

  const data = currentSimData.value;
  if (!data?.data?.despread_samples) {
    console.warn('解扩后样本数据为空');
    return;
  }

  // 直接从当前数据获取解扩后样本
  const scatterData = data.data.despread_samples.map((sample: any) => [
    sample.real || 0,
    sample.imag || 0
  ]);

  if (despreadSamplesChart.value) {
    despreadSamplesChart.value.setOption({
      title: { text: `解扩后样本云图(点数: ${scatterData.length})` },
      series: [{ data: scatterData }]
    });
    return;
  }

  const chart = echarts.init(despreadSamplesChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `解扩后样本云图(点数: ${scatterData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: '解扩后样本', 
      type: 'scatter', 
      data: scatterData,
      symbolSize: 4,
      itemStyle: { 
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#9c27b0' }, { offset: 1, color: '#673ab7' }
        ], false), 
        opacity: 0.7
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  despreadSamplesChart.value = chart;
};

const toIqPoint = (iq: any): number[] => [
  Number(iq?.[0] ?? iq?.real ?? iq?.r ?? 0),
  Number(iq?.[1] ?? iq?.imag ?? iq?.i ?? 0),
];

const RX_IQ_WAVEFORM_MAX_POINTS = 512;
const RX_IQ_WAVEFORM_INIT_ANIMATION_MS = 120;
const RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS = 450;

const getIqComparisonSamples = () => {
  const rawData = currentSimData.value?.data || {};
  const txSource = rawData.transmitter_iq ?? rawData.tx_samples ?? rawData.modulated_iq ?? [];
  const rxSource = rawData.receiver_iq ?? rawData.rx_samples ?? rawData.channel_iq ?? [];
  return {
    txScatterData: Array.isArray(txSource) ? txSource.map(toIqPoint) : [],
    rxScatterData: Array.isArray(rxSource) ? rxSource.map(toIqPoint) : [],
  };
};

const getRxIqWaveformSamples = () => {
  const rawData = currentSimData.value?.data || currentSimData.value || {};
  const rxSource = rawData.rx_samples ?? rawData.receiver_iq ?? rawData.channel_iq ?? [];
  const rxPoints = Array.isArray(rxSource) ? rxSource.map(toIqPoint) : [];
  const displayPoints = rxPoints.length > RX_IQ_WAVEFORM_MAX_POINTS
    ? rxPoints.slice(-RX_IQ_WAVEFORM_MAX_POINTS)
    : rxPoints;
  const startIndex = Math.max(0, rxPoints.length - displayPoints.length);
  return {
    total: rxPoints.length,
    xAxisData: displayPoints.map((_, index) => startIndex + index),
    iData: displayPoints.map(point => point[0]),
    qData: displayPoints.map(point => point[1]),
  };
};

type IqWaveformField = 'channel_iq' | 'recovered_iq' | 'tx_samples' | 'rx_samples';

const getIqWaveformSamplesByField = (field: IqWaveformField) => {
  const rawData = currentSimData.value?.data || currentSimData.value || {};
  const source = rawData[field] ?? [];
  const points = Array.isArray(source) ? source.map(toIqPoint) : [];
  const displayPoints = points.length > RX_IQ_WAVEFORM_MAX_POINTS
    ? points.slice(-RX_IQ_WAVEFORM_MAX_POINTS)
    : points;
  const startIndex = Math.max(0, points.length - displayPoints.length);
  return {
    total: points.length,
    xAxisData: displayPoints.map((_, index) => startIndex + index),
    iData: displayPoints.map(point => point[0]),
    qData: displayPoints.map(point => point[1]),
  };
};

const renderIqWaveformChart = (
  chartRef: { value: HTMLElement | null },
  chartState: { value: echarts.ECharts | null },
  field: IqWaveformField,
  titlePrefix: string,
  idPrefix: string
) => {
  if (!chartRef.value) return;

  const { total, xAxisData, iData, qData } = getIqWaveformSamplesByField(field);
  const pointText = total > xAxisData.length ? `${xAxisData.length}/${total}` : `${total}`;
  const chartTitle = total > 0 ? `${titlePrefix} (点数: ${pointText})` : `${titlePrefix} (暂无数据)`;

  const partialOption = {
    animation: true,
    animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS,
    animationEasingUpdate: 'cubicOut',
    title: { text: chartTitle },
    xAxis: { data: xAxisData },
    series: [
      { id: `${idPrefix}-i`, name: 'I(real)', data: iData, showSymbol: false, animation: true },
      { id: `${idPrefix}-q`, name: 'Q(imag)', data: qData, showSymbol: false, animation: true },
    ],
  };

  if (chartState.value) {
    chartState.value.setOption(partialOption, { lazyUpdate: true });
    return;
  }

  const chart = echarts.init(chartRef.value);
  chart.setOption(markRaw({
    ...partialOption,
    animationDuration: RX_IQ_WAVEFORM_INIT_ANIMATION_MS,
    title: {
      text: chartTitle,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px',
      left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const index = params?.[0]?.axisValue ?? '';
        let result = `采样点: ${index}<br/>`;
        params.forEach((item: any) => {
          const value = Number(item.value);
          result += `${item.marker} ${item.seriesName}: ${Number.isFinite(value) ? value.toFixed(4) : item.value}<br/>`;
        });
        return result;
      }
    },
    legend: {
      top: 35,
      textStyle: { color: '#a5d6a7' },
      data: ['I(real)', 'Q(imag)'],
      itemGap: 20
    },
    grid: { left: '12%', right: '10%', top: '22%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: '采样点',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      name: '幅度',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [
      {
        id: `${idPrefix}-i`,
        name: 'I(real)',
        type: 'line',
        data: iData,
        smooth: false,
        symbol: 'none',
        showSymbol: false,
        lineStyle: { color: '#0cc4cc', width: 2 },
        itemStyle: { color: '#0cc4cc' },
        animation: true,
        animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS
      },
      {
        id: `${idPrefix}-q`,
        name: 'Q(imag)',
        type: 'line',
        data: qData,
        smooth: false,
        symbol: 'none',
        showSymbol: false,
        lineStyle: { color: '#ff7f50', width: 2 },
        itemStyle: { color: '#ff7f50' },
        animation: true,
        animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  chartState.value = chart;
};

const initChannelIqWaveformChart = () => {
  renderIqWaveformChart(channelIqWaveformChartRef, channelIqWaveformChart, 'channel_iq', '信道IQ波形', 'fhss-channel-iq');
};

const updateChannelIqWaveformChart = () => {
  initChannelIqWaveformChart();
};

const initRecoveredIqWaveformChart = () => {
  renderIqWaveformChart(recoveredIqWaveformChartRef, recoveredIqWaveformChart, 'recovered_iq', '恢复IQ波形', 'fhss-recovered-iq');
};

const updateRecoveredIqWaveformChart = () => {
  initRecoveredIqWaveformChart();
};

// VHF 发射机和接收机IQ对比图
const initIQComparisonChart = () => {
  if (!iqComparisonChartRef.value) return;

  const { txScatterData, rxScatterData } = getIqComparisonSamples();
  if (txScatterData.length === 0 && rxScatterData.length === 0) {
    console.warn('IQ对比数据为空');
    return;
  }

  if (iqComparisonChart.value) {
    iqComparisonChart.value.setOption({
      animation: false,
      title: {
        text: `发送IQ vs 接收IQ (TX: ${txScatterData.length} 点, RX: ${rxScatterData.length} 点)`
      },
      series: [
        { name: '发送IQ', data: txScatterData },
        { name: '接收IQ', data: rxScatterData }
      ]
    });
    return;
  }

  const chart = echarts.init(iqComparisonChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `发送IQ vs 接收IQ (TX: ${txScatterData.length} 点, RX: ${rxScatterData.length} 点)`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#ff6b9d',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const seriesName = params.seriesName;
        return `${seriesName}<br/>I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`;
      }
    },
    legend: {
      top: 35,
      textStyle: { color: '#a5d6a7' },
      data: ['发送IQ', '接收IQ'],
      itemGap: 20
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 107, 157, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 107, 157, 0.1)' } }
    },
    series: [
      {
        name: '发送IQ',
        type: 'scatter',
        data: txScatterData,
        symbolSize: 5,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
            { offset: 0, color: '#ff6b9d' },
            { offset: 1, color: '#ff0099' }
          ], false),
          opacity: 0.7
        },
        animation: true,
        animationDuration: 300
      },
      {
        name: '接收IQ',
        type: 'scatter',
        data: rxScatterData,
        symbolSize: 4,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
            { offset: 0, color: '#0cc4cc' },
            { offset: 1, color: '#00d4ff' }
          ], false),
          opacity: 0.7
        },
        animation: true,
        animationDuration: 300
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  iqComparisonChart.value = chart;
};

// VHF 信道后星座图
const initConstellationAfterChannelChart = () => {
  if (!constellationAfterChannelChartRef.value) return;

  const data = currentSimData.value;
  if (!data?.data?.constellation_after_channel) {
    console.warn('信道后星座图数据为空');
    return;
  }

  const scatterData = data.data.constellation_after_channel.map(toIqPoint);

  if (constellationAfterChannelChart.value) {
    constellationAfterChannelChart.value.setOption({
      animation: false,
      title: { text: `信道后星座图 (点数: ${scatterData.length})` },
      series: [{ data: scatterData }]
    });
    return;
  }

  const chart = echarts.init(constellationAfterChannelChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `信道后星座图 (点数: ${scatterData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#4ecdc4',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(78, 205, 196, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(78, 205, 196, 0.1)' } }
    },
    series: [{
      name: '信道后星座图',
      type: 'scatter',
      data: scatterData,
      symbolSize: 4,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#4ecdc4' },
          { offset: 1, color: '#44a08d' }
        ], false),
        opacity: 0.7
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  constellationAfterChannelChart.value = chart;
};

// VHF 恢复星座图
const initRestoredConstellationChart = () => {
  if (!restoredConstellationChartRef.value) return;

  const data = currentSimData.value;
  const restoredSource = data?.data?.restored_constellation ?? data?.data?.recovered_samples ?? data?.data?.recovered_iq;
  if (!Array.isArray(restoredSource) || restoredSource.length === 0) {
    console.warn('恢复星座图数据为空');
    return;
  }

  const scatterData = restoredSource.map(toIqPoint);

  if (restoredConstellationChart.value) {
    restoredConstellationChart.value.setOption({
      animation: false,
      title: { text: `恢复星座图(点数: ${scatterData.length})` },
      series: [{ data: scatterData }]
    });
    return;
  }

  const chart = echarts.init(restoredConstellationChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `恢复星座图(点数: ${scatterData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#95e1d3',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(149, 225, 211, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(149, 225, 211, 0.1)' } }
    },
    series: [{
      name: '恢复星座',
      type: 'scatter',
      data: scatterData,
      symbolSize: 4,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#95e1d3' },
          { offset: 1, color: '#4ecdc4' }
        ], false),
        opacity: 0.7
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  restoredConstellationChart.value = chart;
};

// 解调比特流图
const initDemodulatedBitstreamChart = () => {
  if (!demodulatedBitstreamChartRef.value) return;
  // 此图表仅在有demodulated_bits时显示（通常是DSSS）
  if (!currentSimData.value?.data?.demodulated_bits) return;

  const data = currentSimData.value;
  if (!data?.data?.demodulated_bits) {
    console.warn('解调比特流数据为空');
    return;
  }

  // 直接从当前数据获取解调比特流
  const demodulatedBits = data.data.demodulated_bits;
  const xAxisData = Array.from({ length: demodulatedBits.length }, (_, i) => i);

  if (demodulatedBitstreamChart.value) {
    demodulatedBitstreamChart.value.setOption({
      xAxis: { data: xAxisData },
      series: [{ data: demodulatedBits }]
    });
    return;
  }

  const chart = echarts.init(demodulatedBitstreamChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `解调比特流(比特数: ${demodulatedBits.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        let result = `比特索引: ${params[0].dataIndex}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker} ${item.seriesName}: ${item.value}<br/>`;
        });
        return result;
      }
    },
    grid: { left: '12%', right: '12%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category', 
      data: xAxisData,
      name: `比特索引 (总计: ${demodulatedBits.length})`,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', min: -0.3, max: 1.3,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: '解调比特', data: demodulatedBits,
      type: 'line', smooth: false, symbol: 'circle', symbolSize: 3,
      lineStyle: { color: '#e91e63', width: 2 }, itemStyle: { color: '#e91e63' },
      animation: true, animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)',
    animation: true
  }));
  demodulatedBitstreamChart.value = chart;
};

// 增量更新比特流图- 避免重新初始
const updateBitstreamChart = () => {
  if (!bitstreamChart.value) {
    // 如果图表还没有初始化，先初始化
    if (bitstreamChartRef.value && hasSimulationData.value) {
      initUnifiedBitstreamChart();
    }
    return;
  }
  
  const hist = unifiedHistoryData.value.bitstreamData;
  if (hist.originalBits.length === 0) return;

  // 使用setOption进行增量更新，而不是重新初始化
  bitstreamChart.value.setOption({
    xAxis: {
      data: hist.timeLabels
    },
    series: [
      {
        name: '原始比特',
        data: hist.originalBits
      },
      {
        name: '解调比特',
        data: hist.demodulatedBits
      }
    ]
  });
};

// 增量更新星座- 只显示当前数据，流畅变化
const updateConstellationChart = () => {
  if (!constellationChart.value) {
    // 如果图表还没有初始化，先初始
    if (constellationChartRef.value && hasSimulationData.value) {
      initUnifiedConstellationChart();
    }
    return;
  }
  
  const data = currentSimData.value;
  if (!data?.data) return;

  let scatterData: number[][] = [];

  // 根据数据结构获取当前数据
  if (data.data.modulated_symbols) {
    scatterData = data.data.modulated_symbols.map(toIqPoint);
  } else if (data.data.spread_samples && data.data.hop_sequence) {
    scatterData = data.data.spread_samples.map(toIqPoint);
  } else if (data.data.tx_samples) {
    scatterData = data.data.tx_samples.map(toIqPoint);
  } else if (data.data.modulated_iq) {
    scatterData = data.data.modulated_iq.map(toIqPoint);
  }

  // 使用setOption进行流畅更新，只显示当前数据
  constellationChart.value.setOption({
    series: [
      {
        name: '星座图',
        data: scatterData
      }
    ]
  });
};

// 增量更新跳频序列图 - 避免重新初始化
const updateHopSequenceChart = () => {
  if (!hopSequenceChart.value) {
    // 如果图表还没有初始化，先初始
    if (hopSequenceChartRef.value && hasSimulationData.value) {
      initHopSequenceChart();
    }
    return;
  }
  
  const hist = unifiedHistoryData.value.hopSequenceData;
  if (hist.frequencies.length === 0) return;

  // 使用setOption进行增量更新
  hopSequenceChart.value.setOption({
    xAxis: {
      data: hist.timeLabels
    },
    series: [
      {
        name: '跳频序列',
        data: hist.frequencies
      }
    ]
  });
};

// 增量更新云图 - 只显示当前数据，流畅变化
const updateCloudChart = () => {
  if (!cloudChart.value) {
    // 如果图表还没有初始化，先初始
    if (cloudChartRef.value && hasSimulationData.value) {
      initCloudChart();
    }
    return;
  }

  const data = currentSimData.value;
  const rxSource = data?.data?.rx_samples ?? data?.data?.channel_iq;
  if (!Array.isArray(rxSource) || rxSource.length === 0) return;

  // 准备当前RX样本散点数据
  const scatterData = rxSource.map(toIqPoint);

  // 使用setOption进行流畅更新，只显示当前数据
  cloudChart.value.setOption({
    series: [
      {
        name: 'RX样本',
        data: scatterData
      }
    ]
  });
};

const initRxIqWaveformChart = () => {
  if (!rxIqWaveformChartRef.value) return;

  const { total, xAxisData, iData, qData } = getRxIqWaveformSamples();
  const pointText = total > xAxisData.length ? `${xAxisData.length}/${total}` : `${total}`;
  const chartTitle = total > 0 ? `RX IQ波形 (点数: ${pointText})` : 'RX IQ波形 (暂无数据)';

  if (rxIqWaveformChart.value) {
    rxIqWaveformChart.value.setOption({
      animation: true,
      animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS,
      animationEasingUpdate: 'cubicOut',
      title: { text: chartTitle },
      xAxis: { data: xAxisData },
      series: [
        { id: 'rx-i-waveform', name: 'I(real)', data: iData, showSymbol: false, animation: true },
        { id: 'rx-q-waveform', name: 'Q(imag)', data: qData, showSymbol: false, animation: true }
      ]
    }, { lazyUpdate: true });
    return;
  }

  const chart = echarts.init(rxIqWaveformChartRef.value);
  chart.setOption(markRaw({
    animation: true,
    animationDuration: RX_IQ_WAVEFORM_INIT_ANIMATION_MS,
    animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS,
    animationEasingUpdate: 'cubicOut',
    title: {
      text: chartTitle,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px',
      left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const index = params?.[0]?.axisValue ?? '';
        let result = `采样点: ${index}<br/>`;
        params.forEach((item: any) => {
          const value = Number(item.value);
          result += `${item.marker} ${item.seriesName}: ${Number.isFinite(value) ? value.toFixed(4) : item.value}<br/>`;
        });
        return result;
      }
    },
    legend: {
      top: 35,
      textStyle: { color: '#a5d6a7' },
      data: ['I(real)', 'Q(imag)'],
      itemGap: 20
    },
    grid: { left: '12%', right: '10%', top: '22%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: '采样点',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      name: '幅度',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [
      {
        id: 'rx-i-waveform',
        name: 'I(real)',
        type: 'line',
        data: iData,
        smooth: false,
        symbol: 'none',
        showSymbol: false,
        lineStyle: { color: '#0cc4cc', width: 2 },
        itemStyle: { color: '#0cc4cc' },
        animation: true,
        animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS
      },
      {
        id: 'rx-q-waveform',
        name: 'Q(imag)',
        type: 'line',
        data: qData,
        smooth: false,
        symbol: 'none',
        showSymbol: false,
        lineStyle: { color: '#ff7f50', width: 2 },
        itemStyle: { color: '#ff7f50' },
        animation: true,
        animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  rxIqWaveformChart.value = chart;
};

const updateRxIqWaveformChart = () => {
  if (!rxIqWaveformChart.value) {
    if (rxIqWaveformChartRef.value && hasSimulationData.value) {
      initRxIqWaveformChart();
    }
    return;
  }

  const { total, xAxisData, iData, qData } = getRxIqWaveformSamples();
  const pointText = total > xAxisData.length ? `${xAxisData.length}/${total}` : `${total}`;
  const chartTitle = total > 0 ? `RX IQ波形 (点数: ${pointText})` : 'RX IQ波形 (暂无数据)';

  rxIqWaveformChart.value.setOption({
    animation: true,
    animationDurationUpdate: RX_IQ_WAVEFORM_UPDATE_ANIMATION_MS,
    animationEasingUpdate: 'cubicOut',
    title: { text: chartTitle },
    xAxis: { data: xAxisData },
    series: [
      { id: 'rx-i-waveform', name: 'I(real)', data: iData, showSymbol: false, animation: true },
      { id: 'rx-q-waveform', name: 'Q(imag)', data: qData, showSymbol: false, animation: true }
    ]
  }, { lazyUpdate: true });
};

const initDssTxIqWaveformChart = () => {
  renderIqWaveformChart(dssTxIqWaveformChartRef, dssTxIqWaveformChart, 'tx_samples', '发送IQ波形', 'dss-tx-iq');
};

const updateDssTxIqWaveformChart = () => {
  initDssTxIqWaveformChart();
};

const initDssRxIqWaveformChart = () => {
  renderIqWaveformChart(dssRxIqWaveformChartRef, dssRxIqWaveformChart, 'rx_samples', '接收IQ波形', 'dss-rx-iq');
};

const updateDssRxIqWaveformChart = () => {
  initDssRxIqWaveformChart();
};

// 增量更新趋势- 避免重新初始
const updateTrendChart = () => {
  if (!trendChart.value) {
    // 如果图表还没有初始化，先初始
    if (trendChartRef.value && hasSimulationData.value) {
      initUnifiedTrendChart();
    }
    return;
  }
  
  const hist = unifiedHistoryData.value;
  if (hist.timestamps.length === 0) return;

  // 准备时间标签
  const timeLabels = hist.timestamps.map(ts => new Date(ts).toLocaleTimeString());

  // 使用setOption进行增量更新
  trendChart.value.setOption({
    xAxis: {
      data: timeLabels
    },
    series: [
      {
        name: 'SNR (dB)',
        data: hist.snr
      },
      {
        name: '路径损耗(dB)',
        data: hist.pathLoss
      },
      {
        name: '延迟 (ms)',
        data: hist.delay
      }
    ]
  });
};

// 专用图表更新函数

// 更新扩频后样本云图
const updateSpreadSamplesChart = () => {
  if (!spreadSamplesChart.value) {
    if (spreadSamplesChartRef.value && hasSimulationData.value) {
      initSpreadSamplesChart();
    }
    return;
  }

  const data = currentSimData.value;
  if (!data?.data?.spread_samples) return;

  const scatterData = data.data.spread_samples.map((sample: any) => [
    sample.real || 0,
    sample.imag || 0
  ]);

  spreadSamplesChart.value.setOption({
    title: { text: `扩频后样本云图(点数: ${scatterData.length})` },
    series: [{ data: scatterData }]
  });
};

// 更新解扩后样本云图
const updateDespreadSamplesChart = () => {
  if (!despreadSamplesChart.value) {
    if (despreadSamplesChartRef.value && hasSimulationData.value) {
      initDespreadSamplesChart();
    }
    return;
  }

  const data = currentSimData.value;
  if (!data?.data?.despread_samples) return;

  const scatterData = data.data.despread_samples.map((sample: any) => [
    sample.real || 0,
    sample.imag || 0
  ]);

  despreadSamplesChart.value.setOption({
    title: { text: `解扩后样本云图(点数: ${scatterData.length})` },
    series: [{ data: scatterData }]
  });
};

// 更新解调比特流图
const updateDemodulatedBitstreamChart = () => {
  if (!demodulatedBitstreamChart.value) {
    if (demodulatedBitstreamChartRef.value && hasSimulationData.value) {
      initDemodulatedBitstreamChart();
    }
    return;
  }

  const data = currentSimData.value;
  if (!data?.data?.demodulated_bits) return;

  const demodulatedBits = data.data.demodulated_bits;
  const xAxisData = Array.from({ length: demodulatedBits.length }, (_, i) => i);

  demodulatedBitstreamChart.value.setOption({
    title: { text: `解调比特流(比特数: ${demodulatedBits.length})` },
    xAxis: { data: xAxisData },
    series: [{ data: demodulatedBits }]
  });
};

// 更新VHF IQ对比图
const updateIQComparisonChart = () => {
  if (!iqComparisonChart.value) {
    if (iqComparisonChartRef.value && hasSimulationData.value) {
      initIQComparisonChart();
    }
    return;
  }

  const { txScatterData, rxScatterData } = getIqComparisonSamples();
  if (txScatterData.length === 0 && rxScatterData.length === 0) return;

  iqComparisonChart.value.setOption({
    title: {
      text: `发送IQ vs 接收IQ (TX: ${txScatterData.length} 点, RX: ${rxScatterData.length} 点)`
    },
    series: [
      { name: '发送IQ', data: txScatterData },
      { name: '接收IQ', data: rxScatterData }
    ]
  });
};

// 更新VHF信道后星座图
const updateConstellationAfterChannelChart = () => {
  if (!constellationAfterChannelChart.value) {
    if (constellationAfterChannelChartRef.value && hasSimulationData.value) {
      initConstellationAfterChannelChart();
    }
    return;
  }

  const data = currentSimData.value;
  if (!data?.data?.constellation_after_channel) return;

  const scatterData = data.data.constellation_after_channel.map(toIqPoint);

  constellationAfterChannelChart.value.setOption({
    series: [{ data: scatterData }]
  });
};

// 更新VHF恢复星座图
const updateRestoredConstellationChart = () => {
  if (!restoredConstellationChart.value) {
    if (restoredConstellationChartRef.value && hasSimulationData.value) {
      initRestoredConstellationChart();
    }
    return;
  }

  const data = currentSimData.value;
  const restoredSource = data?.data?.restored_constellation ?? data?.data?.recovered_samples ?? data?.data?.recovered_iq;
  if (!Array.isArray(restoredSource) || restoredSource.length === 0) return;

  const scatterData = restoredSource.map(toIqPoint);

  restoredConstellationChart.value.setOption({
    title: { text: `恢复星座图(点数: ${scatterData.length})` },
    series: [{ data: scatterData }]
  });
};

// 5G QAM调制星座图 - 显示调制后的星座
const initFiveGQamMappedChart = () => {
  if (!fiveGQamMappedChartRef.value) return;

  const data = currentSimData.value;
  const qam_mapped = data?.data?.qam_mapped || data?.qam_mapped;
  if (!qam_mapped) {
    console.warn('5G QAM调制星座图数据为空');
    return;
  }

  const scatterData = qam_mapped.map(toIqPoint);

  if (fiveGQamMappedChart.value) {
    fiveGQamMappedChart.value.setOption({
      title: { text: `5G调制星座图(点数: ${scatterData.length})` },
      series: [{ data: scatterData }]
    });
    return;
  }

  const chart = echarts.init(fiveGQamMappedChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `5G调制星座图(点数: ${scatterData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#ff6b6b',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    grid: { left: '15%', right: '10%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 107, 107, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 107, 107, 0.1)' } }
    },
    series: [{
      name: 'QAM星座',
      type: 'scatter',
      data: scatterData,
      symbolSize: 4,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#ff6b6b' },
          { offset: 1, color: '#ff8787' }
        ], false),
        opacity: 0.7
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  fiveGQamMappedChart.value = chart;
};

const FIVE_G_CLOUD_AXIS_LIMIT = 3;

// 5G云图对比 - 对比去导频和相位补偿后的云图
const initFiveGCloudComparisonChart = () => {
  if (!fiveGCloudComparisonChartRef.value) return;

  const data = currentSimData.value;
  const de_interFrq_out = data?.data?.de_interFrq_out || data?.de_interFrq_out;
  const de_sfo_comp = data?.data?.de_sfo_comp || data?.de_sfo_comp;
  
  if (!de_interFrq_out && !de_sfo_comp) {
    console.warn('5G云图对比数据为空');
    return;
  }

  // 准备去导频后的云图数据
  let cloudDeInterFrqData: number[][] = [];
  if (de_interFrq_out) {
    cloudDeInterFrqData = de_interFrq_out.map(toIqPoint);
  }

  // 准备相位补偿后的云图数据
  let cloudSfoCompData: number[][] = [];
  if (de_sfo_comp) {
    cloudSfoCompData = de_sfo_comp.map(toIqPoint);
  }

  if (fiveGCloudComparisonChart.value) {
    fiveGCloudComparisonChart.value.setOption({
      title: {
        text: `5G云图对比 (去导频: ${cloudDeInterFrqData.length}, 补偿: ${cloudSfoCompData.length})`
      },
      xAxis: {
        min: -FIVE_G_CLOUD_AXIS_LIMIT,
        max: FIVE_G_CLOUD_AXIS_LIMIT,
        interval: 1
      },
      yAxis: {
        min: -FIVE_G_CLOUD_AXIS_LIMIT,
        max: FIVE_G_CLOUD_AXIS_LIMIT,
        interval: 1
      },
      series: [
        { name: '去导频后', data: cloudDeInterFrqData },
        { name: '相位补偿', data: cloudSfoCompData }
      ]
    });
    return;
  }

  const chart = echarts.init(fiveGCloudComparisonChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `5G云图对比 (去导频: ${cloudDeInterFrqData.length}, 补偿: ${cloudSfoCompData.length})`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#64b5f6',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `${params.seriesName}<br/>I: ${params.value[0]?.toFixed(3)}<br/>Q: ${params.value[1]?.toFixed(3)}`
    },
    legend: {
      textStyle: { color: '#a5d6a7' },
      top: '10px', right: '20px'
    },
    grid: { left: '15%', right: '10%', top: '35%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      min: -FIVE_G_CLOUD_AXIS_LIMIT,
      max: FIVE_G_CLOUD_AXIS_LIMIT,
      interval: 1,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(100, 181, 246, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      min: -FIVE_G_CLOUD_AXIS_LIMIT,
      max: FIVE_G_CLOUD_AXIS_LIMIT,
      interval: 1,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(100, 181, 246, 0.1)' } }
    },
    series: [
      {
        name: '去导频后',
        type: 'scatter',
        data: cloudDeInterFrqData,
        symbolSize: 3,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
            { offset: 0, color: '#42a5f5' },
            { offset: 1, color: '#64b5f6' }
          ], false),
          opacity: 0.6
        },
        animation: true,
        animationDuration: 300
      },
      {
        name: '相位补偿',
        type: 'scatter',
        data: cloudSfoCompData,
        symbolSize: 3,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
            { offset: 0, color: '#ef5350' },
            { offset: 1, color: '#ff6b6b' }
          ], false),
          opacity: 0.6
        },
        animation: true,
        animationDuration: 300
      }
    ],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  fiveGCloudComparisonChart.value = chart;
};

// 更新5G QAM调制星座图
const updateFiveGQamMappedChart = () => {
  if (!fiveGQamMappedChart.value) {
    if (fiveGQamMappedChartRef.value && hasSimulationData.value) {
      initFiveGQamMappedChart();
    }
    return;
  }

  const data = currentSimData.value;
  const qam_mapped = data?.data?.qam_mapped || data?.qam_mapped;
  if (!qam_mapped) return;

  const scatterData = qam_mapped.map(toIqPoint);

  fiveGQamMappedChart.value.setOption({
    title: { text: `5G调制星座图(点数: ${scatterData.length})` },
    series: [{ data: scatterData }]
  });
};

// 更新5G云图对比
const updateFiveGCloudComparisonChart = () => {
  if (!fiveGCloudComparisonChart.value) {
    if (fiveGCloudComparisonChartRef.value && hasSimulationData.value) {
      initFiveGCloudComparisonChart();
    }
    return;
  }

  const data = currentSimData.value;
  const de_interFrq_out = data?.data?.de_interFrq_out || data?.de_interFrq_out;
  const de_sfo_comp = data?.data?.de_sfo_comp || data?.de_sfo_comp;
  
  if (!de_interFrq_out && !de_sfo_comp) return;

  // 准备去导频后的云图数据
  let cloudDeInterFrqData: number[][] = [];
  if (de_interFrq_out) {
    cloudDeInterFrqData = de_interFrq_out.map(toIqPoint);
  }

  // 准备相位补偿后的云图数据
  let cloudSfoCompData: number[][] = [];
  if (de_sfo_comp) {
    cloudSfoCompData = de_sfo_comp.map(toIqPoint);
  }

  fiveGCloudComparisonChart.value.setOption({
    title: {
      text: `5G云图对比 (去导频: ${cloudDeInterFrqData.length}, 补偿: ${cloudSfoCompData.length})`
    },
    xAxis: {
      min: -FIVE_G_CLOUD_AXIS_LIMIT,
      max: FIVE_G_CLOUD_AXIS_LIMIT,
      interval: 1
    },
    yAxis: {
      min: -FIVE_G_CLOUD_AXIS_LIMIT,
      max: FIVE_G_CLOUD_AXIS_LIMIT,
      interval: 1
    },
    series: [
      { name: '去导频后', data: cloudDeInterFrqData },
      { name: '相位补偿', data: cloudSfoCompData }
    ]
  });
};

// 5G频谱图 - 显示频域功率分布
const initFiveGSpectrumChart = () => {
  if (!fiveGSpectrumChartRef.value) return;

  const data = currentSimData.value;
  const spectrumRaw = getSpectrumData();
  
  if (!spectrumRaw) {
    console.warn('5G频谱数据为空');
    return;
  }

  const centerFreqMHz = getCenterFrequencyMHz(data);

  // 生成频率标签
  const { freqLabels, spectrumBarData, yAxisName } =
    prepareSpectrumChartData(spectrumRaw, centerFreqMHz);

  if (fiveGSpectrumChart.value) {
    fiveGSpectrumChart.value.setOption({
      title: { text: `5G频谱图(中心频率: ${centerFreqMHz} MHz)` },
      xAxis: { data: freqLabels },
      yAxis: { name: yAxisName },
      series: [{ data: spectrumBarData }]
    });
    return;
  }

  const chart = echarts.init(fiveGSpectrumChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `5G频谱图(中心频率: ${centerFreqMHz} MHz)`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#64b5f6',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        if (Array.isArray(params) && params.length > 0) {
          const param = params[0];
          const freq = freqLabels[param.dataIndex];
          return `频率: ${freq} MHz<br/>功率: ${param.value?.toFixed(2) || 'N/A'} dBm`;
        }
        return '';
      },
      axisPointer: { type: 'cross' }
    },
    grid: { left: '12%', right: '10%', top: '35%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      name: '频率 (MHz)',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      data: freqLabels,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 9, rotate: 45 },
      splitLine: { lineStyle: { color: 'rgba(100, 181, 246, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(100, 181, 246, 0.1)' } }
    },
    series: [{
      name: '频谱功率',
      type: 'bar',
      data: spectrumBarData,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#42a5f5' },
          { offset: 1, color: '#1e88e5' }
        ], false)
      },
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  fiveGSpectrumChart.value = markRaw(chart);
};

// 更新5G频谱图
const updateFiveGSpectrumChart = () => {
  if (!fiveGSpectrumChart.value) {
    if (fiveGSpectrumChartRef.value && hasSimulationData.value) {
      initFiveGSpectrumChart();
    }
    return;
  }

  const data = currentSimData.value;
  const spectrumRaw = getSpectrumData();
  
  if (!spectrumRaw) return;

  const centerFreqMHz = getCenterFrequencyMHz(data);

  const { freqLabels, spectrumBarData, yAxisName } =
    prepareSpectrumChartData(spectrumRaw, centerFreqMHz);

  fiveGSpectrumChart.value.setOption({
    title: { text: `5G频谱图(中心频率: ${centerFreqMHz} MHz)` },
    xAxis: { data: freqLabels },
    yAxis: { name: yAxisName },
    series: [{ data: spectrumBarData }]
  });
};

// 5G数字波形图 - 显示输入和输出比特流
const initFiveGWaveformChart = () => {
  if (!fiveGWaveformChartRef.value) return;

  const data = currentSimData.value;
  const num_in_240_200 = data?.data?.num_in_240_200 || data?.num_in_240_200;
  const de_scram_out_240_200 = data?.data?.de_scram_out_240_200 || data?.de_scram_out_240_200;
  
  if (!num_in_240_200 && !de_scram_out_240_200) {
    console.warn('5G数字波形数据为空');
    return;
  }

  const originalBits = num_in_240_200 || [];
  const outputBits = de_scram_out_240_200 || [];
  const displayLen = Math.min(Math.max(originalBits.length, outputBits.length), 200);
  const xAxisData = Array.from({ length: displayLen }, (_, i) => i);

  const displayOriginal = originalBits.slice(0, displayLen);
  const displayOutput = outputBits.slice(0, displayLen);

  if (fiveGWaveformChart.value) {
    const seriesData = [{
      name: '输入比特 (num_in)',
      data: displayOriginal
    }];
    if (displayOutput.length > 0) {
      seriesData.push({
        name: '输出比特 (de_scram)',
        data: displayOutput
      });
    }
    fiveGWaveformChart.value.setOption({
      xAxis: { data: xAxisData, name: `比特索引 (总计: ${Math.max(originalBits.length, outputBits.length)})` },
      series: seriesData
    });
    return;
  }

  const chart = echarts.init(fiveGWaveformChartRef.value);

  const seriesConfig = [
    {
      name: '输入比特 (num_in)',
      data: displayOriginal,
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 3,
      lineStyle: { color: '#0cc4cc', width: 2 },
      itemStyle: { color: '#0cc4cc' },
      animation: true,
      animationDuration: 300
    }
  ];

  if (displayOutput.length > 0) {
    seriesConfig.push({
      name: '输出比特 (de_scram)',
      data: displayOutput,
      type: 'line',
      smooth: false,
      symbol: 'square',
      symbolSize: 3,
      lineStyle: { color: '#ff7f50', width: 2 },
      itemStyle: { color: '#ff7f50' },
      animation: true,
      animationDuration: 300
    });
  }

  chart.setOption(markRaw({
    title: {
      text: '5G数字波形',
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#0cc4cc',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        let result = `比特索引: ${params[0].dataIndex}<br/>`;
        params.forEach((item: any) => {
          result += `${item.marker} ${item.seriesName}: ${item.value}<br/>`;
        });
        return result;
      }
    },
    legend: {
      top: 35,
      textStyle: { color: '#a5d6a7' },
      data: displayOutput.length > 0 ? ['输入比特 (num_in)', '输出比特 (de_scram)'] : ['输入比特 (num_in)'],
      itemGap: 20
    },
    grid: { left: '12%', right: '12%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: `比特索引 (总计: ${Math.max(originalBits.length, outputBits.length)})`,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      min: -0.3,
      max: 1.3,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: seriesConfig,
    backgroundColor: 'rgba(8, 15, 39, 0.4)',
    animation: true
  }));
  fiveGWaveformChart.value = markRaw(chart);
};

// 更新5G数字波形图
const updateFiveGWaveformChart = () => {
  if (!fiveGWaveformChart.value) {
    if (fiveGWaveformChartRef.value && hasSimulationData.value) {
      initFiveGWaveformChart();
    }
    return;
  }

  const data = currentSimData.value;
  const num_in_240_200 = data?.data?.num_in_240_200 || data?.num_in_240_200;
  const de_scram_out_240_200 = data?.data?.de_scram_out_240_200 || data?.de_scram_out_240_200;
  
  if (!num_in_240_200 && !de_scram_out_240_200) return;

  const originalBits = num_in_240_200 || [];
  const outputBits = de_scram_out_240_200 || [];
  const displayLen = Math.min(Math.max(originalBits.length, outputBits.length), 200);
  const xAxisData = Array.from({ length: displayLen }, (_, i) => i);

  const displayOriginal = originalBits.slice(0, displayLen);
  const displayOutput = outputBits.slice(0, displayLen);

  const seriesData = [{
    name: '输入比特 (num_in)',
    data: displayOriginal
  }];
  if (displayOutput.length > 0) {
    seriesData.push({
      name: '输出比特 (de_scram)',
      data: displayOutput
    });
  }

  fiveGWaveformChart.value.setOption({
    xAxis: { data: xAxisData, name: `比特索引 (总计: ${Math.max(originalBits.length, outputBits.length)})` },
    series: seriesData
  });
};

// 从链路信息找到关联的DSSS/FHSS/GMSK模型节点
const getChannelModelNodeFromLink = (): any | null => {
  if (!props.link || !topoStore.topoData?.nodes) return null;

  const { node1_id, node2_id } = props.link;
  const nodes = topoStore.topoData.nodes;

  // 首先检查node1是否直接是EMANE节点
  const node1 = nodes.find((n: any) => n.id === node1_id);
  if (node1 && node1.type === 'EMANE') {
    return node1;
  }

  // 然后检查node2是否直接是EMANE节点
  const node2 = nodes.find((n: any) => n.id === node2_id);
  if (node2 && node2.type === 'EMANE') {
    return node2;
  }

  // 如果链路两端都不是EMANE节点（链路在两个网络节点之间），
  // 搜索通过其他链路连接到node1或node2的EMANE节点
  const links = topoStore.topoData.links;
  if (links) {
    // 获取当前模型类型用于精确匹配
    const activeModelType = getLinkModelTypeFromTopology();
    const modelTypeMap: Record<string, string> = {
      'gmsk': 'gmsk', 'fhss': 'fhss', 'dsss': 'dss', 'gfsk': 'gfsk',
      'vhf': 'vhf', 'uhf': 'uhf', '5g': 'fiveG', 'ttc': 'ttc',
      'adhoc': 'adhoc', 'coordination': 'coordination', 'custom': 'custom',
    };
    const targetPhyType = activeModelType ? (modelTypeMap[activeModelType.toLowerCase()] || activeModelType).toLowerCase() : null;

    // 搜索与node1或node2相连的EMANE节点
    for (const checkNodeId of [node1_id, node2_id]) {
      const connectedLinks = links.filter(
        (l: any) => l.node1_id === checkNodeId || l.node2_id === checkNodeId
      );
      for (const connLink of connectedLinks) {
        const otherNodeId = connLink.node1_id === checkNodeId ? connLink.node2_id : connLink.node1_id;
        const otherNode = nodes.find((n: any) => n.id === otherNodeId);
        if (otherNode && otherNode.type === 'EMANE') {
          // 如果有目标类型，优先精确匹配
          if (targetPhyType) {
            const nodePhyType = (otherNode.phy_type || '').toLowerCase();
            if (nodePhyType === targetPhyType) {
              return otherNode;
            }
          } else {
            return otherNode;
          }
        }
      }
    }

    // 无精确匹配时回退：返回第一个连接的EMANE节点
    for (const checkNodeId of [node1_id, node2_id]) {
      const connectedLinks = links.filter(
        (l: any) => l.node1_id === checkNodeId || l.node2_id === checkNodeId
      );
      for (const connLink of connectedLinks) {
        const otherNodeId = connLink.node1_id === checkNodeId ? connLink.node2_id : connLink.node1_id;
        const otherNode = nodes.find((n: any) => n.id === otherNodeId);
        if (otherNode && otherNode.type === 'EMANE') {
          return otherNode;
        }
      }
    }
  }

  return null;
};

// 从节点配置中提取中心频率
const getCenterFrequencyFromNodeConfig = (nodeId: number | null): number | null => {
  if (!nodeId || !topoStore.topoData?.nodes) {
    return null;
  }

  const node = topoStore.topoData.nodes.find((n: any) => n.id === nodeId);
  if (!node) {
    return null;
  }

  // 检查所有可能包含中心频率的配置字段
  const configFields = ['custom_config', 'dss_config', 'gmsk_config', 'fhss_config', 'adhoc_config', 'coordination_config', 'ttc_config', 'uhf_config', 'vhf_config', 'fiveG_config'];

  for (const configField of configFields) {
    const config = (node as any)[configField];
    if (config) {
      if (config.centerFreq !== undefined) {
        // centerFreq统一以Hz为单位返回（与getCenterFrequencyFromSimulationService一致）
        // 如果值小000000，说明是以MHz保存的，需要转换为Hz
        const freq = config.centerFreq < 1000000 ? config.centerFreq * 1000000 : config.centerFreq;
        return freq;
      }
    }
  }

  return null;
};

// 从仿真服务中获取模型节点的中心频率配置（根据模型类型
const getCenterFrequencyFromSimulationService = (modelNodeId: number, modelType?: string | null): number | null => {
  // 如果提供了模型类型，只查询对应的仿真服务
  if (modelType) {
    const normalizedType = modelType.toLowerCase();
    
    switch (normalizedType) {
      case 'dsss':
      case 'dss':
        const dssNodes = dssSimulationService.getDSSNodes();
        if (dssNodes.has(modelNodeId)) {
          const config = dssNodes.get(modelNodeId)?.dss_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'fhss':
        const fhssNodes = fhssSimulationService.getFHSSNodes();
        if (fhssNodes.has(modelNodeId)) {
          const config = fhssNodes.get(modelNodeId)?.fhss_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'gmsk':
        const gmskNodes = gmskSimulationService.getGMSKNodes();
        if (gmskNodes.has(modelNodeId)) {
          const config = gmskNodes.get(modelNodeId)?.gmsk_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'gfsk':
        const gfskNodes = gfskSimulationService.getGFSKNodes();
        if (gfskNodes.has(modelNodeId)) {
          const config = gfskNodes.get(modelNodeId)?.gfsk_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'ttc':
        const ttcNodes = ttcSimulationService.getTTCNodes?.();
        if (ttcNodes?.has?.(modelNodeId)) {
          const config = ttcNodes.get(modelNodeId)?.ttc_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'adhoc':
        const adhocNodes = adhocSimulationService.getAdHocNodes?.();
        if (adhocNodes?.has?.(modelNodeId)) {
          const config = adhocNodes.get(modelNodeId)?.adhoc_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'coordination':
        const coordinationNodes = coordinationSimulationService.getCoordinationNodes?.();
        if (coordinationNodes?.has?.(modelNodeId)) {
          const config = coordinationNodes.get(modelNodeId)?.coordination_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'vhf':
        const vhfNodes = vhfSimulationService.getVHFNodes?.();
        if (vhfNodes?.has?.(modelNodeId)) {
          const config = vhfNodes.get(modelNodeId)?.vhf_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'uhf':
        const uhfNodes = uhfSimulationService.getUHFNodes?.();
        if (uhfNodes?.has?.(modelNodeId)) {
          const config = uhfNodes.get(modelNodeId)?.uhf_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case '5g':
      case 'fiveg':
        const fiveGNodes = fiveGSimulationService.getFiveGNodes();
        if (fiveGNodes.has(modelNodeId)) {
          const config = fiveGNodes.get(modelNodeId)?.fiveG_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
        }
        break;

      case 'custom':
        const customNodesTyped = customSimulationService.getCustomNodes?.();
        if (customNodesTyped?.has?.(modelNodeId)) {
          const config = customNodesTyped.get(modelNodeId)?.custom_config;
          if (config?.centerFreq !== undefined) {
            return config.centerFreq;
          }
          // 兼容嵌套phy结构的配
          if (config?.phy?.centerFreq !== undefined) {
            return config.phy.centerFreq;
          }
        }
        // 回退：从channelModelDataStore获取持久化的配置
        {
          const channelModelDataStore = useChannelModelDataStore();
          const persistedData = channelModelDataStore.getNodeData(modelNodeId, 'custom');
          if (persistedData?.centerFreq !== undefined) {
            return persistedData.centerFreq;
          }
        }
        break;
    }
    return null;
  }

  // 如果没有提供模型类型，按原来的顺序遍历（向后兼容
  const dssNodes = dssSimulationService.getDSSNodes();
  if (dssNodes.has(modelNodeId)) {
    const config = dssNodes.get(modelNodeId)?.dss_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const fhssNodes = fhssSimulationService.getFHSSNodes();
  if (fhssNodes.has(modelNodeId)) {
    const config = fhssNodes.get(modelNodeId)?.fhss_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const gmskNodes = gmskSimulationService.getGMSKNodes();
  if (gmskNodes.has(modelNodeId)) {
    const config = gmskNodes.get(modelNodeId)?.gmsk_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const gfskNodes = gfskSimulationService.getGFSKNodes();
  if (gfskNodes.has(modelNodeId)) {
    const config = gfskNodes.get(modelNodeId)?.gfsk_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const ttcNodes = ttcSimulationService.getTTCNodes?.();
  if (ttcNodes?.has?.(modelNodeId)) {
    const config = ttcNodes.get(modelNodeId)?.ttc_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const adhocNodes = adhocSimulationService.getAdHocNodes?.();
  if (adhocNodes?.has?.(modelNodeId)) {
    const config = adhocNodes.get(modelNodeId)?.adhoc_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const coordinationNodes = coordinationSimulationService.getCoordinationNodes?.();
  if (coordinationNodes?.has?.(modelNodeId)) {
    const config = coordinationNodes.get(modelNodeId)?.coordination_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const vhfNodes = vhfSimulationService.getVHFNodes?.();
  if (vhfNodes?.has?.(modelNodeId)) {
    const config = vhfNodes.get(modelNodeId)?.vhf_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const uhfNodes = uhfSimulationService.getUHFNodes?.();
  if (uhfNodes?.has?.(modelNodeId)) {
    const config = uhfNodes.get(modelNodeId)?.uhf_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const fiveGNodes = fiveGSimulationService.getFiveGNodes();
  if (fiveGNodes.has(modelNodeId)) {
    const config = fiveGNodes.get(modelNodeId)?.fiveG_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  const customNodes = customSimulationService.getCustomNodes?.();
  if (customNodes?.has?.(modelNodeId)) {
    const config = customNodes.get(modelNodeId)?.custom_config;
    if (config?.centerFreq !== undefined) {
      return config.centerFreq;
    }
  }

  return null;
};

// 获取当前链路关联的散射的频偏配
const getCustomModelFreqOffsets = (): Map<number, number> => {
  const freqOffsetsMap = new Map<number, number>();

  try {
    // 找到当前链路关联的EMANE模型节点（custom类型
    const channelModelNode = getChannelModelNodeFromLink();
    if (!channelModelNode) {
      console.log('[频偏] getChannelModelNodeFromLink 返回null, link:', props.link?.node1_id, props.link?.node2_id);
      return freqOffsetsMap;
    }

    const modelNodeId = channelModelNode.id;
    const customNodes = customSimulationService.getCustomNodes?.();
    const nodeInfo = customNodes?.get(modelNodeId);

    console.log('[频偏] 查找模型节点:', modelNodeId, '找到nodeInfo:', !!nodeInfo, 'custom_config:', !!nodeInfo?.custom_config);

    if (nodeInfo?.custom_config) {
      // 检查顶级multipath和嵌套phy.multipath
      const multipath = nodeInfo.custom_config.multipath || nodeInfo.custom_config.phy?.multipath;
      console.log('[频偏] multipath数组:', Array.isArray(multipath) ? multipath.length + '条路径' : '不存在',
        multipath ? multipath.map((p: any) => p.freq_offset) : []);
      if (Array.isArray(multipath)) {
        multipath.forEach((path: any, index: number) => {
          if (path.freq_offset !== undefined) {
            freqOffsetsMap.set(index, path.freq_offset ?? 0);
          }
        });
      }
    }

    // 回退：从channelModelDataStore获取持久化的多径配置
    if (freqOffsetsMap.size === 0) {
      const channelModelDataStore = useChannelModelDataStore();
      const persistedData = channelModelDataStore.getNodeData(modelNodeId, 'custom');
      const multipath = persistedData?.multipath || persistedData?.phy?.multipath;
      console.log('[频偏] 回退到channelModelDataStore, multipath:', Array.isArray(multipath) ? multipath.length + '条路径' : '不存在',
        multipath ? multipath.map((p: any) => p.freq_offset) : []);
      if (Array.isArray(multipath)) {
        multipath.forEach((path: any, index: number) => {
          if (path.freq_offset !== undefined) {
            freqOffsetsMap.set(index, path.freq_offset ?? 0);
          }
        });
      }
    }

    console.log('[频偏] 最终freqOffsetsMap:', Object.fromEntries(freqOffsetsMap));
  } catch (error) {
    console.warn('获取散射频偏配置失败', error);
  }

  return freqOffsetsMap;
};

// 增强 multipath_details 数据，添加频偏信息
function enhanceMultipathDetails(rawMultipathDetails: any[]): any[] {
  if (!Array.isArray(rawMultipathDetails)) return [];

  const freqOffsets = getCustomModelFreqOffsets();

  return rawMultipathDetails.map((path: any, index: number) => ({
    ...path,
    freq_offset_hz: freqOffsets.get(index) ?? path.freq_offset_hz ?? 0  // 用数组index匹配配置index
  }));
}

// 通过模型类型直接从仿真服务查找中心频率（遍历该类型的所有已注册节点
const findCenterFreqByModelType = (modelType: string): number | null => {
  const normalizedType = modelType.toLowerCase();
  let nodes: Map<number, any> | undefined;
  let configField = '';

  switch (normalizedType) {
    case 'dsss': case 'dss':
      nodes = dssSimulationService.getDSSNodes(); configField = 'dss_config'; break;
    case 'fhss':
      nodes = fhssSimulationService.getFHSSNodes(); configField = 'fhss_config'; break;
    case 'gmsk':
      nodes = gmskSimulationService.getGMSKNodes(); configField = 'gmsk_config'; break;
    case 'gfsk':
      nodes = gfskSimulationService.getGFSKNodes(); configField = 'gfsk_config'; break;
    case 'ttc':
      nodes = ttcSimulationService.getTTCNodes?.(); configField = 'ttc_config'; break;
    case 'adhoc':
      nodes = adhocSimulationService.getAdHocNodes?.(); configField = 'adhoc_config'; break;
    case 'coordination':
      nodes = coordinationSimulationService.getCoordinationNodes?.(); configField = 'coordination_config'; break;
    case 'vhf':
      nodes = vhfSimulationService.getVHFNodes?.(); configField = 'vhf_config'; break;
    case 'uhf':
      nodes = uhfSimulationService.getUHFNodes?.(); configField = 'uhf_config'; break;
    case '5g': case 'fiveg':
      nodes = fiveGSimulationService.getFiveGNodes(); configField = 'fiveG_config'; break;
    case 'custom':
      nodes = customSimulationService.getCustomNodes?.(); configField = 'custom_config'; break;
  }

  if (nodes && nodes.size > 0) {
    // 取第一个已注册节点的中心频
    for (const [, nodeInfo] of nodes) {
      const config = nodeInfo[configField];
      if (config?.centerFreq !== undefined) {
        return config.centerFreq;
      }
      // 兼容嵌套phy结构
      if (config?.phy?.centerFreq !== undefined) {
        return config.phy.centerFreq;
      }
    }
  }
  return null;
};

const getCenterFrequencyMHz = (data: any): number => {
  let centerFreqMHz = 2400; // 默认(MHz)
  const nodeId = data?.node_id;

  // 辅助函数：将频率从Hz转换为MHz
  // 仿真服务和节点配置中centerFreq始终以Hz保存（注册时 * 1000000），直接除以1000000
  const toMHz = (freq: number): number => {
    return freq / 1000000;
  };

  // 【最优先0】如果数据中直接包含 carrier_freq_mhz，直接使用（已是MHz
  if (data?.carrier_freq_mhz !== undefined && data.carrier_freq_mhz > 0) {
    console.log(`[频谱图] 直接从数据中获取中心频率: ${data.carrier_freq_mhz} MHz`);
    return data.carrier_freq_mhz;
  }

  // 获取当前显示的模型类型，用于精确匹配EMANE节点
  const activeModelType = currentModelName.value?.toLowerCase() || null;
  // 将显示名称映射到phy_type
  const modelTypeMap: Record<string, string> = {
    'gmsk': 'gmsk', 'fhss': 'fhss', 'dsss': 'dss', 'gfsk': 'gfsk',
    'vhf': 'vhf', 'uhf': 'uhf', '5g': 'fiveG', 'ttc': 'ttc',
    'adhoc': 'adhoc', 'coordination': 'coordination', 'custom': 'custom',
  };
  const targetPhyType = activeModelType ? (modelTypeMap[activeModelType] || activeModelType) : null;

  // 【最优先】从WebSocket的node_id找到关联的EMANE模型节点，然后从仿真服务查询
  if (nodeId && topoStore.topoData?.nodes) {
    const emaneModelNodeId = getEmaneModelNodeId(nodeId, targetPhyType);
    if (emaneModelNodeId) {
      const emaneNode = topoStore.topoData.nodes.find((n: any) => n.id === emaneModelNodeId);
      const modelType = emaneNode?.phy_type || getEmaneModelType(nodeId);
      const simServiceFreq = getCenterFrequencyFromSimulationService(emaneModelNodeId, modelType);
      if (simServiceFreq !== null) {
        const freqMHz = toMHz(simServiceFreq);
        console.log(`[频谱图] 从仿真服务获取中心频 nodeId=${nodeId}, emaneModelNodeId=${emaneModelNodeId}, modelType=${modelType}, raw=${simServiceFreq}, MHz=${freqMHz}`);
        return freqMHz;
      }
    }
  }

  // 【备选I】如果知道当前模型类型，直接遍历该类型的仿真服务查找中心频率
  if (targetPhyType) {
    const freq = findCenterFreqByModelType(targetPhyType);
    if (freq !== null) {
      const freqMHz = toMHz(freq);
      console.log(`[频谱图] 通过模型类型(${targetPhyType})查找到中心频 raw=${freq}, MHz=${freqMHz}`);
      return freqMHz;
    }
  }

  // 【备选II】从link找到的EMANE模型节点的仿真服务查
  const channelModelNode = getChannelModelNodeFromLink();
  if (channelModelNode) {
    const modelType = (channelModelNode as any).phy_type || channelModelNode.displayModel ||
                     (channelModelNode.emane?.startsWith('emane_') ? channelModelNode.emane.substring(6) : channelModelNode.emane);
    const modelFreq = getCenterFrequencyFromSimulationService(channelModelNode.id, modelType);
    if (modelFreq !== null) {
      return toMHz(modelFreq);
    }
  }

  // 【备选III】从源节点或目标节点的关联模型的仿真服务查询
  const sourceEmaneNodeId = getEmaneModelNodeId(sourceNodeId.value, targetPhyType);
  if (sourceEmaneNodeId) {
    const sourceNode = topoStore.topoData?.nodes?.find((n: any) => n.id === sourceEmaneNodeId);
    const sourceModelType = sourceNode?.phy_type || getEmaneModelType(sourceNodeId.value);
    const sourceModelFreq = getCenterFrequencyFromSimulationService(sourceEmaneNodeId, sourceModelType);
    if (sourceModelFreq !== null) {
      return toMHz(sourceModelFreq);
    }
  }

  const targetEmaneNodeId = getEmaneModelNodeId(targetNodeId.value, targetPhyType);
  if (targetEmaneNodeId) {
    const targetNode = topoStore.topoData?.nodes?.find((n: any) => n.id === targetEmaneNodeId);
    const targetModelType = targetNode?.phy_type || getEmaneModelType(targetNodeId.value);
    const targetModelFreq = getCenterFrequencyFromSimulationService(targetEmaneNodeId, targetModelType);
    if (targetModelFreq !== null) {
      return toMHz(targetModelFreq);
    }
  }

  // 【备选IV】从节点配置中获取（备份方案
  if (nodeId && topoStore.topoData?.nodes) {
    const emaneModelNodeId = getEmaneModelNodeId(nodeId, targetPhyType);
    if (emaneModelNodeId) {
      const modelNodeFreq = getCenterFrequencyFromNodeConfig(emaneModelNodeId);
      if (modelNodeFreq !== null) {
        return toMHz(modelNodeFreq);
      }
    }
  }

  return centerFreqMHz;
};

const prepareSpectrumChartData = (spectrumRaw: any[], centerFreqMHz: number) => {
  const isObjectFormat = spectrumRaw.length > 0 && typeof spectrumRaw[0] === 'object';

  if (isObjectFormat) {
    return {
      isObjectFormat,
      freqLabels: spectrumRaw.map((item: any) => {
        const rawFreq = Number(item.frequency ?? item.freq ?? 0);
        const freqMHz = rawFreq > 1000000 ? rawFreq / 1000000 : rawFreq;
        return freqMHz.toFixed(3);
      }),
      spectrumBarData: spectrumRaw.map((item: any) => Number(item.magnitude ?? item.power ?? item.value ?? 0)),
      yAxisName: '功率 (dBm)',
    };
  }

  const spectrumLength = spectrumRaw.length;
  const freqStep = 0.2;
  const startFreq = centerFreqMHz - (spectrumLength * freqStep) / 2;
  return {
    isObjectFormat,
    freqLabels: Array.from({ length: spectrumLength }, (_, i) =>
      (startFreq + i * freqStep).toFixed(1)
    ),
    spectrumBarData: spectrumRaw.map((power: any) => Number(power ?? 0)),
    yAxisName: '功率 (dBm)',
  };
};

// 初始化频谱图
const initSpectrumChart = () => {
  if (!spectrumChartRef.value) return;

  const spectrumRaw = getSpectrumData();
  if (!spectrumRaw) {
    console.warn('频谱数据为空');
    return;
  }

  const data = currentSimData.value;
  // 获取配置的中心频率（MHz
  const centerFreqMHz = getCenterFrequencyMHz(data);

  const { isObjectFormat, freqLabels, spectrumBarData, yAxisName } =
    prepareSpectrumChartData(spectrumRaw, centerFreqMHz);

  if (spectrumChart.value) {
    spectrumChart.value.setOption({
      title: {
        text: `频谱图(中心频率: ${centerFreqMHz} MHz)`
      },
      xAxis: {
        data: freqLabels
      },
      yAxis: { name: yAxisName },
      series: [
        {
          data: spectrumBarData
        }
      ]
    });
    return;
  }

  const chart = echarts.init(spectrumChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: `频谱图(中心频率: ${centerFreqMHz} MHz)`,
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#64b5f6',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        if (Array.isArray(params) && params.length > 0) {
          const param = params[0];
          const freq = freqLabels[param.dataIndex];
          const unit = isObjectFormat ? ' dBm' : '';
          return `频率: ${freq} MHz<br/>功率: ${param.value?.toFixed(2) || 'N/A'}${unit}`;
        }
        return '';
      },
      axisPointer: { type: 'cross' }
    },
    legend: {
      textStyle: { color: '#a5d6a7' },
      top: '10px', right: '20px'
    },
    grid: { left: '12%', right: '10%', top: '35%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      name: '频率 (MHz)',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      data: freqLabels,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 9, rotate: 45 },
      splitLine: { lineStyle: { color: 'rgba(100, 181, 246, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(100, 181, 246, 0.1)' } }
    },
    series: [
      {
        name: '频谱功率',
        type: 'bar',
        data: spectrumBarData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#42a5f5' },
            { offset: 1, color: '#1e88e5' }
          ], false)
        },
        animationDuration: 300
      }
    ]
  }));

  spectrumChart.value = markRaw(chart);
};

// 更新频谱图
const updateSpectrumChart = () => {
  if (!spectrumChart.value) {
    if (spectrumChartRef.value && hasSimulationData.value) {
      initSpectrumChart();
    }
    return;
  }

  const spectrumRawU = getSpectrumData();
  if (!spectrumRawU) return;

  const data = currentSimData.value;
  // 获取配置的中心频
  const centerFreqMHz = getCenterFrequencyMHz(data);

  const { freqLabels, spectrumBarData, yAxisName } =
    prepareSpectrumChartData(spectrumRawU, centerFreqMHz);

  spectrumChart.value.setOption({
    title: { text: `频谱图(中心频率: ${centerFreqMHz} MHz)` },
    xAxis: { data: freqLabels },
    yAxis: { name: yAxisName },
    series: [{ data: spectrumBarData }]
  });
};

// 载波频率图表初始化（TTC/协同自组网）
const initCarrierFreqChart = () => {
  if (!carrierFreqChartRef.value) return;
  if (!hasCarrierFreqData.value) return;

  const hist = unifiedHistoryData.value;
  if (hist.timestamps.length === 0) return;

  const startTime = hist.timestamps[0];
  const xAxisData = hist.timestamps.map(t => {
    const elapsed = ((t - startTime) / 1000).toFixed(1);
    return `${elapsed}s`;
  });

  if (carrierFreqChart.value) {
    carrierFreqChart.value.setOption({
      xAxis: { data: xAxisData },
      series: [{ data: [...hist.carrierFreq] }]
    });
    return;
  }

  const chart = echarts.init(carrierFreqChartRef.value);
  chart.setOption(markRaw({
    title: {
      text: '载波频率趋势',
      textStyle: { color: '#a5d6a7', fontSize: 13, fontWeight: 500 },
      top: '10px', left: '20px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#ff9800',
      textStyle: { color: '#fff' },
      axisPointer: { type: 'cross', label: { backgroundColor: '#6c7383' } },
      formatter: (params: any) => {
        if (!params || !params.length) return '';
        const point = params[0];
        return `时间: ${point.axisValue}<br/>载波频率: ${point.value?.toFixed(2) || 0} MHz`;
      }
    },
    legend: {
      top: 35, textStyle: { color: '#a5d6a7' },
      data: ['载波频率 (MHz)'], itemGap: 15
    },
    grid: { left: '12%', right: '8%', top: '20%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category', data: xAxisData,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: '频率 (MHz)',
      nameTextStyle: { color: '#a5d6a7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: '载波频率 (MHz)',
      type: 'line',
      data: [...hist.carrierFreq],
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 2 },
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#ff9800' },
          { offset: 1, color: '#ff5722' }
        ])
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255, 152, 0, 0.3)' },
          { offset: 1, color: 'rgba(255, 152, 0, 0.05)' }
        ])
      },
      animation: true,
      animationDuration: 300
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));
  carrierFreqChart.value = chart;
};

// 更新载波频率图表
const updateCarrierFreqChart = () => {
  if (!carrierFreqChart.value) {
    if (carrierFreqChartRef.value && hasSimulationData.value && hasCarrierFreqData.value) {
      initCarrierFreqChart();
    }
    return;
  }

  const hist = unifiedHistoryData.value;
  if (hist.timestamps.length === 0) return;

  // 准备时间标签
  const timeLabels = hist.timestamps.map(ts => new Date(ts).toLocaleTimeString());

  // 使用setOption进行增量更新
  carrierFreqChart.value.setOption({
    xAxis: {
      data: timeLabels
    },
    series: [{
      name: '载波频率 (MHz)',
      data: hist.carrierFreq
    }]
  });
};

// 初始化多径路径频谱图（支持频偏）
const initMultipathSpectrumChart = () => {
  if (!multipathSpectrumChartRef.value || !currentMultipathDetail.value) return;

  const rawFreqData = currentMultipathDetail.value.freq_domain;
  const freqData = Array.isArray(rawFreqData)
    ? rawFreqData
    : rawFreqData !== undefined && rawFreqData !== null
      ? [Number(rawFreqData)]
      : [];
  if (freqData.length === 0) return;

  // 获取中心频率 (MHz)
  const centerFreqMHz = getCenterFrequencyMHz(currentSimData.value);

  // 获取当前路径的频(Hz)，转换为 MHz
  const freqOffsetHz = currentMultipathDetail.value.freq_offset_hz ?? 0;
  const freqOffsetMHz = freqOffsetHz / 1_000_000;
  console.log('[频谱图] 路径频偏:', { pathId: currentMultipathDetail.value.id, freqOffsetHz, freqOffsetMHz, centerFreqMHz, fullDetail: currentMultipathDetail.value });

  // 计算此路径的实际中心频率 (MHz)
  const pathCenterFreqMHz = centerFreqMHz + freqOffsetMHz;

  // 计算频率步长和轴标签
  // 假设频谱数据覆盖带宽，使用标准的 0.2 MHz 步长
  const freqStep = 0.2;
  const spectrumLength = freqData.length;
  const startFreq = pathCenterFreqMHz - (spectrumLength * freqStep) / 2;

  // 生成频率轴标签，显示实际频率（MHz
  const freqLabels = Array.from({ length: spectrumLength }, (_, i) => {
    const freq = startFreq + i * freqStep;
    return freq.toFixed(1);
  });

  const chart = echarts.init(multipathSpectrumChartRef.value);

  chart.setOption(markRaw({
    title: {
      text: `路径 #${currentMultipathDetail.value.id} 频域数据 (中心: ${pathCenterFreqMHz.toFixed(1)} MHz, 频偏: ${freqOffsetHz.toFixed(1)} Hz)`,
      textStyle: { color: '#a5d6a7', fontSize: 12, fontWeight: 500 },
      top: '5px', left: '10px'
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#00eaff',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        if (!params || !params.length) return '';
        const point = params[0];
        const idx = point.dataIndex;
        const freq = startFreq + idx * freqStep;
        return `频率: ${freq.toFixed(1)} MHz<br/>幅度: ${point.value?.toFixed(3) || 0}`;
      }
    },
    grid: { left: '10%', right: '10%', top: '15%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: freqLabels,
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: {
        color: '#a5d6a7',
        fontSize: 10,
        interval: Math.max(0, Math.floor(spectrumLength / 10)) // 根据数据量自动调整标签间
      },
      name: '频率 (MHz)',
      nameTextStyle: { color: '#a5d6a7', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      name: '幅度',
      nameTextStyle: { color: '#a5d6a7', fontSize: 10 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 }
    },
    series: [{
      type: 'bar',
      data: freqData,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#00eaff' },
          { offset: 1, color: '#0cc4cc' }
        ])
      }
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));

  multipathSpectrumChart.value = chart;
};

// 初始化多径路径星座图（时域数据）
const initMultipathConstellationChart = () => {
  if (!multipathConstellationChartRef.value || !currentMultipathDetail.value) return;

  const timeData = currentMultipathDetail.value.time_domain || [];
  const scatterData = timeData.map((sample: any) => [
    sample.r || 0,
    sample.i || 0
  ]);

  const chart = echarts.init(multipathConstellationChartRef.value);

  chart.setOption(markRaw({
    title: {
      text: `路径 #${currentMultipathDetail.value.id} 时域数据（星座图）`,
      textStyle: { color: '#a5d6a7', fontSize: 12, fontWeight: 500 },
      top: '5px', left: '10px'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: '#ff6b9d',
      textStyle: { color: '#fff' },
      formatter: (params: any) => `I: ${params.value[0]?.toFixed(4)}<br/>Q: ${params.value[1]?.toFixed(4)}`
    },
    grid: { left: '12%', right: '12%', top: '15%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'value', name: 'I路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 10 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    yAxis: {
      type: 'value', name: 'Q路',
      nameTextStyle: { color: '#a5d6a7', fontSize: 10 },
      axisLine: { lineStyle: { color: '#4a6fa5' } },
      axisLabel: { color: '#a5d6a7', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(12, 196, 204, 0.1)' } }
    },
    series: [{
      name: '采样点',
      type: 'scatter',
      data: scatterData,
      symbolSize: 6,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: '#ff6b9d' },
          { offset: 1, color: '#c44569' }
        ]),
        opacity: 0.7
      }
    }],
    backgroundColor: 'rgba(8, 15, 39, 0.4)'
  }));

  multipathConstellationChart.value = chart;
};

// 更新多径路径图表
const updateMultipathCharts = () => {
  if (!hasMultipathData.value || !currentMultipathDetail.value) return;
  initMultipathSpectrumChart();
  initMultipathConstellationChart();
};

// 统一更新仿真图表 - 流畅增量更新
const updateUnifiedSimCharts = () => {
  if (!currentSimData.value) return;

  // 先更新历史数
  updateUnifiedHistoryData();

  // 根据当前视图和活跃的标签页进行增量更
  nextTick(() => {
    // 确定当前活跃的标签页（图表视图或信道数据视图
    const currentActiveTab = currentView.value === 'channel' ? activeChannelTab.value : activeChartTab.value;

    if (currentActiveTab === 'bitstream') {
      updateBitstreamChart();
    } else if (currentActiveTab === 'constellation') {
      updateConstellationChart();
    } else if (currentActiveTab === 'dssTxIqWaveform') {
      updateDssTxIqWaveformChart();
    } else if (currentActiveTab === 'dssRxIqWaveform') {
      updateDssRxIqWaveformChart();
    } else if (currentActiveTab === 'fhssChannelIqWaveform') {
      updateChannelIqWaveformChart();
    } else if (currentActiveTab === 'fhssRecoveredIqWaveform') {
      updateRecoveredIqWaveformChart();
    } else if (currentActiveTab === 'hopSequence') {
      updateHopSequenceChart();
    } else if (currentActiveTab === 'cloudChart') {
      updateCloudChart();
    } else if (currentActiveTab === 'rxIqWaveform') {
      updateRxIqWaveformChart();
    } else if (currentActiveTab === 'trends') {
      updateTrendChart();
    } else if (currentActiveTab === 'spreadSamplesChart') {
      updateSpreadSamplesChart();
    } else if (currentActiveTab === 'despreadSamplesChart') {
      updateDespreadSamplesChart();
    } else if (currentActiveTab === 'demodulatedBitstream') {
      updateDemodulatedBitstreamChart();
    } else if (currentActiveTab === 'iqComparison') {
      updateIQComparisonChart();
    } else if (currentActiveTab === 'constellationAfterChannel') {
      updateConstellationAfterChannelChart();
    } else if (currentActiveTab === 'restoredConstellation') {
      updateRestoredConstellationChart();
    } else if (currentActiveTab === 'fiveGQamMapped') {
      updateFiveGQamMappedChart();
    } else if (currentActiveTab === 'fiveGCloudComparison') {
      updateFiveGCloudComparisonChart();
    } else if (currentActiveTab === 'fiveGSpectrum') {
      updateFiveGSpectrumChart();
    } else if (currentActiveTab === 'fiveGWaveform') {
      updateFiveGWaveformChart();
    } else if (currentActiveTab === 'spectrum') {
      updateSpectrumChart();
    } else if (currentActiveTab === 'carrierFreq') {
      updateCarrierFreqChart();
    } else if (currentActiveTab === 'multipath') {
      updateMultipathCharts();
    }
  });
};

// 处理图表标签切换
const handleChartTabChange = () => {
  // 使用nextTick确保DOM已更
  nextTick(() => {
    // 给一点延迟等待DOM更新和可能的CSS过渡
    setTimeout(() => {
      if (activeChartTab.value === 'metric' && !metricChart.value) {
        initMetricChart();
      } else if (activeChartTab.value === 'status' && !statusChart.value) {
        initStatusChart();
      } else if (activeChartTab.value === 'rfSignal' && !rfSignalChart.value) {
        initRfSignalChart();
      } else if (activeChartTab.value === 'bitstream' && hasSimulationData.value) {
        initUnifiedBitstreamChart();
      } else if (activeChartTab.value === 'constellation' && hasSimulationData.value) {
        initUnifiedConstellationChart();
      } else if (activeChartTab.value === 'hopSequence' && hasSimulationData.value) {
        initHopSequenceChart();
      } else if (activeChartTab.value === 'cloudChart' && hasSimulationData.value) {
        initCloudChart();
      } else if (activeChartTab.value === 'trends' && hasSimulationData.value) {
        initUnifiedTrendChart();
      }

      // 无论是否新创建图表，都确保当前活跃的图表调整大小
      if (activeChartTab.value === 'metric' && metricChart.value) {
        metricChart.value.resize();
      } else if (activeChartTab.value === 'status' && statusChart.value) {
        statusChart.value.resize();
      } else if (activeChartTab.value === 'rfSignal' && rfSignalChart.value) {
        rfSignalChart.value.resize();
      } else if (activeChartTab.value === 'bitstream' && bitstreamChart.value) {
        bitstreamChart.value.resize();
      } else if (activeChartTab.value === 'constellation' && constellationChart.value) {
        constellationChart.value.resize();
      } else if (activeChartTab.value === 'hopSequence' && hopSequenceChart.value) {
        hopSequenceChart.value.resize();
      } else if (activeChartTab.value === 'cloudChart' && cloudChart.value) {
        cloudChart.value.resize();
      } else if (activeChartTab.value === 'trends' && trendChart.value) {
        trendChart.value.resize();
      }

      updateCharts();
    }, 100);
  });
};

// 处理信道标签切换
const fiveGChannelTabs = ['fiveGQamMapped', 'fiveGCloudComparison', 'fiveGSpectrum', 'fiveGWaveform', 'trends'];
const fiveGOnlyChannelTabs = ['fiveGQamMapped', 'fiveGCloudComparison', 'fiveGSpectrum', 'fiveGWaveform'];

const getPreferredFiveGChannelTab = () => {
  if (has5GQamMapped.value) return 'fiveGQamMapped';
  if (has5GDeInterFrqOut.value || has5GSfoComp.value) return 'fiveGCloudComparison';
  if (has5GSpectrumData.value || getSpectrumData()) return 'fiveGSpectrum';
  if (has5GOriginalBits.value || has5GOutputBits.value) return 'fiveGWaveform';
  return 'fiveGQamMapped';
};

const ensureActiveChannelTabForCurrentModel = () => {
  if (currentModelName.value === '5G') {
    if (!fiveGChannelTabs.includes(activeChannelTab.value)) {
      activeChannelTab.value = getPreferredFiveGChannelTab();
      return true;
    }
    return false;
  }

  if (fiveGOnlyChannelTabs.includes(activeChannelTab.value)) {
    activeChannelTab.value = 'bitstream';
    return true;
  }

  if (currentModelName.value !== 'FHSS' && ['fhssChannelIqWaveform', 'fhssRecoveredIqWaveform'].includes(activeChannelTab.value)) {
    activeChannelTab.value = 'bitstream';
    return true;
  }

  if (currentModelName.value !== 'DSSS' && ['dssTxIqWaveform', 'dssRxIqWaveform'].includes(activeChannelTab.value)) {
    activeChannelTab.value = 'bitstream';
    return true;
  }

  if (currentModelName.value === 'FHSS' && ['cloudChart', 'iqComparison', 'restoredConstellation'].includes(activeChannelTab.value)) {
    activeChannelTab.value = 'bitstream';
    return true;
  }

  if (isRxIqWaveformModel.value && ['cloudChart', 'iqComparison'].includes(activeChannelTab.value)) {
    activeChannelTab.value = 'bitstream';
    return true;
  }

  return false;
};

const refreshChannelScrollLayout = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = panelContentRef.value;
      if (!el || currentView.value !== 'channel') return;

      const previousOverflow = el.style.overflowY;
      el.style.overflowY = 'hidden';
      void el.offsetHeight;
      el.style.overflowY = previousOverflow;
    });
  });
};

const handleChannelTabChange = () => {
  ensureActiveChannelTabForCurrentModel();
  // 使用nextTick确保DOM已更
  nextTick(() => {
    // 给一点延迟等待DOM更新和可能的CSS过渡
    setTimeout(() => {
      if (activeChannelTab.value === 'bitstream' && hasSimulationData.value) {
        initUnifiedBitstreamChart();
      } else if (activeChannelTab.value === 'constellation' && hasSimulationData.value) {
        initUnifiedConstellationChart();
      } else if (activeChannelTab.value === 'dssTxIqWaveform' && hasSimulationData.value) {
        initDssTxIqWaveformChart();
      } else if (activeChannelTab.value === 'dssRxIqWaveform' && hasSimulationData.value) {
        initDssRxIqWaveformChart();
      } else if (activeChannelTab.value === 'fhssChannelIqWaveform' && hasSimulationData.value) {
        initChannelIqWaveformChart();
      } else if (activeChannelTab.value === 'fhssRecoveredIqWaveform' && hasSimulationData.value) {
        initRecoveredIqWaveformChart();
      } else if (activeChannelTab.value === 'hopSequence' && hasSimulationData.value) {
        initHopSequenceChart();
      } else if (activeChannelTab.value === 'cloudChart' && hasSimulationData.value) {
        initCloudChart();
      } else if (activeChannelTab.value === 'rxIqWaveform' && hasSimulationData.value) {
        initRxIqWaveformChart();
      } else if (activeChannelTab.value === 'trends' && hasSimulationData.value) {
        initUnifiedTrendChart();
      } else if (activeChannelTab.value === 'spreadSamplesChart' && hasSimulationData.value) {
        initSpreadSamplesChart();
      } else if (activeChannelTab.value === 'despreadSamplesChart' && hasSimulationData.value) {
        initDespreadSamplesChart();
      } else if (activeChannelTab.value === 'demodulatedBitstream' && hasSimulationData.value) {
        initDemodulatedBitstreamChart();
      } else if (activeChannelTab.value === 'iqComparison' && hasSimulationData.value) {
        initIQComparisonChart();
      } else if (activeChannelTab.value === 'constellationAfterChannel' && hasSimulationData.value) {
        initConstellationAfterChannelChart();
      } else if (activeChannelTab.value === 'restoredConstellation' && hasSimulationData.value) {
        initRestoredConstellationChart();
      } else if (activeChannelTab.value === 'fiveGQamMapped' && hasSimulationData.value) {
        initFiveGQamMappedChart();
      } else if (activeChannelTab.value === 'fiveGCloudComparison' && hasSimulationData.value) {
        initFiveGCloudComparisonChart();
      } else if (activeChannelTab.value === 'fiveGSpectrum' && hasSimulationData.value) {
        initFiveGSpectrumChart();
      } else if (activeChannelTab.value === 'fiveGWaveform' && hasSimulationData.value) {
        initFiveGWaveformChart();
      } else if (activeChannelTab.value === 'spectrum' && hasSimulationData.value) {
        initSpectrumChart();
      } else if (activeChannelTab.value === 'carrierFreq' && hasSimulationData.value) {
        initCarrierFreqChart();
      } else if (activeChannelTab.value === 'multipath' && hasSimulationData.value) {
        updateMultipathCharts();
      }

      // 无论是否新创建图表，都确保当前活跃的图表调整大小
      if (activeChannelTab.value === 'bitstream' && bitstreamChart.value) {
        bitstreamChart.value.resize();
      } else if (activeChannelTab.value === 'constellation' && constellationChart.value) {
        constellationChart.value.resize();
      } else if (activeChannelTab.value === 'dssTxIqWaveform' && dssTxIqWaveformChart.value) {
        dssTxIqWaveformChart.value.resize();
      } else if (activeChannelTab.value === 'dssRxIqWaveform' && dssRxIqWaveformChart.value) {
        dssRxIqWaveformChart.value.resize();
      } else if (activeChannelTab.value === 'fhssChannelIqWaveform' && channelIqWaveformChart.value) {
        channelIqWaveformChart.value.resize();
      } else if (activeChannelTab.value === 'fhssRecoveredIqWaveform' && recoveredIqWaveformChart.value) {
        recoveredIqWaveformChart.value.resize();
      } else if (activeChannelTab.value === 'hopSequence' && hopSequenceChart.value) {
        hopSequenceChart.value.resize();
      } else if (activeChannelTab.value === 'cloudChart' && cloudChart.value) {
        cloudChart.value.resize();
      } else if (activeChannelTab.value === 'rxIqWaveform' && rxIqWaveformChart.value) {
        rxIqWaveformChart.value.resize();
      } else if (activeChannelTab.value === 'trends' && trendChart.value) {
        trendChart.value.resize();
      } else if (activeChannelTab.value === 'spreadSamplesChart' && spreadSamplesChart.value) {
        spreadSamplesChart.value.resize();
      } else if (activeChannelTab.value === 'despreadSamplesChart' && despreadSamplesChart.value) {
        despreadSamplesChart.value.resize();
      } else if (activeChannelTab.value === 'demodulatedBitstream' && demodulatedBitstreamChart.value) {
        demodulatedBitstreamChart.value.resize();
      } else if (activeChannelTab.value === 'iqComparison' && iqComparisonChart.value) {
        iqComparisonChart.value.resize();
      } else if (activeChannelTab.value === 'constellationAfterChannel' && constellationAfterChannelChart.value) {
        constellationAfterChannelChart.value.resize();
      } else if (activeChannelTab.value === 'restoredConstellation' && restoredConstellationChart.value) {
        restoredConstellationChart.value.resize();
      } else if (activeChannelTab.value === 'fiveGQamMapped' && fiveGQamMappedChart.value) {
        fiveGQamMappedChart.value.resize();
      } else if (activeChannelTab.value === 'fiveGCloudComparison' && fiveGCloudComparisonChart.value) {
        fiveGCloudComparisonChart.value.resize();
      } else if (activeChannelTab.value === 'fiveGSpectrum' && fiveGSpectrumChart.value) {
        fiveGSpectrumChart.value.resize();
      } else if (activeChannelTab.value === 'fiveGWaveform' && fiveGWaveformChart.value) {
        fiveGWaveformChart.value.resize();
      } else if (activeChannelTab.value === 'spectrum' && spectrumChart.value) {
        spectrumChart.value.resize();
      } else if (activeChannelTab.value === 'carrierFreq' && carrierFreqChart.value) {
        carrierFreqChart.value.resize();
      } else if (activeChannelTab.value === 'multipath' && (multipathSpectrumChart.value || multipathConstellationChart.value)) {
        if (multipathSpectrumChart.value) multipathSpectrumChart.value.resize();
        if (multipathConstellationChart.value) multipathConstellationChart.value.resize();
      }

      updateUnifiedSimCharts();
      refreshChannelScrollLayout();
    }, 100);
  });
};


watch(currentView, (newView, oldView) => {
  // 切换视图前，销毁旧视图的所有图表实例（v-if会销毁DOM，旧实例变为悬空
  disposeAllChartInstances();

  if (newView === 'chart') {
    // 当切换到图表视图时，先给一点延迟等待CSS过渡效果完成，然后初始化图表
    setTimeout(() => {
      nextTick(() => {
        // 根据当前选中的标签页初始化对应的图表
        if (activeChartTab.value === 'metric') {
          initMetricChart();
          if (metricChart.value) metricChart.value.resize();
        } else if (activeChartTab.value === 'status') {
          initStatusChart();
          if (statusChart.value) statusChart.value.resize();
        } else if (activeChartTab.value === 'rfSignal') {
          initRfSignalChart();
          if (rfSignalChart.value) rfSignalChart.value.resize();
        } else if (activeChartTab.value === 'bitstream' && hasSimulationData.value) {
          initUnifiedBitstreamChart();
          if (bitstreamChart.value) bitstreamChart.value.resize();
        } else if (activeChartTab.value === 'constellation' && hasSimulationData.value) {
          initUnifiedConstellationChart();
          if (constellationChart.value) constellationChart.value.resize();
        } else if (activeChartTab.value === 'hopSequence' && hasSimulationData.value) {
          initHopSequenceChart();
          if (hopSequenceChart.value) hopSequenceChart.value.resize();
        } else if (activeChartTab.value === 'cloudChart' && hasSimulationData.value) {
          initCloudChart();
          if (cloudChart.value) cloudChart.value.resize();
        } else if (activeChartTab.value === 'trends' && hasSimulationData.value) {
          initUnifiedTrendChart();
          if (trendChart.value) trendChart.value.resize();
        }
        updateCharts();
      });
    }, 400); // 增加400ms延迟，与CSS过渡时间匹配
  } else if (newView === 'channel') {
    ensureActiveChannelTabForCurrentModel();
    // 当切换到信道数据视图时，初始化信道图
    setTimeout(() => {
      nextTick(() => {
        // 根据当前选中的信道标签页初始化对应的图表
        if (activeChannelTab.value === 'bitstream' && hasSimulationData.value) {
          initUnifiedBitstreamChart();
          if (bitstreamChart.value) bitstreamChart.value.resize();
        } else if (activeChannelTab.value === 'constellation' && hasSimulationData.value) {
          initUnifiedConstellationChart();
          if (constellationChart.value) constellationChart.value.resize();
        } else if (activeChannelTab.value === 'dssTxIqWaveform' && hasSimulationData.value) {
          initDssTxIqWaveformChart();
          if (dssTxIqWaveformChart.value) dssTxIqWaveformChart.value.resize();
        } else if (activeChannelTab.value === 'dssRxIqWaveform' && hasSimulationData.value) {
          initDssRxIqWaveformChart();
          if (dssRxIqWaveformChart.value) dssRxIqWaveformChart.value.resize();
        } else if (activeChannelTab.value === 'fhssChannelIqWaveform' && hasSimulationData.value) {
          initChannelIqWaveformChart();
          if (channelIqWaveformChart.value) channelIqWaveformChart.value.resize();
        } else if (activeChannelTab.value === 'fhssRecoveredIqWaveform' && hasSimulationData.value) {
          initRecoveredIqWaveformChart();
          if (recoveredIqWaveformChart.value) recoveredIqWaveformChart.value.resize();
        } else if (activeChannelTab.value === 'hopSequence' && hasSimulationData.value) {
          initHopSequenceChart();
          if (hopSequenceChart.value) hopSequenceChart.value.resize();
        } else if (activeChannelTab.value === 'cloudChart' && hasSimulationData.value) {
          initCloudChart();
          if (cloudChart.value) cloudChart.value.resize();
        } else if (activeChannelTab.value === 'rxIqWaveform' && hasSimulationData.value) {
          initRxIqWaveformChart();
          if (rxIqWaveformChart.value) rxIqWaveformChart.value.resize();
        } else if (activeChannelTab.value === 'trends' && hasSimulationData.value) {
          initUnifiedTrendChart();
          if (trendChart.value) trendChart.value.resize();
        } else if (activeChannelTab.value === 'spreadSamplesChart' && hasSimulationData.value) {
          initSpreadSamplesChart();
          if (spreadSamplesChart.value) spreadSamplesChart.value.resize();
        } else if (activeChannelTab.value === 'despreadSamplesChart' && hasSimulationData.value) {
          initDespreadSamplesChart();
          if (despreadSamplesChart.value) despreadSamplesChart.value.resize();
        } else if (activeChannelTab.value === 'demodulatedBitstream' && hasSimulationData.value) {
          initDemodulatedBitstreamChart();
          if (demodulatedBitstreamChart.value) demodulatedBitstreamChart.value.resize();
        } else if (activeChannelTab.value === 'iqComparison' && hasSimulationData.value) {
          initIQComparisonChart();
          if (iqComparisonChart.value) iqComparisonChart.value.resize();
        } else if (activeChannelTab.value === 'constellationAfterChannel' && hasSimulationData.value) {
          initConstellationAfterChannelChart();
          if (constellationAfterChannelChart.value) constellationAfterChannelChart.value.resize();
        } else if (activeChannelTab.value === 'restoredConstellation' && hasSimulationData.value) {
          initRestoredConstellationChart();
          if (restoredConstellationChart.value) restoredConstellationChart.value.resize();
        } else if (activeChannelTab.value === 'fiveGQamMapped' && hasSimulationData.value) {
          initFiveGQamMappedChart();
          if (fiveGQamMappedChart.value) fiveGQamMappedChart.value.resize();
        } else if (activeChannelTab.value === 'fiveGCloudComparison' && hasSimulationData.value) {
          initFiveGCloudComparisonChart();
          if (fiveGCloudComparisonChart.value) fiveGCloudComparisonChart.value.resize();
        } else if (activeChannelTab.value === 'fiveGSpectrum' && hasSimulationData.value) {
          initFiveGSpectrumChart();
          if (fiveGSpectrumChart.value) fiveGSpectrumChart.value.resize();
        } else if (activeChannelTab.value === 'fiveGWaveform' && hasSimulationData.value) {
          initFiveGWaveformChart();
          if (fiveGWaveformChart.value) fiveGWaveformChart.value.resize();
        } else if (activeChannelTab.value === 'carrierFreq' && hasSimulationData.value) {
          initCarrierFreqChart();
          if (carrierFreqChart.value) carrierFreqChart.value.resize();
        }
        updateUnifiedSimCharts();
        refreshChannelScrollLayout();
      });
    }, 400); // 增加400ms延迟，与CSS过渡时间匹配
  }
});



// 监听NEM ID变化
watch(selectedNemId, () => {
  updateCharts();
});

// 监听多径路径选择变化
watch(selectedMultipathId, () => {
  updateMultipathCharts();
});

// 监听仿真数据变化，自动更新图
// 当前活跃的模型类型，用于检测模型切
const activeModelType = ref<string>('');

watch(() => currentModelName.value, (newModel, oldModel) => {
  const previousChannelTab = activeChannelTab.value;
  if (newModel === '5G') {
    // 如果切换G模型，确保activeChannelTab设置到一G独有的标签页
    if (activeChannelTab.value === 'bitstream' || activeChannelTab.value === 'constellation') {
      activeChannelTab.value = getPreferredFiveGChannelTab();
    }
  } else if (oldModel === '5G' && newModel !== '5G') {
    // 如果G模型切出，恢复到通用的标签页
    if (activeChannelTab.value === 'fiveGWaveform' || activeChannelTab.value === 'fiveGSpectrum' || activeChannelTab.value === 'fiveGCloudComparison' || activeChannelTab.value === 'fiveGQamMapped') {
      activeChannelTab.value = 'bitstream';
    }
  }
  const tabChanged = ensureActiveChannelTabForCurrentModel() || activeChannelTab.value !== previousChannelTab;
  if (tabChanged && currentView.value === 'channel') {
    nextTick(() => {
      handleChannelTabChange();
      refreshChannelScrollLayout();
    });
  }
});

watch(() => props.dssData, (newData, oldData) => {
  // 只有当数据真正变化且当前在图表视图或信道视图时才更新
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (newData) {
      // 检测是否切换了模型类型，如果是则清除历史数
      if (activeModelType.value !== 'DSSS') {
        clearUnifiedHistoryData();
        activeModelType.value = 'DSSS';
      }
      nextTick(() => {
        updateUnifiedSimCharts();
      });
    }
  } else if (!newData && oldData) {
    // 数据被清除时，清理图
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.fhssData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (newData) {
      // 检测是否切换了模型类型，如果是则清除历史数
      if (activeModelType.value !== 'FHSS') {
        clearUnifiedHistoryData();
        activeModelType.value = 'FHSS';
      }
      nextTick(() => {
        updateUnifiedSimCharts();
      });
    }
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.gmskData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (newData) {
      // 检测是否切换了模型类型，如果是则清除历史数
      if (activeModelType.value !== 'GMSK') {
        clearUnifiedHistoryData();
        activeModelType.value = 'GMSK';
      }
      nextTick(() => {
        updateUnifiedSimCharts();
      });
    }
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.gfskData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== 'GFSK') {
      clearUnifiedHistoryData();
      activeModelType.value = 'GFSK';
    }
    nextTick(() => {
      updateUnifiedSimCharts();
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.uhfData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== 'UHF') {
      clearUnifiedHistoryData();
      activeModelType.value = 'UHF';
    }
    nextTick(() => {
      updateUnifiedSimCharts();
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.vhfData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== 'VHF') {
      clearUnifiedHistoryData();
      activeModelType.value = 'VHF';
    }
    nextTick(() => {
      updateUnifiedSimCharts();
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.fiveGData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== '5G') {
      clearUnifiedHistoryData();
      activeModelType.value = '5G';
    }
    ensureActiveChannelTabForCurrentModel();
    nextTick(() => {
      updateUnifiedSimCharts();
      if (currentView.value === 'channel') {
        handleChannelTabChange();
        refreshChannelScrollLayout();
      }
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.ttcData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== 'TTC') {
      clearUnifiedHistoryData();
      activeModelType.value = 'TTC';
    }
    nextTick(() => {
      updateUnifiedSimCharts();
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.adhocData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== 'AdHoc') {
      clearUnifiedHistoryData();
      activeModelType.value = 'AdHoc';
    }
    nextTick(() => {
      updateUnifiedSimCharts();
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.coordinationData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== 'Coordination') {
      clearUnifiedHistoryData();
      activeModelType.value = 'Coordination';
    }
    nextTick(() => {
      updateUnifiedSimCharts();
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

watch(() => props.customData, (newData, oldData) => {
  if (newData && newData !== oldData && (currentView.value === 'chart' || currentView.value === 'channel')) {
    if (activeModelType.value !== 'Custom') {
      clearUnifiedHistoryData();
      activeModelType.value = 'Custom';
    }
    nextTick(() => {
      updateUnifiedSimCharts();
    });
  } else if (!newData && oldData) {
    clearUnifiedHistoryData();
    activeModelType.value = '';
  }
}, { deep: true });

// 监听视角变化
watch(currentPerspective, () => {
  // 当视角变化时，更新选中的NEM ID和视角NEM ID
  if (perspectiveNemId.value !== null) {
    selectedNemId.value = perspectiveNemId.value;
    viewpointNemId.value = linkViewpointNemId.value;
    
    // 更新表格和图表数
    nextTick(() => {
      // updateTableData();
      // 不需要立即更新历史数据，等待下一次数据更
      updateCharts();
    });
  }
});

// 监听EMANE数据变化
watch([() => emaneStore.lastUpdated, selectedNemId, viewpointNemId], () => {
  if (selectedNemId.value) {
    // 数据更新computed 属性自动处
    // updateTableData();
    updateHistoryData();
    updateCharts();
  }
}, { deep: true });

// 增强数据更新逻辑
// 页面挂载
onMounted(() => {
  // 如果提供了链路信息，查找对应的NEM ID
  if (props.link) {
    watch([() => props.link, nemIds], () => {
      findNemIdForLink();
      // 初始数据加载后更新表格数
      nextTick(() => {
        // updateTableData();

        // 初始化时启用双视角数据对- 仅对链路模式
        if (props.link && !props.link.is_node_monitoring) {
          showDualPerspective.value = true;
        }
      });
    }, { immediate: true, deep: true });
  }
  // 否则，让用户通过下拉菜单选择
  else {
    // 默认选择第一个可用的视角
    if (availableViewpoints.value.length > 0 && !viewpointNemId.value) {
      viewpointNemId.value = availableViewpoints.value[0];
      handleViewpointChange(); // 自动选择第一个邻
    }
  }

  // 初始化时检查是否有仿真数据，自动切换到对应标签
  nextTick(() => {
    if (hasSimulationData.value) {
      activeChartTab.value = 'bitstream';
    }
  });

  // 订阅EMANE数据更新
  startDataSubscription();
});

// 添加数据订阅定时
let dataRefreshInterval: number | null = null;

// 启动数据刷新
const startDataSubscription = () => {
  if (dataRefreshInterval) {
    clearInterval(dataRefreshInterval);
  }
  
  // 秒刷新一次数
  dataRefreshInterval = window.setInterval(() => {
    if (selectedNemId.value) {
      // 不再需要手动调updateTableData
      updateHistoryData();
      updateCharts();
    }
  }, 2000);
};

// 停止数据刷新
const stopDataSubscription = () => {
  if (dataRefreshInterval) {
    clearInterval(dataRefreshInterval);
    dataRefreshInterval = null;
  }
};

// 组件卸载前清
onBeforeUnmount(() => {
  stopDataSubscription();
  window.removeEventListener('resize', handleResize);

  // 销毁图表实
  if (metricChart.value) metricChart.value.dispose();
  if (statusChart.value) statusChart.value.dispose();
  if (rfSignalChart.value) rfSignalChart.value.dispose();
  
  // 清理统一图表和历史数
  clearUnifiedHistoryData();

  // 清空引用
  metricChart.value = null;
  statusChart.value = null;
  rfSignalChart.value = null;
});

// 窗口大小变化时，重新调整图表大小
const handleResize = () => {
  // 基础图表
  if (metricChart.value) metricChart.value.resize();
  if (statusChart.value) statusChart.value.resize();
  if (rfSignalChart.value) rfSignalChart.value.resize();
  
  // 统一图表
  if (bitstreamChart.value) bitstreamChart.value.resize();
  if (constellationChart.value) constellationChart.value.resize();
  if (hopSequenceChart.value) hopSequenceChart.value.resize();
  if (cloudChart.value) cloudChart.value.resize();
  if (rxIqWaveformChart.value) rxIqWaveformChart.value.resize();
  if (channelIqWaveformChart.value) channelIqWaveformChart.value.resize();
  if (recoveredIqWaveformChart.value) recoveredIqWaveformChart.value.resize();
  if (trendChart.value) trendChart.value.resize();
  
  // DSSS专用图表
  if (dssTxIqWaveformChart.value) dssTxIqWaveformChart.value.resize();
  if (dssRxIqWaveformChart.value) dssRxIqWaveformChart.value.resize();
  if (spreadSamplesChart.value) spreadSamplesChart.value.resize();
  if (despreadSamplesChart.value) despreadSamplesChart.value.resize();
  if (demodulatedBitstreamChart.value) demodulatedBitstreamChart.value.resize();
};

// 监听窗口大小变化
window.addEventListener('resize', handleResize);

// 格式化时间显
const formatTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

// 更新数据缓存
const updateCache = (nemId: number, type: 'metric' | 'status' | 'rfSignal', data: any) => {
  if (!nemId) {
    console.warn('尝试更新缓存时NEM ID为空');
    return;
  }
  
  try {
    if (!dataCache.value.has(nemId)) {
      dataCache.value.set(nemId, {
        metric: null,
        status: null,
        rfSignal: null,
        timestamp: Date.now()
      });
    }
    
    const cache = dataCache.value.get(nemId);
    if (cache) {
      // 直接设置对应类型的数
      cache[type] = JSON.parse(JSON.stringify(data)); // 深拷贝以避免引用问题
      cache.timestamp = Date.now();
    }
  } catch (error) {
    console.error(`更新NEM ID ${nemId} 的缓存时出错:`, error);
  }
};

// 双视角数据展示开
const showDualPerspective = ref(false);

// 源节点和目标节点视角的统计数
const sourcePerspectiveStats = computed(() => {
  if (!sourceNodeNemId.value || !targetNodeNemId.value) return null;
  
  return getPerspectiveStats(sourceNodeNemId.value, targetNodeNemId.value);
});

const targetPerspectiveStats = computed(() => {
  if (!sourceNodeNemId.value || !targetNodeNemId.value) return null;
  
  return getPerspectiveStats(targetNodeNemId.value, sourceNodeNemId.value);
});

// 获取特定视角下的统计数据
const getPerspectiveStats = (viewpointNemId: number, targetNemId: number) => {
  const stats = {
    sinrAvg: undefined as number | undefined,
    avgRxPower: undefined as number | undefined,
    avgNoiseFloor: undefined as number | undefined,
  };
  
  // 从RF信号获取数据
  const rfSignal = emaneStore.getRFSignalByNem(targetNemId, viewpointNemId);
  if (rfSignal) {
    stats.avgRxPower = rfSignal.avgRxPower;
    stats.avgNoiseFloor = rfSignal.avgNoiseFloor;
    stats.sinrAvg = rfSignal.avgSINR;
  }
  
  // 如果没有RF信号数据，尝试从指标数据获取SINR
  if (stats.sinrAvg === undefined) {
    const metric = emaneStore.getMetricByNem(targetNemId, viewpointNemId);
    if (metric && Number.isFinite(metric.sinrAvg)) {
      stats.sinrAvg = metric.sinrAvg;
    }
  }
  
  return stats;
};

// 添加判断是否为rfpipe模型的计算属
const isRfPipeModel = computed(() => {
  if (!props.link) return false;
  
  // 检查源节点和目标节点连接的EMANE模型
  const sourceModelType = getEmaneModelType(props.link.node1_id);
  const targetModelType = getEmaneModelType(props.link.node2_id);
  
  // 使用第一个非空的模型类型
  const modelType = sourceModelType || targetModelType;
  
  return modelType === 'rfpipe';
});

// 链路质量评估
const linkQualityClass = computed(() => {
  if (!sourcePerspectiveStats.value?.sinrAvg && !targetPerspectiveStats.value?.sinrAvg) {
    return 'quality-unknown';
  }
  
  // 计算平均SINR
  const sourceSinr = sourcePerspectiveStats.value?.sinrAvg || 0;
  const targetSinr = targetPerspectiveStats.value?.sinrAvg || 0;
  const avgSinr = (sourceSinr + targetSinr) / (sourceSinr && targetSinr ? 2 : 1);
  
  if (avgSinr > 25) return 'quality-excellent';
  if (avgSinr > 15) return 'quality-good';
  if (avgSinr > 10) return 'quality-fair';
  return 'quality-poor';
});

// 链路质量文字描述
const linkQualityText = computed(() => {
  if (!sourcePerspectiveStats.value?.sinrAvg && !targetPerspectiveStats.value?.sinrAvg) {
    return '未知';
  }
  
  const qualityClass = linkQualityClass.value;
  switch (qualityClass) {
    case 'quality-excellent': return '优秀';
    case 'quality-good': return '良好';
    case 'quality-fair': return '一般';
    case 'quality-poor': return '较差';
    default: return '未知';
  }
});

// 获取并格式化当前链路使用的EMANE模型类型
const formattedModelType = computed(() => {
  if (!props.link) return '';
  
  // 检查源节点和目标节点连接的EMANE模型
  const sourceModelType = getEmaneModelType(props.link.node1_id);
  const targetModelType = getEmaneModelType(props.link.node2_id);
  
  // 使用第一个非空的模型类型
  const modelType = sourceModelType || targetModelType;
  
  // 将模型类型转换为更友好的显示格式
  switch(modelType) {
    case 'rfpipe':
      return 'RF Pipe';
    case 'tdma':
      return 'TDMA';
    case 'ieee80211abg':
      return 'IEEE 802.11 a/b/g';
    case 'bypass':
      return 'Bypass';
    case 'commeffect':
      return 'CommEffect';
    default:
      return modelType ? modelType.toUpperCase() : '未知';
  }
});

// 获取模型描述
const modelDescription = computed(() => {
  if (!props.link) return '';
  
  // 检查源节点和目标节点连接的EMANE模型
  const sourceModelType = getEmaneModelType(props.link.node1_id);
  const targetModelType = getEmaneModelType(props.link.node2_id);
  
  // 使用第一个非空的模型类型
  const modelType = sourceModelType || targetModelType;
  
  // 返回相应的描
  switch(modelType) {
    case 'rfpipe':
      return '无线频率管道模型，用于模拟基本射频通信，支持RF信号数据';
    case 'tdma':
      return '时分多址接入模型，适用于模拟多用户时分接入场景';
    case 'ieee80211abg':
      return 'WiFi模型，基于IEEE 802.11 a/b/g标准';
    case 'bypass':
      return '简单的旁路模型，适用于直接测试';
    case 'commeffect':
      return '通信效果模型，提供基础的延迟和丢包功能';
    default:
      return '未知模型类型';
  }
});

// 获取模型状态类
const modelStatusClass = computed(() => {
  if (!props.link) return '';
  
  // 检查源节点和目标节点连接的EMANE模型
  const sourceModelType = getEmaneModelType(props.link.node1_id);
  const targetModelType = getEmaneModelType(props.link.node2_id);
  
  // 使用第一个非空的模型类型
  const modelType = sourceModelType || targetModelType;
  
  // 为不同模型返回不同的类名
  switch(modelType) {
    case 'rfpipe':
      return 'model-rf';
    case 'tdma':
      return 'model-tdma';
    case 'ieee80211abg':
      return 'model-ieee';
    case 'bypass':
      return 'model-bypass';
    case 'commeffect':
      return 'model-commeffect';
    default:
      return 'model-unknown';
  }
});
// ========== 拖拽功能 ==========
const panelPos = reactive({ x: 20, y: -1 });
const isDragging = ref(false);
const dragStart = { mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 };

const panelStyle = computed(() => {
  const y = panelPos.y < 0 ? window.innerHeight - 620 : panelPos.y;
  return { left: panelPos.x + 'px', top: y + 'px' };
});

const onHeaderMousedown = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('.neo-infobox-close')) return;
  if (panelPos.y < 0) panelPos.y = window.innerHeight - 620;
  isDragging.value = true;
  dragStart.mouseX = e.clientX;
  dragStart.mouseY = e.clientY;
  dragStart.panelX = panelPos.x;
  dragStart.panelY = panelPos.y;
  e.preventDefault();
};

const onDragMousemove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  panelPos.x = Math.max(0, Math.min(window.innerWidth - 100, dragStart.panelX + (e.clientX - dragStart.mouseX)));
  panelPos.y = Math.max(0, Math.min(window.innerHeight - 60, dragStart.panelY + (e.clientY - dragStart.mouseY)));
};

const onDragMouseup = () => { isDragging.value = false; };

onMounted(() => {
  document.addEventListener('mousemove', onDragMousemove);
  document.addEventListener('mouseup', onDragMouseup);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragMousemove);
  document.removeEventListener('mouseup', onDragMouseup);
});
</script>

<style scoped>
.emane-panel {
  position: fixed;
  z-index: 11;
}

.neo-infobox {
  background: linear-gradient(135deg, rgba(8, 15, 39, 0.85) 0%, rgba(17, 23, 64, 0.9) 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: min(408px, calc(100vw - 40px)); /* 使用min函数确保不超过视口宽*/
  max-width: 90vw;
  max-height: 80vh; /* 限制最大高度为视口高度0% */
  overflow: hidden;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(76, 175, 80, 0.2);
  color: white;
  transform-origin: bottom left;
  animation: infobox-appear 0.3s cubic-bezier(0.19, 1, 0.22, 1);
  display: flex;
  flex-direction: column;
  transition: width 0.4s ease, height 0.4s ease;
}

@keyframes infobox-appear {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.neo-infobox-header {
  cursor: grab;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  background: linear-gradient(90deg, rgba(76, 175, 80, 0.4) 0%, rgba(76, 175, 80, 0.2) 100%);
  border-bottom: 1px solid rgba(76, 175, 80, 0.2);
  font-weight: 600;
  font-size: 16px;
  color: #4caf50;
  text-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
  position: relative;
  flex: 0 0 auto; /* 防止头部收缩 */
}

.neo-infobox-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 15%;
  width: 70%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(76, 175, 80, 0.7), transparent);
}

.neo-infobox-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
  display: flex;
  align-items: center;
}

.is-dragging .neo-infobox-header {
  cursor: grabbing;
  user-select: none;
}

.neo-infobox-close {
  cursor: pointer;
  color: rgba(76, 175, 80, 0.8);
  font-size: 18px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(76, 175, 80, 0.1);
  transition: all 0.2s ease;
}

.neo-infobox-close:hover {
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.3);
  transform: rotate(90deg);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
}

.neo-infobox-content {
  padding: 14px;
  overflow-y: auto;
  flex: 1 1 auto; /* 内容区域自适应 */
  max-height: calc(80vh - 60px); /* 减去header高度 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.neo-infobox-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
  width: 0;
  height: 0;
}

.neo-section {
  margin-bottom: 16px;
  animation: section-appear 0.5s ease forwards;
  opacity: 0;
  transform: translateY(10px);
}

.neo-section:nth-child(1) { animation-delay: 0.1s; }
.neo-section:nth-child(2) { animation-delay: 0.2s; }
.neo-section:nth-child(3) { animation-delay: 0.3s; }

@keyframes section-appear {
  to { opacity: 1; transform: translateY(0); }
}

.neo-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  color: rgba(76, 175, 80, 0.9);
  letter-spacing: 0.5px;
}

.neo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 4px;
}

.neo-grid-item {
  display: flex;
  flex-direction: column;
  background-color: rgba(255, 255, 255, 0.04);
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid rgba(76, 175, 80, 0.05);
}

.neo-grid-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(76, 175, 80, 0.15);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.1);
  transform: scale(1.02);
}

.item-label {
  color: #a5d6a7;
  font-size: 15px;
  font-weight: 400;
  margin-bottom: 2px;
  letter-spacing: 0.5px;
}

.item-value {
  color: #e8f5e9;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.item-value.highlight {
  color: #4caf50;
  text-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}

.channel-metrics-section {
  margin-bottom: 10px;
}

.channel-metrics-group {
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(76, 175, 80, 0.1);
}

.channel-metrics-group:last-child {
  border-bottom: none;
}

.group-title {
  color: rgba(76, 175, 80, 0.7);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.panel-icon {
  margin-right: 6px;
}

.node-selector {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  background: rgba(0, 40, 30, 0.3);
  padding: 10px;
  border-radius: 8px;
  border-left: 3px solid rgba(76, 175, 80, 0.4);
}

.selector-label {
  color: #a5d6a7;
  font-size: 13px;
  margin-right: 10px;
}

.nem-selector {
  flex: 1;
}

.nem-selector :deep(.el-input__inner) {
  background: rgba(0, 60, 30, 0.3);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: #e8f5e9;
}

.last-updated {
  font-size: 12px;
  color: #a5d6a7;
  margin-left: 10px;
}

.loading-indicator, .no-data-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #a5d6a7;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(76, 175, 80, 0.1);
  border-radius: 50%;
  border-top: 4px solid #4caf50;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(76, 175, 80, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4caf50;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
  border: 2px solid rgba(76, 175, 80, 0.4);
}

/* 视角切换控件样式 */
.perspective-toggle {
  margin-top: 12px;
  background: rgba(0, 60, 30, 0.15);
  padding: 12px;
  border-radius: 8px;
}

.toggle-label {
  color: #a5d6a7;
  font-size: 13px;
  margin-bottom: 8px;
}

.toggle-buttons {
  display: flex;
  gap: 10px;
}

.perspective-btn {
  flex: 1;
  padding: 8px 0;
  border: 1px solid rgba(76, 175, 80, 0.3);
  background: rgba(0, 60, 30, 0.2);
  color: #a5d6a7;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.perspective-btn:hover {
  background: rgba(0, 60, 30, 0.4);
  border-color: rgba(76, 175, 80, 0.5);
}

.perspective-btn.active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.4), rgba(76, 175, 80, 0.6));
  color: #ffffff;
  border-color: rgba(76, 175, 80, 0.6);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
  transform: translateY(-1px);
}

/* 图表类型选择器样*/
.chart-type-selector {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  padding: 8px;
  background: rgba(0, 40, 30, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.chart-type-selector :deep(.el-radio-button__inner) {
  background-color: rgba(0, 40, 30, 0.4);
  border-color: rgba(76, 175, 80, 0.4);
  color: #a5d6a7;
  font-size: 13px;
  padding: 8px 16px;
}

.chart-type-selector :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: rgba(76, 175, 80, 0.6);
  border-color: rgba(76, 175, 80, 0.6);
  color: #ffffff;
  box-shadow: -1px 0 0 0 rgba(76, 175, 80, 0.6);
}

.chart-type-selector :deep(.el-radio-button:hover .el-radio-button__inner) {
  color: #4caf50;
}

/* 视图切换样式 */
.view-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.view-toggle :deep(.el-radio-button__inner) {
  background-color: rgba(0, 40, 30, 0.4);
  border-color: rgba(76, 175, 80, 0.4);
  color: #a5d6a7;
}

.view-toggle :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: rgba(76, 175, 80, 0.6);
  border-color: rgba(76, 175, 80, 0.6);
  color: #ffffff;
  box-shadow: -1px 0 0 0 rgba(76, 175, 80, 0.6);
}

/* 图表样式 */
.chart-view {
  margin-top: 10px;
  padding: 12px;
  background: rgba(8, 15, 39, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(76, 175, 80, 0.15);
  transition: all 0.4s ease;
}

.chart-container {
  height: 380px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  margin: 10px 0;
  animation: fade-in 0.5s ease-in-out;
  border: 1px solid rgba(76, 175, 80, 0.1);
  background: rgba(8, 15, 39, 0.6);
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.3);
  transition: height 0.4s ease, width 0.4s ease;
  position: relative;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.chart-tabs {
  margin-top: 8px;
}

.chart-tabs :deep(.el-tabs__header) {
  background: rgba(0, 40, 30, 0.3);
  border-radius: 8px;
  margin-bottom: 8px;
  border-bottom: none;
  padding: 4px;
}

.chart-tabs :deep(.el-tabs__nav-wrap) {
  padding: 0 8px;
}

.chart-tabs :deep(.el-tabs__item) {
  color: #a5d6a7;
  font-size: 13px;
  font-weight: 500;
  padding: 0 16px;
  height: 36px;
  line-height: 36px;
  transition: all 0.3s;
  margin: 0 2px;
  border-radius: 4px;
}

.chart-tabs :deep(.el-tabs__item:hover) {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.chart-tabs :deep(.el-tabs__item.is-active) {
  color: #4caf50;
  font-weight: bold;
  background: rgba(76, 175, 80, 0.2);
  transform: scale(1.02);
}

.chart-tabs :deep(.el-tabs__active-bar) {
  background-color: #4caf50;
  height: 3px;
  border-radius: 2px;
}

.chart-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(76, 175, 80, 0.2);
  height: 1px;
}

/* 响应式样*/
@media screen and (max-width: 768px) {
  .neo-infobox {
    width: min(350px, calc(100vw - 30px));
    left: 15px;
    bottom: 15px;
  }

  .neo-grid {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 300px;
  }

  .chart-tabs :deep(.el-tabs__item) {
    font-size: 12px;
    padding: 0 12px;
    height: 32px;
    line-height: 32px;
  }

  .node-selector {
    flex-direction: column;
    align-items: flex-start;
  }

  .selector-label {
    margin-bottom: 8px;
  }

  .nem-selector {
    width: 100%;
  }

  .last-updated {
    margin-left: 0;
    margin-top: 6px;
  }

  .toggle-buttons {
    flex-direction: column;
  }
}

@media screen and (max-width: 480px) {
  .neo-infobox {
    width: calc(100vw - 20px);
    left: 10px;
    bottom: 10px;
    max-height: 85vh;
  }

  .neo-infobox-title {
    max-width: 200px;
    font-size: 14px;
  }

  .neo-section-title {
    font-size: 13px;
  }

  .item-label {
    font-size: 13px;
  }

  .item-value {
    font-size: 13px;
  }

  .chart-container {
    height: 250px;
  }

  .chart-tabs :deep(.el-tabs__item) {
    font-size: 11px;
    padding: 0 8px;
    height: 30px;
    line-height: 30px;
  }

  .chart-type-selector :deep(.el-radio-button__inner) {
    font-size: 11px;
    padding: 6px 12px;
  }

  .neo-infobox-header {
    padding: 12px 14px;
  }

  .neo-infobox-content {
    padding: 10px;
  }
}

/* 特别处理低高度屏*/
@media screen and (max-height: 700px) {
  .neo-infobox {
    max-height: 95vh;
    bottom: 10px;
  }
  
  .chart-container {
    height: 200px;
  }
  
  .loading-indicator, .no-data-message {
    min-height: 150px;
  }
}

/* 图表模式下的面板样式 */
.neo-infobox.chart-mode {
  width: min(700px, calc(100vw - 40px));
  max-width: 95vw;
}

.chart-mode .chart-container {
  height: min(420px, 45vh);
}

@media screen and (max-width: 768px) {
  .neo-infobox.chart-mode {
    width: min(580px, calc(100vw - 30px));
  }

  .chart-mode .chart-container {
    height: min(350px, 40vh);
  }
}

@media screen and (max-width: 480px) {
  .neo-infobox.chart-mode {
    width: calc(100vw - 20px);
  }

  .chart-mode .chart-container {
    height: 280px;
  }
}

/* 链路信息块样*/
.link-info {
  margin-bottom: 16px;
}

.node-info-block {
  background: rgba(30, 144, 255, 0.06);
  border-radius: 8px;
  padding: 10px;
  border-left: 3px solid rgba(0, 122, 255, 0.4);
  margin-bottom: 10px;
}

.node-info-title {
  font-size: 14px;
  color: #4caf50;
  margin-bottom: 10px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.item-value.highlight {
  color: #4caf50;
  text-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}

.info-message {
  color: #a5d6a7;
  font-size: 14px;
}

/* 缓存数据指示器样*/
.cache-indicator {
  margin-bottom: 15px;
}

.cache-indicator :deep(.el-alert) {
  background-color: rgba(255, 153, 0, 0.15);
  border: 1px solid rgba(255, 153, 0, 0.3);
  color: #ffcc80;
}

.cache-indicator :deep(.el-alert__title) {
  color: #ffaa00;
  font-weight: bold;
}

.cache-indicator :deep(.el-alert__icon) {
  color: #ffaa00;
}

/* 双视角数据样*/
.dual-perspective-stats {
  margin-top: 15px;
  background: rgba(30, 144, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(76, 175, 80, 0.2);
  animation: fade-in 0.5s ease;
}

.dual-stats-header {
  color: #4caf50;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  text-align: center;
  letter-spacing: 0.5px;
}

.dual-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.perspective-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.perspective-title {
  text-align: center;
  font-size: 13px;
  color: #a5d6a7;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(76, 175, 80, 0.2);
  margin-bottom: 5px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.2);
  padding: 5px 8px;
  border-radius: 4px;
}

.stat-label {
  color: #a5d6a7;
}

.stat-value {
  color: #e8f5e9;
  font-weight: 500;
}

.link-quality-indicator {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 5px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.link-quality-label {
  color: #a5d6a7;
  font-size: 13px;
}

.link-quality-value {
  font-size: 14px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 3px;
}

.quality-excellent {
  color: #00e676;
  background: rgba(0, 230, 118, 0.15);
  text-shadow: 0 0 10px rgba(0, 230, 118, 0.5);
}

.quality-good {
  color: #76ff03;
  background: rgba(118, 255, 3, 0.15);
  text-shadow: 0 0 10px rgba(118, 255, 3, 0.5);
}

.quality-fair {
  color: #ffeb3b;
  background: rgba(255, 235, 59, 0.15);
  text-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
}

.quality-poor {
  color: #ff3d00;
  background: rgba(255, 61, 0, 0.15);
  text-shadow: 0 0 10px rgba(255, 61, 0, 0.5);
}

.quality-unknown {
  color: #9e9e9e;
  background: rgba(158, 158, 158, 0.15);
}

.toggle-dual-perspective {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

@media screen and (max-width: 480px) {
  .dual-stats-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .perspective-column:first-child {
    border-bottom: 1px dashed rgba(76, 175, 80, 0.2);
    padding-bottom: 10px;
  }
}

/* 添加模型类型显示样式 */
.model-type-info {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 20, 40, 0.3);
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.model-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.model-label {
  font-weight: 500;
  color: #a5d6a7;
}

.model-value {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}


/* 不同模型类型的颜色样*/
.model-rf {
  background: linear-gradient(135deg, rgba(0, 150, 136, 0.2), rgba(0, 150, 136, 0.4));
  border-left: 3px solid #009688;
}

.model-tdma {
  background: linear-gradient(135deg, rgba(63, 81, 181, 0.2), rgba(63, 81, 181, 0.4));
  border-left: 3px solid #3f51b5;
}

.model-ieee {
  background: linear-gradient(135deg, rgba(233, 30, 99, 0.2), rgba(233, 30, 99, 0.4));
  border-left: 3px solid #e91e63;
}

.model-bypass {
  background: linear-gradient(135deg, rgba(158, 158, 158, 0.2), rgba(158, 158, 158, 0.4));
  border-left: 3px solid #9e9e9e;
}

.model-commeffect {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 152, 0, 0.4));
  border-left: 3px solid #ff9800;
}

.model-unknown {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(244, 67, 54, 0.4));
  border-left: 3px solid #f44336;
}

/* RF信号数据不可用的样式 */
.rf-data-unavailable {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 30px 20px;
  text-align: center;
  background: rgba(8, 15, 39, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(165, 214, 167, 0.2);
  width: 100%;
  height: 300px;
}

.rf-icon {
  margin-bottom: 20px;
  opacity: 0.7;
}

.rf-unavailable-title {
  font-size: 18px;
  font-weight: 600;
  color: #a5d6a7;
  margin-bottom: 15px;
}

.rf-unavailable-message {
  font-size: 14px;
  color: #8bc34a;
  margin-bottom: 20px;
  line-height: 1.5;
  max-width: 400px;
}

/* RF信号数据不可用的精简提示 */
.rf-unavailable-section {
  border-left: 3px solid #ff9800;
}

.rf-unavailable-compact {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(255, 152, 0, 0.1);
  border-radius: 6px;
  margin: 5px 0;
  font-size: 13px;
  color: #ffcc80;
  line-height: 1.4;
}

.info-icon-small {
  min-width: 20px;
  margin-right: 10px;
}

/* DSSS数据显示样式 */
.dss-data-view {
  padding: 0;
}

.dss-inner-tabs {
  width: 100%;
}

.dss-metrics-section {
  padding: 15px;
}

.dss-spreading-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  padding: 15px;
}

.dss-trend-charts {
  padding: 15px;
}

.dss-chart-item {
  background: rgba(8, 15, 39, 0.4);
  border: 1px solid rgba(12, 196, 204, 0.2);
  border-radius: 6px;
  padding: 12px;
}

@media screen and (max-width: 800px) {
  .dss-spreading-charts {
    grid-template-columns: 1fr;
  }
}

/* DSSS指标分组样式 */
.dss-metric-group {
  margin-bottom: 20px;
  padding: 12px;
  background: rgba(8, 15, 39, 0.5);
  border-left: 3px solid #0cc4cc;
  border-radius: 4px;
}

.dss-metric-group-title {
  color: #0cc4cc;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(12, 196, 204, 0.2);
}

/* 模型类型标识样式 */
.model-type-badge {
  position: absolute;
  top: 10px;
  right: 15px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.8), rgba(76, 175, 80, 0.6));
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* 信道数据视图样式 */
.channel-view {
  padding: 0;
}

.channel-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%);
  border-bottom: 1px solid rgba(33, 150, 243, 0.2);
  margin-bottom: 16px;
}

.channel-title {
  display: flex;
  align-items: center;
  color: #2196f3;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
}

.channel-tabs {
  padding: 0 16px;
}

.channel-tabs :deep(.el-tabs__header) {
  margin: 0 0 16px 0;
}

.channel-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: rgba(33, 150, 243, 0.2);
}

.channel-tabs :deep(.el-tabs__item) {
  color: #a5d6a7;
  font-size: 13px;
  padding: 0 16px;
}

.channel-tabs :deep(.el-tabs__item:hover) {
  color: #2196f3;
}

.channel-tabs :deep(.el-tabs__item.is-active) {
  color: #2196f3;
  font-weight: 600;
}

.channel-tabs :deep(.el-tabs__active-bar) {
  background-color: #2196f3;
}

.channel-chart-item {
  background: rgba(8, 15, 39, 0.3);
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 16px;
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.model-type-badge {
  display: inline-block;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.6), rgba(33, 150, 243, 0.8));
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 信道模式下的面板样式调整 */
.emane-panel.channel-mode {
  width: min(520px, calc(100vw - 40px));
  max-height: min(88vh, 760px);
}

.emane-panel.channel-mode .neo-infobox-content {
  padding: 0;
  max-height: calc(min(88vh, 760px) - 60px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(33, 150, 243, 0.6) rgba(8, 15, 39, 0.35);
}

.emane-panel.channel-mode .neo-infobox-content::-webkit-scrollbar {
  display: block;
  width: 8px;
}

.emane-panel.channel-mode .neo-infobox-content::-webkit-scrollbar-track {
  background: rgba(8, 15, 39, 0.35);
  border-radius: 8px;
}

.emane-panel.channel-mode .neo-infobox-content::-webkit-scrollbar-thumb {
  background: rgba(33, 150, 243, 0.55);
  border-radius: 8px;
}

.emane-panel.channel-mode .neo-infobox-content::-webkit-scrollbar-thumb:hover {
  background: rgba(33, 150, 243, 0.8);
}

/* 连续数据流动效果 */
@keyframes data-flow {
  0% { transform: translateX(-10px); opacity: 0.5; }
  50% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(10px); opacity: 0.5; }
}

.chart-container.streaming {
  animation: data-flow 2s ease-in-out infinite;
}

/* 跳频序列特殊样式 */
.hop-sequence-indicator {
  position: absolute;
  top: 50px;
  right: 15px;
  background: rgba(255, 152, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
  z-index: 10;
}
</style>
