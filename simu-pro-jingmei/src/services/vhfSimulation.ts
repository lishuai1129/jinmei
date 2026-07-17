import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'
import { useTransmissionConfigStore } from '@/store/modules/transmissionConfig'

interface VHFNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  vhf_config?: {
    modulation_type: string
    txPower: number
    centerFreq: number
    k_factor: number
    speed?: number
    samplingRate?: number
    snr_db?: number
    multipath?: MultipathConfig[]
  }
  ethId?: number
}

interface ConnectedNode {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  ethId?: number
}

interface MultipathConfig {
  power_db: number
  delay_us: number
  freq_offset: number
  snr_db?: number
}

interface PayloadMultipathConfig {
  power_db: number
  delay_us: number
  freq_offset: number
}

interface VHFPayload {
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
    snr_db: number
    multipath: PayloadMultipathConfig[]
    dataRateKbps: number
    transmissionDelayMs: number
  }
  payload: number[]
}

class VHFSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private isMockMode: boolean = false
  private isRunning: boolean = false
  private vhfNodes: Map<number, VHFNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  enableMockMode() { this.isMockMode = true }
  disableMockMode() { this.isMockMode = false }

  /**
   * 启动VHF仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateVHFNodes()
    }, 1000)
  }

  /**
   * 停止VHF仿真
   */
  stopSimulation() {
    console.log('[VHF] 停止VHF仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[VHF] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[VHF] 仿真状态已设置为停止');
  }

  /**
   * 注册VHF节点
   */
  registerVHFNode(vhfNodeId: number, nodeInfo: VHFNodeInfo) {
    this.vhfNodes.set(vhfNodeId, nodeInfo)
  }

  /**
   * 注销VHF节点
   */
  unregisterVHFNode(vhfNodeId: number) {
    this.vhfNodes.delete(vhfNodeId)
    this.connectedNodes.delete(vhfNodeId)
  }

  /**
   * 添加连接到VHF节点的节点
   */
  addConnectedNode(vhfNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(vhfNodeId)) {
      this.connectedNodes.set(vhfNodeId, [])
    }
    const nodes = this.connectedNodes.get(vhfNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到VHF节点的节点
   */
  removeConnectedNode(vhfNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(vhfNodeId)
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
   * 更新VHF节点数据并发送HTTP请求
   */
  private async updateVHFNodes() {
    if (this.vhfNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [vhfNodeId, vhfNode] of this.vhfNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(vhfNodeId)

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

      const payload = this.buildPayload(rxNode, txNode, vhfNode)

      // 发送HTTP请求
      await this.sendVHFUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   * 从持久化存储中读取最新的配置参数
   */
  private buildPayload(rxNode: ConnectedNode, txNode: ConnectedNode, vhfNode: VHFNodeInfo): VHFPayload {
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(vhfNode.id)
    const vhfConfig = persistedNodeData || vhfNode.vhf_config

    const rawModulationType = parseInt(
      vhfConfig?.modulation_type ?? vhfNode.vhf_config?.modulation_type ?? '2',
      10
    )
    const modulationType = [0, 1, 2, 3, 7].includes(rawModulationType) ? rawModulationType : 2
    const txPower = vhfConfig?.txPower ?? vhfNode.vhf_config?.txPower ?? 30.0
    let centerFreq = vhfConfig?.centerFreq ?? vhfNode.vhf_config?.centerFreq ?? 150 * 1000000
    if (centerFreq < 1000000) centerFreq = centerFreq * 1000000
    const kFactor = vhfConfig?.k_factor ?? vhfNode.vhf_config?.k_factor ?? 10.0
    const speed = vhfConfig?.speed ?? persistedNodeData?.phy?.speed ?? vhfNode.vhf_config?.speed ?? 20.0
    let samplingRate =
      vhfConfig?.samplingRate ??
      persistedNodeData?.phy?.samplingRate ??
      vhfNode.vhf_config?.samplingRate ??
      200000
    if (samplingRate > 0 && samplingRate < 1000) samplingRate = samplingRate * 1000000
    const snr_db =
      vhfConfig?.snr_db ??
      persistedNodeData?.phy?.snr_db ??
      vhfNode.vhf_config?.snr_db ??
      20.0
    const multipath =
      vhfConfig?.multipath ??
      persistedNodeData?.phy?.multipath ??
      vhfNode.vhf_config?.multipath ??
      [
        { power_db: 0.0, delay_us: 0.0, freq_offset: 0.0, snr_db: 30.0 },
        { power_db: -3.0, delay_us: 5.0, freq_offset: 50.0, snr_db: 20.0 },
        { power_db: -6.0, delay_us: 10.0, freq_offset: -20.0, snr_db: 20.0 },
      ]
    const payloadMultipath = multipath.map((path: MultipathConfig) => ({
      power_db: Number(path.power_db ?? 0),
      delay_us: Number(path.delay_us ?? 0),
      freq_offset: Number(path.freq_offset ?? 0),
    }))

    const transmissionConfigStore = useTransmissionConfigStore()
    const dataRateKbps = vhfConfig?.dataRateKbps ?? persistedNodeData?.dataRateKbps ?? 13.0
    const transmissionDelayMs =
      transmissionConfigStore.getNodeTransmissionDelay(vhfNode.id) ??
      vhfConfig?.transmissionDelay ??
      0.0

    return {
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
        snr_db: snr_db,
        multipath: payloadMultipath,
        dataRateKbps: dataRateKbps,
        transmissionDelayMs: transmissionDelayMs,
      },
      payload: this.generateRandomPayload(450),
    }
  }

  /**
   * 发送HTTP请求更新VHF模型
   */
  private async sendVHFUpdate(payload: VHFPayload) {
    if (this.isMockMode) return

    try {
      const response = await fetch('/vhf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`VHF update failed: ${response.status} ${response.statusText}`)
        return
      }

      try {
        const latestResponse = await fetch('/vhf-latest', { method: 'GET' })
        if (latestResponse.ok) {
          const responseData = await latestResponse.json()
          if (responseData && this.onDataReceived) {
            this.onDataReceived(payload.node_id, responseData)
          }
        } else {
          console.warn(`[VHF] GET /vhf-latest failed: ${latestResponse.status}`)
        }
      } catch (parseError) {
        console.warn('[VHF] 获取最新计算结果失败:', parseError)
      }
    } catch (error) {
      console.error('VHF update network error:', error)
    }
  }
  //   private async sendCoordinationUpdate(payload: CoordinationPayload) {
  //   try {
  //     const response = await fetch(`/coordination`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(payload),
  //     })

  //     if (!response.ok) {
  //       console.warn(`Coordination update failed: ${response.status} ${response.statusText}`)
  //     }
  //   } catch (error) {
  //     // 网络错误时静默处理，不中断仿真
  //     console.error('Coordination update network error:', error)
  //   }
  // }


  /**
   * 获取VHF节点列表
   */
  getVHFNodes(): Map<number, VHFNodeInfo> {
    return this.vhfNodes
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
    const nodeCount = this.vhfNodes.size
    const connectionCount = this.connectedNodes.size

    this.vhfNodes.clear()
    this.connectedNodes.clear()

    console.log(`[VHF] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }}

// 导出单例
export const vhfSimulationService = new VHFSimulationService()

export type { VHFNodeInfo, ConnectedNode, VHFPayload }
