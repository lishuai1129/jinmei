import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'

interface DSSNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  dss_config?: {
    mode?: 'hopping' | 'fixed'
    adaptive?: boolean
    modulation_type: string
    txPower: number
    centerFreq: number
    k_factor: number
    speed?: number
    transmissionDelay?: number
    networkTransmissionRateBps?: number
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface DSSPayload {
  session_id: number
  node_id: number
  eth_info: number
  mode: 'hopping' | 'fixed'
  adaptive: boolean
  modulation_type: number
  relay_capability: boolean
  network_delay_ms: number
  network_transmission_rate_bps: number
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
  data: {
    original_bits: number[]
  }
}

class DSSSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private dssNodes: Map<number, DSSNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 启动DSSS仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateDSSNodes()
    }, 1000)
  }

  /**
   * 停止DSSS仿真
   */
  stopSimulation() {
    console.log('[DSSS] 停止DSSS仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[DSSS] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[DSSS] 仿真状态已设置为停止');
  }

  /**
   * 注册DSSS节点
   */
  registerDSSNode(dssNodeId: number, nodeInfo: DSSNodeInfo) {
    this.dssNodes.set(dssNodeId, nodeInfo)
  }

  /**
   * 注销DSSS节点
   */
  unregisterDSSNode(dssNodeId: number) {
    this.dssNodes.delete(dssNodeId)
    this.connectedNodes.delete(dssNodeId)
  }

  /**
   * 添加连接到DSSS节点的节点
   */
  addConnectedNode(dssNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(dssNodeId)) {
      this.connectedNodes.set(dssNodeId, [])
    }
    const nodes = this.connectedNodes.get(dssNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到DSSS节点的节点
   */
  removeConnectedNode(dssNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(dssNodeId)
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
  private generateRandomBits(length: number = 8): number[] {
    return Array.from({ length }, () => Math.round(Math.random()))
  }

  /**
   * 更新DSSS节点数据并发送HTTP请求
   */
  private async updateDSSNodes() {
    if (this.dssNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id ?? 101
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [dssNodeId, dssNode] of this.dssNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(dssNodeId)

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
        dssNode
      )

      // 发送HTTP请求
      await this.sendDSSUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   * 从持久化存储中读取最新的配置参数
   */
  private buildPayload(
    sessionId: number,
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    dssNode: DSSNodeInfo
  ): DSSPayload {
    // 从持久化存储中读取最新的DSS配置
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(dssNode.id)

    // 优先使用持久化存储中的配置，其次使用内存中的dssNode配置，最后使用默认值
    const dssConfig = persistedNodeData || dssNode.dss_config

    const mode = dssConfig?.mode ?? dssNode.dss_config?.mode ?? 'fixed'
    const adaptive = dssConfig?.adaptive ?? dssNode.dss_config?.adaptive ?? false
    const modulationType = parseInt(dssConfig?.modulation_type ?? dssNode.dss_config?.modulation_type ?? '1', 10)
    const txPower = dssConfig?.txPower ?? dssNode.dss_config?.txPower ?? 43.0
    // centerFreq可能已经以Hz形式保存，也可能需要转换
    let centerFreq = dssConfig?.centerFreq ?? dssNode.dss_config?.centerFreq ?? 7 * 1000000
    if (centerFreq < 1000000) {
      // 如果小于1MHz，说明是以MHz保存的，需要转换为Hz
      centerFreq = centerFreq * 1000000
    }
    // K因子从持久化存储读取，确保使用用户保存的值而不是硬编码默认值
    const kFactor = dssConfig?.k_factor ?? dssNode.dss_config?.k_factor ?? 5.0
    const speed = dssConfig?.speed ?? dssNode.dss_config?.speed ?? 10.0
    const networkDelayMs = dssConfig?.transmissionDelay ?? dssNode.dss_config?.transmissionDelay ?? 10.0
    const networkTransmissionRateBps =
      dssConfig?.networkTransmissionRateBps ?? dssNode.dss_config?.networkTransmissionRateBps ?? 1000.0

    return {
      session_id: sessionId,
      node_id: rxNode.id,
      eth_info: rxNode.ethId ?? 0,
      mode: mode,
      adaptive: adaptive,
      modulation_type: modulationType,
      relay_capability: false,
      network_delay_ms: networkDelayMs,
      network_transmission_rate_bps: networkTransmissionRateBps,
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
      },
      data: {
        original_bits: this.generateRandomBits(8),
      },
    }
  }

  /**
   * 发送HTTP请求更新DSSS模型
   */
  private async sendDSSUpdate(payload: DSSPayload) {
    try {
      const response = await fetch('/dsss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`DSSS update failed: ${response.status} ${response.statusText}`)
      } else {
        try {
          const latestResponse = await fetch('/dsss-latest', { method: 'GET' })
          if (latestResponse.ok) {
            const responseData = await latestResponse.json()
            if (responseData && this.onDataReceived) {
              this.onDataReceived(payload.node_id, responseData)
            }
          } else {
            console.warn(`[DSSS] GET /dsss-latest failed: ${latestResponse.status}`)
          }
        } catch (parseError) {
          console.warn('[DSSS] 获取最新短波模型结果失败', parseError)
        }
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('DSSS update network error:', error)
    }
  }

  /**
   * 获取DSSS节点列表
   */
  getDSSNodes(): Map<number, DSSNodeInfo> {
    return this.dssNodes
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
    const nodeCount = this.dssNodes.size
    const connectionCount = this.connectedNodes.size

    this.dssNodes.clear()
    this.connectedNodes.clear()

    console.log(`[DSS] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }
}

// 导出单例
export const dssSimulationService = new DSSSimulationService()

export type { DSSNodeInfo, ConnectedNode, DSSPayload }
