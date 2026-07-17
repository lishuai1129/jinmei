const fs = require('node:fs')
const path = require('node:path')

const distDir = path.resolve(__dirname, '..', 'dist')
fs.mkdirSync(distDir, { recursive: true })

const content = `import type { App as Vue3App } from 'vue'

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

export interface MountHandle {
  update(nextOptions: Record<string, any>): void
  unmount(): void
  app: Vue3App<Element>
}

export interface MountOptions {
  visible?: boolean
  modelType?: ModelType | string
  model?: ModelType | string
  position?: { lat: number; lon: number; alt: number }
  nodeId?: number
  initialConfig?: Record<string, any>
  link?: Record<string, any>
  data?: Record<string, any>
  dataByModel?: Record<string, any>
  title?: string
  endpoints?: EndpointMap
  baseUrl?: string
  fetcher?: typeof fetch
  onConfirm?: (data: any) => void
  onCancel?: () => void
  onClose?: () => void
}

export interface EndpointPair {
  post?: string
  latest?: string
}

export type EndpointMap = Partial<Record<ModelType, EndpointPair>>

export interface ApiClientOptions {
  baseUrl?: string
  endpoints?: EndpointMap
  fetcher?: typeof fetch
}

export interface RuntimeOptions extends ApiClientOptions {
  intervalMs?: number
}

export declare function mountModelConfigDialog(el: Element | string, options?: MountOptions): MountHandle
export declare function mountCustomConfigDialog(el: Element | string, options?: MountOptions): MountHandle
export declare function mountLinkMonitor(el: Element | string, options?: MountOptions): MountHandle
export declare function createApiClient(options?: ApiClientOptions): any
export declare function createModelRuntime(options?: RuntimeOptions): any
export declare function createChannelModelKit(options?: RuntimeOptions): any

declare const ChannelModelKit: {
  install(Vue: any, options?: RuntimeOptions): void
  mountModelConfigDialog: typeof mountModelConfigDialog
  mountCustomConfigDialog: typeof mountCustomConfigDialog
  mountLinkMonitor: typeof mountLinkMonitor
  createApiClient: typeof createApiClient
  createModelRuntime: typeof createModelRuntime
  createChannelModelKit: typeof createChannelModelKit
}

export default ChannelModelKit
`

fs.writeFileSync(path.join(distDir, 'index.d.ts'), content)
