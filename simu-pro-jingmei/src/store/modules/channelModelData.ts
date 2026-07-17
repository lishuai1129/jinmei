import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createUserIsolatedStorage } from '@/utils/userIsolatedStorage'
import { useTopoStore } from './topo';

/**
 * 存储信道模型节点的实时数据（从HTTP请求中获取的数据）
 * 支持持久化保存到 localStorage，按场景隔离
 */
export const useChannelModelDataStore = defineStore('channelModelData', () => {
  // 存储每个场景的节点数据
  // key: sceneId, value: { nodeId: configData }
  const sceneNodeDataMap = ref<Map<string, Map<number, any>>>(new Map());

  /**
   * 获取当前场景ID
   * 使用多层回退逻辑确保获取到有效的sceneId
   */
  const getCurrentSceneId = (): string => {
    const topoStore = useTopoStore();

    // 首先检查 topoData.id 是否有效（不是 0 或 undefined）
    if (topoStore.topoData?.id && topoStore.topoData.id !== 0) {
      const sceneId = String(topoStore.topoData.id);
      // 直接返回topoData.id对应的sceneId，即使没有数据也要返回
      // 因为数据会被延迟加载到这个sceneId中
      console.log(`[channelModelDataStore] getCurrentSceneId - 使用topoData.id: ${sceneId}`);
      return sceneId;
    }

    // 回退到 currentSessionId
    if (topoStore.currentSessionId) {
      const sceneId = String(topoStore.currentSessionId);
      if (sceneNodeDataMap.value.has(sceneId)) {
        console.log(`[channelModelDataStore] getCurrentSceneId - 使用currentSessionId: ${sceneId}`);
        return sceneId;
      }
    }

    // 如果上述都没找到数据，尝试获取localStorage中最新的sceneId（最后修改的）
    let latestSceneId = 'default';
    let latestTimestamp = 0;
    for (const [sceneId, sceneData] of sceneNodeDataMap.value.entries()) {
      if (sceneData.size > 0) {
        // 获取该sceneId中最新的timestamp
        for (const [, nodeData] of sceneData.entries()) {
          if (nodeData.timestamp && nodeData.timestamp > latestTimestamp) {
            latestTimestamp = nodeData.timestamp;
            latestSceneId = sceneId;
          }
        }
      }
    }

    console.log(`[channelModelDataStore] getCurrentSceneId - 最终返回: ${latestSceneId}, topoData.id: ${topoStore.topoData?.id}, currentSessionId: ${topoStore.currentSessionId}, 所有sceneId: ${Array.from(sceneNodeDataMap.value.keys()).join(',')}`);
    return latestSceneId;
  };

  /**
   * 保存节点的最新数据
   */
  const saveNodeData = (nodeId: number, data: any) => {
    const sceneId = getCurrentSceneId();
    if (!sceneNodeDataMap.value.has(sceneId)) {
      sceneNodeDataMap.value.set(sceneId, new Map());
    }
    const sceneData = sceneNodeDataMap.value.get(sceneId)!;
    const nodeData = {
      ...data,
      timestamp: new Date().getTime(),
    };
    sceneData.set(nodeId, nodeData);
    console.log(`[channelModelDataStore] 保存节点数据 - sceneId: ${sceneId}, nodeId: ${nodeId}`, {
      dataKeys: Object.keys(nodeData),
      modelType: nodeData.modelType,
      hasConfig: !!(nodeData.txPower || nodeData.phy?.txPower)
    });
  };

  /**
   * 获取节点的最新数据
   * 查找优先级：
   * 1. 当前场景中按nodeId精确匹配
   * 2. 其他场景中按nodeId精确匹配（跨场景回退）
   * 3. 所有场景中按modelType模糊匹配（nodeId变化时的回退）
   */
  const getNodeData = (nodeId: number, modelType?: string) => {
    const sceneId = getCurrentSceneId();
    const sceneData = sceneNodeDataMap.value.get(sceneId);
    const data = sceneData?.get(nodeId);

    // 如果在当前场景找到数据，直接返回
    if (data) {
      console.log(`[channelModelDataStore] 在场景${sceneId}中找到节点${nodeId}的数据:`, data);
      return data;
    }

    console.log(`[channelModelDataStore] 在场景${sceneId}中未找到节点${nodeId}的数据，尝试回退搜索...`);

    // 回退搜索1：如果在当前sceneId下找不到数据，尝试在其他sceneId中按nodeId查找
    for (const [otherSceneId, otherSceneData] of sceneNodeDataMap.value.entries()) {
      if (otherSceneId !== sceneId) {
        const fallbackData = otherSceneData.get(nodeId);
        if (fallbackData) {
          console.log(`[channelModelDataStore] 从场景${otherSceneId}中获取节点${nodeId}的回退数据`);
          // 找到数据后，更新到当前场景以便下次查询
          if (!sceneData) {
            sceneNodeDataMap.value.set(sceneId, new Map());
          }
          sceneNodeDataMap.value.get(sceneId)?.set(nodeId, fallbackData);
          return fallbackData;
        }
      }
    }

    // 回退搜索2：如果按nodeId都找不到，尝试按modelType查找
    // 这解决了页面刷新后nodeId变化的问题（不同session中相同模型的nodeId可能不同）
    if (!modelType) {
      // 尝试从topoStore获取节点的modelType
      try {
        const topoStore = useTopoStore();
        const node = topoStore.topoData?.nodes?.find((n: any) => n.id === nodeId);
        if (node?.phy_type) {
          modelType = node.phy_type;
        }
      } catch (e) {
        // ignore
      }
    }

    if (modelType) {
      console.log(`[channelModelDataStore] 尝试按modelType(${modelType})回退搜索节点${nodeId}的数据...`);
      for (const [anySceneId, anySceneData] of sceneNodeDataMap.value.entries()) {
        for (const [storedNodeId, storedData] of anySceneData.entries()) {
          if (storedData.modelType === modelType) {
            console.log(`[channelModelDataStore] 通过modelType(${modelType})从场景${anySceneId}的节点${storedNodeId}获取匹配数据`);
            // 将匹配的数据保存到当前nodeId，下次直接命中
            if (!sceneNodeDataMap.value.has(sceneId)) {
              sceneNodeDataMap.value.set(sceneId, new Map());
            }
            const updatedData = { ...storedData, nodeId: nodeId };
            sceneNodeDataMap.value.get(sceneId)?.set(nodeId, updatedData);
            return updatedData;
          }
        }
      }
    }

    // 都没找到，返回null
    console.log(`[channelModelDataStore] 所有场景中都未找到节点${nodeId}的数据, sceneNodeDataMap内容:`, {
      currentSceneId: sceneId,
      allSceneIds: Array.from(sceneNodeDataMap.value.keys()),
      sceneDataSizes: Array.from(sceneNodeDataMap.value.entries()).map(([id, data]) => ({ sceneId: id, nodeCount: data.size }))
    });
    return null;
  };

  /**
   * 清除当前场景的所有数据
   */
  const clearAllData = () => {
    const sceneId = getCurrentSceneId();
    sceneNodeDataMap.value.delete(sceneId);
  };

  /**
   * 清除特定节点的数据
   */
  const clearNodeData = (nodeId: number) => {
    const sceneId = getCurrentSceneId();
    const sceneData = sceneNodeDataMap.value.get(sceneId);
    sceneData?.delete(nodeId);
  };

  /**
   * 清除所有场景的数据
   */
  const clearAllSceneData = () => {
    sceneNodeDataMap.value.clear();
  };

  return {
    sceneNodeDataMap,
    saveNodeData,
    getNodeData,
    clearAllData,
    clearNodeData,
    clearAllSceneData,
  };
}, {
  persist: {
    key: 'channelModelData-store',
    storage: createUserIsolatedStorage(),
    serializer: {
      serialize: (state) => {
        // 将嵌套的 Map 转换为普通对象进行序列化
        const serialized: Record<string, any> = {};
        let totalNodes = 0;
        state.sceneNodeDataMap.forEach((sceneData, sceneId) => {
          const nodeCount = sceneData.size;
          totalNodes += nodeCount;
          serialized[sceneId] = Object.fromEntries(sceneData);
        });

        const result = JSON.stringify({
          sceneNodeDataMap: serialized
        });

        console.log('[channelModelDataStore] 序列化数据:', {
          sceneCount: state.sceneNodeDataMap.size,
          totalNodes: totalNodes,
          sceneIds: Array.from(state.sceneNodeDataMap.keys()),
          dataSize: result.length
        });

        return result;
      },
      deserialize: (value) => {
        try {
          console.log('[channelModelDataStore] 开始反序列化持久化数据...');
          const parsed = JSON.parse(value)
          const sceneNodeDataMap = new Map();

          if (!parsed.sceneNodeDataMap) {
            console.log('[channelModelDataStore] 警告: 反序列化的数据中没有 sceneNodeDataMap 字段');
            return { sceneNodeDataMap }
          }

          let totalNodes = 0;
          Object.entries(parsed.sceneNodeDataMap || {}).forEach(([sceneId, nodeData]: [string, any]) => {
            const nodeCount = Object.keys(nodeData || {}).length;
            totalNodes += nodeCount;
            sceneNodeDataMap.set(sceneId, new Map(Object.entries(nodeData || {}).map(([k, v]) => [Number(k), v])));
          });

          console.log('[channelModelDataStore] 反序列化完成:', {
            sceneCount: sceneNodeDataMap.size,
            totalNodes: totalNodes,
            sceneIds: Array.from(sceneNodeDataMap.keys())
          });

          return { sceneNodeDataMap }
        } catch (error) {
          console.error('[channelModelDataStore] 反序列化失败:', error);
          return { sceneNodeDataMap: new Map() }
        }
      }
    }
  }
});
