import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createUserIsolatedStorage } from '@/utils/userIsolatedStorage'

export interface TransmissionConfig {
  transmissionDelay: number  // 传输时延 (ms)
}

export const useTransmissionConfigStore = defineStore('transmissionConfig', () => {
  // 传输时延配置，按节点ID存储
  const nodeTransmissionDelays = ref<Map<number, number>>(new Map())

  // 设置节点的传输时延
  const setNodeTransmissionDelay = (nodeId: number, delay: number) => {
    console.log('设置传输时延:', { nodeId, delay });
    nodeTransmissionDelays.value.set(nodeId, delay)
    console.log('当前所有传输时延配置:', Object.fromEntries(nodeTransmissionDelays.value));
  }

  // 获取节点的传输时延
  const getNodeTransmissionDelay = (nodeId: number): number => {
    const delay = nodeTransmissionDelays.value.get(nodeId) || 0;
    console.log('获取传输时延:', { nodeId, delay, hasConfig: nodeTransmissionDelays.value.has(nodeId) });
    return delay;
  }

  // 清除节点的传输时延配置
  const clearNodeTransmissionDelay = (nodeId: number) => {
    nodeTransmissionDelays.value.delete(nodeId)
  }

  // 清除所有传输时延配置
  const clearAllTransmissionDelays = () => {
    nodeTransmissionDelays.value.clear()
  }

  // 获取所有配置（用于调试）
  const getAllTransmissionDelays = () => {
    return Object.fromEntries(nodeTransmissionDelays.value)
  }

  return {
    nodeTransmissionDelays,
    setNodeTransmissionDelay,
    getNodeTransmissionDelay,
    clearNodeTransmissionDelay,
    clearAllTransmissionDelays,
    getAllTransmissionDelays
  }
}, {
  persist: {
    key: 'transmissionConfig-store',
    storage: createUserIsolatedStorage(),
    serializer: {
      serialize: (state) => {
        // 将 Map 转换为普通对象进行序列化
        return JSON.stringify({
          nodeTransmissionDelays: Object.fromEntries(state.nodeTransmissionDelays)
        })
      },
      deserialize: (value) => {
        try {
          const parsed = JSON.parse(value)
          return {
            nodeTransmissionDelays: new Map(Object.entries(parsed.nodeTransmissionDelays || {}).map(([k, v]) => [Number(k), v as number]))
          }
        } catch {
          return { nodeTransmissionDelays: new Map() }
        }
      }
    }
  }
})