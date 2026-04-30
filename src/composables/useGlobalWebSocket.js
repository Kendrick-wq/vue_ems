import { ref, computed } from 'vue'

// 全局单例状态
const DEFAULT_IP = '192.168.7.37'
const DEFAULT_PORT = 9713

// 连接设置
const settings = ref({
  ip: DEFAULT_IP,
  port: DEFAULT_PORT
})

// 从localStorage加载设置
const savedSettings = localStorage.getItem('ems_ws_settings')
if (savedSettings) {
  try {
    const parsed = JSON.parse(savedSettings)
    settings.value.ip = parsed.ip || DEFAULT_IP
    settings.value.port = parsed.port || DEFAULT_PORT
  } catch (e) {}
}

// WebSocket状态
const wsStatus = ref('disconnected')
const wsStatusText = ref('未连接')
const lastUpdateTime = ref('')

// 系统数据
const systemData = ref({
  workState: '--',
  workMode: '--',
  controlMode: '--',
  systemMode: '--',
  onlineCount: 0,
  offlineCount: 0,
  running: false,
  clusterName: '',
  masterName: '',
  masterIp: '',
  masterSn: '',
  slaves: [],
  slaveStatusMap: {},
  // 集群信息
  cluster: {
    cluster_id: null,
    system_id: null,
    is_system_master: false
  },
  // 子阵列表（仅系统主机有）
  clusters: [],
  // GetSytemInfoCmd 相关数据
  emsServiceType: 0,
  bmsWorkState: '--',
  storageStatus: '--',
  storageUtilization: 0,
  systemDiState: 0,
  systemDoState: 0
})

// 设备身份信息（从 deviceinfo 响应解析）
const deviceIdentity = ref({
  loaded: false,
  systemId: null,
  subarrayId: null,
  isSystemMaster: false,
  isSubarrayMaster: false
})

// WebSocket实例
let ws = null
let reconnectTimer = null

// 定时器
let systemInfoTimer = null      // GetSytemInfoCmd 定时器 - 全局
let masterHomeTimer = null      // /api/ems/master_home/get 定时器 - 首页
let deviceStatusTimer = null    // rpc/{system_id}/deviceinfo 定时器 - 首页
let slaveHomeTimer = null       // GetEmsHomeCmd 定时器 - 从机首页

let messageHandlers = []

// 计算属性
const wsUrl = computed(() => `ws://${settings.value.ip}:${settings.value.port}`)

// 更新状态
function updateWsStatus(status, text) {
  wsStatus.value = status
  wsStatusText.value = text
  console.log(`[WebSocket] 状态: ${status} - ${text}`)
}

// 解析消息
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

// 连接WebSocket
function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    console.log('[WebSocket] 已连接或连接中，跳过')
    return
  }
  
  updateWsStatus('connecting', '连接中...')
  console.log(`[WebSocket] 正在连接 ${wsUrl.value}...`)
  
  try {
    ws = new WebSocket(wsUrl.value)
    
    ws.onopen = () => {
      console.log('[WebSocket] 连接成功')
      updateWsStatus('connected', '已连接')
      // 启动全局定时查询 (GetSytemInfoCmd)
      startSystemInfoTimer()
    }
    
    ws.onmessage = async (event) => {
      const text = await parseMessage(event.data)
      try {
        const response = JSON.parse(text)
        console.log('[WebSocket] 收到消息:', response.topic || 'unknown')
        
        // 处理设备状态响应 (rpc/system/deviceinfo)
        if (response.topic === 'rpc/system/deviceinfo::response' ||
            response.topic?.includes('system/deviceinfo')) {
          if (response.data?.success) {
            updateSystemData(response.data)
          }
        }
        
        // 处理首页数据响应
        if (response.topic === '/api/ems/master_home/get/response' || 
            response.topic?.includes('master_home')) {
          if (response.data?.ret === true) {
            updateHomePageData(response.data)
          }
        }
        
        // 处理从机首页数据响应
        if (response.topic === 'GetEmsHomeCmd/response' || 
            response.topic?.includes('GetEmsHomeCmd')) {
          if (response.data?.ret === true) {
            // 通知处理器
          }
        }
        
        // 处理 GetSytemInfoCmd 响应
        if (response.topic === 'GetSytemInfoCmd/response' || 
            response.topic?.includes('GetSytemInfoCmd')) {
          if (response.data?.gSystemGeneralInfo) {
            updateSystemInfoData(response.data.gSystemGeneralInfo)
          }
        }
        
        // 通知所有注册的处理器
        messageHandlers.forEach(handler => {
          try {
            handler(response)
          } catch (e) {
            console.error('[WebSocket] 消息处理器错误:', e)
          }
        })
      } catch (e) {
        console.error('[WebSocket] 解析消息失败:', e)
      }
    }
    
    ws.onerror = (error) => {
      console.error('[WebSocket] 连接错误:', error)
      updateWsStatus('error', '连接错误')
    }
    
    ws.onclose = () => {
      console.log('[WebSocket] 连接已关闭')
      updateWsStatus('disconnected', '未连接')
      ws = null
      stopAllTimers()
      
      // 自动重连
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connectWebSocket()
        }, 5000)
      }
    }
  } catch (error) {
    console.error('[WebSocket] 创建连接失败:', error)
    updateWsStatus('error', '连接失败')
  }
}

// 断开连接
function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  stopAllTimers()
  if (ws) {
    ws.close()
    ws = null
  }
}

// 重新连接
function reconnectWebSocket() {
  disconnectWebSocket()
  setTimeout(() => {
    connectWebSocket()
  }, 500)
}

// 发送消息
function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
    return true
  }
  console.warn('[WebSocket] 未连接，无法发送消息')
  return false
}

// ============ 定时查询控制 ============

// 启动 GetSytemInfoCmd 定时查询 (全局，所有页面都需要)
function startSystemInfoTimer() {
  if (systemInfoTimer) return
  
  // 立即查询一次
  setTimeout(() => fetchSystemInfo(), 200)
  
  // 每4秒查询一次
  systemInfoTimer = setInterval(() => {
    fetchSystemInfo()
  }, 4000)
}

// 停止 GetSytemInfoCmd 定时查询
function stopSystemInfoTimer() {
  if (systemInfoTimer) {
    clearInterval(systemInfoTimer)
    systemInfoTimer = null
  }
}

// 启动首页定时查询 (deviceStatus + masterHome)
// subarrayId: 子阵ID，传入时查询指定子阵，不传时查询系统级
function startMasterHomeTimer(subarrayId = null) {
  if (deviceStatusTimer || masterHomeTimer) return
  
  // 立即查询一次
  setTimeout(() => {
    fetchDeviceStatus(subarrayId)
    setTimeout(() => fetchHomePageData(), 100)
  }, 300)
  
  // 每5秒查询一次
  deviceStatusTimer = setInterval(() => {
    fetchDeviceStatus(subarrayId)
    setTimeout(() => fetchHomePageData(), 100)
  }, 5000)
}

// 停止首页定时查询
function stopMasterHomeTimer() {
  if (deviceStatusTimer) {
    clearInterval(deviceStatusTimer)
    deviceStatusTimer = null
  }
  if (masterHomeTimer) {
    clearInterval(masterHomeTimer)
    masterHomeTimer = null
  }
}

// 启动从机首页定时查询 (ems_home)
function startSlaveHomeTimer(slaveId) {
  if (slaveHomeTimer) return
  
  // 立即查询一次
  setTimeout(() => fetchSlaveHomeData(slaveId), 300)
  
  // 每5秒查询一次
  slaveHomeTimer = setInterval(() => {
    fetchSlaveHomeData(slaveId)
  }, 5000)
}

// 停止从机首页定时查询
function stopSlaveHomeTimer() {
  if (slaveHomeTimer) {
    clearInterval(slaveHomeTimer)
    slaveHomeTimer = null
  }
}

// 停止所有定时器
function stopAllTimers() {
  stopSystemInfoTimer()
  stopMasterHomeTimer()
  stopSlaveHomeTimer()
}

// ============ 查询方法 ============

// 获取设备状态
// 统一固定主题: rpc/system/deviceinfo
// subarrayId: 子阵ID，传入时下发到请求体，不传时查询当前设备
function fetchDeviceStatus(subarrayId = null) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  
  const request = {
    topic: 'rpc/system/deviceinfo',
    data: subarrayId ? { subarray_id: subarrayId } : {},
    data_type: 'binary',
    message_id: 'status_' + Date.now(),
    timestamp: new Date().toISOString()
  }
  
  ws.send(JSON.stringify(request))
}

// 获取首页数据
function fetchHomePageData() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  
  const request = {
    topic: '/api/ems/master_home/get',
    data: {},
    data_type: 'binary',
    message_id: 'home_' + Date.now(),
    timestamp: new Date().toISOString()
  }
  
  ws.send(JSON.stringify(request))
}

// 获取从机首页数据
function fetchSlaveHomeData(slaveId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  
  const request = {
    topic: 'GetEmsHomeCmd',
    data: { slave_id: slaveId },
    data_type: 'binary',
    message_id: 'slave_home_' + Date.now(),
    timestamp: new Date().toISOString()
  }
  
  ws.send(JSON.stringify(request))
}

// 获取系统信息 (GetSytemInfoCmd)
function fetchSystemInfo() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  
  const request = {
    topic: 'GetSytemInfoCmd',
    data: {},
    type: ''
  }
  
  ws.send(JSON.stringify(request))
}

// ============ 数据更新 ============

// 更新系统信息数据 (从 GetSytemInfoCmd/response 解析)
function updateSystemInfoData(infoArray) {
  if (!Array.isArray(infoArray) || infoArray.length < 10) {
    console.warn('[SystemInfo] 数据格式不正确:', infoArray)
    return
  }
  
  systemData.value.emsServiceType = infoArray[0]
  
  // EMS_SYS_RUN_MODE: 0:并网 1:离网
  const runMode = infoArray[1]
  systemData.value.systemMode = runMode === 1 ? '离网' : '并网'
  
  // EMS_SYS_CTRL_MODE: 0:自动 1:手动
  const ctrlMode = infoArray[2]
  systemData.value.controlMode = ctrlMode === 1 ? '手动' : '自动'
  
  // EMS_SYS_OPERATION_MODE: 0:远程 1:就地
  const opMode = infoArray[3]
  systemData.value.workMode = opMode === 1 ? '就地' : '远程'
  
  // EMS_SYS_WORK_STATE: 0:停机 1:运行
  const workState = infoArray[4]
  systemData.value.running = workState === 1
  systemData.value.workState = workState === 1 ? '运行中' : '停机'
  
  // BMS_SYS_WORK_STATE: 0:待机 1:充放电
  const bmsState = infoArray[5]
  systemData.value.bmsWorkState = bmsState === 1 ? '充放电' : '待机'
  
  // STORAGE_DATA_STATUS: 1:正常 2:异常
  const storageStatus = infoArray[6]
  systemData.value.storageStatus = storageStatus === 1 ? '正常' : '异常'
  
  // STORAGE_UTILIZATION: 百分比值(0-100)
  systemData.value.storageUtilization = infoArray[7]
  
  // SYSTEM_DI_STATE
  systemData.value.systemDiState = infoArray[8]
  
  // SYSTEM_DO_STATE
  systemData.value.systemDoState = infoArray[9]
}

// 更新系统数据 (rpc/system/deviceinfo 响应)
function updateSystemData(data) {
  if (data.running !== undefined) {
    systemData.value.running = data.running
  }

  // 从 data.devices 中获取实际数据
  const devices = data.devices || data

  // 系统信息
  if (devices.system) {
    systemData.value.cluster = {
      cluster_id: devices.subarray?.id || '',
      system_id: devices.system.id,
      is_system_master: devices.system.is_master,
      is_subarray_master: devices.subarray?.is_master || false,
      // 保存系统主机信息
      system_master: devices.system.master || {},
      // 保存子阵主机信息
      subarray_master: devices.subarray?.master || {}
    }
    systemData.value.clusterName = devices.subarray?.id || ''
  }

  // 子阵信息
  if (devices.subarray) {
    // 主机信息
    if (devices.subarray.master) {
      systemData.value.masterName = devices.subarray.master.name
      systemData.value.masterIp = devices.subarray.master.ip || ''
      systemData.value.masterSn = devices.subarray.master.sn || ''
    }

    // 从机列表（从 subarray.connections 解析）
    if (devices.subarray.connections && Array.isArray(devices.subarray.connections)) {
      const slaves = []
      const statusMap = {}
      let online = 0
      let offline = 0

      devices.subarray.connections.forEach(conn => {
        if (conn.enabled) {
          slaves.push({
            id: conn.id,
            name: conn.name || `从机#${conn.id}`,
            enabled: conn.enabled
          })

          if (conn.online) {
            online++
          } else {
            offline++
          }
        }

        statusMap[conn.id] = {
          online: conn.online,
          ip: conn.ip || '',
          sn: conn.sn || '',
          status: conn.online ? 'Connected' : 'Disconnected'
        }
      })

      slaves.sort((a, b) => a.id - b.id)
      systemData.value.slaves = slaves
      systemData.value.slaveStatusMap = statusMap
      systemData.value.onlineCount = online
      systemData.value.offlineCount = offline
    }
  }

  // 系统级连接（子阵主机列表，仅系统主机有）
  if (devices.system?.connections && Array.isArray(devices.system.connections)) {
    systemData.value.clusters = devices.system.connections.map(conn => ({
      cluster_id: conn.name.replace('master', 'subarray'), // master2 -> subarray2
      status: conn.online ? 'running' : 'offline',
      total_power: 0,
      system_soc: 0,
      online_slave_count: conn.enabled_slave_count || 0,
      slave_count: conn.slave_count || 0,
      warning_count: 0,
      masterInfo: {
        name: conn.name,
        ip: conn.ip || '--',
        sn: conn.sn || '--'
      }
    }))
  } else if (devices.system?.is_master === false) {
    // 非系统主机，清空 clusters
    systemData.value.clusters = []
  }

  lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
}

// 更新首页数据
function updateHomePageData(data) {
  lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
}

// 注册消息处理器
function onMessage(handler) {
  messageHandlers.push(handler)
  return () => {
    const index = messageHandlers.indexOf(handler)
    if (index > -1) {
      messageHandlers.splice(index, 1)
    }
  }
}

// 保存设置
function saveSettings(newSettings) {
  settings.value.ip = newSettings.ip || DEFAULT_IP
  settings.value.port = newSettings.port || DEFAULT_PORT
  localStorage.setItem('ems_ws_settings', JSON.stringify(settings.value))
  reconnectWebSocket()
}

// 导出组合式函数
export function useGlobalWebSocket() {
  return {
    // 状态
    settings,
    wsUrl,
    wsStatus,
    wsStatusText,
    lastUpdateTime,
    systemData,
    deviceIdentity,
    
    // 方法
    connectWebSocket,
    disconnectWebSocket,
    reconnectWebSocket,
    sendMessage,
    saveSettings,
    onMessage,
    fetchDeviceStatus,
    fetchHomePageData,
    fetchSlaveHomeData,
    
    // 定时控制
    startMasterHomeTimer,
    stopMasterHomeTimer,
    startSlaveHomeTimer,
    stopSlaveHomeTimer
  }
}
