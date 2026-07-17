import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'

interface GFSKNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  gfsk_config?: {
    modulation_type: string
    txPower: number
    centerFreq: number
    k_factor: number
    satAltKm?: number
    radialVelocityMps?: number
    downlinkTxPowerDbw?: number
    bandwidthHz?: number
    rainRateMmh?: number
    maxRetransmissions?: number
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface GFSKPayload {
  node_id: number
  modulation_type: number
  session_id?: number
  sat_alt_km: number
  sat_lat: number
  sat_lon: number
  radial_velocity_mps: number
  freq_hz: number
  uplink_tx_power_dbw: number
  uplink_tx_gain_dbi: number
  satellite_rx_gain_dbi: number
  satellite_rx_noise_temp_k: number
  downlink_tx_power_dbw: number
  downlink_tx_gain_dbi: number
  ground_rx_gain_dbi: number
  ground_rx_noise_temp_k: number
  bandwidth_hz: number
  rolloff_factor: number
  rain_rate_mmh: number
  rician_k_db: number
  max_retransmissions: number
  gs1: { lat: number; lon: number; alt: number }
  gs2: { lat: number; lon: number; alt: number }
  payload: number[]
}

const DEFAULT_GFSK_RADIO = {
  uplinkTxGainDbi: 40.0,
  satelliteRxGainDbi: 32.0,
  satelliteRxNoiseTempK: 290.0,
  downlinkTxGainDbi: 40.0,
  groundRxGainDbi: 32.0,
  groundRxNoiseTempK: 290.0,
  rolloffFactor: 0.2,
}

class GFSKSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private gfskNodes: Map<number, GFSKNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 启动GFSK仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateGFSKNodes()
    }, 1000)
  }

  /**
   * 停止GFSK仿真
   */
  stopSimulation() {
    console.log('[GFSK] 停止GFSK仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[GFSK] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[GFSK] 仿真状态已设置为停止');
  }

  /**
   * 注册GFSK节点
   */
  registerGFSKNode(gfskNodeId: number, nodeInfo: GFSKNodeInfo) {
    this.gfskNodes.set(gfskNodeId, nodeInfo)
  }

  /**
   * 注销GFSK节点
   */
  unregisterGFSKNode(gfskNodeId: number) {
    this.gfskNodes.delete(gfskNodeId)
    this.connectedNodes.delete(gfskNodeId)
  }

  /**
   * 添加连接到GFSK节点的节点
   */
  addConnectedNode(gfskNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(gfskNodeId)) {
      this.connectedNodes.set(gfskNodeId, [])
    }
    const nodes = this.connectedNodes.get(gfskNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到GFSK节点的节点
   */
  removeConnectedNode(gfskNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(gfskNodeId)
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
   * 更新GFSK节点数据并发送HTTP请求
   */
  private async updateGFSKNodes() {
    if (this.gfskNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id ?? 101
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [gfskNodeId, gfskNode] of this.gfskNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(gfskNodeId)

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
        gfskNode
      )

      // 发送HTTP请求
      await this.sendGFSKUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   */
  private buildPayload(
    sessionId: number,
    rxNode: ConnectedNode,
    txNode: ConnectedNode,
    gfskNode: GFSKNodeInfo
  ): GFSKPayload {
    // 从持久化存储中读取最新的GFSK配置
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(gfskNode.id)

    // 三级回退：持久化数据 > 节点对象中的config > 默认值
    const modulationType = parseInt(
      persistedNodeData?.modulation_type ?? gfskNode.gfsk_config?.modulation_type ?? '2',
      10
    )
    const uplinkTxPowerDbw = persistedNodeData?.txPower ?? gfskNode.gfsk_config?.txPower ?? 10.0
    const downlinkTxPowerDbw =
      persistedNodeData?.downlinkTxPowerDbw ?? gfskNode.gfsk_config?.downlinkTxPowerDbw ?? 10.0
    const radialVelocityMps =
      persistedNodeData?.radialVelocityMps ?? gfskNode.gfsk_config?.radialVelocityMps ?? 0.0

    const satAltKm =
      persistedNodeData?.satAltKm ??
      gfskNode.gfsk_config?.satAltKm ??
      (gfskNode.geo.alt ? gfskNode.geo.alt / 1000 : 35786.0)

    // centerFreq单位为MHz，需要转换为Hz（乘以1,000,000）
    let centerFreq = persistedNodeData?.centerFreq ?? gfskNode.gfsk_config?.centerFreq ?? 14000
    if (centerFreq < 1000000) {
      // 如果小于1MHz，说明是以MHz保存的，需要转换为Hz
      centerFreq = centerFreq * 1000000
    }

    // 带宽单位为MHz时转换为Hz
    let bandwidthHz =
      persistedNodeData?.bandwidthHz ?? gfskNode.gfsk_config?.bandwidthHz ?? 36000000
    if (bandwidthHz < 1000000) {
      bandwidthHz = bandwidthHz * 1000000
    }

    const kFactor = persistedNodeData?.k_factor ?? gfskNode.gfsk_config?.k_factor ?? -1.0
    const rainRateMmh = persistedNodeData?.rainRateMmh ?? gfskNode.gfsk_config?.rainRateMmh ?? 0.0
    const maxRetransmissionsRaw =
      persistedNodeData?.maxRetransmissions ?? gfskNode.gfsk_config?.maxRetransmissions ?? 0
    const maxRetransmissions = Math.min(16, Math.max(0, maxRetransmissionsRaw))

    return {
      session_id: sessionId,
      node_id: gfskNode.id ?? 1,
      modulation_type: modulationType,
      sat_alt_km: satAltKm,
      sat_lat: gfskNode.geo.lat,
      sat_lon: gfskNode.geo.lon,
      radial_velocity_mps: radialVelocityMps,
      freq_hz: centerFreq,
      uplink_tx_power_dbw: uplinkTxPowerDbw,
      uplink_tx_gain_dbi: DEFAULT_GFSK_RADIO.uplinkTxGainDbi,
      satellite_rx_gain_dbi: DEFAULT_GFSK_RADIO.satelliteRxGainDbi,
      satellite_rx_noise_temp_k: DEFAULT_GFSK_RADIO.satelliteRxNoiseTempK,
      downlink_tx_power_dbw: downlinkTxPowerDbw,
      downlink_tx_gain_dbi: DEFAULT_GFSK_RADIO.downlinkTxGainDbi,
      ground_rx_gain_dbi: DEFAULT_GFSK_RADIO.groundRxGainDbi,
      ground_rx_noise_temp_k: DEFAULT_GFSK_RADIO.groundRxNoiseTempK,
      bandwidth_hz: bandwidthHz,
      rolloff_factor: DEFAULT_GFSK_RADIO.rolloffFactor,
      rain_rate_mmh: rainRateMmh,
      rician_k_db: kFactor,
      max_retransmissions: maxRetransmissions,
      gs1: {
        lat: txNode.geo.lat,
        lon: txNode.geo.lon,
        alt: txNode.geo.alt,
      },
      gs2: {
        lat: rxNode.geo.lat,
        lon: rxNode.geo.lon,
        alt: rxNode.geo.alt,
      },
      payload: this.generateRandomPayload(450),
    }
  }

  /**
   * 发送HTTP请求更新GFSK模型
   */
  private async sendGFSKUpdate(payload: GFSKPayload) {
    try {
      const response = await fetch('/gfsk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`GFSK update failed: ${response.status} ${response.statusText}`)
      } else {
        try {
          const latestResponse = await fetch('/gfsk-latest', { method: 'GET' })
          if (latestResponse.ok) {
            const responseData = await latestResponse.json()
            if (responseData && this.onDataReceived) {
              this.onDataReceived(payload.node_id, responseData)
            }
          } else {
            console.warn(`[GFSK] GET /gfsk-latest failed: ${latestResponse.status}`)
          }
        } catch (parseError) {
          console.warn('[GFSK] 获取最新卫星模型结果失败', parseError)
        }
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('GFSK update network error:', error)
    }
  }

  /**
   * 获取GFSK节点列表
   */
  getGFSKNodes(): Map<number, GFSKNodeInfo> {
    return this.gfskNodes
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
    const nodeCount = this.gfskNodes.size
    const connectionCount = this.connectedNodes.size

    this.gfskNodes.clear()
    this.connectedNodes.clear()

    console.log(`[GFSK] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }}

// 导出单例
export const gfskSimulationService = new GFSKSimulationService()

export type { GFSKNodeInfo, ConnectedNode, GFSKPayload }
