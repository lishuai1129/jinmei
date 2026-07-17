import { createApiClient, type ApiClientOptions, type ChannelModelApiClient } from './apiClient'
import { MODEL_ORDER, normalizeModelType, type ChannelModelFormData, type ModelType } from '../config/models'
import { normalizeResponse, type NormalizedResponse } from './dataNormalizer'

export interface RuntimeOptions extends ApiClientOptions {
  intervalMs?: number
}

export type RuntimeListener = (event: {
  model: ModelType
  data: NormalizedResponse | null
  raw: any
}) => void

export interface RegisteredNode {
  id: number
  model: ModelType
  config: ChannelModelFormData
  extra?: Record<string, any>
}

export function createModelRuntime(options: RuntimeOptions = {}) {
  const api = createApiClient(options)
  const nodes = new Map<number, RegisteredNode>()
  const latestByModel: Partial<Record<ModelType, NormalizedResponse | null>> = {}
  const listeners = new Set<RuntimeListener>()
  let timer: number | null = null
  const intervalMs = options.intervalMs || 1000

  const notify = (model: ModelType, raw: any) => {
    const normalized = normalizeResponse(raw)
    latestByModel[model] = normalized
    listeners.forEach((listener) => listener({ model, data: normalized, raw }))
  }

  const pollModel = async (model: ModelType) => {
    const raw = await api.getLatest(model)
    notify(model, raw)
    return raw
  }

  const postNode = async (node: RegisteredNode) => {
    const payload = api.buildRequestPayload(node.model, node.config, {
      node_id: node.id,
      ...(node.extra || {}),
    })
    const raw = await api.postModel(node.model, payload)
    const latest = await api.getLatest(node.model).catch(() => raw)
    notify(node.model, latest)
    return latest
  }

  const tick = () => {
    const models = new Set<ModelType>(Array.from(nodes.values()).map((node) => node.model))
    models.forEach((model) => {
      pollModel(model).catch((error) => {
        console.warn(`[channel-model-kit] polling ${model} failed`, error)
      })
    })
  }

  return {
    api,
    nodes,
    latestByModel,
    registerNode(id: number, model: string, config: ChannelModelFormData, extra?: Record<string, any>) {
      const normalized = normalizeModelType(model)
      if (!normalized) throw new Error(`Unknown channel model: ${model}`)
      nodes.set(id, { id, model: normalized, config, extra })
    },
    unregisterNode(id: number) {
      nodes.delete(id)
    },
    async postNode(id: number) {
      const node = nodes.get(id)
      if (!node) throw new Error(`Node ${id} is not registered`)
      return postNode(node)
    },
    async postModel(model: string, config: ChannelModelFormData, extra?: Record<string, any>) {
      const normalized = normalizeModelType(model)
      if (!normalized) throw new Error(`Unknown channel model: ${model}`)
      const tempNode: RegisteredNode = {
        id: Number(extra?.node_id ?? extra?.nodeId ?? 1),
        model: normalized,
        config,
        extra,
      }
      return postNode(tempNode)
    },
    async pollLatest(model?: string) {
      const normalized = normalizeModelType(model)
      if (normalized) return pollModel(normalized)
      return Promise.all(MODEL_ORDER.map((item) => pollModel(item).catch(() => null)))
    },
    start() {
      if (timer !== null) return
      tick()
      timer = globalThis.setInterval(tick, intervalMs) as unknown as number
    },
    stop() {
      if (timer === null) return
      globalThis.clearInterval(timer)
      timer = null
    },
    subscribe(listener: RuntimeListener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getLatest(model: string) {
      const normalized = normalizeModelType(model)
      return normalized ? latestByModel[normalized] || null : null
    },
    destroy() {
      this.stop()
      listeners.clear()
      nodes.clear()
    },
  }
}
