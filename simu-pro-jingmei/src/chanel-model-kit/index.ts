import { createApp, h, reactive, type App, type Component } from 'vue'
import ModelConfigDialog from './src/components/ModelConfigDialog.vue'
import CustomConfigDialog from './src/components/CustomConfigDialog.vue'
import LinkMonitorPanel from './src/components/LinkMonitorPanel.vue'
import { createApiClient, type ApiClientOptions } from './src/runtime/apiClient'
import { createModelRuntime, type RuntimeOptions } from './src/runtime/modelRuntime'
import {
  MODEL_DEFINITIONS,
  MODEL_ORDER,
  createDefaultConfig,
  getModelDefinition,
  normalizeModelType,
  type ChannelModelFormData,
  type ModelType,
} from './src/config/models'
import { DEFAULT_ENDPOINTS, type EndpointMap } from './src/config/endpoints'
import { normalizeResponse } from './src/runtime/dataNormalizer'

export {
  ModelConfigDialog,
  CustomConfigDialog,
  LinkMonitorPanel,
  createApiClient,
  createModelRuntime,
  MODEL_DEFINITIONS,
  MODEL_ORDER,
  DEFAULT_ENDPOINTS,
  createDefaultConfig,
  getModelDefinition,
  normalizeModelType,
  normalizeResponse,
}

export type {
  ApiClientOptions,
  RuntimeOptions,
  EndpointMap,
  ChannelModelFormData,
  ModelType,
}

export interface MountHandle {
  app: App<Element>
  update(nextOptions: Record<string, any>): void
  unmount(): void
}

export interface MountOptions {
  [key: string]: any
}

function resolveElement(el: Element | string): Element {
  if (typeof el !== 'string') return el
  const target = document.querySelector(el)
  if (!target) throw new Error(`channel-model-kit target not found: ${el}`)
  return target
}

function mountComponent(component: Component, el: Element | string, options: MountOptions = {}): MountHandle {
  const target = resolveElement(el)
  const state = reactive({ ...options })

  const app = createApp({
    name: 'ChannelModelKitHost',
    setup() {
      return () =>
        h(component, {
          ...state,
          onConfirm: (payload: any) => state.onConfirm?.(payload),
          onCancel: () => state.onCancel?.(),
          onClose: () => state.onClose?.(),
          'onUpdate:visible': (visible: boolean) => {
            state.visible = visible
            state.onUpdateVisible?.(visible)
          },
        })
    },
  })

  app.mount(target)

  return {
    app,
    update(nextOptions: Record<string, any>) {
      Object.assign(state, nextOptions)
    },
    unmount() {
      app.unmount()
      target.innerHTML = ''
    },
  }
}

export function mountModelConfigDialog(el: Element | string, options: MountOptions = {}) {
  return mountComponent(ModelConfigDialog, el, options)
}

export function mountCustomConfigDialog(el: Element | string, options: MountOptions = {}) {
  return mountComponent(CustomConfigDialog, el, options)
}

export function mountLinkMonitor(el: Element | string, options: MountOptions = {}) {
  return mountComponent(LinkMonitorPanel, el, options)
}

export function createChannelModelKit(options: RuntimeOptions = {}) {
  const runtime = createModelRuntime(options)
  return {
    runtime,
    api: runtime.api,
    mountModelConfigDialog,
    mountCustomConfigDialog,
    mountLinkMonitor,
    createDefaultConfig,
    getModelDefinition,
    normalizeModelType,
    normalizeResponse,
  }
}

const ChannelModelKit = {
  install(Vue: any, options: RuntimeOptions = {}) {
    const kit = createChannelModelKit(options)
    if (Vue?.prototype) {
      Vue.prototype.$channelModelKit = kit
    }
  },
  mountModelConfigDialog,
  mountCustomConfigDialog,
  mountLinkMonitor,
  createApiClient,
  createModelRuntime,
  createChannelModelKit,
  createDefaultConfig,
  getModelDefinition,
  normalizeModelType,
  normalizeResponse,
  MODEL_DEFINITIONS,
  MODEL_ORDER,
  DEFAULT_ENDPOINTS,
}

declare global {
  interface Window {
    ChannelModelKit?: typeof ChannelModelKit
  }
}

if (typeof window !== 'undefined') {
  window.ChannelModelKit = ChannelModelKit
}

export default ChannelModelKit
