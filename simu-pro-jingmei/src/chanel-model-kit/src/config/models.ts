export type ModelType =
  | 'ttc'
  | 'coordination'
  | 'adhoc'
  | 'vhf'
  | 'uhf'
  | 'fiveG'
  | 'dss'
  | 'fhss'
  | 'gfsk'
  | 'custom'

export interface SelectOption {
  label: string
  value: string | number | boolean
}

export interface MultipathConfig {
  power_db: number
  delay_us: number
  freq_offset: number
  snr_db?: number
}

export interface ChannelModelFormData {
  modelType?: ModelType | string
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
  dataRateKbps?: number
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
  codingScheme?: string
  codeRate?: string
  height?: number
}

export interface ModelDefinition {
  type: ModelType
  backendModel: string
  presetKey: string
  displayName: string
  title: string
  themeColor: string
  frequencyUnit: 'MHz' | 'kHz'
  frequencyRange: { min: number; max: number }
  modulationOptions: SelectOption[]
  codingOptions: SelectOption[]
  supportsMode?: boolean
  supportsAdaptive?: boolean
  supportsMultipath?: boolean
  supportsSatellite?: boolean
  supportsNetwork?: boolean
  supportsNoiseSeed?: boolean
  supportsSampling?: boolean
  defaults: ChannelModelFormData
}

export const MODEL_ORDER: ModelType[] = [
  'ttc',
  'coordination',
  'adhoc',
  'vhf',
  'uhf',
  'fiveG',
  'dss',
  'fhss',
  'gfsk',
  'custom',
]

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

const MODULATION_RFPIPE: SelectOption[] = [
  { label: 'BPSK', value: 1 },
  { label: 'QPSK', value: 2 },
  { label: '16QAM', value: 3 },
]

const MODULATION_VHF_UHF: SelectOption[] = [
  { label: 'FSK', value: 0 },
  { label: 'GMSK', value: 1 },
  { label: 'QPSK', value: 2 },
  { label: '16QAM', value: 3 },
]

const MODULATION_5G: SelectOption[] = [
  { label: 'QPSK', value: 2 },
  { label: '16QAM', value: 4 },
]

const MODULATION_DSS: SelectOption[] = [
  { label: 'SSB', value: 1 },
  { label: 'BPSK', value: 2 },
  { label: 'FSK', value: 3 },
]

const MODULATION_FHSS: SelectOption[] = [
  { label: 'AM', value: 1 },
  { label: 'SSB', value: 2 },
  { label: '2FSK', value: 3 },
]

const RFPIPE_MULTIPATH: MultipathConfig[] = [
  { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
  { power_db: -3.0, delay_us: 0.5, freq_offset: 30.0 },
  { power_db: -8.0, delay_us: 2.0, freq_offset: -50.0 },
]

const VHF_UHF_MULTIPATH: MultipathConfig[] = [
  { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
  { power_db: -3.0, delay_us: 5.0, freq_offset: 50.0 },
  { power_db: -6.0, delay_us: 10.0, freq_offset: -20.0 },
]

const FIVEG_MULTIPATH: MultipathConfig[] = [
  { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
  { power_db: -3.0, delay_us: 0.2, freq_offset: 80.0 },
  { power_db: -8.0, delay_us: 0.8, freq_offset: -120.0 },
]

export const MODEL_DEFINITIONS: Record<ModelType, ModelDefinition> = {
  ttc: {
    type: 'ttc',
    backendModel: 'ckl',
    presetKey: 'TT_LINK',
    displayName: '测控链',
    title: '测控链信道模型配置',
    themeColor: '#ffaa00',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 1350, max: 1710 },
    modulationOptions: [],
    codingOptions: STANDARD_CODING,
    supportsMode: true,
    supportsAdaptive: true,
    supportsMultipath: true,
    supportsSampling: true,
    defaults: {
      mode: 'hopping',
      adaptive: true,
      txPower: 43.0,
      centerFreq: 1550,
      k_factor: 10.0,
      speed: 300.0,
      samplingRate: 4000000,
      dataRateKbps: 2000,
      multipath: RFPIPE_MULTIPATH,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      height: 0,
    },
  },
  coordination: {
    type: 'coordination',
    backendModel: 'xtl',
    presetKey: 'COOP_LINK',
    displayName: '协同链',
    title: '协同链信道模型配置',
    themeColor: '#9664ff',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 225, max: 700 },
    modulationOptions: [],
    codingOptions: STANDARD_CODING,
    supportsMode: true,
    supportsAdaptive: true,
    supportsMultipath: true,
    supportsSampling: true,
    defaults: {
      mode: 'hopping',
      adaptive: true,
      txPower: 43.0,
      centerFreq: 462,
      k_factor: 10.0,
      speed: 300.0,
      samplingRate: 4000000,
      dataRateKbps: 2000,
      multipath: RFPIPE_MULTIPATH,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      height: 0,
    },
  },
  adhoc: {
    type: 'adhoc',
    backendModel: 'zzw',
    presetKey: 'AD_HOC',
    displayName: '自组网',
    title: '自组网信道模型配置',
    themeColor: '#00c896',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 225, max: 700 },
    modulationOptions: [],
    codingOptions: STANDARD_CODING,
    supportsMode: true,
    supportsAdaptive: true,
    supportsMultipath: true,
    supportsSampling: true,
    defaults: {
      mode: 'hopping',
      adaptive: true,
      txPower: 30.0,
      centerFreq: 462,
      k_factor: 10.0,
      speed: 300.0,
      samplingRate: 4000000,
      dataRateKbps: 2000,
      multipath: RFPIPE_MULTIPATH,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      height: 0,
    },
  },
  vhf: {
    type: 'vhf',
    backendModel: 'vhf',
    presetKey: 'VHF',
    displayName: 'VHF',
    title: 'VHF信道模型配置',
    themeColor: '#4caf50',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 30, max: 300 },
    modulationOptions: MODULATION_VHF_UHF,
    codingOptions: STANDARD_CODING,
    supportsMultipath: true,
    supportsSampling: true,
    defaults: {
      modulation_type: 2,
      txPower: 30.0,
      centerFreq: 150,
      k_factor: 10.0,
      speed: 20.0,
      samplingRate: 200000,
      snr_db: 20.0,
      multipath: VHF_UHF_MULTIPATH,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      dataRateKbps: 13.0,
      height: 0,
    },
  },
  uhf: {
    type: 'uhf',
    backendModel: 'uhf',
    presetKey: 'UHF',
    displayName: 'UHF',
    title: 'UHF信道模型配置',
    themeColor: '#4caf50',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 300, max: 3000 },
    modulationOptions: MODULATION_VHF_UHF,
    codingOptions: STANDARD_CODING,
    supportsMultipath: true,
    supportsSampling: true,
    defaults: {
      modulation_type: 2,
      txPower: 30.0,
      centerFreq: 1500,
      k_factor: 10.0,
      speed: 20.0,
      samplingRate: 200000,
      snr_db: 20.0,
      multipath: VHF_UHF_MULTIPATH,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      dataRateKbps: 13.0,
      height: 0,
    },
  },
  fiveG: {
    type: 'fiveG',
    backendModel: '5g',
    presetKey: 'FiveG',
    displayName: '5G通信',
    title: '5G信道模型配置',
    themeColor: '#2563eb',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 600, max: 39000 },
    modulationOptions: MODULATION_5G,
    codingOptions: FIVEG_CODING,
    supportsMultipath: true,
    supportsSampling: true,
    defaults: {
      modulation_type: 2,
      txPower: 30.0,
      centerFreq: 3500,
      k_factor: 3.0,
      speed: 10.0,
      samplingRate: 30720000,
      dataRateKbps: 130000,
      multipath: FIVEG_MULTIPATH,
      codingScheme: 'ldpc',
      codeRate: '1/2',
      height: 0,
    },
  },
  dss: {
    type: 'dss',
    backendModel: 'sw',
    presetKey: 'DSSS',
    displayName: '短波',
    title: '短波信道模型配置',
    themeColor: '#0cc4cc',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 0, max: 50000 },
    modulationOptions: MODULATION_DSS,
    codingOptions: STANDARD_CODING,
    supportsMode: true,
    supportsAdaptive: true,
    supportsNetwork: true,
    defaults: {
      mode: 'fixed',
      adaptive: false,
      modulation_type: 1,
      txPower: 43.0,
      centerFreq: 7,
      k_factor: 5.0,
      speed: 10.0,
      transmissionDelay: 10.0,
      networkTransmissionRateBps: 1000.0,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      height: 0,
    },
  },
  fhss: {
    type: 'fhss',
    backendModel: 'mlw',
    presetKey: 'FHSS',
    displayName: '中长波',
    title: '中长波信道模型配置',
    themeColor: '#0cc4cc',
    frequencyUnit: 'kHz',
    frequencyRange: { min: 0, max: 50000 },
    modulationOptions: MODULATION_FHSS,
    codingOptions: STANDARD_CODING,
    supportsNoiseSeed: true,
    defaults: {
      modulation_type: 2,
      txPower: 30.0,
      centerFreq: 2437,
      k_factor: 10.0,
      speed: 30.0,
      noiseFigureDb: 7.0,
      shadowFadingDb: 2.5,
      seed: 1234,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      height: 0,
    },
  },
  gfsk: {
    type: 'gfsk',
    backendModel: 'satellite',
    presetKey: 'GFSK',
    displayName: '卫星',
    title: '卫星信道模型配置',
    themeColor: '#ff8c00',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 0, max: 50000 },
    modulationOptions: MODULATION_RFPIPE,
    codingOptions: STANDARD_CODING,
    supportsSatellite: true,
    defaults: {
      modulation_type: 2,
      txPower: 10.0,
      downlinkTxPowerDbw: 10.0,
      centerFreq: 14000,
      k_factor: -1.0,
      satAltKm: 35786.0,
      radialVelocityMps: 0.0,
      bandwidthMHz: 36.0,
      rainRateMmh: 0.0,
      maxRetransmissions: 0,
      codingScheme: 'convolutional',
      codeRate: '1/2',
      height: 0,
    },
  },
  custom: {
    type: 'custom',
    backendModel: 'choose',
    presetKey: 'CUSTOM',
    displayName: '散射',
    title: '散射配置',
    themeColor: '#4caf50',
    frequencyUnit: 'MHz',
    frequencyRange: { min: 0, max: 100000 },
    modulationOptions: MODULATION_RFPIPE,
    codingOptions: STANDARD_CODING,
    supportsMultipath: true,
    supportsSampling: true,
    defaults: {
      modulation_type: 2,
      txPower: 25.0,
      centerFreq: 2400,
      samplingRate: 1000000,
      snr_db: 25.0,
      speed: 10.0,
      multipath: [
        { power_db: 10.0, delay_us: 0.0, freq_offset: 0.0 },
        { power_db: -6.0, delay_us: 1.5, freq_offset: 10.0 },
      ],
      codingScheme: 'convolutional',
      codeRate: '1/2',
      height: 0,
    },
  },
}

export const BACKEND_MODEL_ALIASES: Record<string, ModelType> = {
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
  fiveG: 'fiveG',
  sw: 'dss',
  dss: 'dss',
  dsss: 'dss',
  shortwave: 'dss',
  mlw: 'fhss',
  fhss: 'fhss',
  satellite: 'gfsk',
  sat: 'gfsk',
  gfsk: 'gfsk',
  choose: 'custom',
  custom: 'custom',
}

export function normalizeModelType(value?: string | null): ModelType | null {
  if (!value) return null
  const raw = String(value).trim()
  return BACKEND_MODEL_ALIASES[raw] || BACKEND_MODEL_ALIASES[raw.toLowerCase()] || null
}

export function getModelDefinition(modelType?: string | null): ModelDefinition {
  const normalized = normalizeModelType(modelType) || 'vhf'
  return MODEL_DEFINITIONS[normalized]
}

export function createDefaultConfig(modelType?: string | null, position?: { alt?: number }): ChannelModelFormData {
  const definition = getModelDefinition(modelType)
  return {
    ...structuredCloneFallback(definition.defaults),
    modelType: definition.type,
    height: position?.alt ?? definition.defaults.height ?? 0,
  }
}

function structuredCloneFallback<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}
