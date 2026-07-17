import { useTopoStore } from '@/store/modules/topo'
import { useChannelModelDataStore } from '@/store/modules/channelModelData'
import { useTransmissionConfigStore } from '@/store/modules/transmissionConfig'

interface UHFNodeInfo {
  id: number
  name: string
  geo: { lat: number; lon: number; alt: number }
  uhf_config?: {
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

interface UHFPayload {
  node_id: number
  modulation_type: number
  phy: {
    txLat: number
    txLon: number
    txAlt: number
    rxLat: number
    rxLon: number
    rxAlt: number
    speed: number //用于计算多普勒
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

class UHFSimulationService {
  private intervalId: NodeJS.Timeout | null = null
  private mockIntervalId: NodeJS.Timeout | null = null
  private isMockMode: boolean = false
  private isRunning: boolean = false
  private uhfNodes: Map<number, UHFNodeInfo> = new Map()
  private connectedNodes: Map<number, ConnectedNode[]> = new Map()
  private onDataReceived: ((nodeId: number, data: any) => void) | null = null

  /**
   * 设置HTTP响应数据回调，用于将接口返回数据存储到主应用
   */
  setDataReceivedCallback(cb: (nodeId: number, data: any) => void) {
    this.onDataReceived = cb
  }

  /**
   * 生成QPSK星座点（4个象限各若干个点）
   */
  private generateQPSKPoints(count: number): [number, number][] {
    const centers: [number, number][] = [[0.7, 0.7], [-0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]]
    return Array.from({ length: count }, (_, i) => {
      const [cx, cy] = centers[i % 4]
      const noise = () => (Math.random() - 0.5) * 0.15
      return [+(cx + noise()).toFixed(3), +(cy + noise()).toFixed(3)] as [number, number]
    })
  }

  /**
   * 生成mock UHF响应数据
   */
  private generateMockData(nodeId: number): any {
    const n = 64
    const snr = +(15 + Math.random() * 10).toFixed(2)
    const pathLoss = +(80 + Math.random() * 15).toFixed(2)
    return {
      channel_metrics: {
        large_scale: {
          total_loss_db: +(pathLoss + 3 + Math.random() * 2).toFixed(2),
          path_loss_db: pathLoss,
          shadowing_loss_db: +(2 + Math.random() * 3).toFixed(2),
          distance_m: +(800 + Math.random() * 400).toFixed(1),
        },
        small_scale: {
          fading_loss_db: +(1 + Math.random() * 4).toFixed(2),
          doppler_hz: +(40 + Math.random() * 30).toFixed(3),
          rician_k_db: +(3 + Math.random() * 2).toFixed(2),
        },
        link_quality: {
          snr_db: snr,
          bit_error_rate: +(0.001 * Math.exp(-snr / 10)).toFixed(6),
        },
        network_characteristics: {
          delay_ms: +(0.03 + Math.random() * 0.08).toFixed(4),
          bandwidth_limit_hz: 12500,
          packet_loss_rate: +(0.005 + Math.random() * 0.02).toFixed(4),
          transmission_rate_bps: 1000000,
        },
      },
      data: {
        original_bits: Array.from({ length: 128 }, () => Math.round(Math.random())),
        transmitter_iq: this.generateQPSKPoints(n).map(([i, q]) => [i * 0.7, q * 0.7]),
        receiver_iq: this.generateQPSKPoints(n).map(([i, q]) => [
          +(i + (Math.random() - 0.5) * 0.08).toFixed(3),
          +(q + (Math.random() - 0.5) * 0.08).toFixed(3),
        ]),
        constellation_after_channel: this.generateQPSKPoints(n),
        restored_constellation: this.generateQPSKPoints(n),
        spectrum_data: Array.from({ length: 64 }, (_, k) => ({
          frequency: k,
          magnitude: +(-45 - Math.random() * 15 + (Math.abs(k - 32) < 12 ? (12 - Math.abs(k - 32)) * 1.5 : 0)).toFixed(2),
        })),
      },
      node_id: nodeId,
      timestamp: Date.now(),
    }
  }

  /**
   * 启用mock模式 - 每秒生成一次假数据（用于UI调试）
   * nodeId: 指定rx节点ID，不传则使用第一个已连接节点
   */
  enableMockMode(nodeId?: number) {
    if (this.mockIntervalId) return
    const fire = () => {
      if (!this.onDataReceived) return
      // 确定nodeId
      let id = nodeId
      if (id === undefined) {
        // 用第一个UHF节点的第一个连接节点(rx)
        for (const [, nodes] of this.connectedNodes.entries()) {
          if (nodes.length >= 1) { id = nodes[0].id; break }
        }
      }
      if (id === undefined) return
      this.onDataReceived(id, this.generateMockData(id))
    }
    this.isMockMode = true
    fire() // 立即触发一次
    this.mockIntervalId = setInterval(fire, 3000)
    console.log('[UHF] Mock模式已启用，nodeId=', nodeId ?? 'auto')
  }

  /**
   * 关闭mock模式
   */
  disableMockMode() {
    this.isMockMode = false
    if (this.mockIntervalId) {
      clearInterval(this.mockIntervalId)
      this.mockIntervalId = null
      console.log('[UHF] Mock模式已关闭')
    }
  }

  /**
   * 启动UHF仿真
   */
  startSimulation() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // mock模式下不启动HTTP轮询interval
    if (this.isMockMode) return

    // 每秒发送一次数据更新
    this.intervalId = setInterval(() => {
      this.updateUHFNodes()
    }, 1000)
  }

  /**
   * 停止UHF仿真
   */
  stopSimulation() {
    console.log('[UHF] 停止UHF仿真，清理interval...');
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[UHF] interval已清理');
    }
    this.isRunning = false

    this.clearAllNodes()  // 清除所有节点和连接
    console.log('[UHF] 仿真状态已设置为停止');
  }

  /**
   * 注册UHF节点
   */
  registerUHFNode(uhfNodeId: number, nodeInfo: UHFNodeInfo) {
    this.uhfNodes.set(uhfNodeId, nodeInfo)
  }

  /**
   * 注销UHF节点
   */
  unregisterUHFNode(uhfNodeId: number) {
    this.uhfNodes.delete(uhfNodeId)
    this.connectedNodes.delete(uhfNodeId)
  }

  /**
   * 添加连接到UHF节点的节点
   */
  addConnectedNode(uhfNodeId: number, connectedNode: ConnectedNode) {
    if (!this.connectedNodes.has(uhfNodeId)) {
      this.connectedNodes.set(uhfNodeId, [])
    }
    const nodes = this.connectedNodes.get(uhfNodeId)!
    if (!nodes.find(n => n.id === connectedNode.id)) {
      nodes.push(connectedNode)
    }
  }

  /**
   * 移除连接到UHF节点的节点
   */
  removeConnectedNode(uhfNodeId: number, connectedNodeId: number) {
    const nodes = this.connectedNodes.get(uhfNodeId)
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
   * 更新UHF节点数据并发送HTTP请求
   */
  private async updateUHFNodes() {
    if (this.uhfNodes.size === 0) {
      return
    }

    if (this.connectedNodes.size === 0) {
      return
    }

    const topoStore = useTopoStore()
    const currentNodes = topoStore.topoData?.nodes || []

    for (const [uhfNodeId, uhfNode] of this.uhfNodes.entries()) {
      const connectedNodesList = this.connectedNodes.get(uhfNodeId)

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

      const payload = this.buildPayload(rxNode, txNode, uhfNode)

      // 调试日志：记录将要发送的节点信息和接收节点
      try {
        console.debug(`[UHF] 准备发送 UHF payload: uhfNode=${uhfNodeId}, rx=${rxNode.id}, tx=${txNode.id}`)
      } catch (e) {
        // ignore
      }

      // 发送HTTP请求
      await this.sendUHFUpdate(payload)
    }
  }

  /**
   * 构建payload对象
   * 从持久化存储中读取最新的配置参数
   */
  private buildPayload(rxNode: ConnectedNode, txNode: ConnectedNode, uhfNode: UHFNodeInfo): UHFPayload {
    // 从持久化存储中读取最新的UHF配置
    const channelModelDataStore = useChannelModelDataStore()
    const persistedNodeData = channelModelDataStore.getNodeData(uhfNode.id)

    // 优先使用持久化存储中的配置，其次使用内存中的uhfNode配置，最后使用默认值
    const uhfConfig = persistedNodeData || uhfNode.uhf_config

    const rawModulationType = parseInt(
      uhfConfig?.modulation_type ?? uhfNode.uhf_config?.modulation_type ?? '2',
      10
    )
    // UHF supports 0=FSK, 1=GMSK, 2=QPSK, 3=16QAM, 7=16QAM.
    const modulationType = [0, 1, 2, 3, 7].includes(rawModulationType) ? rawModulationType : 2
    const txPower = uhfConfig?.txPower ?? uhfNode.uhf_config?.txPower ?? 30.0
    // centerFreq可能已经以Hz形式保存，也可能需要转换
    let centerFreq = uhfConfig?.centerFreq ?? uhfNode.uhf_config?.centerFreq ?? 1500 * 1000000
    if (centerFreq < 1000000) {
      // 如果小于1MHz，说明是以MHz保存的，需要转换为Hz
      centerFreq = centerFreq * 1000000
    }
    // K因子从持久化存储读取，确保使用用户保存的值而不是硬编码默认值
    const kFactor = uhfConfig?.k_factor ?? uhfNode.uhf_config?.k_factor ?? 10.0
    const speed = uhfConfig?.speed ?? persistedNodeData?.phy?.speed ?? uhfNode.uhf_config?.speed ?? 20.0
    let samplingRate =
      uhfConfig?.samplingRate ??
      persistedNodeData?.phy?.samplingRate ??
      uhfNode.uhf_config?.samplingRate ??
      200000
    if (samplingRate > 0 && samplingRate < 1000) {
      samplingRate = samplingRate * 1000000
    }
    const snr_db =
      uhfConfig?.snr_db ??
      persistedNodeData?.phy?.snr_db ??
      uhfNode.uhf_config?.snr_db ??
      20.0

    // 传输速率（kbps）与传输时延（ms）
    const transmissionConfigStore = useTransmissionConfigStore()
    const dataRateKbps =
      uhfConfig?.dataRateKbps ??
      persistedNodeData?.dataRateKbps ??
      13.0
    const transmissionDelayMs =
      transmissionConfigStore.getNodeTransmissionDelay(uhfNode.id) ??
      uhfConfig?.transmissionDelay ??
      0.0

    const multipath =
      uhfConfig?.multipath ??
      persistedNodeData?.phy?.multipath ??
      uhfNode.uhf_config?.multipath ??
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
   * 发送HTTP请求更新UHF模型
   */
  private async sendUHFUpdate(payload: UHFPayload) {
    // mock模式下跳过真实HTTP请求，避免并发造成页面卡顿
    if (this.isMockMode) return

    try {
      // 先固定走本地代理路径 `/uhf`，由 `vite.config.ts` 转发到后端 `/process`
      // 这样前端不直接依赖内网地址，便于先把模块调通
      const url = '/uhf'

      // 调试日志：打印目标 URL 和 payload 简要信息
      try {
        console.debug(`[UHF] 发送 POST -> ${url} (node_id=${payload.node_id}, modulation=${payload.modulation_type})`)
      } catch (e) {
        // ignore
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.warn(`UHF update failed: ${response.status} ${response.statusText}`)
        return
      }

      // POST触发计算后，GET拉取最新计算结果
      try {
        const latestResponse = await fetch('/uhf-latest', { method: 'GET' })
        if (latestResponse.ok) {
          const responseData = await latestResponse.json()
          if (responseData && this.onDataReceived) {
            this.onDataReceived(payload.node_id, responseData)
          }
        } else {
          console.warn(`[UHF] GET /uhf-latest failed: ${latestResponse.status}`)
        }
      } catch (parseError) {
        console.warn('[UHF] 获取最新计算结果失败:', parseError)
      }
    } catch (error) {
      // 网络错误时静默处理，不中断仿真
      console.error('UHF update network error:', error)
    }
  }

  /**
   * 获取UHF节点列表
   */
  getUHFNodes(): Map<number, UHFNodeInfo> {
    return this.uhfNodes
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
    const nodeCount = this.uhfNodes.size
    const connectionCount = this.connectedNodes.size

    this.uhfNodes.clear()
    this.connectedNodes.clear()

    console.log(`[UHF] 已清除节点和连接：${nodeCount}个节点，${connectionCount}个连接`)
  }}

// 导出单例
export const uhfSimulationService = new UHFSimulationService()

export type { UHFNodeInfo, ConnectedNode, UHFPayload }
