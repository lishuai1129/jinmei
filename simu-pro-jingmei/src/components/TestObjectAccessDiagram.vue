<template>
  <el-dialog
    :model-value="modelValue"
    class="access-design-dialog"
    width="min(1180px, 94vw)"
    top="5vh"
    destroy-on-close
    append-to-body
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dialog-heading">
        <span class="heading-icon"><el-icon><Connection /></el-icon></span>
        <div>
          <h2>测试对象接入设计</h2>
          <p>连接测试管理与仿真运行的协议进程接入链路</p>
        </div>
      </div>
    </template>

    <div class="diagram-shell">
      <div class="protocol-strip">
        <span class="strip-label">被测协议</span>
        <span v-for="protocol in protocols" :key="protocol" class="protocol-pill">{{ protocol }}</span>
        <span class="protocol-more">更多协议类型</span>
      </div>

      <div class="flow-overview">
        <div class="flow-node management">
          <span class="node-index">01</span>
          <el-icon><SetUp /></el-icon>
          <div><strong>测试方案</strong><small>定义测试对象</small></div>
        </div>
        <span class="flow-arrow"><i></i></span>
        <div class="flow-node access">
          <span class="node-index">02</span>
          <el-icon><Pointer /></el-icon>
          <div><strong>对象接入</strong><small>配置 / 拖拽</small></div>
        </div>
        <span class="flow-arrow"><i></i></span>
        <div class="flow-node engine">
          <span class="node-index">03</span>
          <el-icon><Cpu /></el-icon>
          <div><strong>执行引擎</strong><small>进程全生命周期</small></div>
        </div>
        <span class="flow-arrow"><i></i></span>
        <div class="flow-node runtime">
          <span class="node-index">04</span>
          <el-icon><Monitor /></el-icon>
          <div><strong>隔离运行</strong><small>命名空间 / 容器</small></div>
        </div>
        <span class="flow-arrow"><i></i></span>
        <div class="flow-node result">
          <span class="node-index">05</span>
          <el-icon><DataAnalysis /></el-icon>
          <div><strong>测试判定</strong><small>指标采集与反馈</small></div>
        </div>
      </div>

      <div class="detail-grid">
        <section class="detail-card access-card">
          <div class="card-title">
            <span class="title-number">A</span>
            <div><h3>双通道接入</h3><p>完成协议模型与仿真节点绑定</p></div>
          </div>

          <div class="access-methods">
            <div class="method-box property-method">
              <span class="method-icon"><el-icon><Tickets /></el-icon></span>
              <div class="method-content">
                <strong>属性配置接入</strong>
                <p>在测试方案配置界面为节点指定运行属性</p>
                <div class="tag-list">
                  <span>协议类型</span><span>协议版本</span><span>启动参数</span>
                  <span>运行账户</span><span>环境变量</span>
                </div>
              </div>
            </div>

            <div class="merge-line"><span>自动校验</span><i></i></div>

            <div class="method-box drag-method">
              <span class="method-icon"><el-icon><Rank /></el-icon></span>
              <div class="method-content">
                <strong>拖拽接入</strong>
                <p>从协议模型库拖拽模型至场景中的目标节点</p>
                <div class="mini-binding">
                  <span class="library">协议模型库</span>
                  <b>→</b>
                  <span class="scene-node">场景节点</span>
                </div>
              </div>
            </div>
          </div>

          <div class="binding-result">
            <el-icon><CircleCheckFilled /></el-icon>
            <span><strong>统一绑定结果</strong> 协议模型 + 节点实例 + 运行配置</span>
          </div>
        </section>

        <section class="detail-card process-card">
          <div class="card-title">
            <span class="title-number">B</span>
            <div><h3>进程全生命周期管理</h3><p>测试执行引擎统一调度</p></div>
          </div>

          <div class="lifecycle">
            <div v-for="(item, index) in lifecycle" :key="item.title" class="life-item">
              <span class="life-icon"><el-icon><component :is="item.icon" /></el-icon></span>
              <div><strong>{{ item.title }}</strong><small>{{ item.desc }}</small></div>
              <span v-if="index < lifecycle.length - 1" class="life-line"></span>
            </div>
          </div>

          <div class="isolation-zone">
            <div class="isolation-heading">
              <span><el-icon><Lock /></el-icon></span>
              <div><strong>多进程隔离运行</strong><small>互不干扰 · 独立资源 · 故障隔离</small></div>
            </div>
            <div class="containers">
              <div><i class="status-dot"></i><strong>节点 A</strong><small>OSPF 进程</small><em>NET NS 01</em></div>
              <div><i class="status-dot"></i><strong>节点 B</strong><small>OLSR 进程</small><em>NET NS 02</em></div>
              <div><i class="status-dot"></i><strong>节点 C</strong><small>TDMA 进程</small><em>CONTAINER 03</em></div>
            </div>
          </div>
        </section>
      </div>

      <section class="mapping-card">
        <div class="mapping-title">
          <span><el-icon><MagicStick /></el-icon></span>
          <div><h3>按协议类型自动匹配测试资源</h3><p>测试用例模板、判定规则与采集指标随被测协议自动装配</p></div>
        </div>
        <div class="mapping-flow">
          <div class="type-group">
            <span>路由协议</span>
            <strong>OSPF · OLSR · AODV</strong>
          </div>
          <span class="mapping-arrow">→</span>
          <div class="metric-group">
            <span><el-icon><Document /></el-icon> 用例模板</span>
            <span><el-icon><CircleCheck /></el-icon> 判定规则</span>
            <span><el-icon><TrendCharts /></el-icon> 邻居表 · 收敛时间 · 更新开销</span>
          </div>
          <div class="mapping-divider"></div>
          <div class="type-group access-type">
            <span>接入协议</span>
            <strong>TDMA · CSMA</strong>
          </div>
          <span class="mapping-arrow">→</span>
          <div class="metric-group">
            <span><el-icon><Document /></el-icon> 用例模板</span>
            <span><el-icon><CircleCheck /></el-icon> 判定规则</span>
            <span><el-icon><TrendCharts /></el-icon> 时隙利用率 · 接入时延 · 碰撞率</span>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="dialog-footer-note">
        <span><i></i> 测试管理域</span>
        <span><i></i> 执行控制域</span>
        <span><i></i> 仿真运行域</span>
      </div>
      <el-button type="primary" @click="$emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  CircleCheck,
  CircleCheckFilled,
  Connection,
  Cpu,
  DataAnalysis,
  Document,
  Download,
  Lock,
  MagicStick,
  Monitor,
  Pointer,
  Rank,
  Refresh,
  SetUp,
  Tickets,
  TrendCharts,
  UploadFilled,
  VideoPlay
} from '@element-plus/icons-vue';

defineProps<{ modelValue: boolean }>();
defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();

const protocols = ['OSPF', 'OLSR', 'AODV', 'TDMA', 'CSMA'];
const lifecycle = [
  { title: '创建', desc: '创建隔离环境', icon: VideoPlay },
  { title: '下发', desc: '参数与环境变量', icon: UploadFilled },
  { title: '监控', desc: '状态与运行日志', icon: Refresh },
  { title: '回收', desc: '停止并释放资源', icon: Download }
];
</script>

<style scoped lang="scss">
:global(.access-design-dialog) {
  --diagram-blue: #3b82f6;
  --diagram-cyan: #06b6d4;
  --diagram-violet: #8b5cf6;
  --diagram-green: #10b981;
  --diagram-orange: #f59e0b;
  border-radius: 16px;
  overflow: hidden;
  background: #f7faff;
  box-shadow: 0 28px 80px rgba(4, 14, 42, 0.32);
}

:global(.access-design-dialog .el-dialog__header) {
  margin: 0;
  padding: 20px 24px;
  color: #fff;
  background: linear-gradient(120deg, #101d3b 0%, #172d5c 58%, #263c76 100%);
}

:global(.access-design-dialog .el-dialog__headerbtn) { top: 15px; right: 18px; }
:global(.access-design-dialog .el-dialog__close) { color: #cbd9ff; font-size: 22px; }
:global(.access-design-dialog .el-dialog__body) { padding: 0; }
:global(.access-design-dialog .el-dialog__footer) {
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #dce6f5;
  background: #fff;
}

.dialog-heading { display: flex; align-items: center; gap: 14px; }
.heading-icon {
  width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px;
  background: linear-gradient(135deg, #4c8dff, #8b5cf6); box-shadow: 0 8px 22px rgba(76, 141, 255, .35);
  font-size: 22px;
}
.dialog-heading h2 { margin: 0; font-size: 20px; letter-spacing: .5px; }
.dialog-heading p { margin: 5px 0 0; color: #adbee4; font-size: 12px; }

.diagram-shell {
  padding: 18px 22px 20px;
  max-height: 74vh;
  overflow: auto;
  color: #17233d;
  background-image: radial-gradient(#c8d5e9 0.8px, transparent 0.8px);
  background-size: 18px 18px;
}

.protocol-strip {
  display: flex; align-items: center; gap: 9px; padding: 10px 14px; border: 1px solid #dbe6f5;
  border-radius: 10px; background: rgba(255,255,255,.9); box-shadow: 0 5px 16px rgba(31, 55, 95, .06);
}
.strip-label { padding-right: 12px; border-right: 1px solid #d7e1f1; color: #5d6c85; font-size: 12px; font-weight: 700; }
.protocol-pill { padding: 4px 12px; border-radius: 14px; color: #2463c4; background: #eaf2ff; font: 700 11px/1.4 monospace; }
.protocol-more { margin-left: auto; color: #8390a7; font-size: 11px; }

.flow-overview { display: flex; align-items: stretch; justify-content: space-between; margin: 16px 0; }
.flow-node {
  position: relative; flex: 0 1 176px; min-width: 130px; display: flex; align-items: center; gap: 10px;
  padding: 13px 12px; border: 1px solid #dbe6f5; border-radius: 12px; background: #fff;
  box-shadow: 0 6px 18px rgba(34, 64, 112, .08);
}
.flow-node > .el-icon { flex: none; width: 32px; height: 32px; border-radius: 9px; color: #fff; background: var(--diagram-blue); }
.flow-node strong, .flow-node small { display: block; }
.flow-node strong { font-size: 13px; }
.flow-node small { margin-top: 3px; color: #76839a; font-size: 10px; }
.node-index { position: absolute; top: 5px; right: 7px; color: #c0cada; font: 700 9px monospace; }
.flow-node.access > .el-icon { background: var(--diagram-cyan); }
.flow-node.engine > .el-icon { background: var(--diagram-violet); }
.flow-node.runtime > .el-icon { background: var(--diagram-green); }
.flow-node.result > .el-icon { background: var(--diagram-orange); }
.flow-arrow { flex: 1; min-width: 18px; display: flex; align-items: center; }
.flow-arrow i { position: relative; width: 100%; height: 2px; background: #afbed6; }
.flow-arrow i::after { content: ''; position: absolute; right: 0; top: -3px; width: 6px; height: 6px; border-top: 2px solid #8da1bf; border-right: 2px solid #8da1bf; transform: rotate(45deg); }

.detail-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 16px; }
.detail-card, .mapping-card { border: 1px solid #dbe6f5; border-radius: 14px; background: rgba(255,255,255,.96); box-shadow: 0 8px 25px rgba(31, 55, 95, .07); }
.detail-card { padding: 16px; }
.card-title, .mapping-title { display: flex; align-items: center; gap: 10px; }
.card-title h3, .mapping-title h3 { margin: 0; color: #1b2c4c; font-size: 14px; }
.card-title p, .mapping-title p { margin: 3px 0 0; color: #8290a6; font-size: 10px; }
.title-number { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 8px; color: #fff; background: linear-gradient(135deg, #3282f6, #685ce8); font: 800 12px monospace; }

.access-methods { margin-top: 14px; }
.method-box { display: flex; gap: 12px; padding: 12px; border: 1px solid #d9e6f7; border-radius: 10px; background: #f8fbff; }
.method-icon { flex: none; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; color: #2871dc; background: #e1edff; font-size: 17px; }
.method-content { min-width: 0; flex: 1; }
.method-content strong { font-size: 12px; }
.method-content p { margin: 4px 0 7px; color: #728098; font-size: 10px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 5px; }
.tag-list span { padding: 3px 7px; color: #416082; border: 1px solid #d4e0ef; border-radius: 5px; background: #fff; font-size: 9px; }
.drag-method .method-icon { color: #008ca7; background: #ddf8fb; }
.mini-binding { display: flex; align-items: center; gap: 9px; }
.mini-binding span { padding: 4px 8px; border-radius: 5px; font-size: 9px; font-weight: 700; }
.library { color: #12718b; background: #dcf7fb; }
.scene-node { color: #4b43a5; background: #ebe9ff; }
.mini-binding b { color: #9caac0; }
.merge-line { height: 22px; display: flex; align-items: center; justify-content: center; color: #8b99ad; font-size: 9px; }
.merge-line i { width: 36px; height: 1px; margin-left: 7px; background: #c9d5e5; }
.binding-result { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 9px 11px; color: #177c64; border: 1px dashed #8dd6c1; border-radius: 8px; background: #effcf8; font-size: 10px; }
.binding-result .el-icon { font-size: 16px; }

.lifecycle { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 18px; }
.life-item { position: relative; z-index: 1; text-align: center; }
.life-icon { position: relative; z-index: 2; width: 32px; height: 32px; margin: 0 auto 7px; display: grid; place-items: center; border: 2px solid #fff; border-radius: 50%; color: #fff; background: linear-gradient(135deg, #6962e8, #895eea); box-shadow: 0 3px 10px rgba(105, 98, 232, .27); }
.life-item strong, .life-item small { display: block; }
.life-item strong { font-size: 10px; }
.life-item small { margin-top: 2px; color: #8a96aa; font-size: 8px; }
.life-line { position: absolute; z-index: -1; top: 15px; left: 65%; width: 80%; border-top: 1px dashed #a7b4ca; }
.isolation-zone { margin-top: 18px; padding: 12px; border: 1px solid #d8e6f0; border-radius: 10px; background: linear-gradient(135deg, #f3fbfa, #f7fbff); }
.isolation-heading { display: flex; align-items: center; gap: 9px; }
.isolation-heading > span { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 8px; color: #0b8b72; background: #dcf7ee; }
.isolation-heading strong, .isolation-heading small { display: block; }
.isolation-heading strong { font-size: 11px; }
.isolation-heading small { margin-top: 2px; color: #7c8c9e; font-size: 8px; }
.containers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 10px; }
.containers > div { position: relative; padding: 9px 7px; border: 1px solid #d6e4ec; border-radius: 7px; background: #fff; box-shadow: inset 0 2px 0 #6ed4bb; }
.containers strong, .containers small, .containers em { display: block; }
.containers strong { padding-left: 10px; font-size: 9px; }
.containers small { margin: 4px 0; color: #68788d; font-size: 8px; }
.containers em { color: #699484; font: normal 700 7px monospace; }
.status-dot { position: absolute; top: 11px; left: 7px; width: 5px; height: 5px; border-radius: 50%; background: #19bd91; box-shadow: 0 0 0 2px #d9f7ef; }

.mapping-card { margin-top: 16px; padding: 14px 16px; }
.mapping-title > span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; color: #c47a00; background: #fff1ce; }
.mapping-flow { display: grid; grid-template-columns: 135px 24px 1fr 1px 120px 24px 1fr; align-items: center; gap: 9px; margin-top: 13px; }
.type-group { padding: 9px 10px; border-left: 3px solid #4e8cf5; border-radius: 6px; background: #edf4ff; }
.type-group span, .type-group strong { display: block; }
.type-group span { color: #3573d4; font-size: 9px; font-weight: 700; }
.type-group strong { margin-top: 4px; color: #2d425f; font-size: 9px; }
.access-type { border-color: #0db693; background: #e9faf5; }
.access-type span { color: #07866f; }
.mapping-arrow { color: #93a2b8; text-align: center; font-size: 18px; }
.metric-group { display: flex; flex-wrap: wrap; gap: 6px; }
.metric-group span { display: flex; align-items: center; gap: 3px; padding: 5px 7px; color: #4a5d78; border: 1px solid #dce5f1; border-radius: 6px; background: #fafcff; font-size: 8px; }
.mapping-divider { align-self: stretch; background: #dde6f2; }

.dialog-footer-note { display: flex; gap: 18px; color: #738198; font-size: 10px; }
.dialog-footer-note span { display: flex; align-items: center; gap: 5px; }
.dialog-footer-note i { width: 7px; height: 7px; border-radius: 2px; background: #3b82f6; }
.dialog-footer-note span:nth-child(2) i { background: #8b5cf6; }
.dialog-footer-note span:nth-child(3) i { background: #10b981; }

@media (max-width: 900px) {
  .flow-overview { min-width: 820px; }
  .detail-grid { grid-template-columns: 1fr; }
  .mapping-flow { grid-template-columns: 120px 20px 1fr; }
  .mapping-divider { display: none; }
}
</style>
