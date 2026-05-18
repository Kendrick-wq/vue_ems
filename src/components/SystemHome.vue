<template>
  <div class="system-home-container">
    <!-- 头部 -->
    <header class="header">
      <div class="header-left">
        <h1>系统首页</h1>
      </div>
      <div class="header-right">
        <button class="settings-btn" @click="goToSettings">
          <span>⚙️</span>
          <span>设置</span>
        </button>
      </div>
    </header>

    <!-- 系统总览 -->
    <section class="system-overview">
      <div class="overview-card power">
        <div class="overview-icon">⚡</div>
        <div class="overview-info">
          <div class="overview-label">系统总功率</div>
          <div class="overview-value">
            <span>{{ systemOverview.totalPower }}</span>
            <span class="overview-unit">kW</span>
          </div>
        </div>
      </div>
      <div class="overview-card soc">
        <div class="overview-icon">🔋</div>
        <div class="overview-info">
          <div class="overview-label">系统平均SOC</div>
          <div class="overview-value">
            <span>{{ systemOverview.avgSoc }}</span>
            <span class="overview-unit">%</span>
          </div>
        </div>
      </div>
      <div class="overview-card cluster">
        <div class="overview-icon">📡</div>
        <div class="overview-info">
          <div class="overview-label">在线子阵</div>
          <div class="overview-value">
            <span>{{ systemOverview.onlineClusters }}</span>
          </div>
        </div>
      </div>
      <div class="overview-card warning">
        <div class="overview-icon">⚠️</div>
        <div class="overview-info">
          <div class="overview-label">总告警数</div>
          <div class="overview-value">
            <span>{{ systemOverview.totalWarnings }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 子阵卡片网格 -->
    <div class="section-title">
      <span class="section-line"></span>
      <span class="section-text">子阵列表</span>
      <span class="section-line"></span>
    </div>

    <div class="clusters-grid">
      <div
        v-for="cluster in clusterCards"
        :key="cluster.id"
        class="cluster-card"
        :class="'status-' + cluster.status"
        @click="goToCluster(cluster.id)"
      >
        <!-- 顶部状态色条 -->
        <div class="card-status-bar"></div>

        <!-- 卡片头部 -->
        <div class="cluster-header">
          <div class="cluster-title-group">
            <span class="cluster-id">子阵 {{ cluster.id.replace('subarray', '') }}</span>
            <span v-if="cluster.isLocal" class="local-badge">本机</span>
          </div>
          <span class="status-badge" :class="'status-' + cluster.status">
            <span class="status-icon">{{ cluster.statusInfo.icon }}</span>
            <span class="status-text">{{ cluster.statusInfo.text }}</span>
          </span>
        </div>

        <!-- 主机信息 -->
        <div v-if="cluster.masterInfo" class="master-info">
          <div class="master-info-row">
            <span class="master-label">主机</span>
            <span class="master-value" :title="cluster.masterInfo.name">{{ cluster.masterInfo.name }}</span>
          </div>
          <div class="master-info-row">
            <span class="master-label">IP</span>
            <span class="master-value">{{ cluster.masterInfo.ip }}</span>
          </div>
        </div>

        <!-- 卡片数据 -->
        <div class="cluster-stats">
          <div class="stat-item">
            <span class="stat-icon">⚡</span>
            <div class="stat-info">
              <span class="stat-label">总功率</span>
              <span class="stat-value">{{ cluster.power }} <small>kW</small></span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🔋</span>
            <div class="stat-info">
              <span class="stat-label">系统SOC</span>
              <span class="stat-value">{{ cluster.soc }} <small>%</small></span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">📡</span>
            <div class="stat-info">
              <span class="stat-label">在线从机</span>
              <span class="stat-value">{{ cluster.slaves }}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">⚠️</span>
            <div class="stat-info">
              <span class="stat-label">告警数</span>
              <span class="stat-value">{{ cluster.warnings }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="clusterCards.length === 0 && isSystemMaster" class="empty-state">
      <div class="empty-icon">📭</div>
      <p>等待子阵数据...</p>
      <button class="view-current-btn" @click="viewCurrentCluster">
        查看当前子阵
      </button>
    </div>

    <div v-if="clusterCards.length === 0 && !isSystemMaster" class="empty-state">
      <div class="empty-icon">📭</div>
      <p>暂无子阵数据</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalWebSocket } from '../composables/useGlobalWebSocket.js'

const router = useRouter()

// 使用全局WebSocket
const { systemData, startMasterHomeTimer, stopMasterHomeTimer } = useGlobalWebSocket()

// 状态映射
const statusMap = {
  'running': { text: '运行中', color: 'green', icon: '🟢' },
  'standby': { text: '待机', color: 'yellow', icon: '🟡' },
  'fault': { text: '故障', color: 'red', icon: '🔴' },
  'offline': { text: '离线', color: 'gray', icon: '⚫' }
}

// 是否系统主机
const isSystemMaster = computed(() => systemData.value.cluster?.is_system_master || false)

// 子阵卡片数据
const clusterCards = computed(() => {
  const cards = []

  if (isSystemMaster.value) {
    const localSubarrayId = systemData.value.cluster?.cluster_id || 'subarray1'

    cards.push({
      id: localSubarrayId,
      status: 'running',
      statusInfo: statusMap['running'],
      power: '--',
      soc: '--',
      slaves: `${systemData.value.cluster?.enabled_slave_count || 0}/${systemData.value.cluster?.slave_count || 0}`,
      warnings: 0,
      isLocal: true,
      masterInfo: {
        name: systemData.value.masterName || '--',
        ip: systemData.value.masterIp || '--',
        sn: systemData.value.masterSn || '--'
      }
    })

    if (systemData.value.clusters && systemData.value.clusters.length > 0) {
      systemData.value.clusters.forEach(cluster => {
        cards.push({
          id: cluster.cluster_id,
          status: cluster.status || 'offline',
          statusInfo: statusMap[cluster.status] || statusMap['offline'],
          power: cluster.total_power?.toFixed(1) || '--',
          soc: cluster.system_soc?.toFixed(1) || '--',
          slaves: `${cluster.online_slave_count || 0}/${cluster.slave_count || 0}`,
          warnings: cluster.warning_count || 0,
          isLocal: false,
          masterInfo: cluster.masterInfo || null
        })
      })
    }
  }

  return cards
})

// 系统总览数据
const systemOverview = computed(() => {
  const cards = clusterCards.value
  let totalPower = 0
  let validPowerCount = 0
  let totalSoc = 0
  let validSocCount = 0
  let totalWarnings = 0
  let onlineCount = 0

  cards.forEach(c => {
    if (c.power !== '--') {
      totalPower += parseFloat(c.power)
      validPowerCount++
    }
    if (c.soc !== '--') {
      totalSoc += parseFloat(c.soc)
      validSocCount++
    }
    totalWarnings += c.warnings || 0
    if (c.status === 'running' || c.status === 'standby') onlineCount++
  })

  return {
    totalPower: validPowerCount > 0 ? totalPower.toFixed(1) : '--',
    avgSoc: validSocCount > 0 ? (totalSoc / validSocCount).toFixed(1) : '--',
    onlineClusters: `${onlineCount}/${cards.length}`,
    totalWarnings: totalWarnings
  }
})

// 跳转到子阵详情
function goToCluster(clusterId) {
  router.push({
    name: 'SubarrayHome',
    params: { clusterId: String(clusterId) }
  })
}

// 查看当前子阵
function viewCurrentCluster() {
  const currentClusterId = systemData.value.cluster?.cluster_id || 'subarray1'
  router.push({
    name: 'SubarrayHome',
    params: { clusterId: String(currentClusterId) }
  })
}

// 跳转到设置页面
function goToSettings() {
  router.push({ name: 'RPCConfig' })
}

onMounted(() => {
  console.log('[SystemHome] 页面加载完成')
  startMasterHomeTimer()
})

onUnmounted(() => {
  stopMasterHomeTimer()
})
</script>

<style scoped>
.system-home-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: #f8fafc;
  min-height: 100vh;
  color: #334155;
  padding-bottom: 40px;
}

/* 头部 */
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 24px;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left h1 {
  color: #1e293b;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 10px;
}

.settings-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #475569;
}

/* ==================== 系统总览 ==================== */
.system-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px 0;
}

.overview-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.overview-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 0 0 12px 12px;
}

.overview-card.power::after { background: linear-gradient(90deg, #10b981, #34d399); }
.overview-card.soc::after { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.overview-card.cluster::after { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.overview-card.warning::after { background: linear-gradient(90deg, #ef4444, #f87171); }

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.overview-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.overview-card.power .overview-icon { background: rgba(16, 185, 129, 0.1); }
.overview-card.soc .overview-icon { background: rgba(245, 158, 11, 0.1); }
.overview-card.cluster .overview-icon { background: rgba(59, 130, 246, 0.1); }
.overview-card.warning .overview-icon { background: rgba(239, 68, 68, 0.1); }

.overview-info { flex: 1; }

.overview-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
  font-weight: 500;
}

.overview-value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.overview-unit {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
  margin-left: 2px;
}

/* ==================== 分割线标题 ==================== */
.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: 1400px;
  margin: 24px auto 0;
  padding: 0 24px;
}

.section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
}

.section-text {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 1px;
}

/* ==================== 子阵卡片网格 ==================== */
.clusters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  max-width: 1400px;
  margin: 20px auto 0;
  padding: 0 24px;
}

/* 子阵卡片 */
.cluster-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  position: relative;
}

.cluster-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

/* 顶部状态色条 */
.card-status-bar {
  height: 4px;
  width: 100%;
}

.status-running .card-status-bar { background: linear-gradient(90deg, #10b981, #34d399); }
.status-standby .card-status-bar { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.status-fault .card-status-bar { background: linear-gradient(90deg, #ef4444, #f87171); }
.status-offline .card-status-bar { background: linear-gradient(90deg, #94a3b8, #cbd5e1); }

/* 卡片头部 */
.cluster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 12px;
}

.cluster-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cluster-id {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.local-badge {
  padding: 2px 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 10px;
  letter-spacing: 0.5px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-running { background: #ecfdf5; color: #059669; }
.status-badge.status-standby { background: #fffbeb; color: #d97706; }
.status-badge.status-fault { background: #fef2f2; color: #dc2626; }
.status-badge.status-offline { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

.status-icon { font-size: 12px; }
.status-text { font-size: 12px; }

/* 主机信息 */
.master-info {
  background: #f8fafc;
  border-radius: 10px;
  padding: 10px 14px;
  margin: 0 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.master-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.master-label {
  color: #64748b;
  font-weight: 500;
  flex-shrink: 0;
}

.master-value {
  color: #334155;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

/* 卡片数据 - 2x2 网格 */
.cluster-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 20px 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
  transition: background 0.2s;
}

.stat-item:hover {
  background: #f1f5f9;
}

.stat-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.stat-value small {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 20px;
}

.view-current-btn {
  padding: 10px 24px;
  background: #fff;
  color: #475569;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-current-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* ==================== 响应式 ==================== */
@media (max-width: 1024px) {
  .system-overview { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .system-overview { grid-template-columns: 1fr; }
  .clusters-grid { grid-template-columns: 1fr; }
  .header-left h1 { font-size: 18px; }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .clusters-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1201px) {
  .clusters-grid { grid-template-columns: repeat(3, 1fr); }
}
</style>
