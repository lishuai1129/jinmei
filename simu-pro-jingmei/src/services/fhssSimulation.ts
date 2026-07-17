import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'

interface FHSSNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  fhss_config?: {
    modulation_type: string
    txPower: number
    centerFreq: number
    k_factor: number
    speed?: number
    noiseFigureDb?: number
    shadowFadingDb?: number
    seed?: number
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface FHSSPayload {
  session_id: number
  node_id: number
  eth_info: number
  modulation_type: number
  signal_type: string
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
    noiseFigureDb: number
    shadowFadingDb: number
    seed: number
  }
  payload: number[]
}

class FHSSSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private fhssNodes: Map<number, FHSSNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  private normalizeCenterFreqHz(centerFreq: number): number {
    const maxFhssKHz = 50000
    const maxFhssHz = maxFhssKHz * 1000

    if (centerFreq <= maxFhssKHz) {
      return centerFreq * 1000
    }

    if (centerFreq <= maxFhssHz) {
      return centerFreq
    }

    // 兼容旧版本按 MHz 乘 1_000_000 保存的中长波频率。
    return centerFreq / 1000
  }

  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 启动FHSS仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateFHSSNodes()
    }, 1000)
  }

  /**
   * 停止FHSS仿真
   */
  stopSimulation() {
    console.log('[FHSS] 停止FHSS仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[FHSS] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[FHSS] 仿真状态已设置为停止');
  }

  /**
   * 注册FHSS节点
   */
  registerFHSSNode(fhssNodeId: number, nodeInfo: FHSSNodeInfo) {
    this.fhssNodes.set(fhssNodeId, nodeInfo)
  }

  /**
   * 注销FHSS节点
   */
  unregisterFHSSNode(fhssNodeId: number) {
    this.fhssNodes.delete(fhssNodeId)
    this.connectedNodes.delete(fhssNodeId)
  }

  /**
   * 添加连接到FHSS节点的节点
   */
  addConnectedNode(fhssNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(fhssNodeId)) {
      this.connectedNodes.set(fhssNodeId, [])
    }
    const nodes = this.connectedNodes.get(fhssNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到FHSS节点的节点
   */
  removeConnectedNode(fhssNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(fhssNodeId)
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
  private generateRandomPayload(length: number = 256): number[] {
    return Array.from({ length }, () => Math.floor(Math.random() * 2))
  }

  /**
   * 更新FHSS节点数据并发送HTTP请求
   */
  private async updateFHSSNodes() {
    if (this.fhssNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id ?? 101
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [fhssNodeId, fhssNode] of this.fhssNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(fhssNodeId)

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
        fhssNode
      )

      // 发送HTTP请求
      await this.sendFHSSUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   */
  private buildPayload(
    sessionId: number,
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    fhssNode: FHSSNodeInfo
  ): FHSSPayload {
    // 从持久化存储中读取最新的FHSS配置
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(fhssNode.id)

    // 三级回退：持久化数据 > 节点对象中的config > 默认值
    const rawModulationType = parseInt(
      persistedNodeData?.modulation_type ?? fhssNode.fhss_config?.modulation_type ?? '2',
      10
    )
    // FHSS only supports AM(1), SSB(2), and 2FSK(3).
    const modulationType = rawModulationType === 1 || rawModulationType === 2 || rawModulationType === 3
      ? rawModulationType
      : 2
    const txPower = persistedNodeData?.txPower ?? fhssNode.fhss_config?.txPower ?? 30.0
    const speed = persistedNodeData?.speed ?? persistedNodeData?.phy?.speed ?? fhssNode.fhss_config?.speed ?? 30.0
    const noiseFigureDb =
      persistedNodeData?.noiseFigureDb ?? persistedNodeData?.phy?.noiseFigureDb ?? fhssNode.fhss_config?.noiseFigureDb ?? 7.0
    const shadowFadingDb =
      persistedNodeData?.shadowFadingDb ?? persistedNodeData?.phy?.shadowFadingDb ?? fhssNode.fhss_config?.shadowFadingDb ?? 2.5
    const seed =
      persistedNodeData?.seed ?? persistedNodeData?.phy?.seed ?? fhssNode.fhss_config?.seed ?? 1234
    // centerFreq单位为MHz，需要转换为Hz（乘以1,000,000）
    let centerFreq = persistedNodeData?.centerFreq ?? fhssNode.fhss_config?.centerFreq ?? 2400
    if (centerFreq < 1000000) {
      // 如果小于1MHz，说明是以MHz保存的，需要转换为Hz
      centerFreq = centerFreq * 1000000
      centerFreq = this.normalizeCenterFreqHz(centerFreq)
    }
    centerFreq = this.normalizeCenterFreqHz(centerFreq)
    const kFactor = persistedNodeData?.k_factor ?? fhssNode.fhss_config?.k_factor ?? 10.0  // K因子，单位为dB，默认10dB

    return {
      session_id: sessionId,
      node_id: rxNode.id,
      eth_info: rxNode.ethId ?? 1,
      modulation_type: modulationType,
      signal_type: 'digital',
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
        noiseFigureDb: noiseFigureDb,
        shadowFadingDb: shadowFadingDb,
        seed: seed,
      },
      payload: this.generateRandomPayload(256),
    }
  }

  /**
   * 发送HTTP请求更新FHSS模型
   */
  private async sendFHSSUpdate(payload: FHSSPayload) {
    try {
      const response = await fetch('/fhss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`FHSS update failed: ${response.status} ${response.statusText}`)
      } else {
        try {
          const latestResponse = await fetch('/fhss-latest', { method: 'GET' })
          if (latestResponse.ok) {
            const responseData = await latestResponse.json()
            if (responseData && this.onDataReceived) {
              this.onDataReceived(payload.node_id, responseData)
            }
          } else {
            console.warn(`[FHSS] GET /fhss-latest failed: ${latestResponse.status}`)
          }
        } catch (parseError) {
          console.warn('[FHSS] 获取最新中长波模型结果失败', parseError)
        }
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('FHSS update network error:', error)
    }
  }

  /**
   * 获取FHSS节点列表
   */
  getFHSSNodes(): Map<number, FHSSNodeInfo> {
    return this.fhssNodes
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
    const nodeCount = this.fhssNodes.size
    const connectionCount = this.connectedNodes.size

    this.fhssNodes.clear()
    this.connectedNodes.clear()

    console.log(`[FHSS] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }}

// 导出单例
export const fhssSimulationService = new FHSSSimulationService()

export type { FHSSNodeInfo, ConnectedNode, FHSSPayload }
