<template>
  <div class="ems-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <button class="back-btn" @click="goBack" title="返回系统首页">
          ←
        </button>
        <div class="logo">EMS</div>
      </div>
      <h1 class="header-title">子阵 {{ clusterId }} 首页</h1>
      <div class="header-right">
        <div class="cluster-tag">
          <span class="cluster-name">{{ clusterInfo.system_id }}/{{ clusterInfo.cluster_id }}</span>
        </div>
        <!-- RPC设置按钮 -->
        <button class="settings-btn" @click="goToRpcConfig" title="RPC设置">
          🔧
        </button>
      </div>
    </header>

    <!-- 概览卡片 -->
    <section class="overview">
      <div class="overview-card power">
        <div class="overview-icon">⚡</div>
        <div class="overview-info">
          <div class="overview-label">总功率</div>
          <div class="overview-value">
            <span>{{ formatNumber(overview.totalPower) }}</span>
            <span class="overview-unit">kW</span>
          </div>
        </div>
      </div>
      <div class="overview-card charge">
        <div class="overview-icon">📥</div>
        <div class="overview-info">
          <div class="overview-label">今日充电量</div>
          <div class="overview-value">
            <span>{{ formatNumber(overview.todayCharge) }}</span>
            <span class="overview-unit">kWh</span>
          </div>
        </div>
      </div>
      <div class="overview-card soc">
        <div class="overview-icon">🔋</div>
        <div class="overview-info">
          <div class="overview-label">系统SOC</div>
          <div class="overview-value">
            <span>{{ formatNumber(overview.systemSoc) }}</span>
            <span class="overview-unit">%</span>
          </div>
        </div>
      </div>
      <div class="overview-card discharge">
        <div class="overview-icon">📤</div>
        <div class="overview-info">
          <div class="overview-label">今日放电量</div>
          <div class="overview-value">
            <span>{{ formatNumber(overview.todayDischarge) }}</span>
            <span class="overview-unit">kWh</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 主拓扑区域 -->
    <section class="topology-main">
      <!-- 紧凑的标题和标签 -->
      <div class="topology-header">
        <h2 class="topology-title">并机拓扑结构</h2>
        <div class="tab-container">
          <button 
            class="tab-btn" 
            :class="{ active: currentTab === 'card' }"
            @click="switchTab('card')"
          >
            卡片
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: currentTab === 'topology' }"
            @click="switchTab('topology')"
          >
            拓扑
          </button>
        </div>
      </div>
      
      <!-- 视图容器 -->
      <div class="view-container">
        <!-- 卡片视图 -->
        <div v-show="currentTab === 'card'" class="view-content">
          <div class="parallel-topology">
            <!-- AC母线 -->
            <div class="ac-bus-container">
              <div class="ac-bus-label">交流母线</div>
              <div class="ac-bus"></div>
            </div>

            <!-- 设备列 -->
            <div class="devices-row">
              <!-- 主机卡片 -->
              <DeviceCard 
                v-if="masterDevice"
                :device="masterDevice"
                type="master"
                :name="systemConfig.masterName"
                @click="goToDetail(masterDevice)"
              />
              
              <!-- 从机卡片 - 根据配置动态生成 -->
              <DeviceCard 
                v-for="slave in configuredSlaves"
                :key="slave.id"
                :device="getSlaveData(slave.id)"
                :type="'slave'"
                :name="slave.name"
                :configured-id="slave.id"
                @click="goToDetail(getSlaveData(slave.id))"
              />
            </div>


          </div>
        </div>
        
        <!-- 拓扑视图 -->
        <div v-show="currentTab === 'topology'" class="view-content">
          <TopologyDiagram 
            :devices="allDevices" 
            :config="systemConfig"
            :key="systemConfig.slaves.length"
            @device-click="goToDetail"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalWebSocket } from '../composables/useGlobalWebSocket.js'
import DeviceCard from './DeviceCard.vue'
import TopologyDiagram from './TopologyDiagram.vue'

// 接收 clusterId 参数
const props = defineProps({
  clusterId: {
    type: String,
    default: '1'
  }
})

const router = useRouter()

// 使用全局WebSocket
const {
  systemData,
  onMessage,
  sendMessage,
  wsStatus,
  startMasterHomeTimer,
  stopMasterHomeTimer
} = useGlobalWebSocket()

// 是否系统主机
const isSystemMaster = computed(() => systemData.value.cluster?.is_system_master || false)

// 返回子阵列表
function goBack() {
  router.push({ name: 'SystemHome' })
}

// ============ 响应式数据 ============
const currentTab = ref('card')

// 本地系统状态
const systemStatusText = computed(() => systemData.value.running ? '系统正常运行' : '系统停止')
const systemRunning = computed(() => systemData.value.running)

// 系统配置（从全局数据同步）
const systemConfig = computed(() => ({
  clusterName: systemData.value.clusterName,
  masterName: systemData.value.masterName,
  masterIp: systemData.value.masterIp,
  masterSn: systemData.value.masterSn,
  slaves: systemData.value.slaves,
  slaveStatusMap: systemData.value.slaveStatusMap
}))

// 显示的集群名称（将 cluster1 转换为 集群1）
const displayClusterName = computed(() => {
  const name = systemConfig.value.clusterName
  if (!name) return '--'
  // 将 cluster + 数字 转换为 集群 + 数字
  return name.replace(/cluster(\d+)/i, '集群$1')
})

// 集群信息 - 从全局数据获取
const clusterInfo = computed(() => ({
  system_id: systemData.value.cluster?.system_id || '--',
  cluster_id: systemData.value.cluster?.cluster_id || '--',
  is_system_master: systemData.value.cluster?.is_system_master || false
}))

// 概览数据
const overview = ref({
  totalPower: 0,
  todayCharge: 0,
  systemSoc: 0,
  todayDischarge: 0
})

// 统计
const summary = ref({
  onlineCount: 0,
  warningCount: 0,
  offlineCount: 0
})

// 设备数据（从 /api/bcmu/EMS/homePage/get 获取）
const devicesData = ref({
  master: null,
  slaves: {}  // {slaveId: deviceData}
})

// 消息处理取消函数
let unsubscribeMessage = null

// ============ 计算属性 ============

// 所有设备（用于拓扑图）
const allDevices = computed(() => {
  const list = []
  if (devicesData.value.master) {
    list.push(devicesData.value.master)
  }
  // 按配置的从机顺序添加
  systemConfig.value.slaves.forEach(slave => {
    const slaveData = devicesData.value.slaves[slave.id]
    if (slaveData) {
      list.push(slaveData)
    }
  })
  return list
})

// 主机设备 - 始终显示（基于配置，即使没有实时数据）
const masterDevice = computed(() => {
  // 如果有实时数据，优先使用
  if (devicesData.value.master) {
    // 确保 IP 和 SN 存在
    const master = devicesData.value.master
    if (!master.ip_address && systemConfig.value.masterIp) {
      master.ip_address = systemConfig.value.masterIp
    }
    if (!master.sn && systemConfig.value.masterSn) {
      master.sn = systemConfig.value.masterSn
    }
    return master
  }
  // 否则返回基于配置的基础对象，确保主机卡片始终显示
  if (systemConfig.value.masterName) {
    return {
      role: 'master',
      device_name: systemConfig.value.masterName,
      ip_address: systemConfig.value.masterIp || '',
      sn: systemConfig.value.masterSn || '',
      status: 'online',
      slave_id: 0,
      pcs: {},
      bms: {}
    }
  }
  return null
})

// 根据配置生成的从机列表（只包含 enabled=true 的）
const configuredSlaves = computed(() => {
  return systemConfig.value.slaves.filter(s => s.enabled)
})

// 在线从机列表
const onlineSlavesList = computed(() => {
  return configuredSlaves.value.filter(slave => {
    const status = systemConfig.value.slaveStatusMap[slave.id]
    return status?.online === true
  })
})

// ============ 方法 ============

// 切换标签
function switchTab(tab) {
  currentTab.value = tab
}

// 格式化数字
function formatNumber(value) {
  if (value === undefined || value === null) return '--'
  return value.toFixed(1)
}

// 获取从机数据（根据配置ID）
function getSlaveData(slaveId) {
  // 从 devicesData 中获取对应从机的数据
  const data = devicesData.value.slaves[slaveId]
  // 从 slaveStatusMap 获取 IP 和状态
  const statusInfo = systemConfig.value.slaveStatusMap[slaveId] || {}
  
  if (data) {
    // 合并 IP 地址和 SN
    return {
      ...data,
      ip_address: statusInfo.ip || data.ip_address || '',
      sn: statusInfo.sn || data.sn || ''
    }
  }
  
  // 如果没有数据，返回一个默认结构
  return {
    slave_id: slaveId,
    role: 'slave',
    device_name: systemConfig.value.slaves.find(s => s.id === slaveId)?.name || `从机#${slaveId}`,
    status: statusInfo.online ? 'online' : 'offline',
    ip_address: statusInfo.ip || '',
    sn: statusInfo.sn || '',
    pcs: {},
    bms: {}
  }
}

// 保存当前状态到 sessionStorage
function saveState() {
  const state = {
    systemConfig: systemConfig.value,
    devicesData: devicesData.value,
    currentTab: currentTab.value,
    overview: overview.value,
    summary: summary.value,
    systemRunning: systemRunning.value,
    systemStatusText: systemStatusText.value,
    timestamp: Date.now()
  }
  sessionStorage.setItem('ems_page_state', JSON.stringify(state))
  console.log('[State] 页面状态已保存')
}

// 从 sessionStorage 恢复状态
function restoreState() {
  const saved = sessionStorage.getItem('ems_page_state')
  if (!saved) return false
  
  try {
    const state = JSON.parse(saved)
    // 检查状态是否过期（5分钟内有效）
    if (Date.now() - state.timestamp > 5 * 60 * 1000) {
      sessionStorage.removeItem('ems_page_state')
      return false
    }
    
    // 恢复状态
    if (state.systemConfig) systemConfig.value = state.systemConfig
    if (state.devicesData) devicesData.value = state.devicesData
    if (state.currentTab) currentTab.value = state.currentTab
    if (state.overview) overview.value = state.overview
    if (state.summary) summary.value = state.summary
    if (state.systemRunning !== undefined) systemRunning.value = state.systemRunning
    if (state.systemStatusText) systemStatusText.value = state.systemStatusText
    
    console.log('[State] 页面状态已恢复')
    return true
  } catch (e) {
    console.error('[State] 恢复状态失败:', e)
    return false
  }
}

// 清除保存的状态
function clearSavedState() {
  sessionStorage.removeItem('ems_page_state')
}

// 查询从机设备配置
function querySlaveDeviceConfig(slaveId) {
  return new Promise((resolve, reject) => {
    if (wsStatus.value !== 'connected') {
      reject(new Error('WebSocket未连接'))
      return
    }
    
    const request = {
      topic: '/api/ems/device_config/get',
      data: { slave_id: slaveId },
      data_type: 'binary',
      message_id: 'myid1234',
      timestamp: new Date().toISOString()
    }
    
    console.log('[WebSocket] 查询从机设备配置:', request)
    
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('查询超时'))
    }, 3000)
    
    const unsubscribe = onMessage((response) => {
      if (response.topic === '/api/ems/device_config/get/response' || 
          response.topic?.includes('device_config')) {
        clearTimeout(timeout)
        unsubscribe()
        
        if (response.data?.ret === true && response.data?.result) {
          console.log('[DeviceConfig] 获取到从机设备配置:', response.data.result)
          resolve(response.data.result)
        } else {
          reject(new Error(response.data?.error || '获取设备配置失败'))
        }
      }
    })
    
    sendMessage(request)
  })
}

// 解析消息辅助函数
async function parseMessage(data) {
  if (data instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsText(data)
    })
  }
  return data
}

// 查询从机拓扑信息
function querySlaveTopology(slaveId) {
  return new Promise((resolve, reject) => {
    if (wsStatus.value !== 'connected') {
      reject(new Error('WebSocket未连接'))
      return
    }
    
    const request = {
      topic: 'GetEmsHomeCmd',
      data: { slave_id: slaveId },
      data_type: 'binary',
      message_id: 'topology_' + slaveId,
      timestamp: new Date().toISOString()
    }
    
    console.log('[WebSocket] 查询从机拓扑:', request)
    
    // 设置超时
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('查询拓扑超时'))
    }, 5000)
    
    // 注册临时消息处理器
    const unsubscribe = onMessage(async (response) => {
      if (response.topic === 'GetEmsHomeCmd/response' || 
          response.topic?.includes('GetEmsHomeCmd')) {
        clearTimeout(timeout)
        unsubscribe()
        
        if (response.data && response.data.connection && response.data.devices) {
          console.log('[Topology] 获取到从机拓扑:', response.data)
          resolve(response.data)
        } else {
          reject(new Error(response.data?.error || '获取拓扑数据失败'))
        }
      }
    })
    
    sendMessage(request)
  })
}

// 查询 BCMU 数据并跳转到详情页
function queryBCMUDataAndNavigate(deviceId) {
  if (wsStatus.value !== 'connected') {
    alert('WebSocket 未连接')
    return
  }
  
  sessionStorage.setItem('ems_last_tab', currentTab.value)
  
  const loadingDiv = document.createElement('div')
  loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 30px;background:rgba(0,0,0,0.7);color:white;border-radius:8px;z-index:9999;font-size:14px;'
  loadingDiv.textContent = '正在查询 BCMU 数据...'
  document.body.appendChild(loadingDiv)
  
  const request = {
    topic: '/api/ems/bcmu_data/get',
    data: { slave_id: parseInt(deviceId) },
    data_type: 'binary',
    message_id: 'bcmu_' + deviceId,
    timestamp: new Date().toISOString()
  }
  
  console.log('[WebSocket] 查询 BCMU 数据:', request)
  
  const timeout = setTimeout(() => {
    document.body.removeChild(loadingDiv)
    alert('查询 BCMU 数据超时')
  }, 5000)
  
  const unsubscribe = onMessage((response) => {
    if (response.topic === '/api/ems/bcmu_data/get/response' || 
        response.topic?.includes('bcmu_data')) {
      clearTimeout(timeout)
      unsubscribe()
      document.body.removeChild(loadingDiv)
      
      if (response.data?.ret === true && response.data?.bcmu) {
        sessionStorage.setItem(`bcmu_data_${deviceId}`, JSON.stringify(response.data.bcmu))
        router.push({ name: 'BCMUDetail', params: { id: String(deviceId) } })
      } else {
        alert('获取 BCMU 数据失败: ' + (response.data?.error || '未知错误'))
      }
    }
  })
  
  sendMessage(request)
}

// 查询 PCS 数据并跳转到详情页
function queryPCSDataAndNavigate(deviceId) {
  if (wsStatus.value !== 'connected') {
    alert('WebSocket 未连接')
    return
  }
  
  sessionStorage.setItem('ems_last_tab', currentTab.value)
  
  const loadingDiv = document.createElement('div')
  loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 30px;background:rgba(0,0,0,0.7);color:white;border-radius:8px;z-index:9999;font-size:14px;'
  loadingDiv.textContent = '正在查询 PCS 数据...'
  document.body.appendChild(loadingDiv)
  
  const request = {
    topic: '/api/ems/pcs_data/get',
    data: { slave_id: parseInt(deviceId) },
    data_type: 'binary',
    message_id: 'pcs_' + deviceId,
    timestamp: new Date().toISOString()
  }
  
  console.log('[WebSocket] 查询 PCS 数据:', request)
  
  const timeout = setTimeout(() => {
    document.body.removeChild(loadingDiv)
    alert('查询 PCS 数据超时')
  }, 5000)
  
  const unsubscribe = onMessage((response) => {
    if (response.topic === '/api/ems/pcs_data/get/response' || 
        response.topic?.includes('pcs_data')) {
      clearTimeout(timeout)
      unsubscribe()
      document.body.removeChild(loadingDiv)
      
      if (response.data?.ret === true && response.data?.pcs) {
        sessionStorage.setItem(`pcs_data_${deviceId}`, JSON.stringify(response.data.pcs))
        router.push({ name: 'PCSDetail', params: { id: String(deviceId) } })
      } else {
        alert('获取 PCS 数据失败: ' + (response.data?.error || '未知错误'))
      }
    }
  })
  
  sendMessage(request)
}

// 查询电表数据并跳转到详情页
function queryMeterDataAndNavigate(deviceId) {
  if (wsStatus.value !== 'connected') {
    alert('WebSocket 未连接')
    return
  }
  
  sessionStorage.setItem('ems_last_tab', currentTab.value)
  
  const loadingDiv = document.createElement('div')
  loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 30px;background:rgba(0,0,0,0.7);color:white;border-radius:8px;z-index:9999;font-size:14px;'
  loadingDiv.textContent = '正在查询电表数据...'
  document.body.appendChild(loadingDiv)
  
  const request = {
    topic: '/api/ems/electric_meter_data/get',
    data: { slave_id: parseInt(deviceId) },
    data_type: 'binary',
    message_id: 'meter_' + deviceId,
    timestamp: new Date().toISOString()
  }
  
  console.log('[WebSocket] 查询电表数据:', request)
  
  const timeout = setTimeout(() => {
    document.body.removeChild(loadingDiv)
    alert('查询电表数据超时')
  }, 5000)
  
  const unsubscribe = onMessage((response) => {
    if (response.topic === '/api/ems/electric_meter_data/get/response' || 
        response.topic?.includes('electric_meter_data')) {
      clearTimeout(timeout)
      unsubscribe()
      document.body.removeChild(loadingDiv)
      
      if (response.data?.ret === true && response.data?.electric_meter) {
        sessionStorage.setItem(`meter_data_${deviceId}`, JSON.stringify(response.data.electric_meter))
        router.push({ name: 'ElectricMeterDetail', params: { id: String(deviceId) } })
      } else {
        alert('获取电表数据失败: ' + (response.data?.error || '未知错误'))
      }
    }
  })
  
  sendMessage(request)
}

// 显示设备配置预览对话框
function showDeviceConfigDialog(slaveId, slaveName, deviceConfig, device, onConfirm) {
  // 创建设备类型映射
  const typeNames = {
    meter: '⚡ 电表',
    pcs: '🔌 PCS',
    bcmu: '🔋 电池(BCMU)',
    io: '🔌 IO模块',
    env: '🌡️ 环境监控',
    acmeter: '⚡ 交流电表',
    dcmeter: '⚡ 直流电表'
  }
  
  // 获取设备类型列表
  const deviceTypes = Object.keys(deviceConfig).filter(type => {
    const devices = deviceConfig[type]
    return Array.isArray(devices) && devices.length > 0
  })
  
  // 创建设备列表HTML
  let devicesHtml = ''
  if (deviceTypes.length === 0) {
    devicesHtml = '<div style="color:#94a3b8;padding:20px;text-align:center;">未配置任何设备</div>'
  } else {
    devicesHtml = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">' +
      deviceTypes.map(type => 
        `<div style="padding:8px 12px;background:#f1f5f9;border-radius:6px;font-size:13px;color:#334155;">${typeNames[type] || type}</div>`
      ).join('') +
      '</div>'
  }
  
  // 创建对话框
  const dialog = document.createElement('div')
  dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;'
  
  dialog.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 16px 0;font-size:18px;color:#1e293b;">📡 从机设备配置</h3>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">
        <div style="font-size:14px;color:#64748b;margin-bottom:4px;">从机名称</div>
        <div style="font-size:16px;font-weight:600;color:#1e293b;">${slaveName}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">ID: ${slaveId} | IP: ${device.ip_address || '--'} | SN: ${device.sn || '--'}</div>
      </div>
      <div style="margin-bottom:20px;">
        <div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:8px;">已配置设备 (${deviceTypes.length}个)</div>
        ${devicesHtml}
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="btnCancel" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;font-size:14px;cursor:pointer;color:#64748b;">取消</button>
        <button id="btnConfirm" style="padding:10px 20px;border:none;background:#3b82f6;color:white;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">进入详情页</button>
      </div>
    </div>
  `
  
  document.body.appendChild(dialog)
  
  // 绑定按钮事件
  dialog.querySelector('#btnCancel').onclick = () => {
    document.body.removeChild(dialog)
  }
  
  dialog.querySelector('#btnConfirm').onclick = () => {
    document.body.removeChild(dialog)
    onConfirm()
  }
  
  // 点击背景关闭
  dialog.onclick = (e) => {
    if (e.target === dialog) {
      document.body.removeChild(dialog)
    }
  }
}

// 跳转到设备详情页
async function goToDetail(clickData) {
  // 处理拓扑图点击事件（新格式）
  if (clickData && clickData.type) {
    const { type, device, deviceId, isMaster } = clickData
    const suffix = isMaster ? '-M' : (deviceId || '')
    const name = isMaster ? `主机${type.toUpperCase()}` : `${type.toUpperCase()}${deviceId}`
    
    const params = new URLSearchParams({
      type: type,
      id: String(deviceId || '0'),
      name: name,
      isMaster: String(isMaster || false)
    })
    
    // 根据类型查询数据并跳转
    if (type.toLowerCase() === 'bcmu') {
      queryBCMUDataAndNavigate(deviceId || '0')
    } else if (type.toLowerCase() === 'pcs') {
      queryPCSDataAndNavigate(deviceId || '0')
    } else if (type.toLowerCase() === 'meter') {
      queryMeterDataAndNavigate(deviceId || '0')
    }
    return
  }
  
  // 处理旧格式（从机卡片点击）
  const device = clickData
  if (!device || device.role === 'master') return
  
  const slaveId = device.slave_id
  const slaveName = device.device_name || '从机#' + slaveId
  
  // 显示加载提示
  const loadingDiv = document.createElement('div')
  loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 30px;background:rgba(0,0,0,0.7);color:white;border-radius:8px;z-index:9999;font-size:14px;'
  loadingDiv.textContent = '正在查询从机信息...'
  document.body.appendChild(loadingDiv)
  
  try {
    // 查询从机拓扑信息（包含设备配置和拓扑）
    const topologyData = await querySlaveTopology(slaveId)
    
    // 移除加载提示
    document.body.removeChild(loadingDiv)
    
    // 保存当前 tab 状态
    sessionStorage.setItem('ems_last_tab', currentTab.value)
    // 保存拓扑信息
    sessionStorage.setItem(`slave_${slaveId}_topology`, JSON.stringify(topologyData))
    
    // 使用 router 跳转到从机首页
    router.push({
      name: 'SlaveHome',
      params: { id: String(slaveId) },
      query: {
        name: slaveName,
        ip: device.ip_address || '',
        sn: device.sn || '',
        clusterId: props.clusterId
      }
    })
  } catch (error) {
    console.error('[goToDetail] 查询从机信息失败:', error)
    document.body.removeChild(loadingDiv)
    
    // 查询失败，询问是否继续跳转
    if (confirm(`查询从机信息失败: ${error.message}\n是否继续跳转？`)) {
      // 保存当前 tab 状态
      sessionStorage.setItem('ems_last_tab', currentTab.value)
      
      // 使用 router 跳转到从机首页
      router.push({
        name: 'SlaveHome',
        params: { id: String(slaveId) },
        query: {
          name: slaveName,
          ip: device.ip_address || '',
          sn: device.sn || ''
        }
      })
    }
  }
}

// ============ RPC配置相关 ============

// 跳转到RPC配置页面
function goToRpcConfig() {
  router.push({ name: 'RPCConfig' })
}

// ============ 生命周期 ============

onMounted(() => {
  console.log('[EMS] 页面加载完成...')

  // 尝试恢复之前保存的 tab 状态（从详情页返回时）
  const lastTab = sessionStorage.getItem('ems_last_tab')
  if (lastTab) {
    currentTab.value = lastTab
    sessionStorage.removeItem('ems_last_tab')
  }

  // 启动首页定时查询 (deviceStatus + masterHome)
  startMasterHomeTimer(props.clusterId)

  // 注册消息处理器以更新设备数据
  unsubscribeMessage = onMessage((response) => {
    if (response.topic === '/api/ems/master_home/get/response' ||
        response.topic?.includes('master_home')) {
      if (response.data?.ret === true) {
        processHomePageData(response.data)
      }
    }
  })
})

onUnmounted(() => {
  // 停止首页定时查询
  stopMasterHomeTimer()
  
  // 取消消息订阅
  if (unsubscribeMessage) {
    unsubscribeMessage()
  }
})

// 处理首页数据
function processHomePageData(data) {
  // 更新设备数据（新的格式：device_info 数组）
  if (data.device_info && Array.isArray(data.device_info)) {
    data.device_info.forEach(device => {
      const slaveId = device.slave_id
      
      if (slaveId === 0) {
        // 主机数据 (slave_id = 0)
        devicesData.value.master = {
          ...devicesData.value.master,
          pcs: device.pcs || {},
          bms: device.bcmu || {},
          device_name: systemConfig.value.masterName || '主机',
          status: 'online',
          slave_id: 0
        }
      } else {
        // 从机数据
        const statusInfo = systemConfig.value.slaveStatusMap[slaveId] || {}
        devicesData.value.slaves[slaveId] = {
          ...devicesData.value.slaves[slaveId],
          slave_id: slaveId,
          device_name: systemConfig.value.slaves.find(s => s.id === slaveId)?.name || `从机#${slaveId}`,
          pcs: device.pcs || {},
          bms: device.bcmu || {},
          status: statusInfo.online ? 'online' : 'offline'
        }
      }
    })
  }
}
</script>

<style scoped>
/* 容器 */
.ems-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
  min-height: calc(100vh - 40px);
  color: #334155;
  overflow: hidden;
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 16px;
  height: 48px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #64748b;
}

.back-btn:hover {
  border-color: #10b981;
  color: #10b981;
  background: #f0fdf4;
}

.logo {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: white;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  text-align: center;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.cluster-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.cluster-name {
  font-weight: 600;
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* 设置按钮 */
.settings-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: rotate(30deg);
}

/* 概览卡片 */
.overview {
  padding: 8px 12px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.overview-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
}

.overview-card.system-id::before { background: linear-gradient(180deg, #06b6d4, #0891b2); }
.overview-card.cluster-id::before { background: linear-gradient(180deg, #ec4899, #db2777); }
.overview-card.power::before { background: linear-gradient(180deg, #10b981, #059669); }
.overview-card.charge::before { background: linear-gradient(180deg, #3b82f6, #2563eb); }
.overview-card.soc::before { background: linear-gradient(180deg, #f59e0b, #d97706); }
.overview-card.discharge::before { background: linear-gradient(180deg, #8b5cf6, #7c3aed); }

.overview-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: #f8fafc;
}

.overview-card.system-id .overview-icon { background: rgba(6, 182, 212, 0.1); }
.overview-card.cluster-id .overview-icon { background: rgba(236, 72, 153, 0.1); }
.overview-card.power .overview-icon { background: rgba(16, 185, 129, 0.1); }
.overview-card.charge .overview-icon { background: rgba(59, 130, 246, 0.1); }
.overview-card.soc .overview-icon { background: rgba(245, 158, 11, 0.1); }
.overview-card.discharge .overview-icon { background: rgba(139, 92, 246, 0.1); }

.overview-info { flex: 1; }

.overview-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 2px;
}

.overview-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.overview-card.system-id .overview-value { color: #0891b2; }
.overview-card.cluster-id .overview-value { color: #db2777; }
.overview-card.power .overview-value { color: #059669; }
.overview-card.charge .overview-value { color: #2563eb; }
.overview-card.soc .overview-value { color: #d97706; }
.overview-card.discharge .overview-value { color: #7c3aed; }

.overview-unit {
  font-size: 13px;
  color: #64748b;
  font-weight: 400;
}

/* 主拓扑区域 */
.topology-main {
  flex: 1;
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* 紧凑的标题和标签栏 */
.topology-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 4px 0;
}

.topology-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}



.topology-title::before {
  content: '';
  width: 3px;
  height: 14px;
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
  border-radius: 2px;
}

/* 标签页 - 更紧凑 */
.tab-container {
  display: flex;
  gap: 2px;
  background: #f1f5f9;
  padding: 2px;
  border-radius: 6px;
  width: fit-content;
}

.tab-btn {
  padding: 4px 12px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover { color: #334155; }

.tab-btn.active {
  background: #ffffff;
  color: #059669;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 视图容器 */
.view-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.view-content { 
  height: 100%;
  overflow: hidden;
}

/* 卡片视图 */
.parallel-topology {
  height: 100%;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: auto;
}

.ac-bus-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12px;
}

.ac-bus-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 500;
}

.ac-bus {
  width: 90%;
  height: 6px;
  background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
  border-radius: 3px;
  position: relative;
  box-shadow: 0 1px 4px rgba(245, 158, 11, 0.3);
}

.ac-bus::before,
.ac-bus::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background: #d97706;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}

.ac-bus::before { left: -6px; }
.ac-bus::after { right: -6px; }

.devices-row {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 0 12px;
  flex-wrap: wrap;
}

/* 图例 - 简化版 */
.topology-legend {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.legend-summary {
  font-size: 13px;
  color: #475569;
}

.legend-summary strong {
  color: #10b981;
  font-size: 15px;
}

.online-slaves-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.online-label {
  font-size: 12px;
  color: #64748b;
}

.online-slave-tag {
  display: inline-block;
  padding: 2px 10px;
  background: #d1fae5;
  color: #065f46;
  font-size: 12px;
  border-radius: 12px;
  border: 1px solid #10b981;
}

.offline-text {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}

.status-dot-inline {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot-inline.online { background: #10b981; }
.status-dot-inline.offline { background: #ef4444; }
.status-dot-inline.warning { background: #f59e0b; }

/* 设置对话框样式在 App.vue 中定义 */

/* 响应式 */
@media (max-width: 1280px) {
  .devices-row { gap: 16px; }
}

@media (max-width: 1024px) {
  .overview { grid-template-columns: repeat(2, 1fr); }
  .devices-row { flex-wrap: wrap; justify-content: center; }
  .settings-panel { width: 90%; }
}
</style>
