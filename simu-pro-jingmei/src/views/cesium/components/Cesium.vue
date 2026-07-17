<template>
  <div
    class="cesium-container"
    @contextmenu.prevent="handleRightClick"
    :class="{
      'add-mode': topoStore.operationMode === 'add',
      'connect-mode': topoStore.operationMode === 'connect',
    }"
  >
    <div id="cesiumContainer" ref="cesiumContainer"></div>

    <!-- 节点配置对话框 -->
    <NodeConfigDialog
      v-model:visible="configDialogVisible"
      :position="clickPosition"
      :node-type="selectedNodeType"
      @confirm="handleNodeConfirm"
      @cancel="handleNodeCancel"
    />
    <!-- 节点信息面板 -->
    <NodeInfoPanel
      v-if="nodeInfoPanelVisible && selectedNode && selectedNode.type !== 'INODE'"
      :node="selectedNode"
      @close="nodeInfoPanelVisible = false"
      @openTerminal="handleOpenTerminal"
      @openVnc="handleOpenVnc"
      @editChannelModel="handleEditChannelModelFromPanel"
    />
    <!-- 干扰节点信息面板 -->
    <InterferenceNodeInfoPanel
      v-if="interferenceNodeInfoPanelVisible && selectedInterferenceNode"
      :node="selectedInterferenceNode"
      @close="interferenceNodeInfoPanelVisible = false"
    />
    <!-- 有线链路信息面板 -->
    <LinkInfoPanel
      v-if="linkInfoPanelVisible && selectedLink?.type === 'WIRED'"
      :link="selectedLink"
      @close="linkInfoPanelVisible = false"
    />
    <!-- 无线链路信息面板 -->
    <WirelessLinkInfoPanel
      v-if="linkInfoPanelVisible && selectedLink?.type === 'WIRELESS'"
      :link="selectedLink"
      @close="linkInfoPanelVisible = false"
    />
    <!-- 链路配置对话框 -->
    <LinkConfigDialog
      v-model:visible="linkDialogVisible"
      :source-node="sourceNode"
      :target-node="targetNode"
      @confirm="handleLinkConfirm"
      @cancel="handleLinkCancel"
    />
    <!-- 分布式链路配置对话框 -->
    <DistributedLinkConfigDialog
      v-model:visible="distributedLinkDialogVisible"
      @confirm="handleDistributedLinkConfirm"
      @cancel="handleDistributedLinkCancel"
    />
    <!-- EMANE MAC信息面板 -->
    <EmaneMacInfoPanel
      v-if="emaneMacInfoPanelVisible"
      :link="selectedLinkForEmane"
      :dssData="currentLinkDssData"
      :fhssData="currentLinkFhssData"
      :gfskData="currentLinkGfskData"
      :uhfData="currentLinkUhfData"
      :vhfData="currentLinkVhfData"
      :fiveGData="currentLinkFiveGData"
      :ttcData="currentLinkTtcData"
      :adhocData="currentLinkAdhocData"
      :coordinationData="currentLinkCoordinationData"
      :customData="currentLinkCustomData"
      @close="emaneMacInfoPanelVisible = false"
    />
    <!-- 无人机路径绘制面板 -->
    <DronePathPanel
      v-model:visible="dronePathPanelVisible"
      :viewer="cesiumViewer ? cesiumViewer : null"
      @droneFlightManagerReady="setupDroneFlightManager"
    />
    <!-- 子网配置对话框 -->
    <SubnetConfigDialog
      v-model:visible="subnetConfigDialogVisible"
      :position="clickPosition"
      @confirm="handleSubnetConfirm"
      @cancel="handleSubnetCancel"
    />
    <!-- 统一的信道模型配置对话框 (覆盖 TTC/协同链/自组网/VHF/UHF/5G/DSS/FHSS/GFSK) -->
    <ChannelModelConfigDialog
      :visible="channelModelDialogVisible"
      :model-type="currentChannelModelType"
      :position="channelModelPosition"
      :node-id="editingChannelModelNodeId ?? undefined"
      @confirm="handleChannelModelConfirm"
      @cancel="handleChannelModelCancel"
    />
    <!-- 散射配置对话框 -->
    <CustomConfigDialog
      :visible="customConfigDialogVisible"
      :position="customPosition"
      @confirm="handleCustomConfirm"
      @cancel="handleCustomCancel"
    />
    <!-- 干扰节点配置对话框 -->
    <InterferenceNodeConfigDialog
      :visible="showInterferenceConfigDialog"
      :position="currentInterferenceNodePosition"
      @update:visible="showInterferenceConfigDialog = $event"
      @confirm="handleInterferenceNodeConfigConfirm"
      @cancel="handleInterferenceNodeConfigCancel"
    />
    <!-- 无人机控制面板 -->
    <DroneControlPanel
      v-model:visible="droneControlPanelVisible"
      :viewer="cesiumViewer"
    />
    <!-- 添加服务器配置对话框 -->
    <ServerConfigDialog
      v-model:visible="serverConfigDialogVisible"
      @save="handleServerConfigSave"
      @add="handleServerConfigAdd"
    />

    <!-- MATLAB结果面板 -->
    <MatlabResultPanel v-model:visible="matlabResultPanelVisible" />

    <!-- 可拖拽的终端窗口 - 支持多个终端 -->
    <div
      v-for="[terminalId, terminal] in terminals"
      :key="terminalId"
      class="draggable-terminal"
      :ref="el => setTerminalRef(terminalId, el)"
      :style="{
        ...terminal.position,
        width: terminal.size.width,
        height: terminal.size.height
      }"
      :class="{ 'active': activeTerminalId === terminalId }"
    >
      <div class="terminal-header" @mousedown="startDragging($event, terminalId)">
        <div class="terminal-title">
          <el-icon><Monitor /></el-icon>
          {{ terminal.node?.alias || terminal.node?.name || '节点' }} 终端
          <span v-if="terminal.terminalIndex && terminal.terminalIndex > 1" class="terminal-index">
            #{{ terminal.terminalIndex }}
          </span>
        </div>
        <div class="terminal-controls">
          <span class="terminal-control minimize" @click="minimizeTerminal(terminalId)">
            <el-icon><Minus /></el-icon>
          </span>
          <span class="terminal-control close" @click="closeTerminal(terminalId)">
            <el-icon><Close /></el-icon>
          </span>
        </div>
      </div>
      <div class="terminal-body" :class="{ 'minimized': terminal.isMinimized }">
        <Terminal
          :wsUrl="terminal.wsUrl"
          :visible="!terminal.isMinimized"
          :key="terminalId"
          :terminalSize="terminal.size"
        />
      </div>

      <!-- 调整大小的手柄 -->
      <div class="resize-handles" v-if="!terminal.isMinimized">
        <!-- 右边缘 -->
        <div class="resize-handle resize-handle-e"
             @mousedown="startResizing($event, terminalId, 'e')"></div>
        <!-- 下边缘 -->
        <div class="resize-handle resize-handle-s"
             @mousedown="startResizing($event, terminalId, 's')"></div>
        <!-- 右下角 -->
        <div class="resize-handle resize-handle-se"
             @mousedown="startResizing($event, terminalId, 'se')"></div>
      </div>
    </div>

    <!-- Draggable VNC windows - support multiple VNC -->
    <div
      v-for="[vncId, vnc] in vncWindows"
      :key="vncId"
      class="draggable-vnc"
      :ref="el => setVncRef(vncId, el)"
      :style="{
        ...vnc.position,
        width: vnc.size.width,
        height: vnc.size.height
      }"
      :class="{ 'active': activeVncId === vncId }"
    >
      <div class="vnc-header" @mousedown="startVncDragging($event, vncId)">
        <div class="vnc-title">
          <el-icon><Monitor /></el-icon>
          {{ vnc.node?.alias || vnc.node?.name }} VM
        </div>
        <div class="vnc-controls">
          <span class="vnc-control minimize" @click="minimizeVnc(vncId)">
            <el-icon><Minus /></el-icon>
          </span>
          <span class="vnc-control close" @click="closeVnc(vncId)">
            <el-icon><Close /></el-icon>
          </span>
        </div>
      </div>
      <div class="vnc-body" :class="{ 'minimized': vnc.isMinimized }">
        <Vnc
          :wsUrl="vnc.wsUrl"
          :visible="!vnc.isMinimized"
          :key="vncId"
        />
      </div>

      <div class="resize-handles" v-if="!vnc.isMinimized">
        <div class="resize-handle resize-handle-e"
             @mousedown="startVncResizing($event, vncId, 'e')"></div>
        <div class="resize-handle resize-handle-s"
             @mousedown="startVncResizing($event, vncId, 's')"></div>
        <div class="resize-handle resize-handle-se"
             @mousedown="startVncResizing($event, vncId, 'se')"></div>
      </div>
    </div>

    <!-- 连接提示 -->
    <div v-if="topoStore.operationMode === 'connect'" class="connect-hint">
      <span>{{
        selectedItem && selectedItem.name === "删除链路"
          ? "请点击要删除的链路 (右键取消)"
          : "请依次点击两个节点建立链路连接 (右键取消)"
      }}</span>
    </div>

    <!-- 底图模式切换按钮 -->
    <div class="naval-demo-toggle">
      <el-tooltip :content="navalStrikeDemoActive ? '关闭海上打击演示' : '播放海上打击演示'" placement="left">
        <el-button
          :icon="Aim"
          circle
          @click="handleToggleNavalStrikeDemo"
          :type="navalStrikeDemoActive ? 'warning' : 'primary'"
        />
      </el-tooltip>
    </div>

    <div class="map-mode-toggle">
      <el-tooltip :content="isSimpleMapMode ? '切换到卫星地图' : '切换到简洁模式'" placement="left">
        <el-button
          :icon="isSimpleMapMode ? Picture : View"
          circle
          @click="toggleMapMode"
          :type="isSimpleMapMode ? 'primary' : 'default'"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  ref,
  reactive,
  computed,
  watch,
  nextTick,
} from "vue";
import * as Cesium from "cesium";
import { useTopoStore } from "../../../store/modules/topo";
import { useSystemLogStore } from "../../../store/modules/systemLog";
import { useTransmissionConfigStore } from "../../../store/modules/transmissionConfig";
import { useCodingConfigStore } from "../../../store/modules/codingConfig";
import { useChannelModelDataStore } from "../../../store/modules/channelModelData";
import { ElMessage, ElMessageBox } from "element-plus";
import { Monitor, Close, Minus, Picture, View, Aim } from '@element-plus/icons-vue';
import NodeConfigDialog from "./NodeConfigDialog.vue";
import InterferenceNodeConfigDialog from "./InterferenceNodeConfigDialog.vue";
import useCesiumEntities from "../../../composables/useCesiumEntities";
import useNavalStrikeDemo from "../composables/useNavalStrikeDemo";
import eventBus from "../../../utils/eventBus";
import NodeInfoPanel from "./NodeInfoPanel.vue";
import LinkInfoPanel from "./LinkInfoPanel.vue";
import LinkConfigDialog from "./LinkConfigDialog.vue";
import DistributedLinkConfigDialog from "./DistributedLinkConfigDialog.vue";
import SubnetConfigDialog from "./SubnetConfigDialog.vue";
import EmaneMacInfoPanel from "./EmaneMacInfoPanel.vue";
import DronePathPanel from "./DronePathPanel.vue";
import WirelessLinkInfoPanel from "./WirelessLinkInfoPanel.vue";
import DroneControlPanel from "./DroneControlPanel.vue";
import InterferenceNodeInfoPanel from "./InterferenceNodeInfoPanel.vue";
import ServerConfigDialog from "./ServerConfigDialog.vue";
import MatlabResultPanel from "./MatlabResultPanel.vue";
import { channelModelPresets, getChannelModelEmaneConfigs } from "../../../config/channelModelPresets";
import ChannelModelConfigDialog from "./ChannelModelConfigDialog.vue";
import { getDialogConfigByPresetKey, type ChannelModelFormData } from "@/config/channelModelDialogConfig";
import CustomConfigDialog from "./CustomConfigDialog.vue";
import { dssSimulationService } from "../../../services/dssSimulation";
import { fhssSimulationService } from "../../../services/fhssSimulation";
import { gmskSimulationService } from "../../../services/gmskSimulation";
import { gfskSimulationService } from "../../../services/gfskSimulation";
import { ttcSimulationService } from "../../../services/ttcSimulation";
import { adhocSimulationService } from "../../../services/adhocSimulation";
import { coordinationSimulationService } from "../../../services/coordinationSimulation";
import { vhfSimulationService } from "../../../services/vhfSimulation";
import { uhfSimulationService } from "../../../services/uhfSimulation";
import { fiveGSimulationService } from "../../../services/fiveGSimulation";
import { customSimulationService } from "../../../services/customSimulation";
import Terminal from "./Terminal.vue";
import Vnc from "./Vnc.vue";
// 引入API函数
import { getTopoBySession } from "../../../api/scene";
import type { ApiResponse } from "../../../api/scene";
// 引入用户信息函数
import { getUserInfo } from "../../../store/user";
// 引入Cesium的CSS样式资源
import "../../../../node_modules/cesium/Build/Cesium/Widgets/widgets.css";

// 导入全局WebSocket服务
import websocketService, { useWebSocketState } from '../../../services/websocket';

// 使用全局WebSocket状态
const { wsConnected, isSimulationRunning } = useWebSocketState();

// Cesium配置常量
const CESIUM_CONFIG = {
  ION_TOKEN:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMGY5N2EyNi1lMDkxLTRkZGMtYTY3Yi04NThmNjA0NGQ5ODQiLCJpZCI6Mjc5OTQ0LCJpYXQiOjE3NDA3MzQ1OTV9.GiRn-8ycUh9-uoH98e8wYshvrQgwYXZJSCrV09ir0TY",
  DEFAULT_VIEW: {
    longitude: -74.006,
    latitude: 40.7128,
    height: 5000,
    heading: 6.075650371148749,
    pitch: -0.46381729464065646,
    roll: 0.0006880065372003585,
  },
};
// 获取状态管理store
const topoStore = useTopoStore();
const systemLogStore = useSystemLogStore();
const transmissionConfigStore = useTransmissionConfigStore();
const codingConfigStore = useCodingConfigStore();
const channelModelDataStore = useChannelModelDataStore();

// 记录当前选中的侧边栏项目
const selectedItem = ref<{ name: string; icon: string; type?: string } | null>(null);
// 监听侧边栏选择事件
eventBus.on("sidebar:item-selected", (item) => {
  selectedItem.value = item;
});

// 监听分布式链路配置事件
eventBus.on("sidebar:distributed-link-config", () => {
  distributedLinkDialogVisible.value = true;
});

// 定义响应式引用，用于存储Cesium实例
// cesiumViewer: Cesium的核心可视化组件，管理整个3D场景
// cesiumContainer: 对应DOM元素的引用，Cesium将在此元素内渲染3D地球
const cesiumViewer = ref<Cesium.Viewer | null>(null);
const cesiumContainer = ref<HTMLElement | null>(null);
const navalStrikeDemo = useNavalStrikeDemo(cesiumViewer);
const navalStrikeDemoActive = navalStrikeDemo.isActive;
// 存储OSM建筑图层
const osmBuildings = ref<Cesium.Cesium3DTileset | null>(null);

// 底图模式状态：简洁模式 vs 卫星地图模式
const isSimpleMapMode = ref(false);

// 使用Cesium实体管理组合式函数
// 因为viewer可能在初始化后才有值，所以在onMounted中初始化
const cesiumEntities = ref<ReturnType<typeof useCesiumEntities> | null>(null);

// 配置框相关状态
const configDialogVisible = ref(false);
const showInterferenceConfigDialog = ref(false);
const clickPosition = reactive({
  lat: 0,
  lon: 0,
  alt: 0,
});
const currentInterferenceNodePosition = ref({ lat: 0, lon: 0, alt: 0 });

// 链路配置状态
const linkDialogVisible = ref(false);
const distributedLinkDialogVisible = ref(false);
const sourceNode = ref<any>(null);
const targetNode = ref<any>(null);

// 节点和链路信息面板状态
const selectedNode = ref<any>(null);
const nodeInfoPanelVisible = ref(false);
const selectedLink = ref<any>(null);
const linkInfoPanelVisible = ref(false);
const emaneMacInfoPanelVisible = ref(false);
const dronePathPanelVisible = ref(false);
const droneControlPanelVisible = ref(false);
const allEffectsVisible = ref(false); // 添加特效显示状态跟踪变量

// 子网配置对话框可见性
const subnetConfigDialogVisible = ref(false);

// 统一的信道模型配置对话框状态
const channelModelDialogVisible = ref(false);
const currentChannelModelType = ref('');
const editingChannelModelNodeId = ref<number | null>(null);
const channelModelPosition = reactive({
  lat: 0,
  lon: 0,
  alt: 0,
});

// 各模型仿真数据 (保留，用于 WebSocket 数据存储)
const dssSimulationData = ref<Map<number, any>>(new Map());
const fhssSimulationData = ref<Map<number, any>>(new Map());
const gmskSimulationData = ref<Map<number, any>>(new Map());
const gfskSimulationData = ref<Map<number, any>>(new Map());
const ttcSimulationData = ref<Map<number, any>>(new Map());
const adhocSimulationData = ref<Map<number, any>>(new Map());
const coordinationSimulationData = ref<Map<number, any>>(new Map());
const vhfSimulationData = ref<Map<number, any>>(new Map());
const uhfSimulationData = ref<Map<number, any>>(new Map());
const fiveGSimulationData = ref<Map<number, any>>(new Map());

// 散射配置对话框状态
const customConfigDialogVisible = ref(false);
const customPosition = reactive({
  lat: 0,
  lon: 0,
  alt: 0,
});
const customSimulationData = ref<Map<number, any>>(new Map());

// 获取所选节点类型
const selectedNodeType = computed(() => {
  return topoStore.selectedNodeType || NODE_TYPES.DEVICE;
});

// 节点类型常量
const NODE_TYPES = {
  DEVICE: "DEVICE",
  STATION: "STATION",
  DRONE: "DRONE",
  MISSILE: "MISSILE",
} as const;

// 存储选中的链路信息，用于EMANE监控
const selectedLinkForEmane = ref<any>(null);

// 根据当前选中的链路获取对应节点的仿真数据
const currentLinkDssData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('dss', dssSimulationData.value);
});

const currentLinkFhssData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('fhss', fhssSimulationData.value);
});

const currentLinkGfskData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('gfsk', gfskSimulationData.value);
});

const currentLinkUhfData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('uhf', uhfSimulationData.value);
});

const currentLinkFiveGData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('fiveG', fiveGSimulationData.value);
});

const RESPONSE_MODEL_TO_FRONTEND_MODEL: Record<string, string> = {
  ckl: 'ttc',
  zzw: 'adhoc',
  xtl: 'coordination',
  ttc: 'ttc',
  adhoc: 'adhoc',
  coordination: 'coordination',
  uhf: 'uhf',
  vhf: 'vhf',
  '5g': 'fiveG',
  fiveg: 'fiveG',
  dss: 'dss',
  dsss: 'dss',
  sw: 'dss',
  shortwave: 'dss',
  fhss: 'fhss',
  mlw: 'fhss',
  gmsk: 'gmsk',
  gfsk: 'gfsk',
  satellite: 'gfsk',
  custom: 'custom',
  choose: 'custom',
};

const getResponseModelType = (data: any): string | null => {
  const rawModel = data?.model ?? data?.data?.model;
  if (rawModel === undefined || rawModel === null) return null;
  const key = String(rawModel).trim().toLowerCase();
  return RESPONSE_MODEL_TO_FRONTEND_MODEL[key] || key;
};

const isDataForModel = (data: any, modelType: string): boolean => {
  if (!data) return false;
  const responseModelType = getResponseModelType(data);
  return !responseModelType || responseModelType === modelType;
};

const getCurrentLinkModelData = (modelType: string, modelDataMap: Map<number, any>) => {
  if (!selectedLinkForEmane.value) return null;

  const node1Id = selectedLinkForEmane.value.node1_id;
  const node2Id = selectedLinkForEmane.value.node2_id;
  const nodes = topoStore.topoData?.nodes || [];
  const links = topoStore.topoData?.links || [];
  const node1 = nodes.find((n: any) => n.id === node1Id);
  const node2 = nodes.find((n: any) => n.id === node2Id);

  const directEmaneNode = node1?.type === 'EMANE' ? node1 : node2?.type === 'EMANE' ? node2 : null;
  const directModelType = directEmaneNode ? getResponseModelType({
    model: directEmaneNode.phy_type || directEmaneNode.displayModel || directEmaneNode.emane,
  }) : null;
  if (directEmaneNode && directModelType !== modelType) {
    return null;
  }

  let emaneNodeId = directModelType === modelType ? directEmaneNode.id : null;

  if (!emaneNodeId) {
    for (const checkNodeId of [node1Id, node2Id]) {
      const connectedLinks = links.filter(
        (l: any) => l.node1_id === checkNodeId || l.node2_id === checkNodeId
      );
      for (const link of connectedLinks) {
        const otherNodeId = link.node1_id === checkNodeId ? link.node2_id : link.node1_id;
        const otherNode = nodes.find((n: any) => n.id === otherNodeId);
        const otherModelType = otherNode?.type === 'EMANE' ? getResponseModelType({
          model: otherNode.phy_type || otherNode.displayModel || otherNode.emane,
        }) : null;
        if (otherNode?.type === 'EMANE' && otherModelType === modelType) {
          emaneNodeId = otherNode.id;
          break;
        }
      }
      if (emaneNodeId) break;
    }
  }

  if (!emaneNodeId) return null;

  const emaneNodeData = modelDataMap.get(emaneNodeId);
  if (isDataForModel(emaneNodeData, modelType)) return emaneNodeData;

  if (emaneNodeId) {
    const modelLinks = links.filter((l: any) => l.node1_id === emaneNodeId || l.node2_id === emaneNodeId);
    for (const link of modelLinks) {
      const connectedNodeId = link.node1_id === emaneNodeId ? link.node2_id : link.node1_id;
      const data = modelDataMap.get(connectedNodeId);
      if (isDataForModel(data, modelType)) return data;
    }
  }

  return null;
};

const currentLinkTtcData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('ttc', ttcSimulationData.value);
});

const currentLinkAdhocData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('adhoc', adhocSimulationData.value);
});

const currentLinkCoordinationData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('coordination', coordinationSimulationData.value);
});

const currentLinkVhfData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('vhf', vhfSimulationData.value);
});

const currentLinkCustomData = computed(() => {
  if (!selectedLinkForEmane.value) return null;
  return getCurrentLinkModelData('custom', customSimulationData.value);
});

// 添加干扰节点信息面板的状态
const interferenceNodeInfoPanelVisible = ref(false);
const selectedInterferenceNode = ref<any>(null);

// 服务器配置对话框状态
const serverConfigDialogVisible = ref(false);

// MATLAB结果面板状态
const matlabResultPanelVisible = ref(false);

// 模板放置相关状态
const isWaitingForTemplatePlacement = ref(false);
const templatePlacementCursor = ref<HTMLElement | null>(null);

// 终端相关状态 - 支持多个终端
interface TerminalInstance {
  id: string;
  node: any;
  wsUrl: string;
  isMinimized: boolean;
  position: { top: string; left: string };
  size: { width: string; height: string };
  isDragging: boolean;
  isResizing: boolean;
  dragOffset: { x: number; y: number };
  resizeHandle: string; // 记录当前调整大小的手柄类型
  terminalIndex?: number; // 终端序号，用于区分同一节点的多个终端
}

const terminals = ref<Map<string, TerminalInstance>>(new Map());
const activeTerminalId = ref<string | null>(null);

// VNC window management - support multiple VNC windows
interface VncInstance {
  id: string;
  node: any;
  wsUrl: string;
  isMinimized: boolean;
  position: { top: string; left: string };
  size: { width: string; height: string };
  isDragging: boolean;
  isResizing: boolean;
  dragOffset: { x: number; y: number };
  resizeHandle: string;
}

const vncWindows = ref<Map<string, VncInstance>>(new Map());
const activeVncId = ref<string | null>(null);

// 无人机列表
const flyingDrones = ref<Array<string>>([]);

// 处理右键点击退出当前模式
const handleRightClick = () => {
  if (topoStore.operationMode === "add") {
    // @ts-ignore: 忽略类型检查错误，该方法确实存在
    topoStore.setOperationMode("select");
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);
    ElMessage.info("已退出放置模式");
  } else if (topoStore.operationMode === "connect") {
    // @ts-ignore: 忽略类型检查错误，该方法确实存在
    topoStore.setOperationMode("select");
    // 重置节点选择状态
    sourceNode.value = null;
    targetNode.value = null;
    ElMessage.info("已退出连接模式");
  }
};

// 从Cartesian2获取地表坐标
const getGroundPosition = (
  viewer: Cesium.Viewer,
  windowPosition: Cesium.Cartesian2
): {
  cartesian: Cesium.Cartesian3;
  longitude: number;
  latitude: number;
  height: number;
} | null => {
  try {
    const scene = viewer.scene;
    const ray = scene.camera.getPickRay(windowPosition);
    if (!ray) return null;

    const cartesian = scene.globe.pick(ray, scene);
    if (!Cesium.defined(cartesian)) return null;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const height = scene.globe.getHeight(cartographic) || 0;

    return { cartesian, longitude, latitude, height };
  } catch (error) {
    console.error("获取地表位置时出错:", error);
    return null;
  }
};

// 更新点击位置并显示配置对话框
const updatePositionAndShowDialog = (position: {
  longitude: number;
  latitude: number;
  height: number;
}) => {
  // 先重置所有可能打开的对话框状态
  configDialogVisible.value = false;
  subnetConfigDialogVisible.value = false;
  showInterferenceConfigDialog.value = false;

  // 更新点击位置数据，格式化数值避免精度问题
  const formattedPosition = {
    lat: Number(position.latitude.toFixed(6)),
    lon: Number(position.longitude.toFixed(6)),
    alt: Number(position.height.toFixed(2)),
  };

  // 使用nextTick确保数据更新后再显示对话框
  nextTick(() => {
    if (topoStore.selectedNodeType === "EMANE") {
      // EMANE (子网) 有其自己的 clickPosition 和 subnetConfigDialogVisible
      clickPosition.lat = formattedPosition.lat;
      clickPosition.lon = formattedPosition.lon;
      clickPosition.alt = formattedPosition.alt;

      // 检查是否为信道模型放置模式（非自定义）
      const channelModel = topoStore.selectedChannelModel;
      if (channelModel === 'CUSTOM') {
        // 散射需要特殊配置
        customPosition.lat = formattedPosition.lat;
        customPosition.lon = formattedPosition.lon;
        customPosition.alt = formattedPosition.alt;
        customConfigDialogVisible.value = true;
      } else if (channelModel && getDialogConfigByPresetKey(channelModel)) {
        // 使用统一信道模型对话框
        const dialogConfig = getDialogConfigByPresetKey(channelModel)!;
        channelModelPosition.lat = formattedPosition.lat;
        channelModelPosition.lon = formattedPosition.lon;
        channelModelPosition.alt = formattedPosition.alt;
        currentChannelModelType.value = dialogConfig.modelType;
        channelModelDialogVisible.value = true;
      } else if (channelModel && channelModel !== 'CUSTOM') {
        // 其他预设信道模型，使用预设配置直接创建节点
        createChannelModelNode(formattedPosition, channelModel);
      } else {
        // 普通子网或自定义信道模型，打开配置对话框
        subnetConfigDialogVisible.value = true;
      }
    } else if (topoStore.selectedNodeType === "INTERFERENCE") {
      currentInterferenceNodePosition.value = formattedPosition;
      showInterferenceConfigDialog.value = true;
    } else if (topoStore.selectedNodeType) {
      clickPosition.lat = formattedPosition.lat;
      clickPosition.lon = formattedPosition.lon;
      clickPosition.alt = formattedPosition.alt;
      configDialogVisible.value = true;
    } else {
      // Should not happen if sidebar selection is enforced before map click
      ElMessage.info("请先选择节点类型");
    }
    // 无论打开哪个对话框，都退出放置模式，让对话框处理后续
    // topoStore.setOperationMode("select"); // This was moved to dialog confirm/cancel handlers
  });
};

// 处理节点点击事件 - 链路连接模式
const handleNodeClickForConnect = (entity: any) => {
  // 确保是节点实体
  if (
    !entity ||
    !entity.id ||
    typeof entity.id !== "string" ||
    !/^\d+$/.test(entity.id)
  ) {
    ElMessage.warning("请点击有效的节点");
    return;
  }

  const nodeId = parseInt(entity.id, 10);

  // 确保 topoData 和 nodes 数组存在
  if (!topoStore.topoData || !Array.isArray(topoStore.topoData.nodes)) {
    ElMessage.error("拓扑数据不完整，无法创建链路");
    return;
  }

  const node = topoStore.topoData.nodes.find((n: any) => n.id === nodeId);

  if (!node) {
    ElMessage.warning("节点数据不存在");
    return;
  }

  // 源节点还未选择
  if (!sourceNode.value) {
    sourceNode.value = node;
    ElMessage.info(`已选择源节点: ${node.alias || node.name}，请选择目标节点`);

    // 记录日志
    systemLogStore.addLog({
      type: "normal",
      module: "link",
      action: "选择链路起点",
      information: "链路起点选择",
      details: `为链路选择了起点节点: "${node.alias || node.name}"`,
    });

    return;
  }

  // 不允许连接到自己
  if (sourceNode.value.id === node.id) {
    ElMessage.warning("不能连接节点到自身");
    return;
  }

  // 节点连接限制规则
  const canConnect = validateNodeConnection(sourceNode.value, node);
  if (!canConnect.valid) {
    ElMessage.warning(canConnect.message);
    sourceNode.value = null; // 重置源节点
    return;
  }

  // 检查是否已存在连接
  // 确保 links 数组存在
  const existingLink = Array.isArray(topoStore.topoData.links)
    ? topoStore.topoData.links.find(
        (link: any) =>
          (link.node1_id === sourceNode.value.id && link.node2_id === node.id) ||
          (link.node1_id === node.id && link.node2_id === sourceNode.value.id)
      )
    : null;

  if (existingLink) {
    ElMessage.warning("这两个节点间已存在链路");
    // 重置选择
    sourceNode.value = null;
    return;
  }

  // 设置目标节点并显示配置对话框
  targetNode.value = node;
  linkDialogVisible.value = true;

  // 切换回选择模式
  // @ts-ignore: 忽略类型检查错误，该方法确实存在
  topoStore.setOperationMode("select");
};

// 验证两个节点是否可以连接
const validateNodeConnection = (
  node1: any,
  node2: any
): { valid: boolean; message: string } => {
  const getDroneType = (nodeType: string) => {
    return nodeType === "DRONE" ;
  };

  const isEmaneType = (nodeType: string) => nodeType === "EMANE";
  const isDroneType = (nodeType: string) => getDroneType(nodeType);
  const isBaseStationType = (nodeType: string) => nodeType === "BASESTATION";

  // 无人机节点只能接入EMANE
  if (isDroneType(node1.type) && !isEmaneType(node2.type)) {
    return { valid: false, message: "无人机只能接入子网(EMANE)节点" };
  }

  if (isDroneType(node2.type) && !isEmaneType(node1.type)) {
    return { valid: false, message: "无人机只能接入子网(EMANE)节点" };
  }

  // 只有无人机和基站节点可以接入EMANE
  if (
    isEmaneType(node1.type) &&
    !isDroneType(node2.type) &&
    !isBaseStationType(node2.type)
  ) {
    return { valid: false, message: "只有无人机和基站可以接入子网(EMANE)节点" };
  }

  if (
    isEmaneType(node2.type) &&
    !isDroneType(node1.type) &&
    !isBaseStationType(node1.type)
  ) {
    return { valid: false, message: "只有无人机和基站可以接入子网(EMANE)节点" };
  }

  // 检查节点角色是否匹配
  if (isEmaneType(node1.type) || isEmaneType(node2.type)) {
    const emaneNode = isEmaneType(node1.type) ? node1 : node2;
    const otherNode = isEmaneType(node1.type) ? node2 : node1;
    
    // 获取节点角色
    const emaneRole = emaneNode.role || 'WHITE';
    const otherRole = otherNode.role || 'WHITE';
     if (emaneRole !== otherRole) {
      return { 
        valid: false, 
        message: `节点角色不匹配` 
      };
    }
  }

  // 所有限制都通过
  return { valid: true, message: "" };
};

// 处理左键点击事件
const handleLeftClick = (movement: { position: Cesium.Cartesian2 }) => {
  if (!cesiumViewer.value) return;

  // 优先处理模板放置模式
  if (isWaitingForTemplatePlacement.value) {
    handleMapClick(movement);
    return;
  }

  // 获取点击的实体
  const picked = cesiumViewer.value.scene.pick(movement.position);

  // 添加节点模式
  if (topoStore.operationMode === "add") {
    // 获取点击位置的地理坐标
    const position = getGroundPosition(cesiumViewer.value, movement.position);

    if (!position) {
      ElMessage.warning("请点击地球表面");
      return;
    }

    // 更新位置并显示配置对话框
    updatePositionAndShowDialog(position);
  }
  // 链路连接模式
  else if (topoStore.operationMode === "connect") {
    // 如果是删除链路模式
    if (selectedItem.value?.name === "删除链路") {
      // 检查是否点击了链路实体
      if (
        Cesium.defined(picked) &&
        picked.id &&
        typeof picked.id.id === "string" &&
        picked.id.id.startsWith("link-")
      ) {
        // 解析链路ID以获取两个节点ID
        const linkIdMatch = picked.id.id.match(/link-(\d+)-(\d+)/);

        if (linkIdMatch && linkIdMatch.length === 3) {
          const node1Id = parseInt(linkIdMatch[1], 10);
          const node2Id = parseInt(linkIdMatch[2], 10);

          // 查找对应的链路
          const link = topoStore.topoData?.links?.find(
            (l: any) =>
              (l.node1_id === node1Id && l.node2_id === node2Id) ||
              (l.node1_id === node2Id && l.node2_id === node1Id)
          );

          if (link) {
            // 显示确认对话框
            ElMessageBox.confirm(
              `确定要删除 ${getNodeName(link.node1_id)} 和 ${getNodeName(
                link.node2_id
              )} 之间的链路吗？`,
              "删除链路",
              {
                confirmButtonText: "确定",
                cancelButtonText: "取消",
                type: "warning",
              }
            )
              .then(async () => {
                try {
                  // 调用删除链路API，传递完整的链路对象
                  await (topoStore as any).deleteLinkRemote(link);

                  ElMessage.success("链路删除成功");
                  // 切换回选择模式
                  (topoStore as any).setOperationMode("select");
                } catch (error: any) {
                  ElMessage.error(error?.message || "删除链路失败");
                }
              })
              .catch(() => {
                ElMessage.info("已取消删除");
              });
            return;
          }
        }

        ElMessage.warning("请点击有效的链路");
        return;
      }

      ElMessage.warning("请点击链路进行删除");
      return;
    }
    // 否则是添加链路模式
    else if (Cesium.defined(picked) && picked.id) {
      handleNodeClickForConnect(picked.id);
    } else {
      ElMessage.warning("请点击节点");
    }
  }
  // 选择模式
  else {
    if (Cesium.defined(picked) && picked.id) {
      // 检查是否点击了链路实体
      const entityId = picked.id.id;
      if (typeof entityId === "string" && entityId.startsWith("link-")) {
        // 解析链路ID以获取两个节点ID
        const linkIdMatch = entityId.match(/link-(\d+)-(\d+)/);
        if (linkIdMatch && linkIdMatch.length === 3) {
          const node1Id = parseInt(linkIdMatch[1], 10);
          const node2Id = parseInt(linkIdMatch[2], 10);

          // 查找对应的链路
          const link = topoStore.topoData?.links?.find(
            (l: any) =>
              (l.node1_id === node1Id && l.node2_id === node2Id) ||
              (l.node1_id === node2Id && l.node2_id === node1Id)
          );

          if (link) {
            // 显示链路信息面板
            selectedLink.value = link;
            linkInfoPanelVisible.value = true;
            nodeInfoPanelVisible.value = false; // 关闭节点信息面板
            interferenceNodeInfoPanelVisible.value = false; // 关闭干扰节点信息面板
            return;
          }
        }
      }

      // 如果不是链路实体，则显示节点信息面板
      cesiumViewer.value.selectedEntity = picked.id;
    } else {
      // 点击空白处，关闭所有信息面板（除了EMANE信息面板）
      nodeInfoPanelVisible.value = false;
      linkInfoPanelVisible.value = false;
      // 移除了关闭EMANE信息面板的代码
      interferenceNodeInfoPanelVisible.value = false; // 添加关闭干扰节点信息面板的代码
    }
  }
};

// 处理双击事件
const handleDoubleClick = (movement: { position: Cesium.Cartesian2 }) => {
  if (!cesiumViewer.value) {
    return;
  }

  // 获取双击的实体
  const picked = cesiumViewer.value.scene.pick(movement.position);

  // 只在选择模式下处理双击事件
  if (topoStore.operationMode === "select") {
    if (Cesium.defined(picked) && picked.id) {
      const entityId = picked.id.id;

      // 检查是否双击了链路实体
      if (typeof entityId === "string" && entityId.startsWith("link-")) {
        // 解析链路ID以获取两个节点ID
        const linkIdMatch = entityId.match(/link-(\d+)-(\d+)/);

        if (linkIdMatch && linkIdMatch.length === 3) {
          const node1Id = parseInt(linkIdMatch[1], 10);
          const node2Id = parseInt(linkIdMatch[2], 10);

          // 查找对应的链路
          const link = topoStore.topoData?.links?.find(
            (l: any) =>
              (l.node1_id === node1Id && l.node2_id === node2Id) ||
              (l.node1_id === node2Id && l.node2_id === node1Id)
          );

          if (link) {
            // 直接打开EMANE MAC信息面板
            selectedLinkForEmane.value = { ...link };
            emaneMacInfoPanelVisible.value = true;
            ElMessage.success("已打开链路EMANE监控面板");
            return;
          } else {
            // 作为备选方案，直接使用选中的实体
            const directLink = {
              node1_id: node1Id,
              node2_id: node2Id,
              type: 'EMANE',
              name: `链路 ${node1Id}-${node2Id}`
            };
            selectedLinkForEmane.value = directLink;
            emaneMacInfoPanelVisible.value = true;
            ElMessage.success("已打开链路EMANE监控面板");
            return;
          }
        }
      }
    }
  }
};

// 辅助方法：根据节点ID获取节点名称
const getNodeName = (nodeId: number): string => {
  const node = topoStore.topoData?.nodes?.find((n: any) => n.id === nodeId);
  return node ? (node.alias || node.name) : `节点${nodeId}`;
};

// 处理节点配置确认
const handleNodeConfirm = async (nodeData: any) => {
  // 检查nodeData是否为数组（星形编队模式）
  if (Array.isArray(nodeData)) {
    ElMessage.success(`已创建${nodeData.length}个节点编队`);
    configDialogVisible.value = false; // Ensure dialog closes
    topoStore.operationMode = "select"; // Corrected: Exit placement mode

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "node",
      action: "创建节点编队",
      information: "节点编队创建成功",
      details: `创建了${nodeData.length}个节点编队`,
    });

    // 发送跨页面同步消息，通知其他页面（如资源库页面）
    await nextTick();
    sendCrossPageSyncMessage();

    return;
  }

  // 单个节点模式
  configDialogVisible.value = false; // Ensure dialog closes
  topoStore.operationMode = "select"; // Corrected: Exit placement mode

  // 记录日志
  systemLogStore.addLog({
    type: "normal",
    module: "node",
    action: "创建节点",
    information: "节点创建成功",
    details: `创建了节点 "${nodeData.alias || nodeData.name}"，类型: ${
      nodeData.type
    }, 位置: [${nodeData.geo.lat.toFixed(4)}, ${nodeData.geo.lon.toFixed(
      4
    )}, ${nodeData.geo.alt.toFixed(1)}]`,
  });

  // 节点已添加到Pinia仓库，Cesium实体会自动创建

  // 发送跨页面同步消息，通知其他页面（如资源库页面）
  await nextTick();
  sendCrossPageSyncMessage();
};

// 处理节点配置取消
const handleNodeCancel = () => {
  ElMessage.info("已取消创建节点");
  configDialogVisible.value = false; // Ensure this is closed
  topoStore.operationMode = "select"; // Corrected: Exit placement mode
};

// 处理链路配置确认
const handleLinkConfirm = (link: any) => {
  ElMessage.success(`链路添加成功`);

  // 记录日志
  const sourceNodeName = getNodeName(link.node1_id);
  const targetNodeName = getNodeName(link.node2_id);

  systemLogStore.addLog({
    type: "normal",
    module: "link",
    action: "创建链路",
    information: "链路创建成功",
    details: `创建了从 "${sourceNodeName}" 到 "${targetNodeName}" 的${
      link.type === "WIRED" ? "有线" : "无线"
    }链路`,
  });

  // 重置节点选择状态
  sourceNode.value = null;
  targetNode.value = null;
};

// 处理链路配置取消
const handleLinkCancel = () => {
  ElMessage.info("已取消创建链路");
  // 重置节点选择状态
  sourceNode.value = null;
  targetNode.value = null;
  linkDialogVisible.value = false; // Ensure dialog closes
  topoStore.operationMode = "select"; // Corrected: Exit placement mode
};

// 处理分布式链路配置确认
const handleDistributedLinkConfirm = (result: any) => {
  distributedLinkDialogVisible.value = false;

  if (result && result.createdLinks && result.createdLinks.length > 0) {
    ElMessage.success(`成功创建 ${result.createdLinks.length} 条分布式链路`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "link",
      action: "分布式链路配置",
      information: "分布式链路创建成功",
      details: `成功创建 ${result.createdLinks.length} 条分布式链路`
    });
  }
};

// 处理分布式链路配置取消
const handleDistributedLinkCancel = () => {
  distributedLinkDialogVisible.value = false;
  ElMessage.info("已取消分布式链路配置");
};

// 处理子网配置确认
const handleSubnetConfirm = async (subnet: any) => {
  subnetConfigDialogVisible.value = false; // Ensure dialog closes
  topoStore.operationMode = "select"; // Corrected: Exit placement mode

  // 记录日志
  systemLogStore.addLog({
    type: "important",
    module: "subnet",
    action: "创建子网",
    information: "子网创建成功",
    details: `创建了子网 "${subnet.name}"，位置: [${subnet.geo.lat.toFixed(
      4
    )}, ${subnet.geo.lon.toFixed(4)}, ${subnet.geo.alt.toFixed(1)}]`,
  });

  // 子网已添加到Pinia仓库，Cesium实体会自动创建

  // 发送跨页面同步消息，通知其他页面（如资源库页面）
  await nextTick();
  sendCrossPageSyncMessage();
};

// 处理子网配置取消
const handleSubnetCancel = () => {
  ElMessage.info("已取消创建子网");
  subnetConfigDialogVisible.value = false; // Ensure this is closed
  topoStore.operationMode = "select"; // Corrected: Exit placement mode
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// ========== 统一的信道模型配置对话框处理 ==========
const handleChannelModelConfirm = async (formData: ChannelModelFormData & { modelType: string }) => {
  const { modelType, ...config } = formData;

  // 编辑模式：更新已有节点的模型配置，不创建新节点
  if (editingChannelModelNodeId.value !== null) {
    const nodeId = editingChannelModelNodeId.value;
    channelModelDialogVisible.value = false;
    channelModelDataStore.saveNodeData(nodeId, {
      nodeId,
      modelType,
      ...config,
      centerFreq: (config.centerFreq as number) * 1000000,
    });
    if (config.transmissionDelay !== undefined) {
      transmissionConfigStore.setNodeTransmissionDelay(nodeId, config.transmissionDelay as number);
    }
    if (config.codingScheme && config.codeRate) {
      codingConfigStore.setNodeCodingConfig(nodeId, {
        codingScheme: config.codingScheme as string,
        codeRate: config.codeRate as string,
      });
    }
    ElMessage.success('模型参数已更新');
    editingChannelModelNodeId.value = null;
    return;
  }
  // 根据 modelType 分发到对应的处理器
  const handlers: Record<string, (cfg: any) => Promise<void> | void> = {
    dss: handleDSSConfirm,
    fhss: handleFHSSConfirm,
    gfsk: handleGFSKConfirm,
    ttc: handleTTCConfirm,
    adhoc: handleAdHocConfirm,
    coordination: handleCoordinationConfirm,
    vhf: handleVHFConfirm,
    uhf: handleUHFConfirm,
    fiveG: handleFiveGConfirm,
  };
  const handler = handlers[modelType];
  if (handler) {
    await handler(config);
  }
};

const handleChannelModelCancel = () => {
  if (editingChannelModelNodeId.value !== null) {
    // 编辑模式取消
    editingChannelModelNodeId.value = null;
    channelModelDialogVisible.value = false;
    return;
  }
  const dialogConfig = getDialogConfigByPresetKey(topoStore.selectedChannelModel || '');
  const aliasPrefix = dialogConfig?.nodeAliasPrefix || '信道模型';
  ElMessage.info(`已取消创建${aliasPrefix}节点`);
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理信道模型节点的修改参数请求（来自 NodeInfoPanel 的 editChannelModel 事件）
const handleEditChannelModelFromPanel = (node: any) => {
  const modelType = node.phy_type ||
    (node.name?.includes('channel-uhf-') ? 'uhf' :
     node.name?.includes('channel-vhf-') ? 'vhf' :
     node.name?.includes('channel-dss-') ? 'dss' :
     node.name?.includes('channel-fhss-') ? 'fhss' :
     node.name?.includes('channel-gmsk-') ? 'gmsk' :
     node.name?.includes('channel-gfsk-') ? 'gfsk' :
     node.name?.includes('channel-ttc-') ? 'ttc' :
     node.name?.includes('channel-adhoc-') ? 'adhoc' :
     node.name?.includes('channel-coordination-') ? 'coordination' :
     node.name?.includes('channel-5g-') ? 'fiveG' : null);
  if (!modelType) {
    ElMessage.error('无法识别信道模型类型');
    return;
  }
  editingChannelModelNodeId.value = node.id;
  channelModelPosition.lat = node.geo?.lat || 0;
  channelModelPosition.lon = node.geo?.lon || 0;
  channelModelPosition.alt = node.geo?.alt || 0;
  currentChannelModelType.value = modelType;
  channelModelDialogVisible.value = true;
};

// 处理DSSS配置对话框确认
const handleDSSConfirm = async (dssConfig: {
  mode?: 'hopping' | 'fixed'
  adaptive?: boolean
  modulation_type: string
  txPower: number
  centerFreq: number
  k_factor: number
  speed?: number
  networkTransmissionRateBps?: number
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    console.log('[handleDSSConfirm] 处理器被调用', dssConfig);
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = dssConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算DSSS节点的序号
    const prefix = 'channel-dsss-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `短波${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取DSSS预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('DSSS');
    if (!emaneConfigs) {
      ElMessage.error("获取DSSS配置失败");
      return;
    }

    // 创建DSSS节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      dss_config: {
        mode: dssConfig.mode ?? 'fixed',
        adaptive: dssConfig.adaptive ?? false,
        modulation_type: dssConfig.modulation_type,
        txPower: dssConfig.txPower,
        centerFreq: dssConfig.centerFreq,
        k_factor: dssConfig.k_factor,
        speed: dssConfig.speed,
        transmissionDelay: dssConfig.transmissionDelay,
        networkTransmissionRateBps: dssConfig.networkTransmissionRateBps,
        height: dssConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "dss",
      modulation_type: "dss",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('DSSS节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存DSSS传输时延配置:', { actualNodeId, transmissionDelay: dssConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, dssConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存DSSS编码配置:', { actualNodeId, codingScheme: dssConfig.codingScheme, codeRate: dssConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: dssConfig.codingScheme,
      codeRate: dssConfig.codeRate
    });

    // 保存配置到 channelModelDataStore - 使用实际的nodeId
    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'dss',
      mode: dssConfig.mode ?? 'fixed',
      adaptive: dssConfig.adaptive ?? false,
      modulation_type: dssConfig.modulation_type,
      txPower: dssConfig.txPower,
      centerFreq: dssConfig.centerFreq * 1000000, // 存储为Hz
      k_factor: dssConfig.k_factor,
      speed: dssConfig.speed,
      transmissionDelay: dssConfig.transmissionDelay,
      networkTransmissionRateBps: dssConfig.networkTransmissionRateBps,
    });

    // 注册DSSS节点到仿真服务 - 使用实际的nodeId
    dssSimulationService.registerDSSNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      dss_config: {
        mode: dssConfig.mode ?? 'fixed',
        adaptive: dssConfig.adaptive ?? false,
        modulation_type: dssConfig.modulation_type,
        txPower: dssConfig.txPower,
        centerFreq: dssConfig.centerFreq * 1000000, // 存储为Hz
        k_factor: dssConfig.k_factor,
        speed: dssConfig.speed,
        transmissionDelay: dssConfig.transmissionDelay,
        networkTransmissionRateBps: dssConfig.networkTransmissionRateBps,
      },
    });

    ElMessage.success(`DSSS节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建DSSS信道模型节点",
      information: "DSSS节点创建成功",
      details: `创建了DSSS节点 "${nodeName}"，调制方式: ${dssConfig.modulation_type}, 发射功率: ${dssConfig.txPower}dBm, 工作频率: ${dssConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建DSSS节点失败:", error);
    ElMessage.error(error?.message || "创建DSSS节点失败，请重试");
  }
};

// 处理DSSS配置对话框取消
const handleDSSCancel = () => {
  ElMessage.info("已取消创建DSSS节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理FHSS配置对话框确认
const handleFHSSConfirm = async (fhssConfig: {
  modulation_type: string
  txPower: number
  centerFreq: number
  k_factor: number
  speed: number
  noiseFigureDb?: number
  shadowFadingDb?: number
  seed?: number
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    console.log('[handleFHSSConfirm] 处理器被调用', fhssConfig);
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = fhssConfig.height;
    const fhssCenterFreqHz = fhssConfig.centerFreq * 1000;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算FHSS节点的序号
    const prefix = 'channel-fhss-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `中长波${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取FHSS预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('FHSS');
    if (!emaneConfigs) {
      ElMessage.error("获取FHSS配置失败");
      return;
    }

    // 创建FHSS节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      fhss_config: {
        modulation_type: fhssConfig.modulation_type,
        txPower: fhssConfig.txPower,
        centerFreq: fhssCenterFreqHz,
        k_factor: fhssConfig.k_factor,
        speed: fhssConfig.speed,
        noiseFigureDb: fhssConfig.noiseFigureDb,
        shadowFadingDb: fhssConfig.shadowFadingDb,
        seed: fhssConfig.seed,
        height: fhssConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "fhss",
      modulation_type: "fhss",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('FHSS节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存FHSS传输时延配置:', { actualNodeId, transmissionDelay: fhssConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, fhssConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存FHSS编码配置:', { actualNodeId, codingScheme: fhssConfig.codingScheme, codeRate: fhssConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: fhssConfig.codingScheme,
      codeRate: fhssConfig.codeRate
    });

    // 保存配置到 channelModelDataStore - 使用实际的nodeId
    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'fhss',
      modulation_type: fhssConfig.modulation_type,
      txPower: fhssConfig.txPower,
      centerFreq: fhssCenterFreqHz,
      k_factor: fhssConfig.k_factor,
      speed: fhssConfig.speed,
      noiseFigureDb: fhssConfig.noiseFigureDb,
      shadowFadingDb: fhssConfig.shadowFadingDb,
      seed: fhssConfig.seed,
    });

    // 注册FHSS节点到仿真服务 - 使用实际的nodeId
    fhssSimulationService.registerFHSSNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      fhss_config: {
        modulation_type: fhssConfig.modulation_type,
        txPower: fhssConfig.txPower,
        centerFreq: fhssCenterFreqHz,
        k_factor: fhssConfig.k_factor,
        speed: fhssConfig.speed,
        noiseFigureDb: fhssConfig.noiseFigureDb,
        shadowFadingDb: fhssConfig.shadowFadingDb,
        seed: fhssConfig.seed,
      },
    });

    ElMessage.success(`FHSS节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建FHSS信道模型节点",
      information: "FHSS节点创建成功",
      details: `创建了FHSS节点 "${nodeName}"，调制方式: ${fhssConfig.modulation_type}, 发射功率: ${fhssConfig.txPower}dBm, 工作频率: ${fhssConfig.centerFreq}kHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建FHSS节点失败:", error);
    ElMessage.error(error?.message || "创建FHSS节点失败，请重试");
  }
};

// 处理FHSS配置对话框取消
const handleFHSSCancel = () => {
  ElMessage.info("已取消创建FHSS节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理GFSK配置对话框确认
const handleGFSKConfirm = async (gfskConfig: {
  modulation_type: string
  txPower: number
  centerFreq: number
  k_factor: number
  satAltKm: number
  radialVelocityMps: number
  downlinkTxPowerDbw: number
  bandwidthMHz: number
  rainRateMmh: number
  maxRetransmissions: number
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    console.log('[handleGFSKConfirm] 处理器被调用', gfskConfig);
    channelModelDialogVisible.value = false;

    // 应用卫星高度到位置对象
    channelModelPosition.alt = (gfskConfig.satAltKm ?? gfskConfig.height ?? 0) * 1000;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算GFSK节点的序号
    const prefix = 'channel-gfsk-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `卫星${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取GFSK预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('GFSK');
    if (!emaneConfigs) {
      ElMessage.error("获取GFSK配置失败");
      return;
    }

    // 创建GFSK节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      gfsk_config: {
        modulation_type: gfskConfig.modulation_type,
        txPower: gfskConfig.txPower,
        centerFreq: gfskConfig.centerFreq,
        k_factor: gfskConfig.k_factor,
        satAltKm: gfskConfig.satAltKm,
        radialVelocityMps: gfskConfig.radialVelocityMps,
        downlinkTxPowerDbw: gfskConfig.downlinkTxPowerDbw,
        bandwidthHz: gfskConfig.bandwidthMHz * 1000000,
        rainRateMmh: gfskConfig.rainRateMmh,
        maxRetransmissions: gfskConfig.maxRetransmissions,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "gfsk",
      modulation_type: "gfsk",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('GFSK节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存GFSK传输时延配置:', { actualNodeId, transmissionDelay: gfskConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, gfskConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存GFSK编码配置:', { actualNodeId, codingScheme: gfskConfig.codingScheme, codeRate: gfskConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: gfskConfig.codingScheme,
      codeRate: gfskConfig.codeRate
    });

    // 保存配置到 channelModelDataStore - 使用实际的nodeId
    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'gfsk',
      modulation_type: gfskConfig.modulation_type,
      txPower: gfskConfig.txPower,
      centerFreq: gfskConfig.centerFreq * 1000000,
      k_factor: gfskConfig.k_factor,
      satAltKm: gfskConfig.satAltKm,
      radialVelocityMps: gfskConfig.radialVelocityMps,
      downlinkTxPowerDbw: gfskConfig.downlinkTxPowerDbw,
      bandwidthHz: gfskConfig.bandwidthMHz * 1000000,
      rainRateMmh: gfskConfig.rainRateMmh,
      maxRetransmissions: gfskConfig.maxRetransmissions,
    });

    // 注册GFSK节点到仿真服务 - 使用实际的nodeId
    gfskSimulationService.registerGFSKNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      gfsk_config: {
        modulation_type: gfskConfig.modulation_type,
        txPower: gfskConfig.txPower,
        centerFreq: gfskConfig.centerFreq * 1000000,
        k_factor: gfskConfig.k_factor,
        satAltKm: gfskConfig.satAltKm,
        radialVelocityMps: gfskConfig.radialVelocityMps,
        downlinkTxPowerDbw: gfskConfig.downlinkTxPowerDbw,
        bandwidthHz: gfskConfig.bandwidthMHz * 1000000,
        rainRateMmh: gfskConfig.rainRateMmh,
        maxRetransmissions: gfskConfig.maxRetransmissions,
      },
    });

    ElMessage.success(`GFSK节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建GFSK信道模型节点",
      information: "GFSK节点创建成功",
      details: `创建了GFSK节点 "${nodeName}"，调制方式: ${gfskConfig.modulation_type}, 发射功率: ${gfskConfig.txPower}dBm, 工作频率: ${gfskConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建GFSK节点失败:", error);
    ElMessage.error(error?.message || "创建GFSK节点失败，请重试");
  }
};

// 处理GFSK配置对话框取消
const handleGFSKCancel = () => {
  ElMessage.info("已取消创建GFSK节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理测控链配置对话框确认
const handleTTCConfirm = async (ttcConfig: {
  mode: 'hopping' | 'fixed'
  adaptive: boolean
  txPower: number
  centerFreq: number
  k_factor: number
  speed: number
  samplingRate: number
  dataRateKbps: number
  multipath: Array<{ power_db: number; delay_us: number; freq_offset: number; snr_db?: number }>
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    console.log('[handleTTCConfirm] 处理器被调用', ttcConfig);
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = ttcConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算测控链节点的序号
    const prefix = 'channel-ttc-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `测控链${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取测控链预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('TT_LINK');
    if (!emaneConfigs) {
      ElMessage.error("获取测控链配置失败");
      return;
    }

    // 创建测控链节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      ttc_config: {
        mode: ttcConfig.mode,
        adaptive: ttcConfig.adaptive,
        txPower: ttcConfig.txPower,
        centerFreq: ttcConfig.centerFreq * 1000000,
        k_factor: ttcConfig.k_factor,
        speed: ttcConfig.speed,
        samplingRate: ttcConfig.samplingRate,
        dataRateKbps: ttcConfig.dataRateKbps,
        multipath: ttcConfig.multipath,
        height: ttcConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "ttc",
      modulation_type: "ttc",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('测控链节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存测控链传输时延配置:', { actualNodeId, transmissionDelay: ttcConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, ttcConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存测控链编码配置:', { actualNodeId, codingScheme: ttcConfig.codingScheme, codeRate: ttcConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: ttcConfig.codingScheme,
      codeRate: ttcConfig.codeRate
    });

    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'ttc',
      txPower: ttcConfig.txPower,
      centerFreq: ttcConfig.centerFreq * 1000000,
      k_factor: ttcConfig.k_factor,
      speed: ttcConfig.speed,
      samplingRate: ttcConfig.samplingRate,
      dataRateKbps: ttcConfig.dataRateKbps,
      multipath: ttcConfig.multipath,
      transmissionDelay: ttcConfig.transmissionDelay,
      mode: ttcConfig.mode,
      adaptive: ttcConfig.adaptive,
    });

    ttcSimulationService.registerTTCNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      ttc_config: {
        mode: ttcConfig.mode,
        adaptive: ttcConfig.adaptive,
        txPower: ttcConfig.txPower,
        centerFreq: ttcConfig.centerFreq * 1000000,
        k_factor: ttcConfig.k_factor,
        speed: ttcConfig.speed,
        samplingRate: ttcConfig.samplingRate,
        dataRateKbps: ttcConfig.dataRateKbps,
        multipath: ttcConfig.multipath.map((p: any) => ({ power_db: p.power_db, delay_us: p.delay_us, freq_offset: p.freq_offset })),
        transmissionDelayMs: ttcConfig.transmissionDelay,
      },
    });

    ElMessage.success(`测控链节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建测控链信道模型节点",
      information: "测控链节点创建成功",
      details: `创建了测控链节点 "${nodeName}"，模式: ${ttcConfig.mode}, 发射功率: ${ttcConfig.txPower}dBm, 工作频率: ${ttcConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建测控链节点失败:", error);
    ElMessage.error(error?.message || "创建测控链节点失败，请重试");
  }
};

// 处理测控链配置对话框取消
const handleTTCCancel = () => {
  ElMessage.info("已取消创建测控链节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理自组网配置对话框确认
const handleAdHocConfirm = async (adhocConfig: {
  mode: 'hopping' | 'fixed'
  adaptive: boolean
  txPower: number
  centerFreq: number
  k_factor: number
  speed: number
  samplingRate: number
  dataRateKbps: number
  multipath: Array<{ power_db: number; delay_us: number; freq_offset: number; snr_db?: number }>
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    console.log('[handleAdHocConfirm] 处理器被调用', adhocConfig);
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = adhocConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算自组网节点的序号
    const prefix = 'channel-adhoc-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `自组网${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取自组网预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('AD_HOC');
    if (!emaneConfigs) {
      ElMessage.error("获取自组网配置失败");
      return;
    }

    // 创建自组网节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      adhoc_config: {
        mode: adhocConfig.mode,
        adaptive: adhocConfig.adaptive,
        txPower: adhocConfig.txPower,
        centerFreq: adhocConfig.centerFreq * 1000000,
        k_factor: adhocConfig.k_factor,
        speed: adhocConfig.speed,
        samplingRate: adhocConfig.samplingRate,
        dataRateKbps: adhocConfig.dataRateKbps,
        multipath: adhocConfig.multipath,
        height: adhocConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "adhoc",
      modulation_type: "adhoc",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('自组网节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存自组网传输时延配置:', { actualNodeId, transmissionDelay: adhocConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, adhocConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存自组网编码配置:', { actualNodeId, codingScheme: adhocConfig.codingScheme, codeRate: adhocConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: adhocConfig.codingScheme,
      codeRate: adhocConfig.codeRate
    });

    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'adhoc',
      txPower: adhocConfig.txPower,
      centerFreq: adhocConfig.centerFreq * 1000000,
      k_factor: adhocConfig.k_factor,
      speed: adhocConfig.speed,
      samplingRate: adhocConfig.samplingRate,
      dataRateKbps: adhocConfig.dataRateKbps,
      multipath: adhocConfig.multipath,
      transmissionDelay: adhocConfig.transmissionDelay,
      mode: adhocConfig.mode,
      adaptive: adhocConfig.adaptive,
    });

    adhocSimulationService.registerAdHocNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      adhoc_config: {
        mode: adhocConfig.mode,
        adaptive: adhocConfig.adaptive,
        txPower: adhocConfig.txPower,
        centerFreq: adhocConfig.centerFreq * 1000000,
        k_factor: adhocConfig.k_factor,
        speed: adhocConfig.speed,
        samplingRate: adhocConfig.samplingRate,
        dataRateKbps: adhocConfig.dataRateKbps,
        multipath: adhocConfig.multipath.map((p: any) => ({ power_db: p.power_db, delay_us: p.delay_us, freq_offset: p.freq_offset })),
        transmissionDelayMs: adhocConfig.transmissionDelay,
      },
    });

    ElMessage.success(`自组网节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建自组网信道模型节点",
      information: "自组网节点创建成功",
      details: `创建了自组网节点 "${nodeName}"，模式: ${adhocConfig.mode}, 发射功率: ${adhocConfig.txPower}dBm, 工作频率: ${adhocConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建自组网节点失败:", error);
    ElMessage.error(error?.message || "创建自组网节点失败，请重试");
  }
};

// 处理自组网配置对话框取消
const handleAdHocCancel = () => {
  ElMessage.info("已取消创建自组网节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理协同链配置对话框确认
const handleCoordinationConfirm = async (coordinationConfig: {
  mode: 'hopping' | 'fixed'
  adaptive: boolean
  txPower: number
  centerFreq: number
  k_factor: number
  speed: number
  samplingRate: number
  dataRateKbps: number
  multipath: Array<{ power_db: number; delay_us: number; freq_offset: number; snr_db?: number }>
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    console.log('[handleCoordinationConfirm] 处理器被调用', coordinationConfig);
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = coordinationConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算协同链节点的序号
    const prefix = 'channel-coordination-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `协同链${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取协同链预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('COOP_LINK');
    if (!emaneConfigs) {
      ElMessage.error("获取协同链配置失败");
      return;
    }

    // 创建协同链节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      coordination_config: {
        mode: coordinationConfig.mode,
        adaptive: coordinationConfig.adaptive,
        txPower: coordinationConfig.txPower,
        centerFreq: coordinationConfig.centerFreq * 1000000,
        k_factor: coordinationConfig.k_factor,
        speed: coordinationConfig.speed,
        samplingRate: coordinationConfig.samplingRate,
        dataRateKbps: coordinationConfig.dataRateKbps,
        multipath: coordinationConfig.multipath,
        height: coordinationConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "coordination",
      modulation_type: "coordination",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('协同链节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存协同链传输时延配置:', { actualNodeId, transmissionDelay: coordinationConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, coordinationConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存协同链编码配置:', { actualNodeId, codingScheme: coordinationConfig.codingScheme, codeRate: coordinationConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: coordinationConfig.codingScheme,
      codeRate: coordinationConfig.codeRate
    });

    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'coordination',
      txPower: coordinationConfig.txPower,
      centerFreq: coordinationConfig.centerFreq * 1000000,
      k_factor: coordinationConfig.k_factor,
      speed: coordinationConfig.speed,
      samplingRate: coordinationConfig.samplingRate,
      dataRateKbps: coordinationConfig.dataRateKbps,
      multipath: coordinationConfig.multipath,
      transmissionDelay: coordinationConfig.transmissionDelay,
      mode: coordinationConfig.mode,
      adaptive: coordinationConfig.adaptive,
    });

    coordinationSimulationService.registerCoordinationNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      coordination_config: {
        mode: coordinationConfig.mode,
        adaptive: coordinationConfig.adaptive,
        txPower: coordinationConfig.txPower,
        centerFreq: coordinationConfig.centerFreq * 1000000,
        k_factor: coordinationConfig.k_factor,
        speed: coordinationConfig.speed,
        samplingRate: coordinationConfig.samplingRate,
        dataRateKbps: coordinationConfig.dataRateKbps,
        multipath: coordinationConfig.multipath.map((p: any) => ({ power_db: p.power_db, delay_us: p.delay_us, freq_offset: p.freq_offset })),
        transmissionDelayMs: coordinationConfig.transmissionDelay,
      },
    });

    ElMessage.success(`协同链节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建协同链信道模型节点",
      information: "协同链节点创建成功",
      details: `创建了协同链节点 "${nodeName}"，模式: ${coordinationConfig.mode}, 发射功率: ${coordinationConfig.txPower}dBm, 工作频率: ${coordinationConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建协同链节点失败:", error);
    ElMessage.error(error?.message || "创建协同链节点失败，请重试");
  }
};

// 处理协同链配置对话框取消
const handleCoordinationCancel = () => {
  ElMessage.info("已取消创建协同链节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理VHF配置对话框确认
const handleVHFConfirm = async (vhfConfig: {
  modulation_type: string
  txPower: number
  centerFreq: number
  k_factor: number
  speed: number
  samplingRate: number
  snr_db: number
  multipath: Array<{ power_db: number; delay_us: number; freq_offset: number; snr_db: number }>
  dataRateKbps: number
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = vhfConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算VHF节点的序号
    const prefix = 'channel-vhf-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `VHF${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取VHF预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('VHF');
    if (!emaneConfigs) {
      ElMessage.error("获取VHF配置失败");
      return;
    }

    // 创建VHF节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      vhf_config: {
        modulation_type: vhfConfig.modulation_type,
        txPower: vhfConfig.txPower,
        centerFreq: vhfConfig.centerFreq * 1000000, // 存储为Hz
        k_factor: vhfConfig.k_factor,
        speed: vhfConfig.speed,
        samplingRate: vhfConfig.samplingRate,
        snr_db: vhfConfig.snr_db,
        multipath: vhfConfig.multipath,
        height: vhfConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "vhf",
      modulation_type: "vhf",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('VHF节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存VHF传输时延配置:', { actualNodeId, transmissionDelay: vhfConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, vhfConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存VHF编码配置:', { actualNodeId, codingScheme: vhfConfig.codingScheme, codeRate: vhfConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: vhfConfig.codingScheme,
      codeRate: vhfConfig.codeRate
    });

    // 保存配置到 channelModelDataStore - 使用实际的nodeId
    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'vhf',
      modulation_type: vhfConfig.modulation_type,
      txPower: vhfConfig.txPower,
      centerFreq: vhfConfig.centerFreq * 1000000, // 存储为Hz
      k_factor: vhfConfig.k_factor,
      speed: vhfConfig.speed,
      samplingRate: vhfConfig.samplingRate,
      snr_db: vhfConfig.snr_db,
      multipath: vhfConfig.multipath,
      dataRateKbps: vhfConfig.dataRateKbps,
    });

    // 注册VHF节点到仿真服务 - 使用实际的nodeId
    vhfSimulationService.registerVHFNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      vhf_config: {
        modulation_type: vhfConfig.modulation_type,
        txPower: vhfConfig.txPower,
        centerFreq: vhfConfig.centerFreq * 1000000, // 存储为Hz
        k_factor: vhfConfig.k_factor,
        speed: vhfConfig.speed,
        samplingRate: vhfConfig.samplingRate,
        snr_db: vhfConfig.snr_db,
        multipath: vhfConfig.multipath,
      },
    });

    ElMessage.success(`VHF节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建VHF信道模型节点",
      information: "VHF节点创建成功",
      details: `创建了VHF节点 "${nodeName}"，调制方式: ${vhfConfig.modulation_type}, 发射功率: ${vhfConfig.txPower}dBm, 工作频率: ${vhfConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建VHF节点失败:", error);
    ElMessage.error(error?.message || "创建VHF节点失败，请重试");
  }
};

// 处理VHF配置对话框取消
const handleVHFCancel = () => {
  ElMessage.info("已取消创建VHF节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理UHF配置对话框确认
const handleUHFConfirm = async (uhfConfig: {
  modulation_type: string
  txPower: number
  centerFreq: number
  k_factor: number
  speed: number
  samplingRate: number
  snr_db: number
  multipath: Array<{ power_db: number; delay_us: number; freq_offset: number; snr_db: number }>
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = uhfConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算UHF节点的序号
    const prefix = 'channel-uhf-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `UHF${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取UHF预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('UHF');
    if (!emaneConfigs) {
      ElMessage.error("获取UHF配置失败");
      return;
    }

    // 创建UHF节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      uhf_config: {
        modulation_type: uhfConfig.modulation_type,
        txPower: uhfConfig.txPower,
        centerFreq: uhfConfig.centerFreq * 1000000, // 存储为Hz
        k_factor: uhfConfig.k_factor,
        speed: uhfConfig.speed,
        samplingRate: uhfConfig.samplingRate,
        snr_db: uhfConfig.snr_db,
        multipath: uhfConfig.multipath,
        height: uhfConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "uhf",
      modulation_type: "uhf",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('UHF节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存UHF传输时延配置:', { actualNodeId, transmissionDelay: uhfConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, uhfConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存UHF编码配置:', { actualNodeId, codingScheme: uhfConfig.codingScheme, codeRate: uhfConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: uhfConfig.codingScheme,
      codeRate: uhfConfig.codeRate
    });

    // 保存配置到 channelModelDataStore - 使用实际的nodeId
    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'uhf',
      modulation_type: uhfConfig.modulation_type,
      txPower: uhfConfig.txPower,
      centerFreq: uhfConfig.centerFreq * 1000000, // 存储为Hz
      k_factor: uhfConfig.k_factor,
      speed: uhfConfig.speed,
      samplingRate: uhfConfig.samplingRate,
      snr_db: uhfConfig.snr_db,
      multipath: uhfConfig.multipath,
    });

    // 注册UHF节点到仿真服务 - 使用实际的nodeId
    uhfSimulationService.registerUHFNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      uhf_config: {
        modulation_type: uhfConfig.modulation_type,
        txPower: uhfConfig.txPower,
        centerFreq: uhfConfig.centerFreq * 1000000, // 存储为Hz
        k_factor: uhfConfig.k_factor,
        speed: uhfConfig.speed,
        samplingRate: uhfConfig.samplingRate,
        snr_db: uhfConfig.snr_db,
        multipath: uhfConfig.multipath,
      },
    });

    ElMessage.success(`UHF节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建UHF信道模型节点",
      information: "UHF节点创建成功",
      details: `创建了UHF节点 "${nodeName}"，调制方式: ${uhfConfig.modulation_type}, 发射功率: ${uhfConfig.txPower}dBm, 工作频率: ${uhfConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建UHF节点失败:", error);
    ElMessage.error(error?.message || "创建UHF节点失败，请重试");
  }
};

// 处理UHF配置对话框取消
const handleUHFCancel = () => {
  ElMessage.info("已取消创建UHF节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理5G配置对话框确认
const handleFiveGConfirm = async (fiveGConfig: {
  modulation_type: string
  txPower: number
  centerFreq: number
  k_factor: number
  speed: number
  samplingRate: number
  dataRateKbps: number
  multipath: Array<{ power_db: number; delay_us: number; freq_offset: number; snr_db?: number }>
  transmissionDelay: number
  codingScheme: string
  codeRate: string
  height: number
}) => {
  try {
    console.log('[handleFiveGConfirm] 处理器被调用', fiveGConfig);
    channelModelDialogVisible.value = false;

    // 应用高度值到位置对象
    channelModelPosition.alt = fiveGConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算5G节点的序号
    const prefix = 'channel-5g-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `5G${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 获取5G预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('FiveG');
    if (!emaneConfigs) {
      ElMessage.error("获取5G配置失败");
      return;
    }

    // 创建5G节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...channelModelPosition },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      fiveG_config: {
        modulation_type: fiveGConfig.modulation_type,
        txPower: fiveGConfig.txPower,
        centerFreq: fiveGConfig.centerFreq,
        k_factor: fiveGConfig.k_factor,
        speed: fiveGConfig.speed,
        samplingRate: fiveGConfig.samplingRate,
        dataRateKbps: fiveGConfig.dataRateKbps,
        multipath: fiveGConfig.multipath,
        height: fiveGConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "fiveG",
      modulation_type: "fiveG",
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('5G节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存传输时延配置 - 使用实际的nodeId
    console.log('保存5G传输时延配置:', { actualNodeId, transmissionDelay: fiveGConfig.transmissionDelay });
    transmissionConfigStore.setNodeTransmissionDelay(actualNodeId, fiveGConfig.transmissionDelay);

    // 保存编码配置 - 使用实际的nodeId
    console.log('保存5G编码配置:', { actualNodeId, codingScheme: fiveGConfig.codingScheme, codeRate: fiveGConfig.codeRate });
    codingConfigStore.setNodeCodingConfig(actualNodeId, {
      codingScheme: fiveGConfig.codingScheme,
      codeRate: fiveGConfig.codeRate
    });

    // 保存配置到 channelModelDataStore - 使用实际的nodeId
    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'fiveG',
      modulation_type: fiveGConfig.modulation_type,
      txPower: fiveGConfig.txPower,
      centerFreq: fiveGConfig.centerFreq * 1000000, // 存储为Hz
      k_factor: fiveGConfig.k_factor,
      speed: fiveGConfig.speed,
      samplingRate: fiveGConfig.samplingRate,
      dataRateKbps: fiveGConfig.dataRateKbps,
      multipath: fiveGConfig.multipath,
      transmissionDelay: fiveGConfig.transmissionDelay,
    });

    // 注册5G节点到仿真服务 - 使用实际的nodeId
    fiveGSimulationService.registerFiveGNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: channelModelPosition,
      fiveG_config: {
        modulation_type: fiveGConfig.modulation_type,
        txPower: fiveGConfig.txPower,
        centerFreq: fiveGConfig.centerFreq * 1000000, // 存储为Hz
        k_factor: fiveGConfig.k_factor,
        speed: fiveGConfig.speed,
        samplingRate: fiveGConfig.samplingRate,
        dataRateKbps: fiveGConfig.dataRateKbps,
        multipath: fiveGConfig.multipath.map((p: any) => ({
          power_db: p.power_db,
          delay_us: p.delay_us,
          freq_offset: p.freq_offset,
        })),
        transmissionDelayMs: fiveGConfig.transmissionDelay,
      },
    });

    ElMessage.success(`5G节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建5G信道模型节点",
      information: "5G节点创建成功",
      details: `创建了5G节点 "${nodeName}"，调制方式: ${fiveGConfig.modulation_type}, 发射功率: ${fiveGConfig.txPower}dBm, 工作频率: ${fiveGConfig.centerFreq}MHz，位置: [${channelModelPosition.lat.toFixed(
        4
      )}, ${channelModelPosition.lon.toFixed(4)}, ${channelModelPosition.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建5G节点失败:", error);
    ElMessage.error(error?.message || "创建5G节点失败，请重试");
  }
};

// 处理5G配置对话框取消
const handleFiveGCancel = () => {
  ElMessage.info("已取消创建5G节点");
  channelModelDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 处理散射配置对话框确认
const handleCustomConfirm = async (customConfig: {
  modulation: string
  centerFreq: number
  samplingRate: number
  snr_db: number
  speed: number
  multipath: Array<{ power_db: number; delay_us: number; freq_offset: number }>
  height: number
}) => {
  try {
    console.log('[handleCustomConfirm] 处理器被调用', customConfig);
    customConfigDialogVisible.value = false;

    // 应用高度值到位置对象
    customPosition.alt = customConfig.height;

    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算散射节点的序号
    const prefix = 'channel-custom-';
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `Custom${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 验证数据有效性
    if (!Number.isFinite(customConfig.centerFreq) || customConfig.centerFreq < 0) {
      ElMessage.error("中心频率无效");
      return;
    }
    if (!Number.isFinite(customConfig.samplingRate) || customConfig.samplingRate < 0) {
      ElMessage.error("采样率无效");
      return;
    }
    if (!Number.isFinite(customConfig.snr_db)) {
      ElMessage.error("背景SNR无效");
      return;
    }

    // 验证多径数据
    if (!Number.isFinite(customConfig.speed) || customConfig.speed < 0) {
      ElMessage.error("速度无效");
      return;
    }

    for (const path of customConfig.multipath) {
      if (!Number.isFinite(path.power_db) || !Number.isFinite(path.delay_us) ||
          !Number.isFinite(path.freq_offset)) {
        ElMessage.error("多径路径数据无效");
        return;
      }
    }

    // 验证和清理位置信息
    const geo = {
      lat: Number.isFinite(customPosition.lat) ? customPosition.lat : 0,
      lon: Number.isFinite(customPosition.lon) ? customPosition.lon : 0,
      alt: Number.isFinite(customPosition.alt) ? customPosition.alt : 0
    };

    // 获取散射预设配置
    const emaneConfigs = getChannelModelEmaneConfigs('CUSTOM');
    if (!emaneConfigs) {
      ElMessage.error("获取散射配置失败");
      return;
    }

    // 创建散射节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: "emane_rfpipe",
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: geo,
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      custom_config: {
        modulation: parseInt(customConfig.modulation, 10),
        centerFreq: customConfig.centerFreq,
        samplingRate: customConfig.samplingRate,
        snr_db: customConfig.snr_db,
        speed: customConfig.speed,
        multipath: customConfig.multipath,
        height: customConfig.height,
      },
      role: 2,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: "custom",
      modulation_type: "custom",
      isWired: false,
    };

    // 验证数据可序列化性
    try {
      JSON.stringify(nodeData);
    } catch (serializeError) {
      console.error("节点数据序列化失败:", serializeError);
      ElMessage.error("节点数据格式错误，请检查输入");
      return;
    }

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    // 从topoStore获取实际创建的节点，确保使用真实的nodeId
    const createdNode = topoStore.topoData?.nodes?.find((n: any) => n.name === nodeName);
    const actualNodeId = createdNode?.id || nodeId;
    console.log('散射节点创建成功，实际nodeId:', actualNodeId, '计算nodeId:', nodeId);

    // 保存配置到 channelModelDataStore - 使用实际的nodeId，特别要保存multipath配置
    channelModelDataStore.saveNodeData(actualNodeId, {
      nodeId: actualNodeId,
      modelType: 'custom',
      modulation: customConfig.modulation,
      centerFreq: customConfig.centerFreq * 1000000,
      samplingRate: customConfig.samplingRate * 1000000,
      snr_db: customConfig.snr_db,
      speed: customConfig.speed,
      multipath: customConfig.multipath,
    });

    // 注册散射节点到仿真服务 - 使用实际的nodeId
    customSimulationService.registerCustomNode(actualNodeId, {
      id: actualNodeId,
      name: nodeName,
      geo: geo,
      custom_config: {
        modulation: parseInt(customConfig.modulation, 10),
        centerFreq: customConfig.centerFreq * 1000000,
        samplingRate: customConfig.samplingRate * 1000000,
        snr_db: customConfig.snr_db,
        speed: customConfig.speed,
        multipath: customConfig.multipath,
      },
    });

    ElMessage.success(`散射节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建散射节点",
      information: "散射节点创建成功",
      details: `创建了散射节点 "${nodeName}"，中心频率: ${customConfig.centerFreq}MHz, 采样率: ${customConfig.samplingRate}MHz, 背景SNR: ${customConfig.snr_db}dB，多径路径数: ${customConfig.multipath.length}，位置: [${geo.lat.toFixed(
        4
      )}, ${geo.lon.toFixed(4)}, ${geo.alt.toFixed(1)}]`,
    });

    topoStore.operationMode = "select";
    // @ts-ignore: 清除信道模型选择
    topoStore.setSelectedChannelModel(null);

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建散射节点失败:", error);
    ElMessage.error(error?.message || "创建散射节点失败，请重试");
  }
};

// 处理散射配置对话框取消
const handleCustomCancel = () => {
  ElMessage.info("已取消创建散射节点");
  customConfigDialogVisible.value = false;
  topoStore.operationMode = "select";
  // @ts-ignore: 清除信道模型选择
  topoStore.setSelectedChannelModel(null);
};

// 创建信道模型节点（使用预设参数直接创建，无需弹出对话框）
const createChannelModelNode = async (
  position: { lat: number; lon: number; alt: number },
  channelType: string
) => {
  try {
    const preset = channelModelPresets[channelType];
    if (!preset) {
      ElMessage.error(`未知的信道模型类型: ${channelType}`);
      return;
    }

    const emaneConfigs = getChannelModelEmaneConfigs(channelType);
    if (!emaneConfigs) {
      ElMessage.error("获取信道模型配置失败");
      return;
    }

    // 生成唯一名称
    const nodes = topoStore.topoData?.nodes || [];
    const links = topoStore.topoData?.links || [];

    // 计算当前信道模型类型的序号
    const prefix = `channel-${preset.name}-`;
    let maxNum = 0;
    nodes.forEach((node: any) => {
      if (node.name && node.name.startsWith(prefix)) {
        const numStr = node.name.substring(prefix.length);
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nodeName = `${prefix}${maxNum + 1}`;
    const nodeAlias = `${preset.displayName}${maxNum + 1}`;

    // 计算下一个可用节点ID
    const maxNodeId = nodes.length > 0 ? Math.max(...nodes.map((n: any) => n.id)) : 0;
    const nodeId = maxNodeId + links.length + 1;

    // 创建EMANE节点数据
    const nodeData = {
      id: nodeId,
      name: nodeName,
      type: "EMANE",
      model: "emane",
      position: { x: 0, y: 0, z: 0 },
      emane: preset.emaneModelFull,
      icon: "",
      image: "",
      server: "",
      config_services: [],
      geo: { ...position },
      dir: "",
      channel: "",
      canvas: 0,
      wlan_config: {},
      mobility_config: {},
      service_configs: {},
      emane_configs: emaneConfigs,
      role: preset.role,
      status: "UP",
      alias: nodeAlias,
      displayModel: null,
      phy_type: preset.phyType,
      isWired: false,
    };

    // 调用API添加节点
    await (topoStore as any).addNodeRemote(nodeData);

    ElMessage.success(`${preset.displayName}节点 ${nodeName} 创建成功`);

    // 记录日志
    systemLogStore.addLog({
      type: "important",
      module: "subnet",
      action: "创建信道模型节点",
      information: "信道模型节点创建成功",
      details: `创建了${preset.displayName}节点 "${nodeName}"，位置: [${position.lat.toFixed(
        4
      )}, ${position.lon.toFixed(4)}, ${position.alt.toFixed(1)}]`,
    });

    // 发送跨页面同步消息
    await nextTick();
    sendCrossPageSyncMessage();
  } catch (error: any) {
    console.error("创建信道模型节点失败:", error);
    ElMessage.error(error?.message || "创建信道模型节点失败，请重试");
  }
};

// 处理干扰节点配置确认
const handleInterferenceNodeConfigConfirm = async (nodeData: any) => {
  showInterferenceConfigDialog.value = false;
  topoStore.operationMode = "select"; // Corrected: Exit placement mode

  // 记录日志
  systemLogStore.addLog({
    type: "important",
    information: "操作成功",
    module: "interference",
    action: "创建干扰节点",
    details: `创建了干扰节点 "${nodeData.alias || nodeData.name}"，位置: [${nodeData.geo.lat.toFixed(
      4
    )}, ${nodeData.geo.lon.toFixed(4)}, ${nodeData.geo.alt.toFixed(1)}]`,
  });

  // 发送跨页面同步消息，通知其他页面（如资源库页面）
  await nextTick();
  sendCrossPageSyncMessage();
};

// 处理干扰节点配置取消
const handleInterferenceNodeConfigCancel = () => {
  showInterferenceConfigDialog.value = false;
  topoStore.operationMode = "select"; // Corrected: Exit placement mode
  ElMessage.info("已取消创建干扰节点");
};

// 确保topoData已初始化
const ensureTopoDataExists = () => {
  if (!topoStore.topoData) {
    // @ts-ignore: 忽略类型检查错误，该方法确实存在
    topoStore.initEmptyTopoData();
  }

  // 确保nodes和links数组存在
  if (topoStore.topoData) {
    if (!Array.isArray(topoStore.topoData.nodes)) {
      topoStore.topoData.nodes = [];
    }

    if (!Array.isArray(topoStore.topoData.links)) {
      topoStore.topoData.links = [];
    }
  }
};

// 同步已有节点到Cesium
const syncExistingNodes = () => {
  // 确保有持久化的节点数据和Cesium实体管理器
  if (!cesiumEntities.value) {
    console.warn("无法同步节点: cesiumEntities为null");
    return;
  }

  if (topoStore.topoData?.nodes?.length > 0) {
    // 使用Promise确保同步完成
    Promise.resolve()
      .then(() => {
        if (cesiumEntities.value) {
          cesiumEntities.value.syncNodesToEntities();
        }
      })
      .catch((error) => {
        console.error("同步节点时出错:", error);
      });
  }
};

// 同步已有链路到Cesium
const syncExistingLinks = () => {
  // 确保有持久化的链路数据和Cesium实体管理器
  if (!cesiumEntities.value) {
    console.warn("无法同步链路: cesiumEntities为null");
    return;
  }

  if (topoStore.topoData?.links?.length > 0) {
    // 使用Promise确保同步完成
    Promise.resolve()
      .then(() => {
        if (cesiumEntities.value) {
          cesiumEntities.value.syncLinksToEntities();
        }
      })
      .catch((error) => {
        console.error("同步链路时出错:", error);
      });
  }
};

// 初始化信道模型节点（页面刷新后恢复）
const initializeChannelModelNodes = () => {
  if (!topoStore.topoData?.nodes) {
    return;
  }

  console.log('开始重新初始化信道模型节点...');

  const nodes = topoStore.topoData.nodes;
  let initializedCount = 0;

  // 辅助函数：判断节点的信道模型类型（通过name或phy_type）
  const getNodeChannelType = (node: any): string | null => {
    // 先检查phy_type
    if (node.phy_type) return node.phy_type;
    // 再检查name
    if (!node.name) return null;
    if (node.name.startsWith('channel-dsss-')) return 'dss';
    if (node.name.startsWith('channel-fhss-')) return 'fhss';
    if (node.name.startsWith('channel-gfsk-')) return 'gfsk';
    if (node.name.startsWith('channel-ttc-')) return 'ttc';
    if (node.name.startsWith('channel-adhoc-')) return 'adhoc';
    if (node.name.startsWith('channel-coordination-')) return 'coordination';
    if (node.name.startsWith('channel-vhf-')) return 'vhf';
    if (node.name.startsWith('channel-uhf-')) return 'uhf';
    if (node.name.startsWith('channel-5g-')) return 'fiveG';
    if (node.name.startsWith('channel-custom-')) return 'custom';
    return null;
  };

  nodes.forEach((node: any) => {
    const channelType = getNodeChannelType(node);
    if (!channelType) return;

    console.log(`发现信道模型节点: ${node.name} (ID: ${node.id}, type: ${channelType})`);

    // 从持久化存储获取配置（传入modelType以启用modelType回退搜索）
    const persistedConfig = channelModelDataStore.getNodeData(node.id, channelType);

    switch (channelType) {
      case 'dss': {
        const registeredNodes = dssSimulationService.getDSSNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.dss_config || {
            mode: 'fixed', adaptive: false, modulation_type: '1', txPower: 43.0,
            centerFreq: 7 * 1000000, k_factor: 5.0, speed: 10.0,
            transmissionDelay: 10.0, networkTransmissionRateBps: 1000.0,
          };
          dssSimulationService.registerDSSNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, dss_config: config,
          });
          initializedCount++;
          console.log(`重新注册DSSS节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'fhss': {
        const registeredNodes = fhssSimulationService.getFHSSNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.fhss_config || {
            modulation_type: '2', txPower: 30.0, centerFreq: 2437 * 1000, k_factor: 10.0, speed: 30.0,
            noiseFigureDb: 7.0, shadowFadingDb: 2.5, seed: 1234,
          };
          fhssSimulationService.registerFHSSNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, fhss_config: config,
          });
          initializedCount++;
          console.log(`重新注册FHSS节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'gfsk': {
        const registeredNodes = gfskSimulationService.getGFSKNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.gfsk_config || {
            modulation_type: '2', txPower: 30.0, centerFreq: 2437 * 1000000, k_factor: 10.0,
          };
          gfskSimulationService.registerGFSKNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, gfsk_config: config,
          });
          initializedCount++;
          console.log(`重新注册GFSK节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'ttc': {
        const registeredNodes = ttcSimulationService.getTTCNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.ttc_config || {
            mode: 'hopping', adaptive: true, txPower: 43.0, centerFreq: 1550000000.0, k_factor: 10.0,
          };
          ttcSimulationService.registerTTCNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, ttc_config: config,
          });
          initializedCount++;
          console.log(`重新注册TTC节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'adhoc': {
        const registeredNodes = adhocSimulationService.getAdHocNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.adhoc_config || {
            mode: 'hopping', adaptive: true, txPower: 43.0, centerFreq: 462500000.0, k_factor: 10.0,
          };
          adhocSimulationService.registerAdHocNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, adhoc_config: config,
          });
          initializedCount++;
          console.log(`重新注册AdHoc节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'coordination': {
        const registeredNodes = coordinationSimulationService.getCoordinationNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.coordination_config || {
            mode: 'hopping', adaptive: true, txPower: 43.0, centerFreq: 462500000.0, k_factor: 10.0,
          };
          coordinationSimulationService.registerCoordinationNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, coordination_config: config,
          });
          initializedCount++;
          console.log(`重新注册Coordination节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'vhf': {
        const registeredNodes = vhfSimulationService.getVHFNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.vhf_config || {
            modulation_type: '2', txPower: 30.0, centerFreq: 150 * 1000000, k_factor: 10.0,
          };
          vhfSimulationService.registerVHFNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, vhf_config: config,
          });
          initializedCount++;
          console.log(`重新注册VHF节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'uhf': {
        const registeredNodes = uhfSimulationService.getUHFNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.uhf_config || {
            modulation_type: '2', txPower: 30.0, centerFreq: 1500 * 1000000, k_factor: 10.0,
          };
          uhfSimulationService.registerUHFNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, uhf_config: config,
          });
          initializedCount++;
          console.log(`重新注册UHF节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'fiveG': {
        const registeredNodes = fiveGSimulationService.getFiveGNodes();
        if (!registeredNodes.has(node.id)) {
          const config = persistedConfig || node.fiveG_config || {
            modulation_type: '2', txPower: 30.0, centerFreq: 3500 * 1000000, k_factor: 10.0,
          };
          fiveGSimulationService.registerFiveGNode(node.id, {
            id: node.id, name: node.name, geo: node.geo || { lat: 0, lon: 0, alt: 0 }, fiveG_config: config,
          });
          initializedCount++;
          console.log(`重新注册5G节点: ${node.name} (ID: ${node.id})`);
        }
        break;
      }
      case 'custom': {
        // Custom model reinitalization handled separately
        break;
      }
    }
  });

  if (initializedCount > 0) {
    console.log(`成功重新初始化 ${initializedCount} 个信道模型节点`);

    // 重新更新网络连接关系
    const links = topoStore.topoData?.links || [];
    updateDSSNetworkConnections(links);
    updateFHSSNetworkConnections(links);
    updateGFSKNetworkConnections(links);
    updateTTCNetworkConnections(links);
    updateAdHocNetworkConnections(links);
    updateCoordinationNetworkConnections(links);
    updateVHFNetworkConnections(links);
    updateUHFNetworkConnections(links);
    updateFiveGNetworkConnections(links);
    updateCustomNetworkConnections(links);

    console.log('信道模型节点网络连接关系已更新');
  } else {
    console.log('没有发现需要重新初始化的信道模型节点');
  }
};

// 初始化Cesium Viewer
const initCesiumViewer = async (container: HTMLElement) => {
  try {
    // 创建Viewer实例
    const viewer = new Cesium.Viewer(container, {
      infoBox: false,
      selectionIndicator: false,
      navigationHelpButton: true,
      baseLayerPicker: true,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      geocoder: true,
      homeButton: true,
      sceneModePicker: true,
      terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(
2767062,)
    });

    // 添加全球影像（使用vite代理）
    // const imageryProvider = new Cesium.UrlTemplateImageryProvider({
    //     url: "http://localhost:666/static/map/{z}/{x}/{reverseY}.png",
    //     tilingScheme: new Cesium.WebMercatorTilingScheme(),
    //     rectangle: Cesium.Rectangle.fromDegrees(-180, -85.0511, 180, 85.0511),
    //     minimumLevel: 0,
    //     maximumLevel: 16,
    //     tileWidth: 256,
    //     tileHeight: 256,

    // });
    // viewer.imageryLayers.addImageryProvider(imageryProvider);

    // 加载OSM建筑数据
    try {
      const buildingTileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
      viewer.scene.primitives.add(buildingTileset);
      // 保存建筑图层引用
      osmBuildings.value = buildingTileset;
      
      // 只在3D模式显示建筑，初始化时默认为3D模式
      if (viewer.scene.mode !== Cesium.SceneMode.SCENE3D) {
        buildingTileset.show = false;
      } else {
        buildingTileset.show = true;
    
      }
      
      console.log("OSM建筑加载完成");
      
    } catch (error) {
      console.warn("加载OSM建筑失败:", error);
    }
    
    // 隐藏水印
    if (viewer.cesiumWidget?.creditContainer) {
      (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none";
    }

    return viewer;
  } catch (error) {
    console.error("创建Cesium Viewer时出错:", error);
    ElMessage.error("初始化3D地球失败，请刷新页面重试");
    throw error;
  }
};

// 切换底图模式：简洁淡蓝色背景 <-> 卫星地图
const toggleMapMode = () => {
  if (!cesiumViewer.value) return;

  const viewer = cesiumViewer.value;
  const imageryLayers = viewer.imageryLayers;

  if (isSimpleMapMode.value) {
    // 当前是简洁模式，切换回卫星地图
    // 显示所有图层
    for (let i = 0; i < imageryLayers.length; i++) {
      imageryLayers.get(i).show = true;
    }

    // 恢复默认地球颜色；瓦片加载慢或失败时也避免整球纯黑
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a3a5c');
    isSimpleMapMode.value = false;
  } else {
    // 当前是卫星地图，切换到简洁模式
    // 隐藏所有图层（不移除，避免对象被销毁）
    for (let i = 0; i < imageryLayers.length; i++) {
      imageryLayers.get(i).show = false;
    }

    // 设置淡蓝色地球背景
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a3a5c');
    isSimpleMapMode.value = true;
  }
};

// 配置Cesium场景
const handleToggleNavalStrikeDemo = () => {
  if (!cesiumViewer.value) {
    ElMessage.warning("三维场景尚未初始化");
    return;
  }

  if (navalStrikeDemoActive.value) {
    navalStrikeDemo.stop();
  } else {
    navalStrikeDemo.start();
  }
};

const setupCesiumScene = (viewer: Cesium.Viewer) => {
  // 设置默认视角
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      CESIUM_CONFIG.DEFAULT_VIEW.longitude,
      CESIUM_CONFIG.DEFAULT_VIEW.latitude,
      CESIUM_CONFIG.DEFAULT_VIEW.height
    ),
    // orientation : new Cesium.HeadingPitchRoll(
    //   CESIUM_CONFIG.DEFAULT_VIEW.heading,
    //   CESIUM_CONFIG.DEFAULT_VIEW.pitch,
    //   CESIUM_CONFIG.DEFAULT_VIEW.roll
    // ),
    duration: 5,
  });

  // 配置场景效果
  if (viewer.scene) {
    const { scene } = viewer;
    scene.globe.enableLighting = false;
    scene.globe.baseColor = Cesium.Color.fromCssColorString('#1a3a5c');
    scene.backgroundColor = Cesium.Color.BLACK;
    scene.fog.enabled = false;
    scene.skyBox.show = false;
    scene.skyAtmosphere.show = true;
    scene.screenSpaceCameraController.enableRotate = true;
  }

  // 添加事件监听
  viewer.screenSpaceEventHandler.setInputAction(
    handleLeftClick,
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );

  // 添加双击事件监听
  viewer.screenSpaceEventHandler.setInputAction(
    handleDoubleClick,
    Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
  );

  // 监听实体选中事件，弹出节点信息面板
  viewer.selectedEntityChanged.addEventListener((entity: any) => {
    if (entity && typeof entity.id === "string" && /^\d+$/.test(entity.id)) {
      const nodeId = parseInt(entity.id, 10);
      const node = topoStore.topoData?.nodes?.find((n: any) => n.id === nodeId);
      if (node) {
        // 根据节点类型显示不同的信息面板
        if (node.type === "INODE") {
          // 显示干扰节点信息面板
          selectedInterferenceNode.value = node;
          interferenceNodeInfoPanelVisible.value = true;
          nodeInfoPanelVisible.value = false; // 确保关闭普通节点信息面板
        } else {
          // 显示普通节点信息面板
          selectedNode.value = node;
          nodeInfoPanelVisible.value = true;
          interferenceNodeInfoPanelVisible.value = false; // 确保关闭干扰节点信息面板
        }

        // 关闭链路信息面板
        linkInfoPanelVisible.value = false;
        // 不再关闭EMANE MAC信息面板
      }
    }
  });
};

// 飞回初始视角
const flyToHomeHandler = () => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化，无法返回初始视角");
    return;
  }

  try {
    // 飞回初始视角，移动时间设为1秒
    cesiumViewer.value.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        CESIUM_CONFIG.DEFAULT_VIEW.longitude,
        CESIUM_CONFIG.DEFAULT_VIEW.latitude,
        CESIUM_CONFIG.DEFAULT_VIEW.height
      ),
      duration: 1, // 移动时间1秒
      complete: () => {
        // 返回初始视角完成
      },
    });
  } catch (error) {
    console.error("返回初始视角时出错:", error);
    ElMessage.error("返回初始视角失败");
  }
};

// 视图模式切换函数
const switchViewMode = (mode: string) => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化，无法切换视图模式");
    return;
  }

  try {
    // 先处理OSM建筑，避免模式切换时的渲染错误
    if (osmBuildings.value) {
      // 无论切换到什么模式，先隐藏建筑
      osmBuildings.value.show = false;
    }
    
    // 切换视图模式
    switch (mode) {
      case "SCENE3D":
        cesiumViewer.value.scene.mode = Cesium.SceneMode.SCENE3D;
        
        // 从其他模式切换到3D模式时，需要重新加载OSM建筑以避免渲染错误
        // if (osmBuildings.value && cesiumViewer.value) {
        //   // 使用setTimeout延迟处理建筑，确保场景模式已完全切换
        //   setTimeout(async () => {
        //     if (!cesiumViewer.value) return; // 确保viewer仍然存在
            
        //     try {
        //       // 移除旧的建筑图层
        //       if (osmBuildings.value) {
        //         cesiumViewer.value.scene.primitives.remove(osmBuildings.value);
        //       }
              
        //       // 重新加载OSM建筑
        //       const buildingTileset = await Cesium.createOsmBuildingsAsync();
        //       cesiumViewer.value.scene.primitives.add(buildingTileset);
        //       osmBuildings.value = buildingTileset;
        //       console.log("3D模式：已重新加载OSM建筑");
        //     } catch (e) {
        //       console.error("重新加载OSM建筑时出错:", e);
        //     }
        //   }, 500); // 延迟500毫秒，确保场景模式已切换完成
        // }
        break;
        
      case "SCENE2D":
        cesiumViewer.value.scene.mode = Cesium.SceneMode.SCENE2D;
        // 2D模式下不显示建筑
        break;
        
      case "COLUMBUS_VIEW":
        cesiumViewer.value.scene.mode = Cesium.SceneMode.COLUMBUS_VIEW;
        // 哥伦布视图模式下不显示建筑
        break;
        
      default:
        console.warn(`未知的视图模式: ${mode}`);
    }
  } catch (error) {
    console.error("切换视图模式时出错:", error);
    ElMessage.error("切换视图模式失败");
  }
};

// 处理渲染性能设置
const handleRenderPerformance = (mode: string) => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化，无法设置渲染性能");
    return;
  }

  try {
    const viewer = cesiumViewer.value;
    const scene = viewer.scene;

    switch (mode) {
      case "high":
        // 高质量渲染模式：有地形、有地图影像、画面质量高，有水波纹等
        if (scene.terrainProvider instanceof Cesium.EllipsoidTerrainProvider) {
          // 使用异步函数加载地形
          Cesium.createWorldTerrainAsync().then((terrainProvider) => {
            scene.terrainProvider = terrainProvider;
          });
        }
        scene.globe.enableLighting = false;
        scene.globe.showWaterEffect = true;
        scene.fog.enabled = true;
        scene.fog.density = 0.0002;
        scene.skyAtmosphere.show = true;
        scene.globe.maximumScreenSpaceError = 2; // 更低的值 = 更高的质量
        scene.postProcessStages.fxaa.enabled = true;
        ElMessage.success("已切换到高质量渲染模式");
        break;

      case "medium":
        // 中质量渲染模式：有地形、有影像、画面质量一般
        if (scene.terrainProvider instanceof Cesium.EllipsoidTerrainProvider) {
          // 使用异步函数加载地形
          Cesium.createWorldTerrainAsync().then((terrainProvider) => {
            scene.terrainProvider = terrainProvider;
          });
        }
        scene.globe.enableLighting = false;
        scene.globe.showWaterEffect = false;
        scene.fog.enabled = true;
        scene.fog.density = 0.0001;
        scene.skyAtmosphere.show = true;
        scene.globe.maximumScreenSpaceError = 4; // 中等质量
        scene.postProcessStages.fxaa.enabled = false;
        ElMessage.success("已切换到中质量渲染模式");
        break;

      case "low":
        // 低质量渲染模式：只有影像，不加载地形
        scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        scene.globe.enableLighting = false;
        scene.globe.showWaterEffect = false;
        scene.fog.enabled = false;
        scene.skyAtmosphere.show = false;
        scene.globe.maximumScreenSpaceError = 8; // 更高的值 = 更低的质量
        scene.postProcessStages.fxaa.enabled = false;
        ElMessage.success("已切换到低质量渲染模式");
        break;

      default:
        console.warn(`未知的渲染性能模式: ${mode}`);
    }

    // 强制刷新渲染
    scene.requestRender();
  } catch (error) {
    console.error("设置渲染性能时出错:", error);
    ElMessage.error("设置渲染性能失败");
  }
};

// 搜索位置并飞向该位置
const searchLocationHandler = async (searchQuery: string) => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化，无法搜索位置");
    return;
  }

  try {
    // 显示加载状态
    const loadingInstance = ElMessage.info({
      message: `正在搜索: ${searchQuery}...`,
      duration: 0,
    });

    // 预定义常见城市位置
    const knownLocations: Record<string, { lon: number; lat: number; height: number }> = {
      北京: { lon: 116.4074, lat: 39.9042, height: 10000 },
      上海: { lon: 121.4737, lat: 31.2304, height: 10000 },
      广州: { lon: 113.2644, lat: 23.1291, height: 10000 },
      深圳: { lon: 114.0579, lat: 22.5431, height: 10000 },
      重庆: { lon: 106.5049, lat: 29.5332, height: 10000 },
      成都: { lon: 104.0647, lat: 30.6595, height: 10000 },
      西安: { lon: 108.9401, lat: 34.3416, height: 10000 },
      武汉: { lon: 114.3055, lat: 30.5928, height: 10000 },
      长沙: { lon: 112.9822, lat: 28.1941, height: 10000 },
      南京: { lon: 118.7969, lat: 32.0603, height: 10000 },
      杭州: { lon: 120.1536, lat: 30.2875, height: 10000 },
      香港: { lon: 114.1694, lat: 22.3193, height: 10000 },
      台北: { lon: 121.5654, lat: 25.033, height: 10000 },
      东京: { lon: 139.6917, lat: 35.6895, height: 10000 },
      纽约: { lon: -74.006, lat: 40.7128, height: 10000 },
      伦敦: { lon: -0.1278, lat: 51.5074, height: 10000 },
      巴黎: { lon: 2.3522, lat: 48.8566, height: 10000 },
      悉尼: { lon: 151.2093, lat: -33.8688, height: 10000 },
      莫斯科: { lon: 37.6173, lat: 55.7558, height: 10000 },
      柏林: { lon: 13.405, lat: 52.52, height: 10000 },
      罗马: { lon: 12.4964, lat: 41.9028, height: 10000 },
      首尔: { lon: 126.978, lat: 37.5665, height: 10000 },
      曼谷: { lon: 100.5018, lat: 13.7563, height: 10000 },
      新加坡: { lon: 103.8198, lat: 1.3521, height: 10000 },
      洛杉矶: { lon: -118.2437, lat: 34.0522, height: 10000 },
      芝加哥: { lon: -87.6298, lat: 41.8781, height: 10000 },
    };

    // 搜索常见位置
    const location = Object.keys(knownLocations).find(
      (name) =>
        searchQuery.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 关闭加载提示
    loadingInstance.close();

    if (location) {
      const { lon, lat, height } = knownLocations[location];
      // 飞向搜索结果位置
      cesiumViewer.value.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        duration: 2, // 移动时间2秒
        complete: () => {
          ElMessage.success(`已定位到: ${location}`);
        },
      });
    } else {
      ElMessage.warning(`未找到位置: ${searchQuery}，请尝试搜索常见城市名称`);
    }
  } catch (error) {
    console.error("搜索位置时出错:", error);
    ElMessage.error(`搜索位置时出错: ${error}`);
  }
};

// 放大视图函数
const handleZoomIn = () => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化，无法操作");
    return;
  }

  try {
    // 获取当前高度
    const cameraPosition = cesiumViewer.value.camera.position;
    const ellipsoid = Cesium.Ellipsoid.WGS84;
    const cartographic = ellipsoid.cartesianToCartographic(cameraPosition);
    const height = cartographic.height;

    // 新高度为当前高度的60%
    const newHeight = height * 0.6;

    // 执行放大操作
    cesiumViewer.value.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        newHeight
      ),
      duration: 1.0,
    });
  } catch (error) {
    console.error("放大视图时出错:", error);
    ElMessage.error("放大视图失败");
  }
};

// 缩小视图函数
const handleZoomOut = () => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化，无法操作");
    return;
  }

  try {
    // 获取当前高度
    const cameraPosition = cesiumViewer.value.camera.position;
    const ellipsoid = Cesium.Ellipsoid.WGS84;
    const cartographic = ellipsoid.cartesianToCartographic(cameraPosition);
    const height = cartographic.height;

    // 新高度为当前高度的1.7倍
    const newHeight = height * 1.7;

    // 执行缩小操作
    cesiumViewer.value.camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        newHeight
      ),
      duration: 1.0,
    });
  } catch (error) {
    console.error("缩小视图时出错:", error);
    ElMessage.error("缩小视图失败");
  }
};

// 刷新场景函数
const handleRefreshScene = () => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化，无法刷新场景");
    return;
  }

  try {
    // 获取Viewer引用以避免TypeScript的null检查警告
    const viewer = cesiumViewer.value;

    // 显示加载提示
    const loadingInstance = ElMessage.info({
      message: "正在刷新场景...",
      duration: 0,
    });

    // 强制刷新 - 先移除所有实体和数据
    viewer.entities.removeAll();
    viewer.dataSources.removeAll();

    // 重新加载地形和影像图层
    const refreshLayers = async () => {
      try {
        // 确保viewer仍然存在
        if (!cesiumViewer.value) {
          loadingInstance.close();
          throw new Error("Cesium Viewer已被销毁");
        }

        // 使用已确认存在的viewer引用
        const currentViewer = cesiumViewer.value;

        // 清除所有现有图层
        while (currentViewer.imageryLayers.length > 0) {
          currentViewer.imageryLayers.remove(currentViewer.imageryLayers.get(0), true);
        }

        // 重新添加全球影像
        const worldImagery = await Cesium.createWorldImageryAsync();
        currentViewer.imageryLayers.addImageryProvider(worldImagery);
        
        // 重新加载OSM建筑（如果之前已加载）
        // if (osmBuildings.value) {
        //   // 移除原有建筑图层
        //   try {
        //     currentViewer.scene.primitives.remove(osmBuildings.value);
        //     osmBuildings.value = null;
        //   } catch (e) {
        //     console.warn("移除OSM建筑时出错:", e);
        //   }
          
        //   // 只在3D模式下重新加载建筑
        //   if (currentViewer.scene.mode === Cesium.SceneMode.SCENE3D) {
        //     try {
        //       // 延迟加载建筑，确保场景已经准备好
        //       setTimeout(async () => {
        //         if (!cesiumViewer.value) return;
                
        //         try {
        //           const buildingTileset = await Cesium.createOsmBuildingsAsync();
        //           cesiumViewer.value.scene.primitives.add(buildingTileset);
        //           osmBuildings.value = buildingTileset;
        //           console.log("刷新场景：OSM建筑已重新加载");
        //         } catch (e) {
        //           console.warn("重新加载OSM建筑时出错:", e);
        //         }
        //       }, 1000); // 延迟1秒，确保场景已刷新
        //     } catch (e) {
        //       console.warn("设置OSM建筑延迟加载时出错:", e);
        //     }
        //   } else {
        //     console.log("非3D模式，不加载OSM建筑");
        //   }
        // }

        // 强制刷新地球
        if (currentViewer.scene && currentViewer.scene.globe) {
          currentViewer.scene.globe.show = false;
          setTimeout(() => {
            // 再次检查viewer是否存在
            if (cesiumViewer.value) {
              const finalViewer = cesiumViewer.value;
              finalViewer.scene.globe.show = true;

              // 飞回初始视角而不是保持当前视角
              finalViewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                  CESIUM_CONFIG.DEFAULT_VIEW.longitude,
                  CESIUM_CONFIG.DEFAULT_VIEW.latitude,
                  CESIUM_CONFIG.DEFAULT_VIEW.height
                ),
                duration: 1.5, // 移动时间1.5秒
                complete: () => {
                  // 重新加载实体数据
                  syncExistingNodes();
                  syncExistingLinks();

                  // 关闭加载提示
                  loadingInstance.close();

                  // 显示成功消息
                  ElMessage.success("场景已刷新");
                },
              });
            } else {
              loadingInstance.close();
            }
          }, 500);
        }
      } catch (error) {
        console.error("刷新图层时出错:", error);
        loadingInstance.close();
        ElMessage.error("刷新图层失败");
      }
    };

    // 执行刷新
    refreshLayers();

    // 强制刷新渲染
    viewer.scene.requestRender();
  } catch (error) {
    console.error("刷新场景时出错:", error);
    ElMessage.error("刷新场景失败");
  }
};

// 处理模板放置开始
const handleStartTemplatePlacement = (data: any) => {
  if (!cesiumViewer.value) {
    ElMessage.warning("Cesium未初始化");
    return;
  }

  isWaitingForTemplatePlacement.value = true;

  // 改变鼠标光标样式
  const viewerContainer = cesiumViewer.value.container;
  viewerContainer.style.cursor = 'crosshair';

  if (data && data.message) {
    ElMessage.info(data.message);
  }
};

// 处理模板放置结束
const handleEndTemplatePlacement = () => {
  if (!cesiumViewer.value) return;

  isWaitingForTemplatePlacement.value = false;

  // 恢复鼠标光标样式
  const viewerContainer = cesiumViewer.value.container;
  viewerContainer.style.cursor = 'default';
};

// 处理地图点击（用于模板放置）
const handleMapClick = (movement: any) => {
  if (!isWaitingForTemplatePlacement.value || !cesiumViewer.value) {
    return;
  }

  const viewer = cesiumViewer.value;

  // 获取点击位置的笛卡尔坐标
  const cartesian = viewer.camera.pickEllipsoid(
    movement.position,
    viewer.scene.globe.ellipsoid
  );

  if (!cartesian) {
    ElMessage.warning('无法获取点击位置，请点击地球表面');
    return;
  }

  // 将笛卡尔坐标转换为经纬度
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const longitude = Cesium.Math.toDegrees(cartographic.longitude);
  const latitude = Cesium.Math.toDegrees(cartographic.latitude);
  const altitude = cartographic.height;

  // 发射事件，传递位置信息
  eventBus.emit('mapClickedForTemplate', {
    position: {
      lat: latitude,
      lon: longitude,
      alt: altitude
    }
  });
};

// 处理开始监控EMANE MAC信息
const handleStartEmaneMonitor = (data?: any) => {
  // 如果有链路数据，存储它
  if (data && data.link) {
    // 确保传递了所有需要的信息，包括可能的视角NEM ID
    selectedLinkForEmane.value = { ...data.link };
    emaneMacInfoPanelVisible.value = true;
    const viewpointText = data.link.viewpoint_nem_id
      ? ` (视角NEM: ${data.link.viewpoint_nem_id})`
      : "";
    ElMessage.success(`已开启链路的EMANE详细监控${viewpointText}`);
  }
  // 如果有 NEM ID，直接传递给 EMANE 监控面板
  else if (data && data.nemId) {
    // 创建一个临时的链路对象，只包含必要的 NEM ID 信息
    selectedLinkForEmane.value = {
      nem_id: data.nemId,
      is_node_monitoring: true,
    };
    emaneMacInfoPanelVisible.value = true;
    ElMessage.success(`已开启 NEM ${data.nemId} 的 EMANE 信息监控`);
  }
  // 没有特定参数，打开通用监控
  else {
    selectedLinkForEmane.value = null;
    emaneMacInfoPanelVisible.value = true;
    ElMessage.success("已开启 EMANE MAC 信息监控");
  }
};

// 处理拓扑同步WebSocket消息 (action=11)
const handleTopoSyncMessage = (data: any) => {
  try {
    // 验证消息格式
    if (!data.sessionId) {
      console.warn("拓扑同步消息缺少sessionId");
      return;
    }

    // 检查是否是当前会话的消息
    if (topoStore.topoData && data.sessionId !== topoStore.topoData.id) {
      return;
    }

    // 检查senderId，只有当senderId与当前用户ID不同时才同步
    // 但如果是跨页面同步消息（CROSS_PAGE_SYNC），则允许同一用户的不同页面同步
    if (data.senderId && data.extand !== "CROSS_PAGE_SYNC") {
      const userInfo = getUserInfo();
      const currentUserId = userInfo.id;

      if (data.senderId === currentUserId) {
        return;
      }
    }

    // 触发拓扑数据同步
    syncTopoData();

    // 检查是否是GETNEMID扩展消息，如果是则需要获取NEM ID数据
    if (data.extand === "GETNEMID") {
      handleGetNemIdMessage(data);
    }

  } catch (error) {
    console.error("处理拓扑同步WebSocket消息出错:", error);
  }
};

// localStorage事件处理器（跨页面通信）
const handleStorageChange = (event: StorageEvent) => {
  if (event.key === 'topoSyncEvent' && event.newValue) {
    try {
      const syncEvent = JSON.parse(event.newValue);

      if (syncEvent.type === 'TOPO_SYNC' &&
          syncEvent.sessionId === topoStore.currentSessionId &&
          syncEvent.source !== 'cesium') {
        syncTopoData();
      }
    } catch (error) {
      console.error('处理localStorage同步事件出错:', error);
    }
  }
};

// 发送跨页面同步消息（Cesium页面版本）
const sendCrossPageSyncMessage = () => {
  if (!topoStore.currentSessionId) return;

  const userInfo = getUserInfo();
  const syncMessage = {
    action: 11, // 拓扑同步消息
    sessionId: topoStore.currentSessionId,
    senderId: userInfo.id,
    extand: "CROSS_PAGE_SYNC", // 标识这是跨页面同步消息
    source: "cesium" // 标识消息来源
  };

  // 方案1: 通过WebSocket发送消息
  if (websocketService.connected) {
    websocketService.send(syncMessage);
  }

  // 方案2: 通过localStorage事件实现跨页面通信（备用方案）
  const storageEvent = {
    type: 'TOPO_SYNC',
    sessionId: topoStore.currentSessionId,
    timestamp: Date.now(),
    source: 'cesium'
  };
  localStorage.setItem('topoSyncEvent', JSON.stringify(storageEvent));
};

// 处理GETNEMID扩展消息
const handleGetNemIdMessage = async (data: any) => {
  try {
    // 检查senderId，只有当senderId与当前用户ID不同时才获取NEM ID
    if (data.senderId) {
      const userInfo = getUserInfo();
      const currentUserId = userInfo.id;

      if (data.senderId === currentUserId) {
        return;
      }
    }

    // 获取NEM ID数据
    if (topoStore.topoData && topoStore.topoData.id) {
      try {
        // 动态导入getNemIds API
        const { getNemIds } = await import("../../../api/node/index");
        const nemIdResponse = await getNemIds(topoStore.topoData.id) as unknown as ApiResponse;

        if (nemIdResponse.code === 200) {
          // 异步导入NEM ID Store并更新数据
          const { useNemIdStore } = await import("../../../store/modules/nemId");
          const nemIdStore = useNemIdStore();
          nemIdStore.setNemIds(nemIdResponse.data.sessionId, nemIdResponse.data.nemIds);

        } else {
          console.error("GETNEMID: 获取NEM ID数据失败:", nemIdResponse);
        }
      } catch (error) {
        console.error("GETNEMID: 调用getNemIds API失败:", error);
      }
    }
  } catch (error) {
    console.error("处理GETNEMID扩展消息出错:", error);
  }
};

// 处理EMANE WebSocket消息
const handleEmaneWebSocketMessage = (data: any) => {
  try {
    // 异步导入EMANE仓库，减少初始加载负担
    import("../../../store/modules/emane")
      .then(({ useEmaneStore }) => {
        const emaneStore = useEmaneStore();
        // 直接将整个数据对象传递给store进行处理
        emaneStore.updateFromWebSocket(data);
      })
      .catch((error) => {
        console.error("加载EMANE仓库失败:", error);
      });
  } catch (error) {
    console.error("处理EMANE WebSocket消息出错:", error);
  }
};



// 根据网络节点ID查找其连接的EMANE模型节点的phy_type列表
const getConnectedEmanePhyTypes = (networkNodeId: number): string[] => {
  const nodes = topoStore.topoData?.nodes || [];
  const links = topoStore.topoData?.links || [];
  const result: string[] = [];

  const nodeLinks = links.filter(
    (link: any) => link.node1_id === networkNodeId || link.node2_id === networkNodeId
  );

  for (const link of nodeLinks) {
    const otherNodeId = link.node1_id === networkNodeId ? link.node2_id : link.node1_id;
    const otherNode = nodes.find((n: any) => n.id === otherNodeId);
    if (otherNode?.type === 'EMANE' && otherNode.phy_type) {
      result.push(otherNode.phy_type);
    }
  }
  return result;
};

// 将WebSocket数据存储到指定模型的数据Map中
const storeSimDataForModel = (modelType: string, nodeId: number, data: any) => {
  const responseModelType = getResponseModelType(data);
  const resolvedModelType = responseModelType || modelType;
  const mapRef: Record<string, any> = {
    'gmsk': gmskSimulationData, 'gfsk': gfskSimulationData, 'ttc': ttcSimulationData,
    'adhoc': adhocSimulationData, 'coordination': coordinationSimulationData,
    'vhf': vhfSimulationData, 'uhf': uhfSimulationData,
    'fiveG': fiveGSimulationData, 'dss': dssSimulationData,
    'fhss': fhssSimulationData, 'custom': customSimulationData,
  };
  const target = mapRef[resolvedModelType];
  if (target) {
    const newMap = new Map(target.value);
    newMap.set(nodeId, data);
    target.value = newMap;
  } else {
    console.warn(`[storeSimDataForModel] 未识别的模型类型: ${resolvedModelType}`, data);
  }
};

// 通过查询仿真服务，精确查找哪些模型将该nodeId作为接收机(rx，即第一个连接的节点)
const getModelsForRxNode = (rxNodeId: number): string[] => {
  const result: string[] = [];
  const services: [any, string][] = [
    [vhfSimulationService, 'vhf'],
    [uhfSimulationService, 'uhf'],
    [ttcSimulationService, 'ttc'],
    [adhocSimulationService, 'adhoc'],
    [coordinationSimulationService, 'coordination'],
    [gfskSimulationService, 'gfsk'],
    [fiveGSimulationService, 'fiveG'],
    [dssSimulationService, 'dss'],
    [fhssSimulationService, 'fhss'],
    [customSimulationService, 'custom'],
  ];

  for (const [service, modelType] of services) {
    const connectedNodes = service.getConnectedNodes();
    for (const [, nodes] of connectedNodes.entries()) {
      if (nodes.length > 0 && nodes[0].id === rxNodeId) {
        result.push(modelType);
      }
    }
  }
  return result;
};

// 处理action=6的仿真数据消息
const handleAction6Message = (data: any) => {
  try {
    // 检查是否是仿真数据（data字段可选，UHF等模型可能只返回channel_metrics）
    if (data.channel_metrics !== undefined && data.node_id !== undefined) {
      const dataFields = data.data || {};
      const nodeId = data.node_id;

      console.log(`收到action=6数据，节点ID: ${nodeId}`);

      const explicitModelType = getResponseModelType(data);
      if (explicitModelType) {
        storeSimDataForModel(explicitModelType, nodeId, data);
        return;
      }

      // 核心路由策略：
      // WebSocket数据的node_id是该模型的接收机(rx)节点ID
      // 通过查询仿真服务，精确找到哪个模型将该nodeId作为rx节点
      const rxModels = getModelsForRxNode(nodeId);

      if (rxModels.length === 1) {
        // 精确匹配到一个模型，直接路由
        console.log(`设置节点${nodeId}的数据 (${rxModels[0]} - 通过仿真服务rx精确匹配)`);
        storeSimDataForModel(rxModels[0], nodeId, data);
        return;
      } else if (rxModels.length > 1) {
        // 多个模型的rx都是该节点，使用数据结构进一步区分
        console.log(`节点${nodeId}是多个模型的rx: ${rxModels.join(',')}, 使用数据结构区分`);
        if (dataFields.hop_sequence !== undefined) {
          const target = rxModels.find(m => m === 'fhss') || rxModels[0];
          storeSimDataForModel(target, nodeId, data);
        } else if (dataFields.spread_samples !== undefined || dataFields.despread_samples !== undefined) {
          const target = rxModels.find(m => m === 'dss') || rxModels[0];
          storeSimDataForModel(target, nodeId, data);
        } else if (dataFields.transmitter_iq !== undefined || dataFields.receiver_iq !== undefined) {
          const target = rxModels.find(m => m === 'vhf' || m === 'uhf') || rxModels[0];
          storeSimDataForModel(target, nodeId, data);
        } else if (dataFields.qam_mapped !== undefined || dataFields.de_scram_out_240_200 !== undefined) {
          const target = rxModels.find(m => m === 'fiveG') || rxModels[0];
          storeSimDataForModel(target, nodeId, data);
        } else {
          // 无法区分，存储到第一个匹配的模型
          storeSimDataForModel(rxModels[0], nodeId, data);
        }
        return;
      }

      // 回退逻辑：仿真服务中未找到rx匹配（可能服务还未注册），使用拓扑连接+数据结构检测
      console.log(`节点${nodeId}在仿真服务中未找到rx匹配，使用拓扑连接+数据结构回退`);
      const connectedPhyTypes = getConnectedEmanePhyTypes(nodeId);

      if (dataFields.hop_sequence !== undefined) {
        storeSimDataForModel('fhss', nodeId, data);
      } else if (dataFields.spread_samples !== undefined || dataFields.despread_samples !== undefined) {
        storeSimDataForModel('dss', nodeId, data);
      } else if (dataFields.transmitter_iq !== undefined || dataFields.receiver_iq !== undefined) {
        const hasUhf = connectedPhyTypes.includes('uhf');
        const hasVhf = connectedPhyTypes.includes('vhf');
        if (hasUhf && !hasVhf) {
          storeSimDataForModel('uhf', nodeId, data);
        } else if (hasVhf && !hasUhf) {
          storeSimDataForModel('vhf', nodeId, data);
        } else {
          storeSimDataForModel('vhf', nodeId, data);
          if (hasUhf) storeSimDataForModel('uhf', nodeId, data);
        }
      } else if (dataFields.qam_mapped !== undefined || dataFields.de_scram_out_240_200 !== undefined || dataFields.num_in_240_200 !== undefined) {
        storeSimDataForModel('fiveG', nodeId, data);
      } else if (dataFields.tx_samples !== undefined && dataFields.rx_samples !== undefined) {
        const txRxModels = connectedPhyTypes.filter(t =>
          ['gfsk', 'ttc', 'adhoc', 'coordination'].includes(t)
        );
        if (txRxModels.length === 1) {
          storeSimDataForModel(txRxModels[0], nodeId, data);
        } else if (txRxModels.length > 1) {
          // 无法精确区分，存储到所有匹配的map（回退行为）
          for (const model of txRxModels) {
            storeSimDataForModel(model, nodeId, data);
          }
        } else {
          console.warn(`节点${nodeId}的tx/rx数据未找到匹配模型，connectedPhyTypes=`, connectedPhyTypes);
        }
      } else {
        // 检查是否是散射
        const hasCustom = connectedPhyTypes.includes('custom');
        if (hasCustom) {
          storeSimDataForModel('custom', nodeId, data);
        } else {
          console.warn(`节点${nodeId}的数据类型无法识别，数据字段:`, Object.keys(dataFields));
        }
      }
    }
  } catch (error) {
    console.error("处理action=6消息数据渲染出错:", error);
  }
};

// 处理action=7的FHSS仿真数据消息
const handleAction7Message = (data: any) => {
  try {
    // 检查是否是FHSS仿真数据
    if (data.channel_metrics && data.data && data.node_id !== undefined) {
      console.log(`收到action=7数据，节点ID: ${data.node_id}, modulation_type: ${data.modulation_type}`);

      // action=7专门用于FHSS，直接设置
      console.log(`设置节点${data.node_id}的FHSS数据 (action=7)`);
      const newMap = new Map(fhssSimulationData.value);
      newMap.set(data.node_id, data);
      fhssSimulationData.value = newMap;
    }
  } catch (error) {
    console.error("处理action=7消息数据渲染出错:", error);
  }
};

// 处理action=10的WebSocket消息数据渲染
const handleAction10Message = (data: any) => {
  try {
    // 检查是否有EMANE数据需要渲染
    if (data.emaneInfo) {
      handleEmaneWebSocketMessage(data);
      // console.log(data)
    }

    // 检查是否有NEM ID数据需要渲染
    if (data.nemIds && Array.isArray(data.nemIds)) {
      handleNemIdWebSocketMessage(data);
    }
  } catch (error) {
    console.error("处理action=10消息数据渲染出错:", error);
  }
};

// WebSocket消息处理现在由全局服务管理，具体的消息处理函数在下面定义

// 创建WebSocket连接 - 现在使用全局服务
const createWebSocketConnection = () => {
  websocketService.connect();
};

// WebSocket相关功能现在由全局服务管理
// 为了保持兼容性，保留这些函数作为代理
const startHeartbeat = () => websocketService.startHeartbeat();
const stopHeartbeat = () => websocketService.stopHeartbeat();
const startNodesUpdate = () => websocketService.startNodesUpdate();
const stopNodesUpdate = () => websocketService.stopNodesUpdate();
const startTopoSync = () => websocketService.startTopoSync();
const stopTopoSync = () => websocketService.stopTopoSync();

// 检测节点位置是否有变化
const detectNodePositionChanges = (currentNodes: any[], newNodes: any[]) => {
  const positionChanges = [];

  // 创建节点ID到节点的映射，便于快速查找
  const currentNodeMap = new Map();
  const newNodeMap = new Map();

  currentNodes.forEach(node => currentNodeMap.set(node.id, node));
  newNodes.forEach(node => newNodeMap.set(node.id, node));

  // 检查每个节点的位置变化
  for (const [nodeId, currentNode] of currentNodeMap) {
    const newNode = newNodeMap.get(nodeId);
    if (newNode && currentNode.geo && newNode.geo) {
      const currentPos = currentNode.geo;
      const newPos = newNode.geo;

      // 检查位置是否有显著变化（精度到小数点后6位，约1米精度）
      const latChanged = Math.abs(currentPos.lat - newPos.lat) > 0.000001;
      const lonChanged = Math.abs(currentPos.lon - newPos.lon) > 0.000001;
      const altChanged = Math.abs(currentPos.alt - newPos.alt) > 0.1; // 高度精度到0.1米

      if (latChanged || lonChanged || altChanged) {
        positionChanges.push({
          nodeId,
          nodeName: currentNode.name || `节点${nodeId}`,
          oldPos: { ...currentPos },
          newPos: { ...newPos }
        });
      }
    }
  }

  return positionChanges;
};

// 检测场景状态是否有变化
const detectSceneStateChanges = (currentTopo: any, newTopo: any) => {
  const stateChanges = [];

  // 检查场景状态变化
  if (currentTopo.state !== newTopo.state) {
    stateChanges.push({
      type: 'state',
      field: '场景状态',
      oldValue: currentTopo.state,
      newValue: newTopo.state
    });
  }

  // 检查场景名称变化
  if (currentTopo.name !== newTopo.name) {
    stateChanges.push({
      type: 'name',
      field: '场景名称',
      oldValue: currentTopo.name || '未命名',
      newValue: newTopo.name || '未命名'
    });
  }

  // 检查用户变化
  if (currentTopo.user !== newTopo.user) {
    stateChanges.push({
      type: 'user',
      field: '场景用户',
      oldValue: currentTopo.user,
      newValue: newTopo.user
    });
  }

  // 检查场景位置信息变化
  if (currentTopo.location && newTopo.location) {
    const currentLoc = currentTopo.location;
    const newLoc = newTopo.location;

    // 检查位置坐标变化
    const locChanged =
      Math.abs(currentLoc.lat - newLoc.lat) > 0.000001 ||
      Math.abs(currentLoc.lon - newLoc.lon) > 0.000001 ||
      Math.abs(currentLoc.alt - newLoc.alt) > 0.1 ||
      Math.abs(currentLoc.scale - newLoc.scale) > 0.01;

    if (locChanged) {
      stateChanges.push({
        type: 'location',
        field: '场景位置',
        oldValue: `[${currentLoc.lat.toFixed(6)}, ${currentLoc.lon.toFixed(6)}, ${currentLoc.alt.toFixed(1)}, scale:${currentLoc.scale}]`,
        newValue: `[${newLoc.lat.toFixed(6)}, ${newLoc.lon.toFixed(6)}, ${newLoc.alt.toFixed(1)}, scale:${newLoc.scale}]`
      });
    }
  }

  // 检查元数据变化
  const currentMetadata = JSON.stringify(currentTopo.metadata || {});
  const newMetadata = JSON.stringify(newTopo.metadata || {});
  if (currentMetadata !== newMetadata) {
    stateChanges.push({
      type: 'metadata',
      field: '场景元数据',
      oldValue: currentMetadata,
      newValue: newMetadata
    });
  }

  // 检查配置选项变化
  const currentOptions = JSON.stringify(currentTopo.options || {});
  const newOptions = JSON.stringify(newTopo.options || {});
  if (currentOptions !== newOptions) {
    stateChanges.push({
      type: 'options',
      field: '场景配置',
      oldValue: currentOptions,
      newValue: newOptions
    });
  }

  return stateChanges;
};

// 同步拓扑数据
const syncTopoData = async () => {
  if (!topoStore.topoData || !topoStore.topoData.id) {
    return;
  }

  try {
    const sessionId = topoStore.topoData.id;
    const result = await getTopoBySession(sessionId);

    if (result && result.data) {
      // 检查数据是否有变化
      const currentNodeCount = topoStore.topoData.nodes?.length || 0;
      const currentLinkCount = topoStore.topoData.links?.length || 0;
      const newNodeCount = result.data.nodes?.length || 0;
      const newLinkCount = result.data.links?.length || 0;

      // 检测节点位置变化
      const positionChanges = detectNodePositionChanges(
        topoStore.topoData.nodes || [],
        result.data.nodes || []
      );

      // 检测场景状态变化
      const sceneStateChanges = detectSceneStateChanges(
        topoStore.topoData,
        result.data
      );

      // 更详细的变化检测
      let hasChanges = false;
      let changeDetails = [];

      if (currentNodeCount !== newNodeCount) {
        hasChanges = true;
        changeDetails.push(`节点数量: ${currentNodeCount} -> ${newNodeCount}`);
      }

      if (currentLinkCount !== newLinkCount) {
        hasChanges = true;
        changeDetails.push(`链路数量: ${currentLinkCount} -> ${newLinkCount}`);
      }

      if (positionChanges.length > 0) {
        hasChanges = true;
        changeDetails.push(`节点位置变化: ${positionChanges.length}个节点`);
      }

      if (sceneStateChanges.length > 0) {
        hasChanges = true;
        changeDetails.push(`场景状态变化: ${sceneStateChanges.length}项`);

        // 检查场景状态变化
        sceneStateChanges.forEach(change => {
          // 检查是否是仿真停止状态变化，如果是则清理数据缓存
          if (change.type === 'state' && change.newValue === 'SHUTDOWN') {
            console.log('[SHUTDOWN] 检测到场景状态变为SHUTDOWN，正在停止仿真服务...');

            // 清理NEM ID数据
            import("../../../store/modules/nemId")
              .then(({ useNemIdStore }) => {
                const nemIdStore = useNemIdStore();
                nemIdStore.resetNemIds();
              })
              .catch((error) => {
                console.error("加载NEM ID仓库失败:", error);
              });

            // 清理EMANE数据
            import("../../../store/modules/emane")
              .then(({ useEmaneStore }) => {
                const emaneStore = useEmaneStore();
                emaneStore.clearEmaneData();
              })
              .catch((error) => {
                console.error("加载EMANE仓库失败:", error);
              });

            // 触发停止仿真事件，确保其他组件也能响应
            console.log('[SHUTDOWN] 触发stopSimulation事件');
            eventBus.emit("stopSimulation");
          }
        });
      }

      // 如果有变化，进行更新
      if (hasChanges) {
        // 更新拓扑数据
        (topoStore as any).setTopoData(sessionId, result.data);

        // 延迟同步实体到Cesium，确保数据更新完成
        await nextTick();

        if (cesiumEntities.value) {
          try {
            // 如果有位置变化，需要强制更新节点位置
            if (positionChanges.length > 0) {
              cesiumEntities.value.syncNodesToEntities(true); // 传入true强制更新位置
            } else {
              // 只有数量变化时的常规同步
              cesiumEntities.value.syncNodesToEntities();
            }

            cesiumEntities.value.syncLinksToEntities();
          } catch (syncError) {
            console.error("同步实体到Cesium失败:", syncError);
          }
        }

        // 显示更新提示
        let message = "检测到节点变更";
        const messageDetails = [];

        if (positionChanges.length > 0) {
          messageDetails.push(`${positionChanges.length}个节点位置已更新`);
        }

        if (sceneStateChanges.length > 0) {
          // 根据变化类型生成具体的提示信息
          const stateChangeTypes = sceneStateChanges.map(change => {
            switch (change.type) {
              case 'state':
                return `场景状态: ${change.newValue}`;
              case 'name':
                return `场景名称: ${change.newValue}`;
              case 'user':
                return `场景用户: ${change.newValue}`;
              case 'location':
                return '场景位置已更新';
              case 'metadata':
                return '场景元数据已更新';
              case 'options':
                return '场景配置已更新';
              default:
                return '场景信息已更新';
            }
          });
          messageDetails.push(...stateChangeTypes);
        }

        if (messageDetails.length > 0) {
          message += `：${messageDetails.join('，')}`;
        }

        // 触发拓扑数据更新事件，通知其他组件
        eventBus.emit('topoDataUpdated');
      }
    }
  } catch (error) {
    console.error("同步拓扑数据失败:", error);
    // 如果是网络错误或服务器错误，可以考虑暂时停止同步
    if (error instanceof Error && (error.message.includes('Network') || error.message.includes('timeout'))) {
      console.warn("网络错误，暂时停止拓扑同步");
      stopTopoSync();
      // 5分钟后重新尝试启动同步
      setTimeout(() => {
        if (topoStore.topoData && topoStore.topoData.id) {
          console.log("重新尝试启动拓扑同步");
          startTopoSync();
        }
      }, 300000); // 5分钟
    }
  }
};

// 发送节点位置更新
const sendNodesPositionUpdate = () => {
  // 检查仿真是否正在运行 - 使用topo store状态而不是WebSocket状态
  if (!topoStore.topoData || (topoStore.topoData.state !== 'RUNTIME' && topoStore.topoData.state !== 'RUNNING')) {
    return;
  }

  if (!topoStore.topoData || !topoStore.topoData.nodes || !topoStore.topoData.id) {
    console.warn("没有可用的拓扑数据或节点");
    return;
  }

  // 获取当前用户ID
  const userInfo = getUserInfo();
  const currentUserId = userInfo.id;

  const nodePositions = topoStore.topoData.nodes.map((node: any) => ({
    nodeId: node.id,
    geo: {
      lat: node.geo.lat,
      lon: node.geo.lon,
      alt: node.geo.alt,
    },
  }));

  const positionData = {
    action: 5,
    extand: null,
    senderId: currentUserId, // 使用当前用户ID而不是固定的SENDER_ID
    sessionId: topoStore.topoData.id,
    nodes: nodePositions,
  };

  // 使用全局WebSocket服务发送消息
  websocketService.send(positionData);
};

// 关闭WebSocket连接 - 现在使用全局服务
const closeWebSocketConnection = () => {
  websocketService.disconnect();
};

// 将启动仿真的函数导出，供事件总线调用
const startSimulation = () => {
  // 设置仿真状态为运行
  isSimulationRunning.value = true;

  // 重要：重新初始化信道模型节点（从topoStore恢复节点注册和网络连接）
  // 这是必须的，因为停止仿真时会清除所有节点
  initializeChannelModelNodes();

  // 启动DSSS仿真服务
  dssSimulationService.startSimulation();

  // 启动FHSS仿真服务
  fhssSimulationService.startSimulation();

  // 启动GMSK仿真服务
  gmskSimulationService.startSimulation();

  // 启动GFSK仿真服务
  gfskSimulationService.startSimulation();

  // 启动TTC仿真服务
  ttcSimulationService.startSimulation();

  // 启动AdHoc仿真服务
  adhocSimulationService.startSimulation();

  // 启动Coordination仿真服务
  coordinationSimulationService.startSimulation();

  // 启动VHF仿真服务
  vhfSimulationService.startSimulation();

  // 启动UHF仿真服务（TODO: mock模式，后端就绪后删除uhfSimulationService.enableMockMode();这行）
   uhfSimulationService.startSimulation();

  // 启动5G仿真服务
  fiveGSimulationService.startSimulation();

  // 启动散射仿真服务
  customSimulationService.startSimulation();

  // 通知TMV流量模型Store仿真已开始
  import("../../../store/modules/tmvTraffic")
    .then(({ useTMVTrafficStore }) => {
      const tmvTrafficStore = useTMVTrafficStore();
      tmvTrafficStore.setSimulationRunning(true);
    })
    .catch((error) => {
      console.error("加载TMV流量模型Store失败:", error);
    });

  // 记录日志
  systemLogStore.addLog({
    type: "important",
    module: "simulation",
    action: "启动仿真",
    information: "仿真启动",
    details: `启动仿真会话，ID: ${topoStore.topoData.id}, 节点数量: ${
      topoStore.topoData.nodes?.length || 0
    }, 链路数量: ${topoStore.topoData.links?.length || 0}`,
  });

  // 在启动位置更新定时器前，确保已设置位置是最新的
  // 1. 查找所有具有自定义路径的实体，确保它们的位置被保存到topoStore
  if (cesiumViewer.value) {
    const entities = cesiumViewer.value.entities.values;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const entityAny = entity as any;

      // 检查这个实体是否是无人机并且已经移动过（有自定义路径但不在移动状态）
      if (entityAny._hasCustomPath && entityAny._pathData && !entityAny._isFlying) {
        // 获取当前位置并更新到topoStore
        try {
          const position = entity.position?.getValue(
            cesiumViewer.value.clock.currentTime
          );
          if (position && entity.id && /^\d+$/.test(entity.id)) {
            const cartographic = Cesium.Cartographic.fromCartesian(position);
            const currentPosition = {
              longitude: Cesium.Math.toDegrees(cartographic.longitude),
              latitude: Cesium.Math.toDegrees(cartographic.latitude),
              height: cartographic.height,
            };

            // 更新到topoStore
            updateNodePositionInStore(entity.id, currentPosition);
          }
        } catch (e) {
          // 忽略位置获取错误
        }
      }
    }
  }

  // 模拟接收 NEM ID 数据的过程（实际应该从 WebSocket 收到）
  // 这里只是为了演示，实际应该从后端接收
  setTimeout(updateNemIdMapping, 2000);
};

// 更新 NEM ID 映射关系
const updateNemIdMapping = () => {
  try {
    // 异步导入 NEM ID Store
    import("../../../store/modules/nemId")
      .then(({ useNemIdStore }) => {
        const nemIdStore = useNemIdStore();

      })
      .catch((error) => {
        console.error("加载 NEM ID 仓库失败:", error);
      });
  } catch (error) {
    console.error("更新 NEM ID 映射时出错:", error);
  }
};

// 处理 WebSocket 消息中的 NEM ID 数据更新
const handleNemIdWebSocketMessage = (data: any) => {
  if (!data || !data.nemIds || !Array.isArray(data.nemIds)) return;

  try {
    // 异步导入 NEM ID Store
    import("../../../store/modules/nemId")
      .then(({ useNemIdStore }) => {
        const nemIdStore = useNemIdStore();

        // 更新 NEM ID 数据
        nemIdStore.setNemIds(data.sessionId || topoStore.topoData.id, data.nemIds);
      })
      .catch((error) => {
        console.error("加载 NEM ID 仓库失败:", error);
      });
  } catch (error) {
    console.error("处理 NEM ID WebSocket 消息时出错:", error);
  }
};

// 组件挂载时初始化Cesium
onMounted(async () => {
  // 清除EMANE数据，确保每次组件加载时都是空状态
  import("../../../store/modules/emane")
    .then(({ useEmaneStore }) => {
      const emaneStore = useEmaneStore();
      // 使用已定义的action来清除数据
      emaneStore.clearEmaneData();
    })
    .catch((error) => {
      console.error("加载EMANE仓库失败:", error);
    });

  // 监听视图模式切换事件
  eventBus.on("switchViewMode", switchViewMode);

  // 监听飞回初始视角事件
  eventBus.on("flyToHome", flyToHomeHandler);

  // 监听搜索位置事件
  eventBus.on("searchLocation", searchLocationHandler);

  // 监听放大、缩小和刷新事件
  eventBus.on("zoomIn", handleZoomIn);
  eventBus.on("zoomOut", handleZoomOut);
  eventBus.on("refreshScene", handleRefreshScene);
  
  // 监听仿真开始和停止事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("startSimulation", startSimulation);
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("stopSimulation", stopSimulation);

  // 监听EMANE监控事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("startEmaneMonitor", handleStartEmaneMonitor);

  // 监听路径绘制事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("startPathDrawing", handleStartPathDrawing);

  // 监听无人机控制面板事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("openDroneControlPanel", handleOpenDroneControlPanel);

  // 监听无人机控制位置更新事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("triggerPositionUpdate", sendNodesPositionUpdate);
  
  // 监听无人机开始/停止移动事件，控制位置更新定时器
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("startFlightPositionUpdates", startNodesUpdate);

  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("stopFlightPositionUpdates", stopNodesUpdate);

  // 监听渲染性能设置事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("setRenderPerformance", handleRenderPerformance);

  // 监听显示所有特殊效果事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("showAllSpecialEffects", handleShowAllSpecialEffects);
  
  // 监听恢复快照事件，用于更新地图数据
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("updateTopoData", handleTopoDataUpdate);

  // 确保topoData存在
  ensureTopoDataExists();

  // 设置Cesium Ion令牌
  Cesium.Ion.defaultAccessToken = CESIUM_CONFIG.ION_TOKEN;

  try {
    if (!cesiumContainer.value) {
      throw new Error("Cesium容器DOM元素不存在");
    }

    // 初始化Cesium Viewer
    cesiumViewer.value = await initCesiumViewer(cesiumContainer.value);

    // 配置Cesium场景
    setupCesiumScene(cesiumViewer.value);

    cesiumViewer.value.clock.shouldAnimate = false; // 停止时间动画

    // 初始化实体管理
    cesiumEntities.value = useCesiumEntities(cesiumViewer.value);

    // 等待Cesium完全加载后同步已有节点和链路 - 添加双重检查
    if (cesiumViewer.value && cesiumEntities.value) {
      window.requestAnimationFrame(() => {
        if (cesiumViewer.value && cesiumEntities.value) {
          syncExistingNodes();
          syncExistingLinks();
          // 重新初始化信道模型节点（页面刷新后恢复）
          initializeChannelModelNodes();
        }
      });
    }

    // 设置拓扑存储获取器
    websocketService.setTopoStoreGetter(() => topoStore);

    // 初始化WebSocket连接
    createWebSocketConnection();

    // 注册WebSocket消息处理器
    websocketService.onMessage('action_6', handleAction6Message);
    websocketService.onMessage('action_7', handleAction7Message);
    websocketService.onMessage('action_10', handleAction10Message);
    websocketService.onMessage('action_11', handleTopoSyncMessage);
    websocketService.onMessage('emane', handleEmaneWebSocketMessage);
    websocketService.onMessage('nemIds', handleNemIdWebSocketMessage);

    // 通用的 HTTP 响应回调处理函数，能够根据数据中的 model 字段智能路由
    const handleHttpResponseData = (nodeId: number, data: any, defaultModel: string) => {
      if (!data) return;
      const targetModel = getResponseModelType(data) || defaultModel;
      storeSimDataForModel(targetModel, nodeId, data);
    };

    // 注册UHF HTTP响应回调，确保接口返回数据能存储到uhfSimulationData
    uhfSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'uhf');
    });

    // 注册VHF HTTP响应回调
    vhfSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'vhf');
    });

    // 注册FHSS/中长波 HTTP响应回调
    fhssSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'fhss');
    });

    dssSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'dss');
    });

    // 注册5G HTTP响应回调
    fiveGSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'fiveG');
    });

    // 注册TTC测控链 HTTP响应回调
    ttcSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'ttc');
    });

    // 注册AdHoc自组网 HTTP响应回调
    adhocSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'adhoc');
    });

    // 注册Coordination协同链 HTTP响应回调
    coordinationSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'coordination');
    });

    // 注册GFSK/卫星模型 HTTP响应回调
    gfskSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'gfsk');
    });

    customSimulationService.setDataReceivedCallback((nodeId, data) => {
      handleHttpResponseData(nodeId, data, 'custom');
    });

    // 注册WebSocket服务需要的事件监听器
    // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
    eventBus.on('websocket:sendNodesPositionUpdate', sendNodesPositionUpdate);
    // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
    eventBus.on('websocket:syncTopoData', syncTopoData);

  } catch (error) {
    console.error("初始化Cesium出错:", error);
    ElMessage.error("加载3D地球失败，请刷新页面重试");
  }

  // 添加localStorage事件监听器（跨页面通信）
  window.addEventListener('storage', handleStorageChange);

  // 监听添加服务器事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("openServerConfigDialog", () => {
    serverConfigDialogVisible.value = true;
  });

  // 监听MATLAB结果显示事件
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.on("openMatlabResults", (data: any) => {
    matlabResultPanelVisible.value = true;
    // 触发MATLAB结果面板的数据更新事件
    // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
    eventBus.emit('matlabResults', data);
  });

  // 启动拓扑同步（仅在有拓扑数据时启动）
  if (topoStore.topoData && topoStore.topoData.id) {
    startTopoSync();
  }

  // 监听拓扑数据变化，重新启动同步
  watch(
    () => topoStore.topoData?.id,
    (newSessionId, oldSessionId) => {
      if (newSessionId && newSessionId !== oldSessionId) {
        stopTopoSync();
        startTopoSync();
      } else if (!newSessionId) {
        stopTopoSync();
      }
    }
  );

  // 记录日志 - 加载地图
  systemLogStore.addLog({
    type: "normal",
    information: "系统信息",
    module: "map",
    action: "初始化地图",
    details: "初始化3D地球和Cesium可视化组件",
  });

  // 监听渲染模式切换事件
  eventBus.on("toggleRenderingMode", () => {
    if (cesiumEntities.value) {
      cesiumEntities.value.toggleRenderingMode();
      // 发送渲染模式变化事件，通知TopNavBar更新状态
      const currentMode = cesiumEntities.value.getRenderingMode();
      eventBus.emit("renderingModeChanged", currentMode.value);
      // 渲染模式已切换
    }
  });

  // 监听链路标签切换事件
  eventBus.on("toggleLinkLabels", (visible: boolean) => {
    if (cesiumEntities.value) {
      cesiumEntities.value.toggleLinkLabels(visible);
    }
  });

  // 监听链路标签刷新事件
  eventBus.on("refreshLinkLabels", () => {
    if (cesiumEntities.value) {
      cesiumEntities.value.syncLinksToEntities();
    }
  });

  // 监听节点名称切换事件
  eventBus.on("toggleNodeNames", (visible: boolean) => {
    if (cesiumEntities.value) {
      cesiumEntities.value.toggleNodeNames(visible);
    }
  });

  // 监听模板放置相关事件
  eventBus.on("startTemplatePlacement", handleStartTemplatePlacement);
  eventBus.on("endTemplatePlacement", handleEndTemplatePlacement);

  // 初始化useCesiumEntities后，同步初始渲染模式状态
  nextTick(() => {
    if (cesiumEntities.value) {
      const currentMode = cesiumEntities.value.getRenderingMode();
      eventBus.emit("renderingModeChanged", currentMode.value);
    }
  });

  // 添加终端拖拽事件监听器
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDragging);
});

// 组件卸载前清理资源
onBeforeUnmount(() => {
  navalStrikeDemo.destroy();

  // 移除事件监听
  eventBus.off("switchViewMode", switchViewMode);
  eventBus.off("flyToHome", flyToHomeHandler);
  eventBus.off("searchLocation", searchLocationHandler);
  eventBus.off("zoomIn", handleZoomIn);
  eventBus.off("zoomOut", handleZoomOut);
  eventBus.off("refreshScene", handleRefreshScene);

  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("startSimulation", startSimulation);
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("stopSimulation", stopSimulation);

  // 移除EMANE监控事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("startEmaneMonitor", handleStartEmaneMonitor);

  // 移除路径绘制事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("startPathDrawing", handleStartPathDrawing);

  // 移除无人机控制面板事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("openDroneControlPanel", handleOpenDroneControlPanel);

  // 移除渲染性能设置事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("setRenderPerformance", handleRenderPerformance);

  // 移除无人机控制位置更新事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("triggerPositionUpdate", sendNodesPositionUpdate);

  // 移除无人机移动状态事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("startFlightPositionUpdates", startNodesUpdate);

  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("stopFlightPositionUpdates", stopNodesUpdate);

  // 移除显示所有特殊效果事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("showAllSpecialEffects", handleShowAllSpecialEffects);
  
  // 移除快照数据更新事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("updateTopoData", handleTopoDataUpdate);

  // 移除添加服务器配置对话框事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("openServerConfigDialog");

  // 移除MATLAB结果显示事件监听
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off("openMatlabResults");

  // 确保资源被正确释放
  if (cesiumViewer.value) {
    // 移除事件监听
    try {
      cesiumViewer.value.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );
    } catch (e) {
      console.error("移除点击事件监听时出错:", e);
    }

    // 清理OSM建筑资源
    if (osmBuildings.value && cesiumViewer.value) {
      try {
        cesiumViewer.value.scene.primitives.remove(osmBuildings.value);
        osmBuildings.value = null;
      } catch (e) {
        console.error("清理OSM建筑资源时出错:", e);
      }
    }

    try {
      // 销毁Viewer实例
      cesiumViewer.value.destroy();
    } catch (e) {
      console.error("销毁Cesium Viewer时出错:", e);
    }

    // 重置引用
    cesiumViewer.value = null;
    cesiumEntities.value = null;
  }

  // 停止拓扑同步
  stopTopoSync();

  // 关闭WebSocket连接
  closeWebSocketConnection();

  // 移除WebSocket消息处理器
  websocketService.offMessage('action_6', handleAction6Message);
  websocketService.offMessage('action_7', handleAction7Message);
  websocketService.offMessage('action_8', handleAction8Message);
  websocketService.offMessage('action_10', handleAction10Message);
  websocketService.offMessage('action_11', handleTopoSyncMessage);
  websocketService.offMessage('emane', handleEmaneWebSocketMessage);
  websocketService.offMessage('nemIds', handleNemIdWebSocketMessage);

  // 移除WebSocket服务事件监听器
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off('websocket:sendNodesPositionUpdate', sendNodesPositionUpdate);
  // @ts-ignore: 暂时忽略类型检查错误，因为事件总线定义可能不完整
  eventBus.off('websocket:syncTopoData', syncTopoData);

  // 移除渲染模式切换事件监听
  eventBus.off("toggleRenderingMode");

  // 移除链路标签刷新事件监听
  eventBus.off("refreshLinkLabels");

  // 移除localStorage事件监听器
  window.removeEventListener('storage', handleStorageChange);

  // 移除终端拖拽事件监听器
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDragging);
});

// 处理开始绘制路径
const handleStartPathDrawing = () => {
  dronePathPanelVisible.value = true;
  ElMessage.success("已开启路径绘制面板");
};

// 处理恢复快照后的拓扑数据更新
const handleTopoDataUpdate = (topoData: any) => {
  if (cesiumViewer.value && cesiumEntities.value) {
    // 清除现有实体
    cesiumEntities.value.clearAllEntities();
    
    // 更新topoStore中的数据
    if (topoData) {
      // 同步节点和链路
      cesiumEntities.value.syncNodesToEntities();
      cesiumEntities.value.syncLinksToEntities();
      
      // 记录日志
      systemLogStore.addLog({
        type: "normal",
        information: "场景恢复",
        module: "map",
        action: "恢复快照",
        details: `已从快照恢复场景，共 ${topoData.nodes?.length || 0} 个节点和 ${topoData.links?.length || 0} 条链路`,
      });
      
      ElMessage.success('已成功恢复场景快照');
    }
  } else {
    ElMessage.error('更新地图失败：Cesium视图未初始化');
  }
};

// 更新节点在topoStore中的位置
const updateNodePositionInStore = (
  nodeId: string,
  position: { longitude: number; latitude: number; height: number }
) => {
  // 确保拓扑数据存在
  if (!topoStore.topoData || !topoStore.topoData.nodes) {
    console.warn("无法更新节点位置：拓扑数据不存在");
    return;
  }

  // 节点ID是字符串，需要转换为数字
  const nodeIdNumber = parseInt(nodeId, 10);
  if (isNaN(nodeIdNumber)) {
    console.warn(`无法更新节点位置：无效的节点ID "${nodeId}"`);
    return;
  }

  // 查找节点
  const node = topoStore.topoData.nodes.find((n: any) => n.id === nodeIdNumber);
  if (!node) {
    console.warn(`找不到ID为${nodeIdNumber}的节点`);
    return;
  }

  // 更新节点位置 - 使用直接赋值而不是替换整个对象，减少响应式系统的重新渲染
  const roundDecimals = (num: number, decimals = 6) => Number(num.toFixed(decimals));

  // 检查位置是否发生了实质性变化，如果基本相同，则不更新
  const currentLat = roundDecimals(node.geo.lat);
  const currentLon = roundDecimals(node.geo.lon);
  const currentAlt = roundDecimals(node.geo.alt);

  const newLat = roundDecimals(position.latitude);
  const newLon = roundDecimals(position.longitude);
  const newAlt = roundDecimals(position.height);

  // 如果位置实际上没有变化，则跳过更新
  if (currentLat === newLat && currentLon === newLon && currentAlt === newAlt) {
    return;
  }

  // 使用直接赋值的方式更新，而不是重新创建对象
  node.geo.lat = newLat;
  node.geo.lon = newLon;
  node.geo.alt = newAlt;
};

// 设置无人机移动管理器
const setupDroneFlightManager = (droneFlightManager: any) => {
  if (!droneFlightManager) {
    console.warn("无人机移动管理器未初始化");
    return;
  }

  // 设置位置更新回调
  droneFlightManager.setPositionUpdateCallback((entityId: string, position: any) => {
    // 标记此更新来自移动管理器，避免其他实体更新逻辑被触发
    const entity = cesiumViewer.value?.entities.getById(entityId);
    if (entity) {
      (entity as any)._updatingFromFlightManager = true;
    }

    // 更新topoStore中的节点位置
    updateNodePositionInStore(entityId, position);

    // 清除标记
    if (entity) {
      (entity as any)._updatingFromFlightManager = false;
    }
  });

  droneFlightManager.setFlightStatusCallback((activeEntityIds: string[]) => {
    if (activeEntityIds.length > 0) {
      // 存在移动中的无人机，开始发送节点位置更新
      startNodesUpdate();

      // 记录日志
      systemLogStore.addLog({
        type: "normal",
        module: "drone",
        action: "位置更新开始",
        information: "位置更新启动",
        details: `开始发送无人机位置更新，活动无人机数量: ${activeEntityIds.length}`,
      });
    } else {
      // 没有移动中的无人机，停止发送节点位置更新
      stopNodesUpdate();

      // 记录日志
      systemLogStore.addLog({
        type: "normal",
        module: "drone",
        action: "位置更新停止",
        information: "位置更新停止",
        details: "所有无人机已停止移动，停止位置更新",
      });
    }

    // 在状态回调中添加移动状态变更的日志记录功能
    // 比较上一次活动的无人机列表和当前活动列表，记录变化
    const prevFlying = flyingDrones.value || [];

    // 新开始移动的无人机
    const newlyStarted = activeEntityIds.filter((id: string) => !prevFlying.includes(id));
    // 刚刚停止移动的无人机
    const newlyStopped = prevFlying.filter((id: string) => !activeEntityIds.includes(id));

    // 为新开始移动的无人机记录日志
    newlyStarted.forEach((droneId: string) => {
      const drone = topoStore.topoData?.nodes?.find(
        (n: any) => n.id.toString() === droneId
      );
      const droneName = drone ? drone.alias || drone.name : `无人机${droneId}`;

      systemLogStore.addLog({
        type: "normal",
        module: "drone",
        action: "开始移动",
        information: "无人机移动开始",
        details: `无人机 "${droneName}" 开始移动`,
      });
    });

    // 为刚停止移动的无人机记录日志
    newlyStopped.forEach((droneId: string) => {
      const drone = topoStore.topoData?.nodes?.find(
        (n: any) => n.id.toString() === droneId
      );
      const droneName = drone ? drone.alias || drone.name : `无人机${droneId}`;

      systemLogStore.addLog({
        type: "normal",
        module: "drone",
        action: "结束移动",
        information: "无人机移动结束",
        details: `无人机 "${droneName}" 结束移动`,
      });
    });

    // 更新移动中的无人机列表
    flyingDrones.value = activeEntityIds;
  });
};

// 更新DSSS网络的连接关系
const updateDSSNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有DSSS节点（通过名称模式）
  const dssNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-dsss-')) {
      dssNodeMap.set(node.id, node);

      // 如果该DSSS节点还未注册到dssSimulationService，则注册它
      const registeredDSSNodes = dssSimulationService.getDSSNodes();
      if (!registeredDSSNodes.has(node.id)) {
        // 先尝试从持久化存储中获取配置
        const persistedDSSConfig = channelModelDataStore.getNodeData(node.id);
        const dssConfig = persistedDSSConfig || node.dss_config || {
          mode: 'fixed',
          adaptive: false,
          modulation_type: '1',
          txPower: 43.0,
          centerFreq: 7 * 1000000,
          k_factor: 5.0,
          speed: 10.0,
          transmissionDelay: 10.0,
          networkTransmissionRateBps: 1000.0,
        };

        dssSimulationService.registerDSSNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          dss_config: dssConfig,
        });
      }
    }
  });

  if (dssNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到DSSS节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到DSSS节点
    dssNodeMap.forEach((dssNode, dssNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === dssNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === dssNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== dssNodeId) {
        if (!processedConnections.has(dssNodeId)) {
          processedConnections.set(dssNodeId, new Set());
        }
        processedConnections.get(dssNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新DSSS节点的连接
  processedConnections.forEach((connectedNodeIds, dssNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        dssSimulationService.addConnectedNode(dssNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新FHSS网络的连接关系
const updateFHSSNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有FHSS节点（通过名称模式）
  const fhssNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-fhss-')) {
      fhssNodeMap.set(node.id, node);

      // 如果该FHSS节点还未注册到fhssSimulationService，则注册它
      const registeredFHSSNodes = fhssSimulationService.getFHSSNodes();
      if (!registeredFHSSNodes.has(node.id)) {
        fhssSimulationService.registerFHSSNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          fhss_config: node.fhss_config || {
            modulation_type: '2',
            txPower: 30.0,
            centerFreq: 2437 * 1000,
            k_factor: 10.0,
            speed: 30.0,
            noiseFigureDb: 7.0,
            shadowFadingDb: 2.5,
            seed: 1234,
          },
        });
      }
    }
  });

  if (fhssNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到FHSS节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到FHSS节点
    fhssNodeMap.forEach((fhssNode, fhssNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === fhssNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === fhssNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== fhssNodeId) {
        if (!processedConnections.has(fhssNodeId)) {
          processedConnections.set(fhssNodeId, new Set());
        }
        processedConnections.get(fhssNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新FHSS节点的连接
  processedConnections.forEach((connectedNodeIds, fhssNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        fhssSimulationService.addConnectedNode(fhssNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新GFSK网络的连接关系
const updateGFSKNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有GFSK节点（通过名称模式）
  const gfskNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-gfsk-')) {
      gfskNodeMap.set(node.id, node);

      // 如果该GFSK节点还未注册到gfskSimulationService，则注册它
      const registeredGFSKNodes = gfskSimulationService.getGFSKNodes();
      if (!registeredGFSKNodes.has(node.id)) {
        gfskSimulationService.registerGFSKNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          gfsk_config: node.gfsk_config || {
            modulation_type: '2',
            txPower: 30.0,
            centerFreq: 2437,
            k_factor: 10.0,
          },
        });
      }
    }
  });

  if (gfskNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到GFSK节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到GFSK节点
    gfskNodeMap.forEach((gfskNode, gfskNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === gfskNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === gfskNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== gfskNodeId) {
        if (!processedConnections.has(gfskNodeId)) {
          processedConnections.set(gfskNodeId, new Set());
        }
        processedConnections.get(gfskNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新GFSK节点的连接
  processedConnections.forEach((connectedNodeIds, gfskNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        gfskSimulationService.addConnectedNode(gfskNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新散射网络的连接关系
const updateCustomNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有散射节点（通过名称模式）
  const customNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-custom-')) {
      customNodeMap.set(node.id, node);

      // 如果该散射节点还未注册到customSimulationService，则注册它
      const registeredCustomNodes = customSimulationService.getCustomNodes();
      if (!registeredCustomNodes.has(node.id)) {
        // 优先从channelModelDataStore获取持久化的配置
        const channelModelDataStore = useChannelModelDataStore();
        const persistedData = channelModelDataStore.getNodeData(node.id, 'custom');
        let customConfig: any = node.custom_config;

        // 如果topo节点没有custom_config，尝试从持久化数据构建
        if (!customConfig && persistedData) {
          customConfig = {
            modulation: parseInt(persistedData.modulation || '2', 10),
            centerFreq: persistedData.centerFreq || 2.4e9,
            samplingRate: persistedData.samplingRate || 1e6,
            snr_db: persistedData.snr_db || 25.0,
            speed: persistedData.speed ?? 10.0,
            multipath: persistedData.multipath || persistedData.phy?.multipath || [],
          };
        }

        customSimulationService.registerCustomNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          custom_config: customConfig || {
            modulation: 2,
            centerFreq: 2.4e9,
            samplingRate: 1e6,
            snr_db: 25.0,
            speed: 10.0,
            multipath: [],
          },
        });
      }
    }
  });

  if (customNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到散射节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到散射节点
    customNodeMap.forEach((customNode, customNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === customNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === customNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== customNodeId) {
        if (!processedConnections.has(customNodeId)) {
          processedConnections.set(customNodeId, new Set());
        }
        processedConnections.get(customNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新散射节点的连接
  processedConnections.forEach((connectedNodeIds, customNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        customSimulationService.addConnectedNode(customNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新TTC网络的连接关系
const updateTTCNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有TTC节点（通过名称模式）
  const ttcNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-ttc-')) {
      ttcNodeMap.set(node.id, node);

      // 如果该TTC节点还未注册到ttcSimulationService，则注册它
      const registeredTTCNodes = ttcSimulationService.getTTCNodes();
      if (!registeredTTCNodes.has(node.id)) {
        ttcSimulationService.registerTTCNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ttc_config: node.ttc_config || {
            mode: 'hopping',
            adaptive: true,
            txPower: 43.0,
            centerFreq: 1550000000.0,
            k_factor: 10.0,
          },
        });
      }
    }
  });

  if (ttcNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到TTC节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到TTC节点
    ttcNodeMap.forEach((ttcNode, ttcNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === ttcNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === ttcNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== ttcNodeId) {
        if (!processedConnections.has(ttcNodeId)) {
          processedConnections.set(ttcNodeId, new Set());
        }
        processedConnections.get(ttcNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新TTC节点的连接
  processedConnections.forEach((connectedNodeIds, ttcNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        ttcSimulationService.addConnectedNode(ttcNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新AdHoc网络的连接关系
const updateAdHocNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有AdHoc节点（通过名称模式）
  const adhocNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-adhoc-')) {
      adhocNodeMap.set(node.id, node);

      // 如果该AdHoc节点还未注册到adhocSimulationService，则注册它
      const registeredAdHocNodes = adhocSimulationService.getAdHocNodes();
      if (!registeredAdHocNodes.has(node.id)) {
        adhocSimulationService.registerAdHocNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          adhoc_config: node.adhoc_config || {
            mode: 'hopping',
            adaptive: true,
            txPower: 43.0,
            centerFreq: 462500000.0,
            k_factor: 10.0,
          },
        });
      }
    }
  });

  if (adhocNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到AdHoc节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到AdHoc节点
    adhocNodeMap.forEach((adhocNode, adhocNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === adhocNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === adhocNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== adhocNodeId) {
        if (!processedConnections.has(adhocNodeId)) {
          processedConnections.set(adhocNodeId, new Set());
        }
        processedConnections.get(adhocNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新AdHoc节点的连接
  processedConnections.forEach((connectedNodeIds, adhocNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        adhocSimulationService.addConnectedNode(adhocNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新Coordination网络的连接关系
const updateCoordinationNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有Coordination节点（通过名称模式）
  const coordinationNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-coordination-')) {
      coordinationNodeMap.set(node.id, node);

      // 如果该Coordination节点还未注册到coordinationSimulationService，则注册它
      const registeredCoordinationNodes = coordinationSimulationService.getCoordinationNodes();
      if (!registeredCoordinationNodes.has(node.id)) {
        coordinationSimulationService.registerCoordinationNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          coordination_config: node.coordination_config || {
            mode: 'hopping',
            adaptive: true,
            txPower: 43.0,
            centerFreq: 462500000.0,
            k_factor: 10.0,
          },
        });
      }
    }
  });

  if (coordinationNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到Coordination节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到Coordination节点
    coordinationNodeMap.forEach((coordinationNode, coordinationNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === coordinationNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === coordinationNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== coordinationNodeId) {
        if (!processedConnections.has(coordinationNodeId)) {
          processedConnections.set(coordinationNodeId, new Set());
        }
        processedConnections.get(coordinationNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新Coordination节点的连接
  processedConnections.forEach((connectedNodeIds, coordinationNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        coordinationSimulationService.addConnectedNode(coordinationNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新VHF网络的连接关系
const updateVHFNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有VHF节点（通过名称模式）
  const vhfNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-vhf-')) {
      vhfNodeMap.set(node.id, node);

      // 如果该VHF节点还未注册到vhfSimulationService，则注册它
      const registeredVHFNodes = vhfSimulationService.getVHFNodes();
      if (!registeredVHFNodes.has(node.id)) {
        vhfSimulationService.registerVHFNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          vhf_config: node.vhf_config || {
            modulation_type: '2',
            txPower: 30.0,
            centerFreq: 150,
            k_factor: 10.0,
          },
        });
      }
    }
  });

  if (vhfNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到VHF节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到VHF节点
    vhfNodeMap.forEach((vhfNode, vhfNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === vhfNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === vhfNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== vhfNodeId) {
        if (!processedConnections.has(vhfNodeId)) {
          processedConnections.set(vhfNodeId, new Set());
        }
        processedConnections.get(vhfNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新VHF节点的连接
  processedConnections.forEach((connectedNodeIds, vhfNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        vhfSimulationService.addConnectedNode(vhfNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新UHF网络的连接关系
const updateUHFNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有UHF节点（通过名称模式）
  const uhfNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-uhf-')) {
      uhfNodeMap.set(node.id, node);

      // 如果该UHF节点还未注册到uhfSimulationService，则注册它
      const registeredUHFNodes = uhfSimulationService.getUHFNodes();
      if (!registeredUHFNodes.has(node.id)) {
        uhfSimulationService.registerUHFNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          uhf_config: node.uhf_config || {
            modulation_type: '2',
            txPower: 30.0,
            centerFreq: 1500,
            k_factor: 10.0,
          },
        });
      }
    }
  });

  if (uhfNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到UHF节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到UHF节点
    uhfNodeMap.forEach((uhfNode, uhfNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === uhfNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === uhfNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== uhfNodeId) {
        if (!processedConnections.has(uhfNodeId)) {
          processedConnections.set(uhfNodeId, new Set());
        }
        processedConnections.get(uhfNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新UHF节点的连接
  processedConnections.forEach((connectedNodeIds, uhfNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        uhfSimulationService.addConnectedNode(uhfNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 更新5G网络的连接关系
const updateFiveGNetworkConnections = (links: any[]) => {
  const nodes = topoStore.topoData?.nodes || [];
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  // 从节点列表中发现所有5G节点（通过名称模式）
  const fiveGNodeMap = new Map<number, any>();
  nodes.forEach((node: any) => {
    if (node.name && node.name.startsWith('channel-5g-')) {
      fiveGNodeMap.set(node.id, node);

      // 如果该5G节点还未注册到fiveGSimulationService，则注册它
      const registered5GNodes = fiveGSimulationService.getFiveGNodes();
      if (!registered5GNodes.has(node.id)) {
        // 先尝试从持久化存储中获取配置
        const persisted5GConfig = channelModelDataStore.getNodeData(node.id);
        const fiveGConfig = persisted5GConfig || node.fiveG_config || {
          modulation_type: '2',
          txPower: 30.0,
          centerFreq: 3500 * 1000000, // 存储为Hz
          k_factor: 10.0,
        };

        fiveGSimulationService.registerFiveGNode(node.id, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          fiveG_config: fiveGConfig,
        });
      }
    }
  });

  if (fiveGNodeMap.size === 0) {
    return;
  }

  // 遍历所有链路，找到连接到5G节点的链路
  const processedConnections = new Map<number, Set<number>>();

  links.forEach((link: any) => {
    const node1Id = link.node1_id;
    const node2Id = link.node2_id;

    // 检查是否连接到5G节点
    fiveGNodeMap.forEach((fiveGNode, fiveGNodeId) => {
      let connectedNodeId: number | null = null;

      if (node1Id === fiveGNodeId) {
        connectedNodeId = node2Id;
      } else if (node2Id === fiveGNodeId) {
        connectedNodeId = node1Id;
      }

      if (connectedNodeId !== null && connectedNodeId !== fiveGNodeId) {
        if (!processedConnections.has(fiveGNodeId)) {
          processedConnections.set(fiveGNodeId, new Set());
        }
        processedConnections.get(fiveGNodeId)!.add(connectedNodeId);
      }
    });
  });

  // 更新5G节点的连接
  processedConnections.forEach((connectedNodeIds, fiveGNodeId) => {
    connectedNodeIds.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        fiveGSimulationService.addConnectedNode(fiveGNodeId, {
          id: node.id,
          name: node.name,
          geo: node.geo || { lat: 0, lon: 0, alt: 0 },
          ethId: node.eth_info || 1,
        });
      }
    });
  });
};

// 将停止仿真的函数导出，供事件总线调用
const stopSimulation = () => {
  console.log('[stopSimulation] 开始停止所有仿真服务...');

  // 设置仿真状态为停止
  isSimulationRunning.value = false;

  // 停止DSSS仿真服务
  dssSimulationService.stopSimulation();
  console.log('[stopSimulation] DSSS仿真服务已停止');

  // 停止FHSS仿真服务
  fhssSimulationService.stopSimulation();
  console.log('[stopSimulation] FHSS仿真服务已停止');

  // 停止GMSK仿真服务
  gmskSimulationService.stopSimulation();
  console.log('[stopSimulation] GMSK仿真服务已停止');

  // 停止GFSK仿真服务
  gfskSimulationService.stopSimulation();
  console.log('[stopSimulation] GFSK仿真服务已停止');

  // 停止TTC仿真服务
  ttcSimulationService.stopSimulation();
  console.log('[stopSimulation] TTC仿真服务已停止');

  // 停止AdHoc仿真服务
  adhocSimulationService.stopSimulation();
  console.log('[stopSimulation] AdHoc仿真服务已停止');

  // 停止Coordination仿真服务
  coordinationSimulationService.stopSimulation();
  console.log('[stopSimulation] Coordination仿真服务已停止');

  // 停止VHF仿真服务
  vhfSimulationService.stopSimulation();
  console.log('[stopSimulation] VHF仿真服务已停止');

  // 停止UHF仿真服务
  uhfSimulationService.disableMockMode();
  uhfSimulationService.stopSimulation();
  console.log('[stopSimulation] UHF仿真服务已停止');

  // 停止5G仿真服务
  fiveGSimulationService.stopSimulation();
  console.log('[stopSimulation] 5G仿真服务已停止');

  // 停止散射仿真服务
  customSimulationService.stopSimulation();
  console.log('[stopSimulation] 散射仿真服务已停止');

  // 清除仿真数据 - 确保彻底清理
  const oldDssData = dssSimulationData.value;
  const oldFhssData = fhssSimulationData.value;
  const oldGmskData = gmskSimulationData.value;
  const oldGfskData = gfskSimulationData.value;
  const oldTtcData = ttcSimulationData.value;
  const oldAdhocData = adhocSimulationData.value;
  const oldCoordinationData = coordinationSimulationData.value;
  const oldVhfData = vhfSimulationData.value;
  const oldUhfData = uhfSimulationData.value;
  const oldFiveGData = fiveGSimulationData.value;

  dssSimulationData.value.clear();
  fhssSimulationData.value.clear();
  gmskSimulationData.value.clear();
  gfskSimulationData.value.clear();
  ttcSimulationData.value.clear();
  adhocSimulationData.value.clear();
  coordinationSimulationData.value.clear();
  vhfSimulationData.value.clear();
  uhfSimulationData.value.clear();
  fiveGSimulationData.value.clear();

  // 强制触发响应式更新
  nextTick(() => {
    // 确保数据已被清理
    const totalCleared = oldDssData.size + oldFhssData.size + oldGmskData.size + oldGfskData.size +
                         oldTtcData.size + oldAdhocData.size + oldCoordinationData.size +
                         oldVhfData.size + oldUhfData.size + oldFiveGData.size;
    if (totalCleared > 0) {
      console.log('仿真数据已清理，共清理', totalCleared, '条记录');
    }
  });

  // 通知TMV流量模型Store仿真已停止
  import("../../../store/modules/tmvTraffic")
    .then(({ useTMVTrafficStore }) => {
      const tmvTrafficStore = useTMVTrafficStore();
      tmvTrafficStore.setSimulationRunning(false);
    })
    .catch((error) => {
      console.error("加载TMV流量模型Store失败:", error);
    });

  // 记录日志
  systemLogStore.addLog({
    type: "important",
    module: "simulation",
    action: "停止仿真",
    information: "仿真停止",
    details: `停止仿真会话，ID: ${topoStore.topoData.id}`,
  });

  // 无论是否有无人机在移动，都强制停止节点位置更新
  stopNodesUpdate();
};

// 处理无人机控制面板事件
const handleOpenDroneControlPanel = () => {
  droneControlPanelVisible.value = true;
  ElMessage.success("已开启无人机控制面板");
};

// 修改处理显示/隐藏所有特殊效果的函数，添加状态更新事件
const handleShowAllSpecialEffects = () => {
  if (!cesiumEntities.value) {
    console.warn("无法操作特效：cesiumEntities为null");
    return;
  }

  // 根据当前状态决定是显示还是隐藏特效
  if (allEffectsVisible.value) {
    // 当前是显示状态，需要隐藏特效
    cesiumEntities.value.hideAllSpecialEffects();
    allEffectsVisible.value = false;
    ElMessage.success("已隐藏所有节点特效");
  } else {
    // 当前是隐藏状态，需要显示特效
    cesiumEntities.value.showAllSpecialEffects();
    allEffectsVisible.value = true;
    ElMessage.success("已显示所有节点特效");
  }

  // 发送状态更新事件，通知其他组件
  eventBus.emit("effectsVisibilityChanged", allEffectsVisible.value);
};

// 处理服务器配置保存
const handleServerConfigSave = (config: any) => {
  console.log("保存服务器配置:", config);
  // 仅作展示，不实现实际功能
};

// 处理添加服务器
const handleServerConfigAdd = (config: any) => {
  console.log("添加服务器:", config);
  // 仅作展示，不实现实际功能
};

// 终端相关方法
const terminalRefs = ref<Map<string, HTMLElement>>(new Map());

// 设置终端DOM引用
const setTerminalRef = (terminalId: string, el: any) => {
  if (el) {
    terminalRefs.value.set(terminalId, el);
  } else {
    terminalRefs.value.delete(terminalId);
  }
};

// 生成唯一的终端ID
const generateTerminalId = (nodeId: string) => {
  return `terminal_${nodeId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// 计算新终端的位置
const calculateTerminalPosition = (index: number) => {
  const baseTop = 100;
  const baseLeft = 150;
  const offset = 30;

  return {
    top: `${baseTop + (index * offset)}px`,
    left: `${baseLeft + (index * offset)}px`
  };
};

// Handle open VNC event from NodeInfoPanel
const handleOpenVnc = (params: { nodeId: number; nodeName: string; wsUrl: string }) => {
  // Check if a VNC window with the same WebSocket URL already exists
  const existingVncEntry = Array.from(vncWindows.value.entries()).find(
    ([_, vnc]) => vnc.wsUrl === params.wsUrl
  );
  
  if (existingVncEntry) {
    const [existingId, existingVnc] = existingVncEntry;
    existingVnc.isMinimized = false;
    activeVncId.value = existingId;
    ElMessage.warning('This VM is already open in another VNC window. Showing existing window.');
    return;
  }
  
  // Generate unique VNC ID with timestamp
  const timestamp = Date.now();
  const vncId = `vnc-${params.nodeId}-${timestamp}`;

  const existingCount = vncWindows.value.size;
  const baseTop = 100;
  const baseLeft = 400;
  const offset = existingCount * 30;

  const newVnc: VncInstance = {
    id: vncId,
    node: { id: params.nodeId, name: params.nodeName, alias: params.nodeName },
    wsUrl: params.wsUrl,
    isMinimized: false,
    position: {
      top: `${baseTop + offset}px`,
      left: `${baseLeft + offset}px`
    },
    size: {
      width: '800px',
      height: '600px'
    },
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
    resizeHandle: ''
  };

  vncWindows.value.set(vncId, newVnc);
  activeVncId.value = vncId;
  
  // Warn user if multiple VNC windows might connect to same VM (backend limitation)
  if (vncWindows.value.size > 1) {
    ElMessage.warning({
      message: 'Note: Multiple VNC windows may show the same VM due to backend configuration. If you see duplicates, this is a backend issue with VM instance management.',
      duration: 5000,
      showClose: true
    });
  }
  
  ElMessage.success('VNC window opened');
};

const handleOpenTerminal = async (node: any) => {
  try {
    // 获取当前会话ID
    const sessionId = topoStore.currentSessionId ?? topoStore.topoData?.id;

    let response;
    // 根据节点类型调用不同的API接口
    if (node?.type === 'DRONE' || node?.type === 'BASESTATION') {
      // 调用getExecVnode接口
      const { getExecVnode } = await import("../../../api/node");
      response = await getExecVnode({
        sessionId: sessionId,
        nodeName: node?.name || node?.alias
      });
    } else {
      // 调用getExecDocker接口
      const { getExecDocker } = await import("../../../api/node");
      response = await getExecDocker({
        sessionId: sessionId,
        nodeId: node?.id
      });
    }

    if (response && response.data) {
      const terminalId = generateTerminalId(node.id);
      const position = calculateTerminalPosition(terminals.value.size);

      // 计算该节点已有的终端数量，用于显示序号
      const nodeTerminalCount = Array.from(terminals.value.values()).filter(
        terminal => terminal.node.id === node.id
      ).length;

      // 创建新的终端实例
      const newTerminal: TerminalInstance = {
        id: terminalId,
        node: node,
        wsUrl: response.data,
        isMinimized: false,
        position: position,
        size: { width: '600px', height: '400px' },
        isDragging: false,
        isResizing: false,
        dragOffset: { x: 0, y: 0 },
        resizeHandle: '',
        terminalIndex: nodeTerminalCount + 1 // 添加终端序号
      };

      // 添加到终端列表
      terminals.value.set(terminalId, newTerminal);
      activeTerminalId.value = terminalId;

      const terminalLabel = nodeTerminalCount > 0
        ? `${node.alias || node.name} 终端 #${nodeTerminalCount + 1}`
        : `${node.alias || node.name} 终端`;

      ElMessage.success(`已打开 ${terminalLabel}`);
    } else {
      ElMessage.error("获取终端连接失败");
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取终端连接失败");
  }
};

// 关闭终端
const closeTerminal = (terminalId: string) => {
  const closingTerminal = terminals.value.get(terminalId);
  const nodeId = closingTerminal?.node?.id;

  terminals.value.delete(terminalId);
  terminalRefs.value.delete(terminalId);

  // 如果关闭的是当前活动终端，切换到其他终端
  if (activeTerminalId.value === terminalId) {
    const remainingTerminals = Array.from(terminals.value.keys());
    activeTerminalId.value = remainingTerminals.length > 0 ? remainingTerminals[0] : null;
  }

  // 重新计算同一节点其他终端的序号
  if (nodeId) {
    updateTerminalIndices(nodeId);
  }
};

// 更新指定节点的所有终端序号
const updateTerminalIndices = (nodeId: number) => {
  const nodeTerminals = Array.from(terminals.value.values())
    .filter(terminal => terminal.node.id === nodeId)
    .sort((a, b) => a.id.localeCompare(b.id)); // 按ID排序保持一致性

  nodeTerminals.forEach((terminal, index) => {
    terminal.terminalIndex = index + 1;
  });
};

// 最小化/最大化终端
const minimizeTerminal = (terminalId: string) => {
  const terminal = terminals.value.get(terminalId);
  if (terminal) {
    terminal.isMinimized = !terminal.isMinimized;
  }
};

// 开始拖拽
const startDragging = (event: MouseEvent, terminalId: string) => {
  // 忽略控制按钮的点击
  if ((event.target as HTMLElement).closest('.terminal-control')) {
    return;
  }

  const terminal = terminals.value.get(terminalId);
  const element = terminalRefs.value.get(terminalId);

  if (!terminal || !element) return;

  // 设置当前终端为活动终端
  activeTerminalId.value = terminalId;
  terminal.isDragging = true;

  // 计算鼠标点击位置与元素左上角的相对位置
  const rect = element.getBoundingClientRect();
  terminal.dragOffset = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  // 防止选择文本
  event.preventDefault();
};

// 拖拽移动
const onDrag = (event: MouseEvent) => {
  if (!activeTerminalId.value) return;

  const terminal = terminals.value.get(activeTerminalId.value);
  if (!terminal) return;

  // 处理拖拽
  if (terminal.isDragging) {
    // 计算新位置
    const x = event.clientX - terminal.dragOffset.x;
    const y = event.clientY - terminal.dragOffset.y;

    // 确保窗口不会被拖出视口
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const boundedX = Math.max(0, Math.min(x, viewportWidth - parseInt(terminal.size.width)));
    const boundedY = Math.max(0, Math.min(y, viewportHeight - 50));

    terminal.position = {
      top: `${boundedY}px`,
      left: `${boundedX}px`
    };
  }

  // 处理调整大小
  if (terminal.isResizing) {
    onResize(event);
  }
};

// 结束拖拽和调整大小
const stopDragging = () => {
  // 停止所有终端的拖拽和调整大小状态
  terminals.value.forEach(terminal => {
    terminal.isDragging = false;
    terminal.isResizing = false;
    terminal.resizeHandle = '';
  });
};

// 开始调整大小
const startResizing = (event: MouseEvent, terminalId: string, handle: string) => {
  event.preventDefault();
  event.stopPropagation();

  const terminal = terminals.value.get(terminalId);
  if (!terminal) return;

  // 设置当前终端为活动终端
  activeTerminalId.value = terminalId;
  terminal.isResizing = true;
  terminal.resizeHandle = handle;

  // 记录初始鼠标位置
  terminal.dragOffset = {
    x: event.clientX,
    y: event.clientY
  };
};

// 调整大小移动
const onResize = (event: MouseEvent) => {
  if (!activeTerminalId.value) return;

  const terminal = terminals.value.get(activeTerminalId.value);
  if (!terminal || !terminal.isResizing) return;

  const deltaX = event.clientX - terminal.dragOffset.x;
  const deltaY = event.clientY - terminal.dragOffset.y;

  const element = terminalRefs.value.get(activeTerminalId.value);
  if (!element) return;

  const currentWidth = parseInt(terminal.size.width);
  const currentHeight = parseInt(terminal.size.height);

  let newWidth = currentWidth;
  let newHeight = currentHeight;

  // 根据调整手柄类型计算新尺寸
  if (terminal.resizeHandle.includes('e')) {
    newWidth = Math.max(300, currentWidth + deltaX); // 最小宽度300px
  }
  if (terminal.resizeHandle.includes('s')) {
    newHeight = Math.max(200, currentHeight + deltaY); // 最小高度200px
  }

  // 限制最大尺寸
  const maxWidth = window.innerWidth - parseInt(terminal.position.left) - 20;
  const maxHeight = window.innerHeight - parseInt(terminal.position.top) - 20;

  newWidth = Math.min(newWidth, maxWidth);
  newHeight = Math.min(newHeight, maxHeight);

  // 更新终端尺寸
  terminal.size = {
    width: `${newWidth}px`,
    height: `${newHeight}px`
  };

  // 更新鼠标位置记录
  terminal.dragOffset = {
    x: event.clientX,
    y: event.clientY
  };

  // 通知Terminal组件调整大小
  nextTick(() => {
    // 触发Terminal组件的resize事件
    const terminalComponent = element.querySelector('.terminal');
    if (terminalComponent) {
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
    }
  });
};



// 监听topoStore中的节点变化，确保在节点删除时更新Cesium实体
watch(
  () => topoStore.topoData?.links,
  (newLinks) => {
    if (!newLinks) return;

    // 更新DSSS节点的连接关系
    updateDSSNetworkConnections(newLinks);

    // 更新FHSS节点的连接关系
    updateFHSSNetworkConnections(newLinks);

    // 更新GFSK节点的连接关系
    updateGFSKNetworkConnections(newLinks);

    // 更新散射节点的连接关系
    updateCustomNetworkConnections(newLinks);

    // 更新TTC节点的连接关系
    updateTTCNetworkConnections(newLinks);

    // 更新AdHoc节点的连接关系
    updateAdHocNetworkConnections(newLinks);

    // 更新Coordination节点的连接关系
    updateCoordinationNetworkConnections(newLinks);

    // 更新VHF节点的连接关系
    updateVHFNetworkConnections(newLinks);

    // 更新UHF节点的连接关系
    updateUHFNetworkConnections(newLinks);

    // 更新5G节点的连接关系
    updateFiveGNetworkConnections(newLinks);
  },
  { deep: true }
);

// 监听场景状态变化，确保SHUTDOWN时停止仿真
watch(
  () => topoStore.topoData?.state,
  (newState, oldState) => {
    if (newState === 'SHUTDOWN' && oldState !== 'SHUTDOWN') {
      console.log('[状态监听] 检测到场景状态变为SHUTDOWN，正在停止仿真服务...');
      stopSimulation();
    }
  }
);

watch(
  () => topoStore.topoData?.nodes?.length,
  (newLength, oldLength) => {
    if (!cesiumEntities.value) return;

    // 如果节点数量为0（可能是删除了最后一个节点）
    if (newLength === 0 && oldLength > 0) {
      // 强制清理所有实体
      cesiumEntities.value.clearAllEntities();
    }
    // 常规节点变化，同步节点实体
    else if (newLength !== oldLength) {
      cesiumEntities.value.syncNodesToEntities();
      cesiumEntities.value.syncLinksToEntities();
    }
  }
);

// VNC window management functions
const setVncRef = (vncId: string, el: any) => {
  if (el && vncWindows.value.has(vncId)) {
    activeVncId.value = vncId;
  }
};

const minimizeVnc = (vncId: string) => {
  const vnc = vncWindows.value.get(vncId);
  if (vnc) {
    vnc.isMinimized = !vnc.isMinimized;
  }
};

const closeVnc = (vncId: string) => {
  vncWindows.value.delete(vncId);
  if (activeVncId.value === vncId) {
    activeVncId.value = null;
  }
  ElMessage.info('VNC window closed');
};

const startVncDragging = (e: MouseEvent, vncId: string) => {
  const vnc = vncWindows.value.get(vncId);
  if (!vnc || vnc.isDragging) return;
  
  vnc.isDragging = true;
  activeVncId.value = vncId;
  
  const vncElement = (e.target as HTMLElement).closest('.draggable-vnc');
  if (!vncElement) return;
  
  const rect = vncElement.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  
  const onMouseMove = (e: MouseEvent) => {
    if (!vnc || !vnc.isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    const maxX = window.innerWidth - parseInt(vnc.size.width);
    const maxY = window.innerHeight - parseInt(vnc.size.height);
    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));
    
    vnc.position = {
      top: `${boundedY}px`,
      left: `${boundedX}px`
    };
  };
  
  const onMouseUp = () => {
    if (vnc) {
      vnc.isDragging = false;
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

const startVncResizing = (e: MouseEvent, vncId: string, handle: string) => {
  e.preventDefault();
  e.stopPropagation();
  const vnc = vncWindows.value.get(vncId);
  if (!vnc) return;
  vnc.isResizing = true;
  vnc.resizeHandle = handle;
  activeVncId.value = vncId;
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = parseInt(vnc.size.width);
  const startHeight = parseInt(vnc.size.height);
  const onMouseMove = (e: MouseEvent) => {
    if (!vnc.isResizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (handle.includes('e')) {
      const newWidth = Math.max(600, startWidth + dx);
      vnc.size.width = `${newWidth}px`;
    }
    if (handle.includes('s')) {
      const newHeight = Math.max(400, startHeight + dy);
      vnc.size.height = `${newHeight}px`;
    }
  };
  const onMouseUp = () => {
    if (vnc) {
      vnc.isResizing = false;
      vnc.resizeHandle = '';
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};
</script>

<style scoped>
/* Cesium容器样式 */
.cesium-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 放置模式下的鼠标样式 */
.add-mode {
  cursor: crosshair;
}

/* 连接模式下的鼠标样式 */
.connect-mode {
  cursor: pointer;
}

#cesiumContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: black;
}

/* 连接提示样式 */
.connect-hint {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.7);
  color: #00eaff;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 0 10px rgba(0, 198, 255, 0.5);
  border: 1px solid rgba(0, 198, 255, 0.3);
}

/* 底图模式切换按钮 */
.naval-demo-toggle {
  position: absolute;
  bottom: 72px;
  right: 20px;
  z-index: 100;
}

.naval-demo-toggle .el-button {
  background: rgba(0, 0, 0, 0.62);
  border: 1px solid rgba(255, 136, 0, 0.65);
  color: #ffb340;
  box-shadow: 0 0 10px rgba(255, 136, 0, 0.3);
  transition: all 0.3s ease;
}

.naval-demo-toggle .el-button:hover {
  background: rgba(255, 136, 0, 0.2);
  border-color: #ffb340;
  box-shadow: 0 0 15px rgba(255, 136, 0, 0.5);
}

.naval-demo-toggle .el-button.el-button--warning {
  background: rgba(255, 136, 0, 0.34);
  border-color: #ffb340;
}

.map-mode-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.map-mode-toggle .el-button {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(0, 198, 255, 0.5);
  color: #00eaff;
  box-shadow: 0 0 10px rgba(0, 198, 255, 0.3);
  transition: all 0.3s ease;
}

.map-mode-toggle .el-button:hover {
  background: rgba(0, 198, 255, 0.2);
  border-color: #00eaff;
  box-shadow: 0 0 15px rgba(0, 198, 255, 0.5);
}

.map-mode-toggle .el-button.is-primary {
  background: rgba(0, 198, 255, 0.3);
  border-color: #00eaff;
}

/* 隐藏Cesium的logo和水印 */
:deep(.cesium-viewer-bottom),
:deep(.cesium-widget-credits) {
  display: none !important;
}

:deep(.cesium-viewer-toolbar) {
  display: none;
}

/* 可拖拽终端样式 */
.draggable-terminal {
  position: fixed;
  z-index: 20;
  min-width: 300px;
  min-height: 200px;
  max-width: 95vw;
  max-height: 90vh;
  background: linear-gradient(
    135deg,
    rgba(8, 15, 39, 0.9) 0%,
    rgba(17, 23, 64, 0.95) 100%
  );
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 122, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: terminal-appear 0.3s ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  will-change: transform;
  transition: box-shadow 0.2s, z-index 0.2s;
  /* 确保终端内容能够适当显示 */
  display: flex;
  flex-direction: column;
  resize: none; /* 禁用浏览器默认的resize */
}

/* 活动终端样式 */
.draggable-terminal.active {
  z-index: 25;
  border: 1px solid rgba(0, 200, 255, 0.6);
  box-shadow: 0 12px 40px rgba(0, 200, 255, 0.3);
}

@keyframes terminal-appear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(
    90deg,
    rgba(0, 52, 134, 0.8) 0%,
    rgba(0, 86, 179, 0.6) 100%
  );
  padding: 10px 12px;
  cursor: move;
  user-select: none;
  border-bottom: 1px solid rgba(0, 122, 255, 0.2);
  /* 确保头部不会滚动 */
  flex: 0 0 auto;
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}

.terminal-index {
  background-color: rgba(0, 122, 255, 0.8);
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 4px;
}

.terminal-controls {
  display: flex;
  gap: 8px;
}

.terminal-control {
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.terminal-control:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.terminal-control.close:hover {
  background-color: rgba(255, 0, 0, 0.6);
}

.terminal-control.minimize:hover {
  background-color: rgba(255, 165, 0, 0.6);
}

.terminal-body {
  overflow: hidden;
  transition: height 0.3s cubic-bezier(0.19, 1, 0.22, 1);
  /* 允许终端主体自适应父容器 */
  flex: 1 1 auto;
  min-height: 150px; /* 最小高度 */
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

/* 隐藏终端区域的WebKit滚动条 */
.terminal-body::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.terminal-body.minimized {
  height: 0;
}

/* 调整大小手柄样式 */
.resize-handles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  pointer-events: all;
  background: transparent;
}

/* 右边缘调整手柄 */
.resize-handle-e {
  top: 0;
  right: -3px;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

/* 下边缘调整手柄 */
.resize-handle-s {
  left: 0;
  right: 0;
  bottom: -3px;
  height: 6px;
  cursor: ns-resize;
}

/* 右下角调整手柄 */
.resize-handle-se {
  right: -3px;
  bottom: -3px;
  width: 12px;
  height: 12px;
  cursor: nw-resize;
  background: linear-gradient(
    -45deg,
    transparent 0%,
    transparent 40%,
    rgba(0, 122, 255, 0.3) 40%,
    rgba(0, 122, 255, 0.3) 60%,
    transparent 60%,
    transparent 100%
  );
}

.resize-handle-se::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 8px;
  height: 8px;
  background: linear-gradient(
    -45deg,
    transparent 0%,
    transparent 30%,
    rgba(0, 122, 255, 0.6) 30%,
    rgba(0, 122, 255, 0.6) 70%,
    transparent 70%,
    transparent 100%
  );
}

/* 调整大小时的视觉反馈 */
.draggable-terminal:hover .resize-handle-e,
.draggable-terminal:hover .resize-handle-s {
  background: rgba(0, 122, 255, 0.2);
}

.draggable-terminal:hover .resize-handle-se {
  background: linear-gradient(
    -45deg,
    transparent 0%,
    transparent 40%,
    rgba(0, 122, 255, 0.5) 40%,
    rgba(0, 122, 255, 0.5) 60%,
    transparent 60%,
    transparent 100%
  );
}

/* 响应式终端调整 */
@media screen and (max-width: 768px) {
  .draggable-terminal {
    min-width: 280px;
    max-width: 95vw;
    max-height: 70vh;
  }

  .terminal-body {
    min-height: 120px;
  }

  /* 在小屏幕上隐藏调整大小手柄，避免误触 */
  .resize-handle-e,
  .resize-handle-s {
    display: none;
  }

  .resize-handle-se {
    width: 16px;
    height: 16px;
  }
}

/* 针对较低高度屏幕的终端优化 */
@media screen and (max-height: 700px) {
  .draggable-terminal {
    max-height: 60vh;
  }

  .terminal-body {
    min-height: 100px;
  }
}

.chat-fab {
  position: absolute;
  right: 32px;
  bottom: 32px;
  z-index: 1002;
  width: 56px;
  height: 56px;
  background: none;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px #07c16033;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s;
}
.chat-fab:hover {
  box-shadow: 0 8px 32px #07c16055;
}
.chat-float {
  position: fixed;
  z-index: 2000;
  width: 380px;
  height: 540px;
  background: #f7f7f7;
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18);
  border: 1.5px solid #07c160;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}
.chat-float-header {
  background: #ededed;
  color: #222;
  font-size: 17px;
  font-weight: 600;
  padding: 10px 18px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
}
.chat-float-close {
  font-size: 22px;
  color: #888;
  cursor: pointer;
  margin-left: 12px;
  font-weight: 700;
  transition: color 0.2s;
}
.chat-float-close:hover {
  color: #07c160;
}
@media (max-width: 500px) {
  .chat-float {
    width: 98vw;
    height: 60vh;
    left: 1vw !important;
    top: 20vh !important;
  }
  .chat-fab {
    right: 10px;
    bottom: 10px;
  }
}

/* VNC window styles */
.draggable-vnc {
  position: fixed;
  z-index: 1000;
  background: linear-gradient(135deg, rgba(8, 15, 39, 0.95) 0%, rgba(17, 23, 64, 0.95) 100%);
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  min-width: 600px;
  min-height: 400px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.draggable-vnc.active {
  z-index: 1001;
  box-shadow: 0 16px 56px rgba(0, 0, 0, 0.7);
}

.vnc-header {
  background: linear-gradient(90deg, rgba(24, 29, 40, 0.9) 0%, rgba(31, 38, 54, 0.9) 100%);
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}

.vnc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.vnc-controls {
  display: flex;
  gap: 8px;
}

.vnc-control {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.vnc-control.minimize {
  background: linear-gradient(135deg, #e6a23c 0%, #cf9236 100%);
  color: #ffffff;
}

.vnc-control.minimize:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.4);
}

.vnc-control.close {
  background: linear-gradient(135deg, #f56c6c 0%, #e85656 100%);
  color: #ffffff;
}

.vnc-control.close:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.4);
}

.vnc-body {
  flex: 1;
  overflow: hidden;
}

.vnc-body.minimized {
  display: none;
}
</style>
