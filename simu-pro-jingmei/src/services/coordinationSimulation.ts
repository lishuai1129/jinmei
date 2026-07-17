import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'
import { useTransmissionConfigStore } from '@/store/modules/transmissionConfig'

interface CoordinationNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  coordination_config?: {
    mode: 'hopping' | 'fixed'
    adaptive: boolean
    txPower: number
    centerFreq: number
    k_factor: number
    speed?: number
    samplingRate?: number
    dataRateKbps?: number
    multipath?: Array<{ power_db: number; delay_us: number; freq_offset: number }>
    transmissionDelayMs?: number
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface CoordinationPayload {
  model: 'xtl'
  node_id: number
  mode: 'hopping' | 'fixed'
  adaptive: boolean
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
    samplingRate: number
    dataRateKbps: number
    transmissionDelayMs: number
    multipath: Array<{ power_db: number; delay_us: number; freq_offset: number }>
  }
  payload: number[]
}

class CoordinationSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private coordinationNodes: Map<number, CoordinationNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private readonly PORT = 9006
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  /**
   * 设置HTTP响应数据回调
   */
  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 启动协同链仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateCoordinationNodes()
    }, 1000)
  }

  /**
   * 停止协同链仿真
   */
  stopSimulation() {
    console.log('[Coordination] 停止协同链仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[Coordination] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[Coordination] 仿真状态已设置为停止');
  }

  /**
   * 注册协同链节点
   */
  registerCoordinationNode(coordinationNodeId: number, nodeInfo: CoordinationNodeInfo) {
    this.coordinationNodes.set(coordinationNodeId, nodeInfo)
  }

  /**
   * 注销协同链节点
   */
  unregisterCoordinationNode(coordinationNodeId: number) {
    this.coordinationNodes.delete(coordinationNodeId)
    this.connectedNodes.delete(coordinationNodeId)
  }

  /**
   * 添加连接到协同链节点的节点
   */
  addConnectedNode(coordinationNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(coordinationNodeId)) {
      this.connectedNodes.set(coordinationNodeId, [])
    }
    const nodes = this.connectedNodes.get(coordinationNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到协同链节点的节点
   */
  removeConnectedNode(coordinationNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(coordinationNodeId)
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
   * 更新协同链节点数据并发送HTTP请求
   */
  private async updateCoordinationNodes() {
    if (this.coordinationNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [coordinationNodeId, coordinationNode] of this.coordinationNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(coordinationNodeId)

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
        rxNode,
        txNode,
        coordinationNode
      )

      // 发送HTTP请求
      await this.sendCoordinationUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   */
  private buildPayload(
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    coordinationNode: CoordinationNodeInfo
  ): CoordinationPayload {
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(coordinationNode.id)
    const transmissionConfigStore = useTransmissionConfigStore()

    const mode = persistedNodeData?.mode ?? coordinationNode.coordination_config?.mode ?? 'hopping'
    const adaptive = persistedNodeData?.adaptive ?? coordinationNode.coordination_config?.adaptive ?? true
    const txPower = persistedNodeData?.txPower ?? coordinationNode.coordination_config?.txPower ?? 43.0
    // 协同链频率范围：225MHz～700MHz，默认462MHz
    let centerFreq = persistedNodeData?.centerFreq ?? coordinationNode.coordination_config?.centerFreq ?? 462
    if (centerFreq < 1000000) {
      centerFreq = centerFreq * 1000000
    }
    const kFactor = persistedNodeData?.k_factor ?? coordinationNode.coordination_config?.k_factor ?? 10.0
    const speed = persistedNodeData?.speed ?? coordinationNode.coordination_config?.speed ?? 300.0
    const samplingRate = persistedNodeData?.samplingRate ?? coordinationNode.coordination_config?.samplingRate ?? 4000000.0
    const dataRateKbps = persistedNodeData?.dataRateKbps ?? coordinationNode.coordination_config?.dataRateKbps ?? 2000.0
    const transmissionDelayMs = transmissionConfigStore.getNodeTransmissionDelay(coordinationNode.id)
      ?? persistedNodeData?.transmissionDelay
      ?? coordinationNode.coordination_config?.transmissionDelayMs
      ?? 5.0
    const DEFAULT_MULTIPATH = [
      { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
      { power_db: -3.0, delay_us: 0.5, freq_offset: 30.0 },
      { power_db: -8.0, delay_us: 2.0, freq_offset: -50.0 },
    ]
    const multipath = (persistedNodeData?.multipath ?? coordinationNode.coordination_config?.multipath ?? DEFAULT_MULTIPATH)
      .map((p: any) => ({ power_db: p.power_db ?? 0, delay_us: p.delay_us ?? 0, freq_offset: p.freq_offset ?? 0 }))

    return {
      model: 'xtl',
      node_id: rxNode.id,
      mode: mode,
      adaptive: adaptive,
      phy: {
        txLat: txNode.geo.lat,
        txLon: txNode.geo.lon,
        txAlt: txNode.geo.alt,
        rxLat: rxNode.geo.lat,
        rxLon: rxNode.geo.lon,
        rxAlt: rxNode.geo.alt,
        speed: speed,
        txPower: txPower,
        centerFreq: centerFreq,
        k_factor: kFactor,
        samplingRate: samplingRate,
        dataRateKbps: dataRateKbps,
        transmissionDelayMs: transmissionDelayMs,
        multipath: multipath,
      },
      payload: this.generateRandomPayload(6),
    }
  }

  /**
   * 发送HTTP请求更新协同链模型
   */
  private async sendCoordinationUpdate(payload: CoordinationPayload) {
    try {
      const response = await fetch(`/coordination`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`Coordination update failed: ${response.status} ${response.statusText}`)
      } else {
        // POST触发计算后，GET拉取最新计算结果
        try {
          const latestResponse = await fetch('/coordination-latest', { method: 'GET' })
          if (latestResponse.ok) {
            const responseData = await latestResponse.json()
            if (responseData && this.onDataReceived) {
              this.onDataReceived(payload.node_id, responseData)
            }
          } else {
            console.warn(`[Coordination] GET /coordination-latest failed: ${latestResponse.status}`)
          }
        } catch (parseError) {
          console.warn('[Coordination] 获取最新计算结果失败:', parseError)
        }
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('Coordination update network error:', error)
    }
  }

  /**
   * 获取协同链节点列表
   */
  getCoordinationNodes(): Map<number, CoordinationNodeInfo> {
    return this.coordinationNodes
  }

  /**
   * 检查是否正在运行
   */
  isSimulationRunning(): boolean {
    return this.isRunning
  }

  /**
   * 获取端口号
   */
  getPort(): number {
    return this.PORT
  }

  /**
   * 获取已连接的节点映射（用于NodeInfoPanel访问）
   */
  getConnectedNodes(): Map<number, ConnectedNode[]> {
    return this.connectedNodes
  }

  /**
   * 清除所有已注册的节点和连接关系
   */
  clearAllNodes() {
    const nodeCount = this.coordinationNodes.size
    const connectionCount = this.connectedNodes.size
    this.coordinationNodes.clear()
    this.connectedNodes.clear()
    console.log(`[Coordination] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }
}

// 导出单例
export const coordinationSimulationService = new CoordinationSimulationService()

export type { CoordinationNodeInfo, ConnectedNode, CoordinationPayload }
