import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'
import { useTransmissionConfigStore } from '@/store/modules/transmissionConfig'

interface MultipathEntry {
  power_db: number
  delay_us: number
  freq_offset: number
}

interface FiveGNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  fiveG_config?: {
    modulation_type: string
    txPower: number
    centerFreq: number
    k_factor: number
    speed?: number
    samplingRate?: number
    dataRateKbps?: number
    transmissionDelayMs?: number
    multipath?: MultipathEntry[]
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface FiveGPayload {
  model: string
  node_id: number
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
    samplingRate: number
    dataRateKbps: number
    transmissionDelayMs: number
    multipath: MultipathEntry[]
  }
  payload: number[]
}

const DEFAULT_5G_MULTIPATH: MultipathEntry[] = [
  { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0 },
  { power_db: -3.0, delay_us: 0.2, freq_offset: 80.0 },
  { power_db: -8.0, delay_us: 0.8, freq_offset: -120.0 },
]

class FiveGSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private fiveGNodes: Map<number, FiveGNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  /**
   * 设置HTTP响应数据回调
   */
  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 启动5G仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateFiveGNodes()
    }, 1000)
  }

  /**
   * 停止5G仿真
   */
  stopSimulation() {
    console.log('[5G] 停止5G仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[5G] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[5G] 仿真状态已设置为停止');
  }

  /**
   * 注册5G节点
   */
  registerFiveGNode(fiveGNodeId: number, nodeInfo: FiveGNodeInfo) {
    this.fiveGNodes.set(fiveGNodeId, nodeInfo)
  }

  /**
   * 注销5G节点
   */
  unregisterFiveGNode(fiveGNodeId: number) {
    this.fiveGNodes.delete(fiveGNodeId)
    this.connectedNodes.delete(fiveGNodeId)
  }

  /**
   * 添加连接到5G节点的节点
   */
  addConnectedNode(fiveGNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(fiveGNodeId)) {
      this.connectedNodes.set(fiveGNodeId, [])
    }
    const nodes = this.connectedNodes.get(fiveGNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到5G节点的节点
   */
  removeConnectedNode(fiveGNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(fiveGNodeId)
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
   * 更新5G节点数据并发送HTTP请求
   */
  private async updateFiveGNodes() {
    if (this.fiveGNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [fiveGNodeId, fiveGNode] of this.fiveGNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(fiveGNodeId)

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

      const payload = this.buildPayload(rxNode, txNode, fiveGNode)

      // 发送HTTP请求
      await this.sendFiveGUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   */
  private buildPayload(
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    fiveGNode: FiveGNodeInfo
  ): FiveGPayload {
    // 从持久化存储中读取最新的5G配置
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(fiveGNode.id)

    // 三级回退：持久化数据 > 节点对象中的config > 默认值
    const rawModulationType = parseInt(
      persistedNodeData?.modulation_type ?? fiveGNode.fiveG_config?.modulation_type ?? '2',
      10
    )
    // 5G only supports QPSK(2) and 16QAM(4); map legacy 16QAM(3) to 4.
    const modulationType = rawModulationType === 4 ? 4 : rawModulationType === 2 ? 2 : rawModulationType === 3 ? 4 : 2
    const txPower = persistedNodeData?.txPower ?? fiveGNode.fiveG_config?.txPower ?? 30.0
    // centerFreq单位为Hz，若小于1MHz则视为MHz值转换
    let centerFreq = persistedNodeData?.centerFreq ?? fiveGNode.fiveG_config?.centerFreq ?? 3500000000
    if (centerFreq < 1000000) {
      centerFreq = centerFreq * 1000000
    }
    const kFactor = persistedNodeData?.k_factor ?? fiveGNode.fiveG_config?.k_factor ?? 3.0
    const speed = persistedNodeData?.speed ?? fiveGNode.fiveG_config?.speed ?? 10.0
    let samplingRate = persistedNodeData?.samplingRate ?? fiveGNode.fiveG_config?.samplingRate ?? 30720000
    if (samplingRate > 0 && samplingRate < 1000) {
      samplingRate = samplingRate * 1000000
    }
    const dataRateKbps = persistedNodeData?.dataRateKbps ?? fiveGNode.fiveG_config?.dataRateKbps ?? 130000.0

    const transmissionConfigStore = useTransmissionConfigStore()
    const transmissionDelayMs =
      transmissionConfigStore.getNodeTransmissionDelay(fiveGNode.id) ??
      persistedNodeData?.transmissionDelay ??
      fiveGNode.fiveG_config?.transmissionDelayMs ??
      5.0

    // multipath: strip snr_db if present (不发送给5G服务)
    const rawMultipath = persistedNodeData?.multipath ?? fiveGNode.fiveG_config?.multipath ?? DEFAULT_5G_MULTIPATH
    const multipath: MultipathEntry[] = rawMultipath.map((p: any) => ({
      power_db: p.power_db,
      delay_us: p.delay_us,
      freq_offset: p.freq_offset,
    }))

    return {
      model: '5g',
      node_id: rxNode.id,
      modulation_type: modulationType,
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
      payload: this.generateRandomPayload(8),
    }
  }

  /**
   * 发送HTTP请求更新5G模型
   */
  private async sendFiveGUpdate(payload: FiveGPayload) {
    try {
      const response = await fetch('/5g', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`5G update failed: ${response.status} ${response.statusText}`)
        return
      }

      // POST触发计算后，GET拉取最新计算结果
      try {
        const latestResponse = await fetch('/5g-latest', { method: 'GET' })
        if (latestResponse.ok) {
          const responseData = await latestResponse.json()
          if (responseData && this.onDataReceived) {
            this.onDataReceived(payload.node_id, responseData)
          }
        } else {
          console.warn(`[5G] GET /5g-latest failed: ${latestResponse.status}`)
        }
      } catch (parseError) {
        console.warn('[5G] 获取最新计算结果失败:', parseError)
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('5G update network error:', error)
    }
  }

  /**
   * 获取5G节点列表
   */
  getFiveGNodes(): Map<number, FiveGNodeInfo> {
    return this.fiveGNodes
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
    const nodeCount = this.fiveGNodes.size
    const connectionCount = this.connectedNodes.size

    this.fiveGNodes.clear()
    this.connectedNodes.clear()

    console.log(`[5G] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }}

// 导出单例
export const fiveGSimulationService = new FiveGSimulationService()

export type { FiveGNodeInfo, ConnectedNode, FiveGPayload, MultipathEntry }
