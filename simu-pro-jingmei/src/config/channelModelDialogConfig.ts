/**
 * 信道模型配置对话框的差异化配置注册表
 * 将 10 个几乎完全相同的对话框组件整合为数据驱动的单一组件
 */

export interface SelectOption {
  label: string
  value: string
}

interface MultipathConfig {
  power_db: number
  delay_us: number
  freq_offset: number
  snr_db?: number
}

export interface ChannelModelDialogConfig {
  /** 模型类型标识 */
  modelType: string
  /** 对应 channelModelPresets 中的 preset key */
  presetKey: string

  /** 对话框标题 */
  title: string
  /** 主题色 (用于 CSS 变量) */
  themeColor: string
  /** 渐变次色 */
  themeColorSecondary: string
  /** 确认按钮深色 */
  confirmColorDark: string

  /** 第一个 section 类型: mode(跳频/定频) 或 modulation(调制方式) */
  firstSection: 'mode' | 'modulation'
  /** 调制方式选项 (仅 firstSection='modulation' 时使用) */
  modulationOptions: SelectOption[]
  /** 编码方式选项 */
  codingOptions: SelectOption[]

  /** 工作频率范围 */
  freqRange: { min: number; max: number }
  /** 频率输入框 placeholder */
  freqPlaceholder: string
  /** 频率范围校验失败提示 (为空则不做范围校验) */
  freqValidationMsg: string

  /** 默认表单值 */
  defaults: {
    mode?: 'hopping' | 'fixed'
    adaptive?: boolean
    modulation_type?: string | number
    txPower: number
    centerFreq: number
    k_factor?: number
    speed?: number
    transmissionDelay?: number
    networkTransmissionRateBps?: number
    samplingRate?: number
    snr_db?: number
    noiseFigureDb?: number
    shadowFadingDb?: number
    seed?: number
    multipath?: MultipathConfig[]
    satAltKm?: number
    radialVelocityMps?: number
    downlinkTxPowerDbw?: number
    bandwidthMHz?: number
    rainRateMmh?: number
    maxRetransmissions?: number
    dataRateKbps?: number
    codingScheme: string
    codeRate: string
  }

  /** 节点名前缀 */
  nodePrefix: string
  /** 节点别名前缀 */
  nodeAliasPrefix: string
  /** 物理层类型 */
  phyType: string
}

// ---------- 公共选项 ----------

const STANDARD_CODING: SelectOption[] = [
  { label: '卷积码', value: 'convolutional' },
  { label: 'LDPC编码', value: 'ldpc' },
  { label: 'Turbo码', value: 'turbo' },
  { label: 'BCH编码', value: 'bch' },
]

const FIVEG_CODING: SelectOption[] = [
  { label: '卷积码', value: 'convolutional' },
  { label: 'LDPC编码', value: 'ldpc' },
  { label: 'Turbo码', value: 'turbo' },
  { label: '极化码', value: 'polar' },
]

const MODULATION_3: SelectOption[] = [
  { label: 'BPSK', value: '1' },
  { label: 'QPSK', value: '2' },
  { label: '16QAM', value: '3' },
]

const MODULATION_DSS: SelectOption[] = [
  { label: 'SSB', value: '1' },
  { label: 'BPSK', value: '2' },
  { label: 'FSK', value: '3' },
]

const MODULATION_VHF_UHF: SelectOption[] = [
  { label: 'FSK', value: 0 },
  { label: 'GMSK', value: 1 },
  { label: 'QPSK', value: 2 },
  { label: '16QAM', value: 3 },
];

const MODULATION_UHF: SelectOption[] = [
  { label: 'FSK', value: 0 },
  { label: 'GMSK', value: 1 },
  { label: 'QPSK', value: 2 },
  { label: '16QAM', value: 3 },
];

const MODULATION_5G: SelectOption[] = [
  { label: 'QPSK', value: '2' },
  { label: '16QAM', value: '4' },
]

const MODULATION_FHSS: SelectOption[] = [
  { label: 'AM', value: '1' },
  { label: 'SSB', value: '2' },
  { label: '2FSK', value: '3' },
]

// ---------- 10 种信道模型配置 ----------

const CHANNEL_MODEL_CONFIGS: ChannelModelDialogConfig[] = [
  {
    modelType: 'ttc',
    presetKey: 'TT_LINK',
    title: '测控链信道模型配置',
    themeColor: '#ffaa00',
    themeColorSecondary: '#ff6600',
    confirmColorDark: '#cc6600',
    firstSection: 'mode',
    modulationOptions: [],
    codingOptions: STANDARD_CODING,
    freqRange: { min: 1350, max: 1710 },
    freqPlaceholder: '1350-1710',
    freqValidationMsg: '测控链工作频率必须在1350-1710MHz范围内',
    defaults: {
      mode: 'hopping',
      adaptive: true,
      txPower: 43.0,
      centerFreq: 1550,
      k_factor: 10.0,
      speed: 300.0,
      samplingRate: 4000000,
      dataRateKbps: 2000,
      multipath: [
        { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
        { power_db: -3.0, delay_us: 0.5, freq_offset: 30.0 },
        { power_db: -8.0, delay_us: 2.0, freq_offset: -50.0 },
      ],
      codingScheme: 'convolutional',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-ttc-',
    nodeAliasPrefix: '测控链',
    phyType: 'ttc',
  },
  {
    modelType: 'coordination',
    presetKey: 'COOP_LINK',
    title: '协同链信道模型配置',
    themeColor: '#9664ff',
    themeColorSecondary: '#7850dd',
    confirmColorDark: '#6a3fcc',
    firstSection: 'mode',
    modulationOptions: [],
    codingOptions: STANDARD_CODING,
    freqRange: { min: 225, max: 700 },
    freqPlaceholder: '225-700',
    freqValidationMsg: '协同链工作频率必须在225-700MHz范围内',
    defaults: {
      mode: 'hopping',
      adaptive: true,
      txPower: 43.0,
      centerFreq: 462,
      k_factor: 10.0,
      speed: 300.0,
      samplingRate: 4000000,
      dataRateKbps: 2000,
      multipath: [
        { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
        { power_db: -3.0, delay_us: 0.5, freq_offset: 30.0 },
        { power_db: -8.0, delay_us: 2.0, freq_offset: -50.0 },
      ],
      codingScheme: 'convolutional',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-coordination-',
    nodeAliasPrefix: '协同链',
    phyType: 'coordination',
  },
  {
    modelType: 'adhoc',
    presetKey: 'AD_HOC',
    title: '自组网信道模型配置',
    themeColor: '#00c896',
    themeColorSecondary: '#00a080',
    confirmColorDark: '#008866',
    firstSection: 'mode',
    modulationOptions: [],
    codingOptions: STANDARD_CODING,
    freqRange: { min: 225, max: 700 },
    freqPlaceholder: '225-700',
    freqValidationMsg: '自组网工作频率必须在225-700MHz范围内',
    defaults: {
      mode: 'hopping',
      adaptive: true,
      txPower: 30.0,
      centerFreq: 462,
      k_factor: 10.0,
      speed: 300.0,
      samplingRate: 4000000,
      dataRateKbps: 2000,
      multipath: [
        { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
        { power_db: -3.0, delay_us: 0.5, freq_offset: 30.0 },
        { power_db: -8.0, delay_us: 2.0, freq_offset: -50.0 },
      ],
      codingScheme: 'convolutional',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-adhoc-',
    nodeAliasPrefix: '自组网',
    phyType: 'adhoc',
  },
  {
    modelType: 'vhf',
    presetKey: 'VHF',
    title: 'VHF信道模型配置',
    themeColor: '#4caf50',
    themeColorSecondary: '#81c784',
    confirmColorDark: '#388e3c',
    firstSection: 'modulation',
    modulationOptions: MODULATION_VHF_UHF,
    codingOptions: STANDARD_CODING,
    freqRange: { min: 30, max: 300 },
    freqPlaceholder: '30-300 (VHF频段)',
    freqValidationMsg: 'VHF工作频率必须在30-300MHz范围内',
    defaults: {
      modulation_type: 2,
      txPower: 30.0,
      centerFreq: 150,
      k_factor: 10.0,
      speed: 20.0,
      samplingRate: 200000,
      snr_db: 20.0,
      multipath: [
        { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
        { power_db: -3.0, delay_us: 5.0, freq_offset: 50.0 },
        { power_db: -6.0, delay_us: 10.0, freq_offset: -20.0 },
      ],
      codingScheme: 'convolutional',
      codeRate: '1/2',
      dataRateKbps: 13.0,
    },
    nodePrefix: 'channel-vhf-',
    nodeAliasPrefix: 'VHF',
    phyType: 'vhf',
  },
  {
    modelType: 'uhf',
    presetKey: 'UHF',
    title: 'UHF信道模型配置',
    themeColor: '#4caf50',
    themeColorSecondary: '#81c784',
    confirmColorDark: '#388e3c',
    firstSection: 'modulation',
    modulationOptions: MODULATION_UHF,
    codingOptions: STANDARD_CODING,
    freqRange: { min: 300, max: 3000 },
    freqPlaceholder: '300-3000 (UHF频段)',
    freqValidationMsg: 'UHF工作频率必须在300-3000MHz范围内',
    defaults: {
      modulation_type: 2,
      txPower: 30.0,
      centerFreq: 1500,
      k_factor: 10.0,
      speed: 20.0,
      samplingRate: 200000,
      snr_db: 20.0,
      multipath: [
        { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
        { power_db: -3.0, delay_us: 5.0, freq_offset: 50.0 },
        { power_db: -6.0, delay_us: 10.0, freq_offset: -20.0 },
      ],
      codingScheme: 'convolutional',
      codeRate: '1/2',
      dataRateKbps: 13.0,
    },
    nodePrefix: 'channel-uhf-',
    nodeAliasPrefix: 'UHF',
    phyType: 'uhf',
  },
  {
    modelType: 'fiveG',
    presetKey: 'FiveG',
    title: '5G信道模型配置',
    themeColor: '#2563eb',
    themeColorSecondary: '#3b82f6',
    confirmColorDark: '#1d4ed8',
    firstSection: 'modulation',
    modulationOptions: MODULATION_5G,
    codingOptions: FIVEG_CODING,
    freqRange: { min: 600, max: 39000 },
    freqPlaceholder: '600-39000 (5G频段)',
    freqValidationMsg: '5G工作频率必须在600-39000MHz范围内',
    defaults: {
      modulation_type: '2',
      txPower: 30.0,
      centerFreq: 3500,
      k_factor: 3.0,
      speed: 10.0,
      samplingRate: 30720000,
      dataRateKbps: 130000.0,
      multipath: [
        { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0, snr_db: 0 },
        { power_db: -3.0, delay_us: 0.2, freq_offset: 80.0, snr_db: 0 },
        { power_db: -8.0, delay_us: 0.8, freq_offset: -120.0, snr_db: 0 },
      ],
      codingScheme: 'ldpc',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-fiveG-',
    nodeAliasPrefix: '5G',
    phyType: 'fiveG',
  },
  {
    modelType: 'dss',
    presetKey: 'DSSS',
    title: '短波信道模型配置',
    themeColor: '#0cc4cc',
    themeColorSecondary: '#00a8ff',
    confirmColorDark: '#105f95',
    firstSection: 'modulation',
    modulationOptions: MODULATION_DSS,
    codingOptions: STANDARD_CODING,
    freqRange: { min: 0, max: 50000 },
    freqPlaceholder: '0-50000',
    freqValidationMsg: '',
    defaults: {
      mode: 'fixed',
      adaptive: false,
      modulation_type: '1',
      txPower: 43.0,
      centerFreq: 7,
      k_factor: 5.0,
      speed: 10.0,
      transmissionDelay: 10.0,
      networkTransmissionRateBps: 1000.0,
      satAltKm: 35786.0,
      radialVelocityMps: 2.0,
      downlinkTxPowerDbw: 10.0,
      bandwidthMHz: 36.0,
      rainRateMmh: 0.0,
      maxRetransmissions: 0,
      codingScheme: 'convolutional',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-dsss-',
    nodeAliasPrefix: '短波',
    phyType: 'dss',
  },
  {
    modelType: 'fhss',
    presetKey: 'FHSS',
    title: '中长波信道模型配置',
    themeColor: '#0cc4cc',
    themeColorSecondary: '#00a8ff',
    confirmColorDark: '#105f95',
    firstSection: 'modulation',
    modulationOptions: MODULATION_FHSS,
    codingOptions: STANDARD_CODING,
    freqRange: { min: 0, max: 50000 },
    freqPlaceholder: '0-50000',
    freqValidationMsg: '',
    defaults: {
      modulation_type: '2',
      txPower: 30.0,
      centerFreq: 2437,
      k_factor: 10.0,
      speed: 30.0,
      noiseFigureDb: 7.0,
      shadowFadingDb: 2.5,
      seed: 1234,
      codingScheme: 'convolutional',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-fhss-',
    nodeAliasPrefix: '中长波',
    phyType: 'fhss',
  },
  {
    modelType: 'gmsk',
    presetKey: 'GMSK',
    title: '散射信道模型配置',
    themeColor: '#0cc4cc',
    themeColorSecondary: '#00a8ff',
    confirmColorDark: '#105f95',
    firstSection: 'modulation',
    modulationOptions: MODULATION_3,
    codingOptions: STANDARD_CODING,
    freqRange: { min: 0, max: 50000 },
    freqPlaceholder: '0-50000',
    freqValidationMsg: '',
    defaults: {
      modulation_type: '2',
      txPower: 30.0,
      centerFreq: 2437,
      k_factor: 10.0,
      codingScheme: 'convolutional',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-gmsk-',
    nodeAliasPrefix: '散射',
    phyType: 'gmsk',
  },
  {
    modelType: 'gfsk',
    presetKey: 'GFSK',
    title: '卫星信道模型配置',
    themeColor: '#ff8c00',
    themeColorSecondary: '#ff6600',
    confirmColorDark: '#cc6600',
    firstSection: 'modulation',
    modulationOptions: MODULATION_3,
    codingOptions: STANDARD_CODING,
    freqRange: { min: 0, max: 50000 },
    freqPlaceholder: '0-50000',
    freqValidationMsg: '',
    defaults: {
      modulation_type: '2',
      txPower: 10.0,
      centerFreq: 14000,
      k_factor: -1.0,
      satAltKm: 35786.0,
      radialVelocityMps: 0.0,
      downlinkTxPowerDbw: 10.0,
      bandwidthMHz: 36.0,
      rainRateMmh: 0.0,
      maxRetransmissions: 0,
      codingScheme: 'convolutional',
      codeRate: '1/2',
    },
    nodePrefix: 'channel-gfsk-',
    nodeAliasPrefix: '卫星',
    phyType: 'gfsk',
  },
]

/** 按 modelType 索引的配置表 */
const CONFIG_MAP = new Map<string, ChannelModelDialogConfig>(
  CHANNEL_MODEL_CONFIGS.map(c => [c.modelType, c])
)

/** 按 presetKey 索引的配置表 (用于从 channelModel 预设键查找) */
const PRESET_KEY_MAP = new Map<string, ChannelModelDialogConfig>(
  CHANNEL_MODEL_CONFIGS.map(c => [c.presetKey, c])
)

/** 根据模型类型获取对话框配置 */
export function getDialogConfig(modelType: string): ChannelModelDialogConfig | undefined {
  return CONFIG_MAP.get(modelType)
}

/** 根据预设键获取对话框配置 (用于 Cesium.vue 中 channelModel → modelType 的映射) */
export function getDialogConfigByPresetKey(presetKey: string): ChannelModelDialogConfig | undefined {
  return PRESET_KEY_MAP.get(presetKey)
}

/** 获取所有已注册的模型类型 */
export function getAllModelTypes(): string[] {
  return CHANNEL_MODEL_CONFIGS.map(c => c.modelType)
}

/** 统一的表单数据类型 */
export interface ChannelModelFormData {
  mode?: 'hopping' | 'fixed'
  adaptive?: boolean
  modulation_type?: string
  txPower: number
  centerFreq: number
  k_factor: number
  speed?: number
  networkTransmissionRateBps?: number
  samplingRate?: number
  snr_db?: number
  noiseFigureDb?: number
  shadowFadingDb?: number
  seed?: number
  multipath?: MultipathConfig[]
  transmissionDelay: number
  dataRateKbps?: number
  codingScheme: string
  codeRate: string
  height: number
  satAltKm?: number
  radialVelocityMps?: number
  downlinkTxPowerDbw?: number
  bandwidthMHz?: number
  rainRateMmh?: number
  maxRetransmissions?: number
}
