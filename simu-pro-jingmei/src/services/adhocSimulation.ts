import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'
import { useTransmissionConfigStore } from '@/store/modules/transmissionConfig'

interface AdHocNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  adhoc_config?: {
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

interface AdHocPayload {
  model: 'zzw'
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

class AdHocSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private adhocNodes: Map<number, AdHocNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private readonly PORT = 9005
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  /**
   * 设置HTTP响应数据回调
   */
  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 启动自组网仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateAdHocNodes()
    }, 1000)
  }

  /**
   * 停止自组网仿真
   */
  stopSimulation() {
    console.log('[AdHoc] 停止自组网仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[AdHoc] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[AdHoc] 仿真状态已设置为停止');
  }

  /**
   * 注册自组网节点
   */
  registerAdHocNode(adhocNodeId: number, nodeInfo: AdHocNodeInfo) {
    this.adhocNodes.set(adhocNodeId, nodeInfo)
  }

  /**
   * 注销自组网节点
   */
  unregisterAdHocNode(adhocNodeId: number) {
    this.adhocNodes.delete(adhocNodeId)
    this.connectedNodes.delete(adhocNodeId)
  }

  /**
   * 添加连接到自组网节点的节点
   */
  addConnectedNode(adhocNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(adhocNodeId)) {
      this.connectedNodes.set(adhocNodeId, [])
    }
    const nodes = this.connectedNodes.get(adhocNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到自组网节点的节点
   */
  removeConnectedNode(adhocNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(adhocNodeId)
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
  private generateRandomPayload(length: number = 100): number[] {
    return Array.from({ length }, () => Math.floor(Math.random() * 256))
  }

  /**
   * 更新自组网节点数据并发送HTTP请求
   */
  private async updateAdHocNodes() {
    if (this.adhocNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [adhocNodeId, adhocNode] of this.adhocNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(adhocNodeId)

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
        adhocNode
      )

      // 发送HTTP请求
      await this.sendAdHocUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   */
  private buildPayload(
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    adhocNode: AdHocNodeInfo
  ): AdHocPayload {
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(adhocNode.id)
    const transmissionConfigStore = useTransmissionConfigStore()

    const mode = persistedNodeData?.mode ?? adhocNode.adhoc_config?.mode ?? 'hopping'
    const adaptive = persistedNodeData?.adaptive ?? adhocNode.adhoc_config?.adaptive ?? true
    const txPower = persistedNodeData?.txPower ?? adhocNode.adhoc_config?.txPower ?? 30.0
    // 自组网频率范围：225MHz～700MHz，默认462MHz
    let centerFreq = persistedNodeData?.centerFreq ?? adhocNode.adhoc_config?.centerFreq ?? 462
    if (centerFreq < 1000000) {
      centerFreq = centerFreq * 1000000
    }
    const kFactor = persistedNodeData?.k_factor ?? adhocNode.adhoc_config?.k_factor ?? 10.0
    const speed = persistedNodeData?.speed ?? adhocNode.adhoc_config?.speed ?? 300.0
    const samplingRate = persistedNodeData?.samplingRate ?? adhocNode.adhoc_config?.samplingRate ?? 4000000.0
    const dataRateKbps = persistedNodeData?.dataRateKbps ?? adhocNode.adhoc_config?.dataRateKbps ?? 2000.0
    const transmissionDelayMs = transmissionConfigStore.getNodeTransmissionDelay(adhocNode.id)
      ?? persistedNodeData?.transmissionDelay
      ?? adhocNode.adhoc_config?.transmissionDelayMs
      ?? 5.0
    const DEFAULT_MULTIPATH = [
      { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
      { power_db: -3.0, delay_us: 0.5, freq_offset: 30.0 },
      { power_db: -8.0, delay_us: 2.0, freq_offset: -50.0 },
    ]
    const multipath = (persistedNodeData?.multipath ?? adhocNode.adhoc_config?.multipath ?? DEFAULT_MULTIPATH)
      .map((p: any) => ({ power_db: p.power_db ?? 0, delay_us: p.delay_us ?? 0, freq_offset: p.freq_offset ?? 0 }))

    return {
      model: 'zzw',
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
   * 发送HTTP请求更新自组网模型
   */
  private async sendAdHocUpdate(payload: AdHocPayload) {
    try {
      const response = await fetch(`/adhoc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`AdHoc update failed: ${response.status} ${response.statusText}`)
      } else {
        // POST触发计算后，GET拉取最新计算结果
        try {
          const latestResponse = await fetch('/adhoc-latest', { method: 'GET' })
          if (latestResponse.ok) {
            const responseData = await latestResponse.json()
            if (responseData && this.onDataReceived) {
              this.onDataReceived(payload.node_id, responseData)
            }
          } else {
            console.warn(`[AdHoc] GET /adhoc-latest failed: ${latestResponse.status}`)
          }
        } catch (parseError) {
          console.warn('[AdHoc] 获取最新计算结果失败:', parseError)
        }
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('AdHoc update network error:', error)
    }
  }

  /**
   * 获取自组网节点列表
   */
  getAdHocNodes(): Map<number, AdHocNodeInfo> {
    return this.adhocNodes
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
   * 用于仿真停止后彻底清理状态，避免下次启动时的状态混乱
   */
  clearAllNodes() {
    const nodeCount = this.adhocNodes.size
    const connectionCount = this.connectedNodes.size

    this.adhocNodes.clear()
    this.connectedNodes.clear()

    console.log(`[AdHoc] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }
}

// 导出单例
export const adhocSimulationService = new AdHocSimulationService()

export type { AdHocNodeInfo, ConnectedNode, AdHocPayload }
