import { MODEL_ORDER, normalizeModelType, type ModelType } from '../config/models'

export interface ComplexPoint {
  x: number
  y: number
}

export interface NormalizedResponse {
  raw: any
  model: ModelType | null
  channelMetrics: Record<string, any>
  data: Record<string, any>
  timestamp?: number | string
}

export function unwrapPayload(payload: any): any {
  if (!payload) return null
  if (payload.response && typeof payload.response === 'object') return unwrapPayload(payload.response)
  if (payload.result && typeof payload.result === 'object') return unwrapPayload(payload.result)
  return payload
}

export function normalizeResponse(payload: any): NormalizedResponse | null {
  const raw = unwrapPayload(payload)
  if (!raw || typeof raw !== 'object') return null

  const model = normalizeModelType(raw.model || raw.modelType || raw.phy_type)
  const data = raw.data && typeof raw.data === 'object' ? raw.data : {}
  const channelMetrics =
    raw.channel_metrics ||
    raw.channelMetrics ||
    data.channel_metrics ||
    {}

  return {
    raw,
    model,
    channelMetrics,
    data,
    timestamp: raw.timestamp || data.timestamp,
  }
}

export function pickDataForModel(
  dataByModel?: Record<string, any> | null,
  model?: string | null,
): NormalizedResponse | null {
  if (!dataByModel) return null
  const normalizedTarget = normalizeModelType(model)

  if (normalizedTarget) {
    const direct = dataByModel[normalizedTarget] || dataByModel[model || '']
    const normalizedDirect = normalizeResponse(direct)
    if (normalizedDirect) return normalizedDirect
  }

  for (const modelType of MODEL_ORDER) {
    const normalized = normalizeResponse(dataByModel[modelType])
    if (normalized) return normalized
  }

  for (const value of Object.values(dataByModel)) {
    const normalized = normalizeResponse(value)
    if (normalized && (!normalizedTarget || normalized.model === normalizedTarget)) {
      return normalized
    }
  }

  return null
}

export function isResponseForModel(payload: any, model?: string | null): boolean {
  const target = normalizeModelType(model)
  if (!target) return true
  const normalized = normalizeResponse(payload)
  if (!normalized?.model) return true
  return normalized.model === target
}

export function toNumber(value: any): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function toPercent(value: any): number | null {
  const numeric = toNumber(value)
  if (numeric === null) return null
  return numeric <= 1 ? numeric * 100 : numeric
}

export function formatMetric(value: any, unit = ''): string {
  const numeric = toNumber(value)
  if (numeric === null) return value === null || value === undefined ? 'N/A' : String(value)

  if (unit === '%') {
    const percent = toPercent(numeric)
    if (percent === null) return 'N/A'
    return `${percent.toFixed(percent < 0.01 ? 4 : 2)}%`
  }

  if (Math.abs(numeric) >= 1000000) return `${numeric.toExponential(3)}${unit ? ` ${unit}` : ''}`
  if (Math.abs(numeric) >= 1000) return `${numeric.toFixed(2)}${unit ? ` ${unit}` : ''}`
  if (Math.abs(numeric) < 0.001 && numeric !== 0) return `${numeric.toExponential(3)}${unit ? ` ${unit}` : ''}`
  return `${numeric.toFixed(4).replace(/\.?0+$/, '')}${unit ? ` ${unit}` : ''}`
}

export function complexPoint(input: any): ComplexPoint | null {
  if (!input) return null
  if (Array.isArray(input) && input.length >= 2) {
    const x = toNumber(input[0])
    const y = toNumber(input[1])
    return x === null || y === null ? null : { x, y }
  }
  const x = toNumber(input.real ?? input.r ?? input.i_real ?? input.x)
  const y = toNumber(input.imag ?? input.i ?? input.q ?? input.y)
  return x === null || y === null ? null : { x, y }
}

export function getComplexArray(data: Record<string, any>, keys: string[], limit = 4096): ComplexPoint[] {
  for (const key of keys) {
    const value = data[key]
    if (!Array.isArray(value)) continue
    const points = value
      .slice(0, limit)
      .map(complexPoint)
      .filter((point): point is ComplexPoint => !!point)
    if (points.length) return points
  }
  return []
}

export function getNumberArray(data: Record<string, any>, keys: string[], limit = 4096): number[] {
  for (const key of keys) {
    const value = data[key]
    if (!Array.isArray(value)) continue
    const numbers = value
      .slice(0, limit)
      .map(toNumber)
      .filter((item): item is number => item !== null)
    if (numbers.length) return numbers
  }
  return []
}

export function getBitArray(data: Record<string, any>, keys: string[], limit = 4096): number[] {
  return getNumberArray(data, keys, limit).map((value) => (value ? 1 : 0))
}

export function getOriginalBits(data: Record<string, any>): number[] {
  return getBitArray(data, ['original_bits', 'num_in_240_200', 'input_bits'])
}

export function getDecodedBits(data: Record<string, any>): number[] {
  return getBitArray(data, [
    'demodulated_bits',
    'recover_bits',
    'recovered_bits',
    'de_scram_out_240_200',
    'output_bits',
  ])
}

export function getTxPoints(data: Record<string, any>): ComplexPoint[] {
  return getComplexArray(data, ['tx_samples', 'transmitter_iq', 'modulated_iq', 'qam_mapped'])
}

export function getRxPoints(data: Record<string, any>): ComplexPoint[] {
  return getComplexArray(data, [
    'rx_samples',
    'receiver_iq',
    'channel_iq',
    'constellation_after_channel',
    'de_interFrq_out',
  ])
}

export function getRecoveredPoints(data: Record<string, any>): ComplexPoint[] {
  return getComplexArray(data, ['recovered_samples', 'recovered_iq', 'restored_constellation', 'de_sfo_comp'])
}

export function getSpectrumData(raw: Record<string, any>, data: Record<string, any>): number[] {
  return getNumberArray({ ...raw, ...data }, ['spectrum_data'])
}
