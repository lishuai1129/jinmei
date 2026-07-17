<template>
  <div
    class="neo-infobox satellite-panel"
    v-if="link"
    :class="{ 'chart-mode': currentView === 'chart' }"
    :style="{
      left: position.left + 'px',
      top: position.top + 'px',
      width: panelSize.width + 'px',
      height: panelSize.height + 'px'
    }"
  >
    <div class="neo-infobox-header" @mousedown="startDrag">
      <span class="neo-infobox-title">
        <svg class="panel-icon" width="18" height="18" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="3" fill="#00bcd4" />
          <circle cx="12" cy="19" r="3" fill="#00e5ff" />
          <path d="M12 8 L12 16" stroke="#00bcd4" stroke-width="2" stroke-dasharray="3,2" />
        </svg>
        UE-卫星链路监控
      </span>
      <span class="neo-infobox-close" @click.stop="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <line x1="5" y1="5" x2="15" y2="15" stroke="#80deea" stroke-width="2" stroke-linecap="round"/>
          <line x1="15" y1="5" x2="5" y2="15" stroke="#80deea" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
    </div>

    <div class="neo-infobox-content">
      <!-- 加载状态 -->
      <div v-if="!hasData" class="loading-indicator">
        <div class="loading-spinner"></div>
        <span>等待链路数据...</span>
      </div>

      <template v-else>
        <!-- 链路信息 -->
        <div class="link-info">
          <div class="node-info-block">
            <div class="node-info-title">链路信息</div>
            <div class="neo-grid">
              <div class="neo-grid-item">
                <div class="item-label">UE节点</div>
                <div class="item-value highlight">{{ sourceNodeName }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">卫星基站</div>
                <div class="item-value highlight">{{ targetNodeName }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 视图切换 -->
        <div class="view-toggle">
          <el-radio-group v-model="currentView" size="small">
            <el-radio-button label="table">表格视图</el-radio-button>
            <el-radio-button label="chart">图表视图</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 表格视图 -->
        <div v-if="currentView === 'table'">
          <div class="neo-section">
            <div class="neo-section-title">
              <svg width="16" height="16" style="margin-right:4px;">
                <circle cx="8" cy="8" r="7" fill="#00bcd4" fill-opacity="0.18"/>
              </svg>
              信道指标
            </div>
            <div class="neo-grid">
              <div class="neo-grid-item">
                <div class="item-label">误码率 (BER)</div>
                <div class="item-value highlight">{{ formatPercent(linkData?.metrics?.ber) }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">比特错误数</div>
                <div class="item-value">{{ linkData?.metrics?.bit_error_count ?? 'N/A' }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">总比特数</div>
                <div class="item-value">{{ linkData?.metrics?.total_bits ?? 'N/A' }}</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">传输延迟</div>
                <div class="item-value">{{ linkData?.metrics?.delay_ms ?? 'N/A' }} ms</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">多普勒频移</div>
                <div class="item-value highlight">{{ formatNumber(linkData?.metrics?.doppler_shift_hz) }} Hz</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">衰落损耗</div>
                <div class="item-value">{{ formatNumber(linkData?.metrics?.fading_loss_db, 4) }} dB</div>
              </div>
            </div>
          </div>

          <div class="neo-section">
            <div class="neo-section-title">
              <svg width="16" height="16" style="margin-right:4px;">
                <circle cx="8" cy="8" r="7" fill="#00bcd4" fill-opacity="0.18"/>
              </svg>
              功率指标
            </div>
            <div class="neo-grid">
              <div class="neo-grid-item">
                <div class="item-label">信号功率</div>
                <div class="item-value highlight">{{ formatPower(linkData?.metrics?.signal_power) }} W</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">噪声功率</div>
                <div class="item-value">{{ formatPower(linkData?.metrics?.noise_power) }} W</div>
              </div>
              <div class="neo-grid-item">
                <div class="item-label">干扰功率</div>
                <div class="item-value">{{ formatPower(linkData?.metrics?.interference_power) }} W</div>
              </div>
            </div>
          </div>

          <!-- 指标趋势折线图 -->
          <div class="neo-section">
            <div class="neo-section-title">
              <svg width="16" height="16" style="margin-right:4px;">
                <circle cx="8" cy="8" r="7" fill="#00bcd4" fill-opacity="0.18"/>
              </svg>
              指标趋势
            </div>
            <div class="chart-container metrics-chart" ref="metricsChartRef"></div>
          </div>
        </div>

        <!-- 图表视图 -->
        <div v-if="currentView === 'chart'" class="chart-view">
          <div class="chart-tabs">
            <el-tabs v-model="activeChartTab" @tab-change="handleChartTabChange">
              <!-- QAM星座图 -->
              <el-tab-pane label="星座图" name="qam">
                <div class="chart-section">
                  <div class="chart-title">QAM 星座图</div>
                  <div ref="qamChartRef" class="chart-container"></div>
                </div>
              </el-tab-pane>

              <!-- 波形图 (输入/输出) -->
              <el-tab-pane label="波形图" name="waveform">
                <div class="chart-section dual-section">
                  <div class="chart-panel">
                    <div class="chart-title">
                      <span class="title-dot input"></span>
                      输入数据 (num_in)
                    </div>
                    <div ref="numInChartRef" class="chart-container-half"></div>
                  </div>
                  <div class="chart-panel">
                    <div class="chart-title">
                      <span class="title-dot output"></span>
                      输出数据 (de_scram_out)
                    </div>
                    <div ref="deScramChartRef" class="chart-container-half"></div>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 云图 -->
              <el-tab-pane label="云图" name="cloud">
                <div class="chart-section">
                  <div class="chart-title">过信道后数据 (de_sfo_comp)</div>
                  <div ref="cloudChartRef" class="chart-container"></div>
                </div>
              </el-tab-pane>

              <!-- 频谱图 -->
              <el-tab-pane label="频谱图" name="spectrum">
                <div class="chart-section">
                  <div class="chart-title">过信道后数据 (de_interFrq_out)</div>
                  <div ref="spectrumChartRef" class="chart-container"></div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>
      </template>
    </div>

    <!-- 调整大小手柄 -->
    <div class="resize-handle" @mousedown="startResize">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="#80deea" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useTopoStore } from '../../../store/modules/topo';
import * as echarts from 'echarts';
import websocketService from '../../../services/websocket';
import type { Node } from '../../../types/topo';

interface LinkData {
  metrics: {
    ber: number;
    bit_error_count: number;
    delay_ms: number;
    doppler_shift_hz: number;
    fading_loss_db: number;
    interference_power: number;
    noise_power: number;
    signal_power: number;
    total_bits: number;
  };
  step_data: {
    qam_mapped: Array<{ real: number; imag: number }>;
    num_in_240_200: number[];
    de_scram_out_240_200: number[];
    de_sfo_comp: Array<{ real: number; imag: number }>;
    de_interFrq_out: Array<{ real: number; imag: number }>;
  };
  node_id: number;
  session_id: number;
}

const props = defineProps<{
  link: any;
}>();

const emit = defineEmits(['close']);

const topoStore = useTopoStore();

// 状态
const linkData = ref<LinkData | null>(null);
const metricsHistory = ref<Array<{ timestamp: Date; metrics: LinkData['metrics'] }>>([]);
const currentView = ref<'table' | 'chart'>('table');
const activeChartTab = ref('qam');

// 拖动相关状态 - 初始位置左下角
const position = reactive({ left: 20, top: window.innerHeight - 500 });
const isDragging = ref(false);
const dragOffset = reactive({ x: 0, y: 0 });

// 面板大小状态
const panelSize = reactive({ width: 420, height: 500 });
const isResizing = ref(false);
const resizeStart = reactive({ x: 0, y: 0, width: 0, height: 0 });

// 最小/最大尺寸限制
const MIN_WIDTH = 350;
const MAX_WIDTH = 900;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = window.innerHeight - 50;

// 图表引用
const metricsChartRef = ref<HTMLElement | null>(null);
const qamChartRef = ref<HTMLElement | null>(null);
const numInChartRef = ref<HTMLElement | null>(null);
const deScramChartRef = ref<HTMLElement | null>(null);
const cloudChartRef = ref<HTMLElement | null>(null);
const spectrumChartRef = ref<HTMLElement | null>(null);

// 图表实例
let metricsChart: echarts.ECharts | null = null;
let qamChart: echarts.ECharts | null = null;
let numInChart: echarts.ECharts | null = null;
let deScramChart: echarts.ECharts | null = null;
let cloudChart: echarts.ECharts | null = null;
let spectrumChart: echarts.ECharts | null = null;

// 计算属性
const sourceNodeName = computed(() => {
  if (!topoStore.topoData?.nodes) return '未知';
  const node = topoStore.topoData.nodes.find((n: Node) => n.id === props.link?.node1_id);
  return node ? (node.alias || node.name) : '未知';
});

const targetNodeName = computed(() => {
  if (!topoStore.topoData?.nodes) return '未知';
  const node = topoStore.topoData.nodes.find((n: Node) => n.id === props.link?.node2_id);
  return node ? (node.alias || node.name) : '未知';
});

const hasData = computed(() => linkData.value !== null);

// 格式化函数
const formatNumber = (value: number | undefined, decimals: number = 2): string => {
  if (value === undefined || value === null) return 'N/A';
  return value.toFixed(decimals);
};

const formatPercent = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  return (value * 100).toFixed(2) + '%';
};

const formatPower = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A';
  if (value < 0.001) return value.toExponential(3);
  return value.toFixed(4);
};

// 图表更新节流控制
let chartUpdateTimer: ReturnType<typeof setTimeout> | null = null;
const CHART_UPDATE_INTERVAL = 800; // 图表更新间隔 800ms，确保动画有足够时间完成

// WebSocket消息处理
const handleAction4Message = (data: any) => {
  if (!data || (data.action !== undefined && data.action !== 4)) return;

  const nodeId = data.node_id;
  if (!props.link) return;

  if (nodeId !== props.link.node1_id && nodeId !== props.link.node2_id) {
    return;
  }

  // 处理metrics数据：比特错误数/10，误码率重新计算
  let processedMetrics = data.metrics;
  if (data.metrics) {
    const originalBitErrorCount = data.metrics.bit_error_count || 0;
    const totalBits = data.metrics.total_bits || 1; // 避免除以0
    const newBitErrorCount = Math.floor(originalBitErrorCount / 10);
    const newBer = totalBits > 0 ? newBitErrorCount / totalBits : 0;

    processedMetrics = {
      ...data.metrics,
      bit_error_count: newBitErrorCount,
      ber: newBer,
    };
  }

  linkData.value = {
    metrics: processedMetrics,
    step_data: data.step_data,
    node_id: data.node_id,
    session_id: data.session_id,
  };

  // 保存历史数据
  if (processedMetrics) {
    metricsHistory.value.push({
      timestamp: new Date(),
      metrics: processedMetrics,
    });
    // 保留更多历史数据以显示连续变化
    if (metricsHistory.value.length > 60) {
      metricsHistory.value = metricsHistory.value.slice(-60);
    }
  }

  // 节流更新图表，避免更新过于频繁导致动画跳变
  if (!chartUpdateTimer) {
    chartUpdateTimer = setTimeout(() => {
      chartUpdateTimer = null;
      nextTick(() => {
        updateCharts();
      });
    }, CHART_UPDATE_INTERVAL);
  }
};

// 图表Tab切换
const handleChartTabChange = () => {
  nextTick(() => {
    initCurrentChart();
  });
};

// 初始化当前Tab的图表
const initCurrentChart = () => {
  switch (activeChartTab.value) {
    case 'qam':
      initQamChart();
      break;
    case 'waveform':
      initWaveformCharts();
      break;
    case 'cloud':
      initCloudChart();
      break;
    case 'spectrum':
      initSpectrumChart();
      break;
  }
};

// 更新所有可见图表
const updateCharts = () => {
  if (currentView.value === 'table') {
    updateMetricsChart();
  } else {
    updateCurrentChart();
  }
};

// 更新当前Tab的图表数据（不重新初始化）
const updateCurrentChart = () => {
  switch (activeChartTab.value) {
    case 'qam':
      updateQamChart();
      break;
    case 'waveform':
      updateWaveformCharts();
      break;
    case 'cloud':
      updateCloudChart();
      break;
    case 'spectrum':
      updateSpectrumChart();
      break;
  }
};

// 指标趋势图
const initMetricsChart = () => {
  if (!metricsChartRef.value) return;
  if (metricsChart) metricsChart.dispose();
  metricsChart = echarts.init(metricsChartRef.value);
  updateMetricsChart();
};

const updateMetricsChart = () => {
  if (!metricsChart || metricsHistory.value.length === 0) return;

  const times = metricsHistory.value.map((h, i) => i + 1);

  metricsChart.setOption({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 700,
    animationEasingUpdate: 'linear',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: 'rgba(0, 188, 212, 0.3)',
      textStyle: { color: '#e0f7fa' }
    },
    legend: {
      data: ['BER (%)', '信号功率', '多普勒频移'],
      textStyle: { color: '#80deea', fontSize: 11 },
      top: 5
    },
    grid: { left: '8%', right: '8%', bottom: '12%', top: '18%' },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { color: '#80deea', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.3)' } },
      splitLine: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: 'BER(%)',
        nameTextStyle: { color: '#80deea', fontSize: 10 },
        axisLabel: { color: '#80deea', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.1)' } }
      }
    ],
    series: [
      {
        name: 'BER (%)',
        type: 'line',
        smooth: 0.6,
        symbol: 'none',
        sampling: 'lttb',
        data: metricsHistory.value.map(h => (h.metrics.ber * 100).toFixed(2)),
        lineStyle: { color: '#ff6b6b', width: 2 },
        itemStyle: { color: '#ff6b6b' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0)' }
          ])
        }
      }
    ]
  });
};

// QAM星座图
const initQamChart = () => {
  if (!qamChartRef.value) return;
  if (!qamChart) {
    qamChart = echarts.init(qamChartRef.value);
  }
  updateQamChart();
};

const updateQamChart = () => {
  if (!qamChartRef.value || !linkData.value?.step_data?.qam_mapped) return;
  if (!qamChart) {
    qamChart = echarts.init(qamChartRef.value);
  }

  const data = linkData.value.step_data.qam_mapped.map(p => [p.real, p.imag]);

  qamChart.setOption({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 700,
    animationEasingUpdate: 'linear',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: 'rgba(0, 188, 212, 0.3)',
      formatter: (p: any) => `I: ${p.value[0].toFixed(4)}<br/>Q: ${p.value[1].toFixed(4)}`
    },
    grid: { left: '10%', right: '10%', bottom: '12%', top: '8%' },
    xAxis: {
      type: 'value',
      name: 'I (同相)',
      nameTextStyle: { color: '#80deea' },
      axisLabel: { color: '#80deea', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      name: 'Q (正交)',
      nameTextStyle: { color: '#80deea' },
      axisLabel: { color: '#80deea', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.1)' } }
    },
    series: [{
      type: 'scatter',
      data: data,
      symbolSize: 8,
      itemStyle: {
        color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
          { offset: 0, color: '#00e5ff' },
          { offset: 1, color: '#00bcd4' }
        ]),
        shadowBlur: 10,
        shadowColor: 'rgba(0, 229, 255, 0.5)'
      }
    }]
  });
};

// 波形图
const initWaveformCharts = () => {
  // 初始化输入波形图
  if (numInChartRef.value && !numInChart) {
    numInChart = echarts.init(numInChartRef.value);
  }
  // 初始化输出波形图
  if (deScramChartRef.value && !deScramChart) {
    deScramChart = echarts.init(deScramChartRef.value);
  }
  updateWaveformCharts();
};

const updateWaveformCharts = () => {
  if (!linkData.value?.step_data) return;

  // 输入波形
  if (linkData.value.step_data.num_in_240_200) {
    if (numInChartRef.value && !numInChart) {
      numInChart = echarts.init(numInChartRef.value);
    }
    if (numInChart) {
      const data = linkData.value.step_data.num_in_240_200;
      numInChart.setOption({
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 800,
        animationDurationUpdate: 700,
        animationEasingUpdate: 'linear',
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(8, 15, 39, 0.9)', borderColor: 'rgba(0, 188, 212, 0.3)' },
        grid: { left: '10%', right: '5%', bottom: '12%', top: '8%' },
        xAxis: {
          type: 'category',
          data: data.map((_, i) => i),
          axisLabel: { color: '#80deea', fontSize: 9, interval: Math.floor(data.length / 5) },
          axisLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.3)' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#80deea', fontSize: 9 },
          splitLine: { lineStyle: { color: 'rgba(0, 188, 212, 0.1)' } }
        },
        series: [{
          type: 'line',
          data: data,
          smooth: 0.3,
          symbol: 'none',
          sampling: 'lttb',
          lineStyle: { color: '#4fc3f7', width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79, 195, 247, 0.4)' },
              { offset: 1, color: 'rgba(79, 195, 247, 0)' }
            ])
          }
        }]
      });
    }
  }

  // 输出波形
  if (linkData.value.step_data.de_scram_out_240_200) {
    if (deScramChartRef.value && !deScramChart) {
      deScramChart = echarts.init(deScramChartRef.value);
    }
    if (deScramChart) {
      const data = linkData.value.step_data.de_scram_out_240_200;
      deScramChart.setOption({
        backgroundColor: 'transparent',
        animation: true,
        animationDuration: 800,
        animationDurationUpdate: 700,
        animationEasingUpdate: 'linear',
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(8, 15, 39, 0.9)', borderColor: 'rgba(156, 39, 176, 0.3)' },
        grid: { left: '10%', right: '5%', bottom: '12%', top: '8%' },
        xAxis: {
          type: 'category',
          data: data.map((_, i) => i),
          axisLabel: { color: '#80deea', fontSize: 9, interval: Math.floor(data.length / 5) },
          axisLine: { lineStyle: { color: 'rgba(156, 39, 176, 0.3)' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#80deea', fontSize: 9 },
          splitLine: { lineStyle: { color: 'rgba(156, 39, 176, 0.1)' } }
        },
        series: [{
          type: 'line',
          data: data,
          smooth: 0.3,
          symbol: 'none',
          sampling: 'lttb',
          lineStyle: { color: '#ba68c8', width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(186, 104, 200, 0.4)' },
              { offset: 1, color: 'rgba(186, 104, 200, 0)' }
            ])
          }
        }]
      });
    }
  }
};

// 云图 (散点图)
const initCloudChart = () => {
  if (!cloudChartRef.value) return;
  if (!cloudChart) {
    cloudChart = echarts.init(cloudChartRef.value);
  }
  updateCloudChart();
};

const updateCloudChart = () => {
  if (!cloudChartRef.value || !linkData.value?.step_data?.de_sfo_comp) return;
  if (!cloudChart) {
    cloudChart = echarts.init(cloudChartRef.value);
  }

  const data = linkData.value.step_data.de_sfo_comp.map(p => [p.real, p.imag]);

  cloudChart.setOption({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 700,
    animationEasingUpdate: 'linear',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: 'rgba(255, 152, 0, 0.3)',
      formatter: (p: any) => `Real: ${p.value[0].toFixed(4)}<br/>Imag: ${p.value[1].toFixed(4)}`
    },
    grid: { left: '10%', right: '10%', bottom: '12%', top: '8%' },
    xAxis: {
      type: 'value',
      name: 'Real',
      nameTextStyle: { color: '#80deea' },
      axisLabel: { color: '#80deea', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255, 152, 0, 0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(255, 152, 0, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      name: 'Imag',
      nameTextStyle: { color: '#80deea' },
      axisLabel: { color: '#80deea', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255, 152, 0, 0.3)' } },
      splitLine: { lineStyle: { color: 'rgba(255, 152, 0, 0.1)' } }
    },
    visualMap: {
      show: false,
      min: 0,
      max: data.length,
      inRange: {
        color: ['#ff9800', '#ff5722', '#f44336']
      }
    },
    series: [{
      type: 'scatter',
      data: data.map((d, i) => [...d, i]),
      symbolSize: 6,
      itemStyle: {
        shadowBlur: 8,
        shadowColor: 'rgba(255, 152, 0, 0.5)'
      }
    }]
  });
};

// 频谱图
const initSpectrumChart = () => {
  if (!spectrumChartRef.value) return;
  if (!spectrumChart) {
    spectrumChart = echarts.init(spectrumChartRef.value);
  }
  updateSpectrumChart();
};

const updateSpectrumChart = () => {
  if (!spectrumChartRef.value || !linkData.value?.step_data?.de_interFrq_out) return;
  if (!spectrumChart) {
    spectrumChart = echarts.init(spectrumChartRef.value);
  }

  const data = linkData.value.step_data.de_interFrq_out;
  const magnitude = data.map(p => Math.sqrt(p.real * p.real + p.imag * p.imag));

  spectrumChart.setOption({
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationDurationUpdate: 700,
    animationEasingUpdate: 'linear',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 15, 39, 0.9)',
      borderColor: 'rgba(76, 175, 80, 0.3)'
    },
    grid: { left: '10%', right: '5%', bottom: '12%', top: '8%' },
    xAxis: {
      type: 'category',
      name: '频点',
      nameTextStyle: { color: '#80deea' },
      data: magnitude.map((_, i) => i),
      axisLabel: { color: '#80deea', fontSize: 9, interval: Math.floor(magnitude.length / 8) },
      axisLine: { lineStyle: { color: 'rgba(76, 175, 80, 0.3)' } }
    },
    yAxis: {
      type: 'value',
      name: '幅度',
      nameTextStyle: { color: '#80deea' },
      axisLabel: { color: '#80deea', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(76, 175, 80, 0.1)' } }
    },
    series: [{
      type: 'bar',
      data: magnitude,
      barWidth: '80%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#81c784' },
          { offset: 0.5, color: '#4caf50' },
          { offset: 1, color: '#2e7d32' }
        ]),
        borderRadius: [2, 2, 0, 0]
      }
    }]
  });
};

// 监听视图切换
watch(currentView, (newView, oldView) => {
  // 切换到图表模式时，如果宽度还是默认的420，自动扩大到600
  if (newView === 'chart' && panelSize.width <= 420) {
    panelSize.width = 600;
  }
  // 切换回表格模式时，如果宽度是600（未手动调整），恢复到420
  if (newView === 'table' && oldView === 'chart' && panelSize.width === 600) {
    panelSize.width = 420;
  }
  nextTick(() => {
    if (newView === 'table') {
      initMetricsChart();
    } else {
      initCurrentChart();
    }
    // 重新调整图表大小
    handleResize();
  });
});

// 监听数据变化初始化图表
watch(hasData, (has) => {
  if (has) {
    nextTick(() => {
      if (currentView.value === 'table') {
        initMetricsChart();
      }
    });
  }
});

// 窗口大小变化
const handleResize = () => {
  metricsChart?.resize();
  qamChart?.resize();
  numInChart?.resize();
  deScramChart?.resize();
  cloudChart?.resize();
  spectrumChart?.resize();
};

// 销毁图表
const disposeAllCharts = () => {
  metricsChart?.dispose(); metricsChart = null;
  qamChart?.dispose(); qamChart = null;
  numInChart?.dispose(); numInChart = null;
  deScramChart?.dispose(); deScramChart = null;
  cloudChart?.dispose(); cloudChart = null;
  spectrumChart?.dispose(); spectrumChart = null;
};

// 拖动功能
const startDrag = (e: MouseEvent) => {
  // 如果点击的是关闭按钮，不启动拖动
  if ((e.target as HTMLElement).closest('.neo-infobox-close')) {
    return;
  }
  isDragging.value = true;
  dragOffset.x = e.clientX - position.left;
  dragOffset.y = e.clientY - position.top;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;

  const newLeft = e.clientX - dragOffset.x;
  const newTop = e.clientY - dragOffset.y;

  // 使用实际面板尺寸
  const panelWidth = panelSize.width;
  const panelHeight = panelSize.height;

  // 限制在窗口范围内
  const maxLeft = window.innerWidth - panelWidth;
  const maxTop = window.innerHeight - 100;

  position.left = Math.max(0, Math.min(newLeft, maxLeft));
  position.top = Math.max(0, Math.min(newTop, maxTop));
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 调整大小功能
const startResize = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = true;
  resizeStart.x = e.clientX;
  resizeStart.y = e.clientY;
  resizeStart.width = panelSize.width;
  resizeStart.height = panelSize.height;
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
};

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return;

  const deltaX = e.clientX - resizeStart.x;
  const deltaY = e.clientY - resizeStart.y;

  const newWidth = Math.max(MIN_WIDTH, Math.min(resizeStart.width + deltaX, MAX_WIDTH));
  const newHeight = Math.max(MIN_HEIGHT, Math.min(resizeStart.height + deltaY, MAX_HEIGHT));

  panelSize.width = newWidth;
  panelSize.height = newHeight;

  // 调整大小时重新设置图表尺寸
  nextTick(() => {
    handleResize();
  });
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
};

// 初始化位置到左下角
const initPosition = () => {
  position.left = 20;
  position.top = window.innerHeight - 520;
};

onMounted(() => {
  initPosition();
  websocketService.onMessage('action_4', handleAction4Message);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  websocketService.offMessage('action_4', handleAction4Message);
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
  // 清理图表更新定时器
  if (chartUpdateTimer) {
    clearTimeout(chartUpdateTimer);
    chartUpdateTimer = null;
  }
  disposeAllCharts();
});
</script>

<style scoped>
.neo-infobox.satellite-panel {
  position: fixed;
  z-index: 11;
  min-width: 350px;
  max-width: 900px;
  background: linear-gradient(135deg, rgba(8, 15, 39, 0.95) 0%, rgba(0, 50, 80, 0.98) 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 188, 212, 0.15);
  border: 1px solid rgba(0, 188, 212, 0.3);
  color: white;
  backdrop-filter: blur(12px);
  animation: panel-appear 0.3s ease-out;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.neo-infobox.satellite-panel.chart-mode {
  /* 图表模式可以更宽 - 由用户手动调整 */
}

@keyframes panel-appear {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.neo-infobox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(90deg, rgba(0, 188, 212, 0.35) 0%, rgba(0, 188, 212, 0.15) 100%);
  border-bottom: 1px solid rgba(0, 188, 212, 0.3);
  cursor: move;
  user-select: none;
}

.neo-infobox-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #00e5ff;
}

.neo-infobox-close {
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 188, 212, 0.1);
  transition: all 0.2s ease;
}

.neo-infobox-close:hover {
  background: rgba(0, 188, 212, 0.3);
  transform: rotate(90deg);
}

.neo-infobox-content {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}

/* 加载状态 */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #80deea;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 188, 212, 0.2);
  border-radius: 50%;
  border-top-color: #00bcd4;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 链路信息 */
.link-info {
  margin-bottom: 14px;
}

.node-info-block {
  background: rgba(0, 188, 212, 0.06);
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid rgba(0, 188, 212, 0.5);
}

.node-info-title {
  font-size: 13px;
  color: #00bcd4;
  margin-bottom: 10px;
  font-weight: 500;
}

/* 视图切换 */
.view-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.view-toggle :deep(.el-radio-button__inner) {
  background-color: rgba(0, 40, 60, 0.4);
  border-color: rgba(0, 188, 212, 0.4);
  color: #80deea;
  font-size: 12px;
  padding: 6px 16px;
}

.view-toggle :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: rgba(0, 188, 212, 0.5);
  border-color: rgba(0, 188, 212, 0.6);
  color: #ffffff;
}

/* Neo Grid */
.neo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.neo-grid-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(0, 188, 212, 0.1);
}

.item-label {
  color: #80deea;
  font-size: 11px;
  margin-bottom: 3px;
}

.item-value {
  color: #e0f7fa;
  font-size: 13px;
  font-weight: 500;
}

.item-value.highlight {
  color: #00e5ff;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.4);
}

/* Neo Section */
.neo-section {
  margin-bottom: 14px;
}

.neo-section-title {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #00bcd4;
}

/* 图表容器 */
.chart-container {
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(8, 15, 39, 0.4);
  border: 1px solid rgba(0, 188, 212, 0.1);
}

.metrics-chart {
  height: 180px;
}

/* 图表视图 */
.chart-view {
  animation: fade-in 0.3s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.chart-tabs {
  background: rgba(8, 15, 39, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(0, 188, 212, 0.15);
  padding: 10px;
}

.chart-tabs :deep(.el-tabs__header) {
  background: rgba(0, 40, 60, 0.3);
  border-radius: 6px;
  margin-bottom: 10px;
  border-bottom: none;
  padding: 3px;
}

.chart-tabs :deep(.el-tabs__item) {
  color: #80deea;
  font-size: 12px;
  font-weight: 500;
  padding: 0 14px;
  height: 32px;
  line-height: 32px;
  transition: all 0.2s;
  border-radius: 4px;
}

.chart-tabs :deep(.el-tabs__item:hover) {
  background: rgba(0, 188, 212, 0.1);
  color: #00e5ff;
}

.chart-tabs :deep(.el-tabs__item.is-active) {
  color: #00e5ff;
  background: rgba(0, 188, 212, 0.2);
}

.chart-tabs :deep(.el-tabs__active-bar) {
  background-color: #00bcd4;
  height: 2px;
  border-radius: 1px;
}

.chart-tabs :deep(.el-tabs__content) {
  padding: 0;
}

.chart-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

/* 图表区块 */
.chart-section {
  padding: 8px 0;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #80deea;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 2px solid #00bcd4;
}

.title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.title-dot.input {
  background: #4fc3f7;
  box-shadow: 0 0 6px #4fc3f7;
}

.title-dot.output {
  background: #ba68c8;
  box-shadow: 0 0 6px #ba68c8;
}

/* 双图布局 */
.dual-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.chart-panel {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid rgba(0, 188, 212, 0.08);
}

.chart-container-half {
  height: 180px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(8, 15, 39, 0.3);
}

/* 响应式 */
@media screen and (max-width: 768px) {
  .neo-infobox.satellite-panel {
    width: calc(100vw - 20px);
    max-height: 70vh;
  }

  .neo-infobox.satellite-panel.chart-mode {
    width: calc(100vw - 20px);
  }

  .neo-grid {
    grid-template-columns: 1fr;
  }

  .dual-section {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 180px;
  }

  .chart-container-half {
    height: 160px;
  }
}

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(0, 188, 212, 0.1);
  transition: all 0.2s ease;
  z-index: 10;
}

.resize-handle:hover {
  background: rgba(0, 188, 212, 0.25);
}

.resize-handle:hover svg path {
  stroke: #00e5ff;
}

.resize-handle:active {
  background: rgba(0, 188, 212, 0.4);
}
</style>
