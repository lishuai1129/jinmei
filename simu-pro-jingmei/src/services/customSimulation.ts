import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'

interface MultipathConfig {
  power_db: number
  delay_us: number
  freq_offset: number
}

interface PayloadMultipathConfig {
  power_db: number
  delay_us: number
  freq_offset: number
}

interface CustomNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  custom_config?: {
    modulation: number
    centerFreq: number
    samplingRate: number
    snr_db: number
    speed?: number
    multipath: MultipathConfig[]
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface CustomPayload {
  node_id: number
  modulation: number
  phy: {
    txLat: number
    txLon: number
    txAlt: number
    rxLat: number
    rxLon: number
    rxAlt: number
    centerFreq: number
    samplingRate: number
    snr_db: number
    speed: number
    multipath: PayloadMultipathConfig[]
  }
  payload: number[]
}

class CustomSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private customNodes: Map<number, CustomNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null
  private readonly HTTP_PORT = 9010
  private readonly UDP_PORT = 9011
  private useUDP: boolean = false

  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 设置传输方式（HTTP或UDP）
   */
  setTransportMode(useUDP: boolean) {
    this.useUDP = useUDP
    console.log(`[Custom] 已切换为${useUDP ? 'UDP' : 'HTTP'}传输模式`)
  }

  /**
   * 获取当前传输方式
   */
  getTransportMode(): 'HTTP' | 'UDP' {
    return this.useUDP ? 'UDP' : 'HTTP'
  }

  /**
   * 启动散射仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateCustomNodes()
    }, 1000)
  }

  /**
   * 停止散射仿真
   */
  stopSimulation() {
    console.log('[Custom] 停止散射仿真，清理数据...')
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[Custom] interval已清理')
    }
    this.isRunning = false
    this.clearAllNodes()  // 清除所有节点和连接
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
    const nodeCount = this.customNodes.size
    const connectionCount = this.connectedNodes.size

    this.customNodes.clear()
    this.connectedNodes.clear()

    console.log(`[Custom] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }

  /**
   * 注册散射节点
   */
  registerCustomNode(customNodeId: number, nodeInfo: CustomNodeInfo) {
    this.customNodes.set(customNodeId, nodeInfo)
  }

  /**
   * 注销散射节点
   */
  unregisterCustomNode(customNodeId: number) {
    this.customNodes.delete(customNodeId)
    this.connectedNodes.delete(customNodeId)
  }

  /**
   * 添加连接到散射节点的节点
   */
  addConnectedNode(customNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(customNodeId)) {
      this.connectedNodes.set(customNodeId, [])
    }
    const nodes = this.connectedNodes.get(customNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到散射节点的节点
   */
  removeConnectedNode(customNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(customNodeId)
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
   * 更新散射节点数据并发送HTTP请求
   */
  private async updateCustomNodes() {
    if (this.customNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [customNodeId, customNode] of this.customNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(customNodeId)

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

      const payload = this.buildPayload(rxNode, txNode, customNode)

      // 发送HTTP请求
      await this.sendCustomUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   */
  private buildPayload(
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    customNode: CustomNodeInfo
  ): CustomPayload {
    // 从持久化存储中读取最新的Custom配置
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(customNode.id)

    // 三级回退：持久化数据 > 节点对象中的config > 默认值
    const modulation = parseInt(persistedNodeData?.modulation ?? customNode.custom_config?.modulation ?? 2, 10)
    let centerFreq = persistedNodeData?.centerFreq ?? customNode.custom_config?.centerFreq ?? 2400
    if (centerFreq < 1000000) {
      // 如果小于1MHz，说明是以MHz保存的，需要转换为Hz
      centerFreq = centerFreq * 1000000
    }
    let samplingRate = persistedNodeData?.samplingRate ?? customNode.custom_config?.samplingRate ?? 1
    if (samplingRate < 1000000) {
      // 如果小于1MHz，说明是以MHz保存的，需要转换为Hz
      samplingRate = samplingRate * 1000000
    }
    const snr_db = persistedNodeData?.snr_db ?? customNode.custom_config?.snr_db ?? 25.0
    const speed = persistedNodeData?.speed ?? customNode.custom_config?.speed ?? 10.0
    const multipath = persistedNodeData?.multipath ?? customNode.custom_config?.multipath ?? [
      {
        power_db: 0.0,
        delay_us: 0.0,
        freq_offset: 0.0
      }
    ]
    const payloadMultipath = multipath.map((path: MultipathConfig) => ({
      power_db: Number(path.power_db ?? 0),
      delay_us: Number(path.delay_us ?? 0),
      freq_offset: Number(path.freq_offset ?? 0),
    }))

    return {
      node_id: rxNode.id,
      modulation: modulation,
      phy: {
        txLat: txNode.geo.lat,
        txLon: txNode.geo.lon,
        txAlt: txNode.geo.alt,
        rxLat: rxNode.geo.lat,
        rxLon: rxNode.geo.lon,
        rxAlt: rxNode.geo.alt,
        centerFreq: centerFreq,
        samplingRate: samplingRate,
        snr_db: snr_db,
        speed: speed,
        multipath: payloadMultipath,
      },
      payload: this.generateRandomPayload(200),
    }
  }

  /**
   * 发送HTTP/UDP请求更新散射
   */
  private async sendCustomUpdate(payload: CustomPayload) {
    if (this.useUDP) {
      await this.sendUDPUpdate(payload)
    } else {
      await this.sendHTTPUpdate(payload)
    }
  }

  /**
   * 发送HTTP请求（端口9010）
   */
  private async sendHTTPUpdate(payload: CustomPayload) {
    try {
      const response = await fetch(`/choose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`Custom choose update failed: ${response.status} ${response.statusText}`)
      } else {
        try {
          const latestResponse = await fetch('/choose-latest', { method: 'GET' })
          if (latestResponse.ok) {
            const responseData = await latestResponse.json()
            if (responseData && this.onDataReceived) {
              this.onDataReceived(payload.node_id, responseData)
            }
          } else {
            console.warn(`[Custom] GET /choose-latest failed: ${latestResponse.status}`)
          }
        } catch (parseError) {
          console.warn('[Custom] 获取choose模型最新结果失败', parseError)
        }
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('Custom choose update network error:', error)
    }
  }

  /**
   * 发送UDP请求（端口9011）- 通过后端中继
   */
  private async sendUDPUpdate(payload: CustomPayload) {
    try {
      const response = await fetch(`/custom-udp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`Custom UDP update failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('Custom UDP update network error:', error)
    }
  }

  /**
   * 获取散射节点列表
   */
  getCustomNodes(): Map<number, CustomNodeInfo> {
    return this.customNodes
  }

  /**
   * 检查是否正在运行
   */
  isSimulationRunning(): boolean {
    return this.isRunning
  }
}

// 导出单例
export const customSimulationService = new CustomSimulationService()

export type { CustomNodeInfo, ConnectedNode, CustomPayload, MultipathConfig }
