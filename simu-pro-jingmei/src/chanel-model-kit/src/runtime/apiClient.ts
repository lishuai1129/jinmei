import { DEFAULT_ENDPOINTS, mergeEndpoints, type EndpointMap } from '../config/endpoints'
import { getModelDefinition, normalizeModelType, type ChannelModelFormData, type ModelType } from '../config/models'

export interface ApiClientOptions {
  baseUrl?: string
  endpoints?: EndpointMap
  fetcher?: typeof fetch
}

export interface ChannelModelApiClient {
  postModel(model: string, payload: any): Promise<any>
  getLatest(model: string): Promise<any>
  buildRequestPayload(model: string, config: ChannelModelFormData, extra?: Record<string, any>): any
}

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  if (!baseUrl) return path
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function createApiClient(options: ApiClientOptions = {}): ChannelModelApiClient {
  const endpoints = mergeEndpoints(options.endpoints || DEFAULT_ENDPOINTS)
  const fetcher = options.fetcher || globalThis.fetch?.bind(globalThis)
  const baseUrl = options.baseUrl || ''

  if (!fetcher) {
    throw new Error('channel-model-kit requires fetch or a custom fetcher.')
  }

  const request = async (url: string, init?: RequestInit) => {
    const response = await fetcher(url, init)
    const body = await parseResponse(response)
    if (!response.ok) {
      const error = new Error(`Request failed: ${response.status} ${response.statusText}`)
      ;(error as any).response = response
      ;(error as any).body = body
      throw error
    }
    return body
  }

  return {
    async postModel(model, payload) {
      const normalized = normalizeModelType(model)
      if (!normalized) throw new Error(`Unknown channel model: ${model}`)
      const endpoint = endpoints[normalized]?.post
      if (!endpoint) throw new Error(`Missing post endpoint for ${normalized}`)
      return request(joinUrl(baseUrl, endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    async getLatest(model) {
      const normalized = normalizeModelType(model)
      if (!normalized) throw new Error(`Unknown channel model: ${model}`)
      const endpoint = endpoints[normalized]?.latest
      if (!endpoint) throw new Error(`Missing latest endpoint for ${normalized}`)
      return request(joinUrl(baseUrl, endpoint), { method: 'GET' })
    },
    buildRequestPayload(model, config, extra = {}) {
      return buildRequestPayload(model, config, extra)
    },
  }
}

export function buildRequestPayload(model: string, config: ChannelModelFormData, extra: Record<string, any> = {}) {
  const normalized = normalizeModelType(model) as ModelType | null
  if (!normalized) throw new Error(`Unknown channel model: ${model}`)

  const definition = getModelDefinition(normalized)
  const defaultPayload = getDefaultPayload(normalized, extra)
  const defaultOriginalBits = getDefaultOriginalBits(extra)
  const centerFreqHz =
    definition.frequencyUnit === 'kHz'
      ? Number(config.centerFreq || 0) * 1000
      : Number(config.centerFreq || 0) * 1000000

  const nodeId = extra.node_id ?? extra.nodeId ?? config.modelType ?? 1
  const base = {
    model: definition.backendModel,
    node_id: Number(extra.node_id ?? extra.nodeId ?? 1),
    modulation_type: Number(config.modulation_type ?? definition.defaults.modulation_type ?? 2),
    ...extra.base,
  }

  if (normalized === 'gfsk') {
    return {
      ...base,
      model: 'satellite',
      sat_alt_km: config.satAltKm,
      sat_lat: extra.sat_lat ?? 0,
      sat_lon: extra.sat_lon ?? 105,
      radial_velocity_mps: config.radialVelocityMps,
      freq_hz: centerFreqHz,
      uplink_tx_power_dbw: config.txPower,
      downlink_tx_power_dbw: config.downlinkTxPowerDbw,
      bandwidth_hz: Number(config.bandwidthMHz || 0) * 1000000,
      rain_rate_mmh: config.rainRateMmh,
      rician_k_db: config.k_factor,
      max_retransmissions: config.maxRetransmissions,
      payload: defaultPayload,
      ...extra,
    }
  }

  if (normalized === 'fhss') {
    return {
      ...base,
      model: 'mlw',
      signal_type: 'digital',
      payload: defaultPayload,
      phy: {
        centerFreq: centerFreqHz,
        txPower: config.txPower,
        txLat: extra.txLat ?? extra.tx?.lat ?? 39.9,
        txLon: extra.txLon ?? extra.tx?.lon ?? 116.4,
        txAlt: extra.txAlt ?? extra.tx?.alt ?? config.height ?? 0,
        rxLat: extra.rxLat ?? extra.rx?.lat ?? 39.85,
        rxLon: extra.rxLon ?? extra.rx?.lon ?? 116.45,
        rxAlt: extra.rxAlt ?? extra.rx?.alt ?? 0,
        speed: config.speed,
        noiseFigureDb: config.noiseFigureDb,
        shadowFadingDb: config.shadowFadingDb,
        seed: config.seed,
      },
      ...extra,
    }
  }

  const payload = {
    ...base,
    mode: config.mode,
    adaptive: config.adaptive,
    relay_capability: extra.relay_capability ?? false,
    network_delay_ms: config.transmissionDelay,
    network_transmission_rate_bps: config.networkTransmissionRateBps,
    phy: {
      centerFreq: centerFreqHz,
      txPower: config.txPower,
      txLat: extra.txLat ?? extra.tx?.lat ?? 30,
      txLon: extra.txLon ?? extra.tx?.lon ?? 100,
      txAlt: extra.txAlt ?? extra.tx?.alt ?? config.height ?? 0,
      rxLat: extra.rxLat ?? extra.rx?.lat ?? 30.18,
      rxLon: extra.rxLon ?? extra.rx?.lon ?? 100,
      rxAlt: extra.rxAlt ?? extra.rx?.alt ?? 0,
      speed: config.speed,
      k_factor: config.k_factor,
      samplingRate: config.samplingRate,
      dataRateKbps: config.dataRateKbps,
      snr_db: config.snr_db,
      multipath: config.multipath,
    },
    data: {
      original_bits: defaultOriginalBits,
    },
    payload: defaultPayload,
    ...extra,
  }

  if (normalized === 'custom') {
    return {
      node_id: payload.node_id,
      modulation: payload.modulation_type,
      payload: payload.payload,
      phy: payload.phy,
    }
  }

  return payload
}

export function randomBits(length: number): number[] {
  return Array.from({ length }, () => (Math.random() > 0.5 ? 1 : 0))
}

function getDefaultPayload(model: ModelType, extra: Record<string, any>) {
  if (Array.isArray(extra.payload)) return extra.payload
  return randomBits(model === 'fhss' ? 256 : 8)
}

function getDefaultOriginalBits(extra: Record<string, any>) {
  if (Array.isArray(extra.original_bits)) return extra.original_bits
  if (extra.data && Array.isArray(extra.data.original_bits)) return extra.data.original_bits
  return randomBits(8)
}
