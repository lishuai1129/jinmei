import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'

interface GMSKNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  gmsk_config?: {
    modulation_type: string
    txPower: number
    centerFreq: number
    k_factor: number
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface GMSKPayload {
  session_id: number
  node_id: number
  eth_info: number
  modulation_type: number
  phy: {
    txLat: number
    txLon: number
    txAlt: number
    rxLat: number
    rxLon: number
    rxAlt: number
    speed: number
    txPower: number
    centerFreq: number
    k_factor: number
  }
  payload: number[]
}

class GMSKSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private gmskNodes: Map<number, GMSKNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()

  /**
   * 启动GMSK仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateGMSKNodes()
    }, 1000)
  }

  /**
   * 停止GMSK仿真
   */
  stopSimulation() {
    console.log('[GMSK] 停止GMSK仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[GMSK] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[GMSK] 仿真状态已设置为停止');
  }

  /**
   * 注册GMSK节点
   */
  registerGMSKNode(gmskNodeId: number, nodeInfo: GMSKNodeInfo) {
    this.gmskNodes.set(gmskNodeId, nodeInfo)
  }

  /**
   * 注销GMSK节点
   */
  unregisterGMSKNode(gmskNodeId: number) {
    this.gmskNodes.delete(gmskNodeId)
    this.connectedNodes.delete(gmskNodeId)
  }

  /**
   * 添加连接到GMSK节点的节点
   */
  addConnectedNode(gmskNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(gmskNodeId)) {
      this.connectedNodes.set(gmskNodeId, [])
    }
    const nodes = this.connectedNodes.get(gmskNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到GMSK节点的节点
   */
  removeConnectedNode(gmskNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(gmskNodeId)
    if (nodes) {
      const index = nodes.findIndex(n => n.id === connectedNodeId)
      if (index !== -1) {
        nodes.splice(index, 1)
      }
    }
  }

  /**
   * 生成随机payload
   */
  private generateRandomPayload(length: number = 5): number[] {
    return Array.from({ length }, () => Math.floor(Math.random() * 256))
  }

  /**
   * 更新GMSK节点数据并发送HTTP请求
   */
  private async updateGMSKNodes() {
    if (this.gmskNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id ?? 101
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [gmskNodeId, gmskNode] of this.gmskNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(gmskNodeId)

      if (!connectedNodesList || connectedNodesList.length < 2) {
        // 需要至少2个接入节点
        continue
      }

      // 取前两个节点作为tx和rx，从topoStore获取最新位置
      const rxNodeStored = connectedNodesList[0]
      const txNodeStored = connectedNodesList[1]

      // 从topoStore获取最新的节点位置
      const rxNodeCurrent = currentNodes.find((n: any) => n.id === rxNodeStored.id)
      const txNodeCurrent = currentNodes.find((n: any) => n.id === txNodeStored.id)

      // 使用最新位置，如果找不到则使用存储的位置
      const rxNode = {
        ...rxNodeStored,
        geo: rxNodeCurrent?.geo || rxNodeStored.geo
      }
      const txNode = {
        ...txNodeStored,
        geo: txNodeCurrent?.geo || txNodeStored.geo
      }

      const payload = this.buildPayload(
        sessionId,
        rxNode,
        txNode,
        gmskNode
      )

      // 发送HTTP请求
      await this.sendGMSKUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   */
  private buildPayload(
    sessionId: number,
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    gmskNode: GMSKNodeInfo
  ): GMSKPayload {
    // 从持久化存储中读取最新的GMSK配置
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(gmskNode.id)

    // 三级回退：持久化数据 > 节点对象中的config > 默认值
    const modulationType = parseInt(persistedNodeData?.modulation_type ?? gmskNode.gmsk_config?.modulation_type ?? '2', 10)
    const txPower = persistedNodeData?.txPower ?? gmskNode.gmsk_config?.txPower ?? 30.0
    // centerFreq单位为MHz，需要转换为Hz（乘以1,000,000）
    let centerFreq = persistedNodeData?.centerFreq ?? gmskNode.gmsk_config?.centerFreq ?? 2400
    if (centerFreq < 1000000) {
      // 如果小于1MHz，说明是以MHz保存的，需要转换为Hz
      centerFreq = centerFreq * 1000000
    }
    const kFactor = persistedNodeData?.k_factor ?? gmskNode.gmsk_config?.k_factor ?? 10.0  // K因子，单位为dB，默认10dB

    return {
      session_id: sessionId,
      node_id: rxNode.id,
      eth_info: rxNode.ethId ?? 1,
      modulation_type: modulationType,
      phy: {
        txLat: txNode.geo.lat,
        txLon: txNode.geo.lon,
        txAlt: txNode.geo.alt,
        rxLat: rxNode.geo.lat,
        rxLon: rxNode.geo.lon,
        rxAlt: rxNode.geo.alt,
        speed: 20.0,
        txPower: txPower,
        centerFreq: centerFreq,
        k_factor: kFactor,
      },
      payload: this.generateRandomPayload(450),
    }
  }

  /**
   * 发送HTTP请求更新GMSK模型
   */
  private async sendGMSKUpdate(payload: GMSKPayload) {
    try {
      const response = await fetch('/gmsk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`GMSK update failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('GMSK update network error:', error)
    }
  }

  /**
   * 获取GMSK节点列表
   */
  getGMSKNodes(): Map<number, GMSKNodeInfo> {
    return this.gmskNodes
  }

  /**
   * 检查是否正在运行
   */
  isSimulationRunning(): boolean {
    return this.isRunning
  }

  /**
   * 获取已连接的节点映射（用于NodeInfoPanel访问）
   */
  getConnectedNodes(): Map<number, ConnectedNode[]> {
    return this.connectedNodes
  }

  /**
   * 清除所有已注册的节点和连接关系
   * 用于仿真停止后彻底清理状态，避免下次启动时的状态混乱
   */
  clearAllNodes() {
    const nodeCount = this.gmskNodes.size
    const connectionCount = this.connectedNodes.size

    this.gmskNodes.clear()
    this.connectedNodes.clear()

    console.log(`[GMSK] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }}

// 导出单例
export const gmskSimulationService = new GMSKSimulationService()

export type { GMSKNodeInfo, ConnectedNode, GMSKPayload }
