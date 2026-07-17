import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createUserIsolatedStorage } from '@/utils/userIsolatedStorage'

export interface CodingConfig {
  codingScheme: string  // 编码方式
  codeRate: string      // 码率
}

export const useCodingConfigStore = defineStore('codingConfig', () => {
  // 编码配置，按节点ID存储
  const nodeCodingConfigs = ref<Map<number, CodingConfig>>(new Map())

  // 设置节点的编码配置
  const setNodeCodingConfig = (nodeId: number, config: CodingConfig) => {
    console.log('设置编码配置:', { nodeId, config });
    nodeCodingConfigs.value.set(nodeId, config)
    console.log('当前所有编码配置:', Object.fromEntries(nodeCodingConfigs.value));
  }

  // 获取节点的编码配置
  const getNodeCodingConfig = (nodeId: number): CodingConfig | null => {
    const config = nodeCodingConfigs.value.get(nodeId) || null;
    console.log('获取编码配置:', { nodeId, config, hasConfig: nodeCodingConfigs.value.has(nodeId) });
    return config;
  }

  // 清除节点的编码配置
  const clearNodeCodingConfig = (nodeId: number) => {
    nodeCodingConfigs.value.delete(nodeId)
  }

  // 清除所有编码配置
  const clearAllCodingConfigs = () => {
    nodeCodingConfigs.value.clear()
  }

  // 获取所有配置（用于调试）
  const getAllCodingConfigs = () => {
    return Object.fromEntries(nodeCodingConfigs.value)
  }

  return {
    nodeCodingConfigs,
    setNodeCodingConfig,
    getNodeCodingConfig,
    clearNodeCodingConfig,
    clearAllCodingConfigs,
    getAllCodingConfigs
  }
}, {
  persist: {
    key: 'codingConfig-store',
    storage: createUserIsolatedStorage(),
    serializer: {
      serialize: (state) => {
        // 将 Map 转换为普通对象进行序列化
        return JSON.stringify({
          nodeCodingConfigs: Object.fromEntries(state.nodeCodingConfigs)
        })
      },
      deserialize: (value) => {
        try {
          const parsed = JSON.parse(value)
          return {
            nodeCodingConfigs: new Map(Object.entries(parsed.nodeCodingConfigs || {}).map(([k, v]) => [Number(k), v as CodingConfig]))
          }
        } catch {
          return { nodeCodingConfigs: new Map() }
        }
      }
    }
  }
})