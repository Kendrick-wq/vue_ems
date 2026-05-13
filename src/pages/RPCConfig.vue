<template>
  <div class="rpc-config-page">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">←</button>
        <span class="header-title">RPC配置</span>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="loadConfig" :disabled="loading">
          <span v-if="loading">加载中...</span>
          <span v-else>🔄 刷新</span>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="content">
      <!-- 加载状态 -->
      <div v-if="loading && !hasLoaded" class="loading-state">
        <div class="loading-spinner"></div>
        <span>正在加载配置...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <span class="error-icon">⚠️</span>
        <span>{{ error }}</span>
        <button class="btn-secondary" @click="loadConfig">重试</button>
      </div>

      <!-- 配置内容 -->
      <div v-else class="config-container">
        <!-- RPC使能 + 设备信息 -->
        <div class="enable-section">
          <label class="enable-switch">
            <input type="checkbox" v-model="rpcConfig.enabled">
            <span class="enable-slider"></span>
            <span class="enable-label">RPC使能</span>
          </label>
          <div class="device-info-group">
            <div v-if="rpcConfig.enabled && rpcConfig.server" class="device-info">
              <span class="device-label">当前设备:</span>
              <span class="device-value">{{ rpcConfig.server.name || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 身份配置 -->
        <div v-if="rpcConfig.enabled" class="config-section">
          <h3 class="section-title">身份配置</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>子阵ID</label>
              <select v-model="rpcConfig.identity.subarray_id" class="form-select">
                <option v-for="n in 8" :key="n" :value="`subarray${n}`">subarray{{ n }}</option>
              </select>
            </div>
            <div class="info-item">
              <label>角色</label>
              <select v-model="rpcConfig.identity.role" class="form-select">
                <option value="master">主机</option>
                <option v-for="n in 16" :key="n" :value="`slave${n}`">从机{{ n }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 子阵系统身份 -->
        <div v-if="rpcConfig.enabled && isMaster" class="config-section">
          <h3 class="section-title">子阵系统身份</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>所属系统ID</label>
              <select v-model="rpcConfig.subarray.system_id" class="form-select">
                <option v-for="n in 4" :key="n" :value="`system${n}`">system{{ n }}</option>
              </select>
            </div>
            <div class="info-item">
              <label>是否系统主子阵</label>
              <select v-model="rpcConfig.subarray.is_master" class="form-select">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 子阵设备连接 -->
        <div v-if="rpcConfig.enabled && isMaster" class="config-section">
          <h3 class="section-title">子阵设备连接</h3>

          <!-- 扫描按钮 -->
          <div class="scan-bar">
            <button class="btn-scan" @click="scanSubarray" :disabled="scanningSubarray">
              <span v-if="scanningSubarray">🔍 扫描中...</span>
              <span v-else>🔍 扫描子阵设备</span>
            </button>
            <span v-if="subarrayScanMessage" class="scan-message">{{ subarrayScanMessage }}</span>
          </div>

          <!-- 候选列表 -->
          <div v-if="subarrayCandidates.length > 0" class="candidate-section">
            <h4 class="subsection-title">
              <span>扫描结果 (勾选后点击确认)</span>
              <button class="btn-confirm" @click="confirmSubarray" :disabled="confirmingSubarray">
                {{ confirmingSubarray ? '确认中...' : '✅ 确认连接' }}
              </button>
            </h4>
            <div class="candidate-list">
              <label
                v-for="cand in subarrayCandidates"
                :key="cand.name"
                class="candidate-item"
                :class="{ selected: cand.selected, existing: cand.existing }"
              >
                <input type="checkbox" v-model="cand.selected">
                <span class="cand-subarray">{{ cand.name }}</span>
                <span class="cand-host">{{ cand.role }}</span>
                <span v-if="cand.name === rpcConfig.server?.name" class="cand-self">本机</span>
                <span v-else class="cand-remote">远端</span>
                <span v-if="cand.role === 'master'" class="cand-master-tag">主机</span>
                <span v-else class="cand-slave-tag">从机</span>
                <span v-if="cand.existing && cand.name !== rpcConfig.server?.name" class="cand-existing">已保存</span>
              </label>
            </div>
          </div>

          <!-- 已保存的连接 -->
          <div v-if="rpcConfig.subarray?.connections?.length > 0" class="saved-connections">
            <h4 class="subsection-title">
              <span>已保存连接 ({{ enabledSubarrayConnCount }}/{{ rpcConfig.subarray.connections.length }})</span>
            </h4>
            <div class="connections-grid subarray-connections-grid">
              <div
                v-for="(conn, index) in sortedSubarrayConnections"
                :key="conn.name"
                class="connection-card subarray-connection-card"
                :class="{ enabled: conn.enabled, self: conn.name === rpcConfig.server?.name }"},{
              >
                <div class="subarray-connection-row">
                  <span class="conn-subarray-bold">{{ conn.name }}</span>
                  <label class="switch" @click.stop>
                    <input type="checkbox" v-model="conn.enabled">
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="subarray-connection-row">
                  <span class="conn-host-light">{{ conn.role || (conn.name === rpcConfig.server?.name ? rpcConfig.identity?.role : 'slave') }}</span>
                </div>
                <div class="subarray-connection-tags">
                  <span v-if="conn.name === rpcConfig.server?.name" class="tag-self">本机</span>
                  <span v-else class="tag-remote">远端</span>
                  <span v-if="conn.role === 'master' || conn.name === rpcConfig.server?.name" class="tag-master">主机</span>
                  <span v-else class="tag-slave">从机</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!subarrayCandidates.length && !rpcConfig.subarray?.connections?.length" class="empty-state">
            暂无连接，点击"扫描子阵设备"发现设备
          </div>
        </div>

        <!-- 系统子阵连接 -->
        <div v-if="rpcConfig.enabled && isMaster && rpcConfig.subarray?.is_master" class="config-section">
          <h3 class="section-title">系统子阵连接</h3>

          <!-- 扫描按钮 -->
          <div class="scan-bar">
            <button class="btn-scan" @click="scanSystem" :disabled="scanningSystem">
              <span v-if="scanningSystem">🔍 扫描中...</span>
              <span v-else>🔍 扫描系统子阵</span>
            </button>
            <span v-if="systemScanMessage" class="scan-message">{{ systemScanMessage }}</span>
          </div>

          <!-- 候选列表 -->
          <div v-if="systemCandidates.length > 0" class="candidate-section">
            <h4 class="subsection-title">
              <span>扫描结果 (勾选后点击确认)</span>
              <button class="btn-confirm" @click="confirmSystem" :disabled="confirmingSystem">
                {{ confirmingSystem ? '确认中...' : '✅ 确认连接' }}
              </button>
            </h4>
            <div class="candidate-list">
              <label
                v-for="cand in systemCandidates"
                :key="cand.name"
                class="candidate-item"
                :class="{ selected: cand.selected, existing: cand.existing, self: cand.name === rpcConfig.server?.name }"
              >
                <input type="checkbox" v-model="cand.selected">
                <span class="cand-subarray">{{ cand.subarray_id }}</span>
                <span class="cand-host">{{ cand.name }}</span>
                <span v-if="cand.name === rpcConfig.server?.name" class="cand-self">本机</span>
                <span v-else-if="cand.existing" class="cand-existing">已保存</span>
              </label>
            </div>
          </div>

          <!-- 已保存的连接 -->
          <div v-if="rpcConfig.system?.connections?.length > 0" class="saved-connections">
            <h4 class="subsection-title">
              <span>已保存连接 ({{ enabledSystemConnCount }}/{{ rpcConfig.system.connections.length }})</span>
            </h4>
            <div class="connections-grid system-connections-grid">
              <div
                v-for="(conn, index) in sortedSystemConnections"
                :key="conn.name"
                class="connection-card system-connection-card"
                :class="{ enabled: conn.enabled, self: conn.name === rpcConfig.server?.name }"
              >
                <div class="system-connection-row">
                  <span class="conn-subarray-bold">{{ conn.subarray_id }}</span>
                  <label class="switch" @click.stop>
                    <input type="checkbox" v-model="conn.enabled">
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="system-connection-row">
                  <span class="conn-host-light">{{ conn.name }}</span>
                </div>
                <div class="system-connection-tags">
                  <span v-if="conn.name === rpcConfig.server?.name" class="tag-self">本机</span>
                  <span v-else class="tag-remote">远端</span>
                  <span v-if="conn.subarray_id && rpcConfig.subarray?.is_master && conn.name === rpcConfig.server?.name" class="tag-master">主子阵</span>
                  <span v-else-if="conn.subarray_id && !rpcConfig.subarray?.is_master && conn.name === rpcConfig.server?.name" class="tag-slave">子阵</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!systemCandidates.length && !rpcConfig.system?.connections?.length" class="empty-state">
            暂无连接，点击"扫描系统子阵"发现设备
          </div>
        </div>

        <!-- 保存结果提示 -->
        <div v-if="saveMessage" class="save-message" :class="saveSuccess ? 'success' : 'error'">
          {{ saveMessage }}
        </div>

        <!-- 保存按钮 -->
        <div class="action-bar">
          <button class="btn-primary" @click="saveConfig" :disabled="saving">
            <span v-if="saving">保存中...</span>
            <span v-else>💾 保存配置</span>
          </button>
        </div>

        <!-- 原始配置（调试用） -->
        <div v-if="showRawConfig" class="config-section">
          <h3 class="section-title">原始配置</h3>
          <pre class="raw-config">{{ JSON.stringify(rpcConfig, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// WebSocket 实例
let ws = null

// RPC配置数据（新结构）
const rpcConfig = ref({
  enabled: false,
  server: null,
  identity: null,
  system: null,
  subarray: null,
  timeouts: null
})

// 状态
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const hasLoaded = ref(false)
const showRawConfig = ref(false)
const saveMessage = ref('')
const saveSuccess = ref(false)

// 扫描状态
const scanningSubarray = ref(false)
const confirmingSubarray = ref(false)
const subarrayCandidates = ref([])
const subarrayScanMessage = ref('')

const scanningSystem = ref(false)
const confirmingSystem = ref(false)
const systemCandidates = ref([])
const systemScanMessage = ref('')

// 计算属性：是否为子阵主机
const isMaster = computed(() => {
  return rpcConfig.value.identity?.role === 'master'
})

// 计算属性：角色文本
const roleText = computed(() => {
  const role = rpcConfig.value.identity?.role
  return role === 'master' ? '子阵主机' : (role === 'slave' ? '从机' : '-')
})

// 计算属性：已启用的子阵连接数
const enabledSubarrayConnCount = computed(() => {
  if (!rpcConfig.value.subarray?.connections) return 0
  return rpcConfig.value.subarray.connections.filter(c => c.enabled).length
})

// 计算属性：已启用的系统连接数
const enabledSystemConnCount = computed(() => {
  if (!rpcConfig.value.system?.connections) return 0
  return rpcConfig.value.system.connections.filter(c => c.enabled).length
})

// 计算属性：排序后的子阵连接（本机排第一）
const sortedSubarrayConnections = computed(() => {
  if (!rpcConfig.value.subarray?.connections) return []
  const selfName = rpcConfig.value.server?.name || ''
  return [...rpcConfig.value.subarray.connections].sort((a, b) => {
    const aIsSelf = a.name === selfName ? 1 : 0
    const bIsSelf = b.name === selfName ? 1 : 0
    return bIsSelf - aIsSelf
  })
})

// 计算属性：排序后的系统连接（本机排第一）
const sortedSystemConnections = computed(() => {
  if (!rpcConfig.value.system?.connections) return []
  const selfName = rpcConfig.value.server?.name || ''
  return [...rpcConfig.value.system.connections].sort((a, b) => {
    const aIsSelf = a.name === selfName ? 1 : 0
    const bIsSelf = b.name === selfName ? 1 : 0
    return bIsSelf - aIsSelf
  })
})

// 获取WebSocket连接
function getWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return ws
  }

  const savedSettings = localStorage.getItem('ems_ws_settings')
  let wsUrl = 'ws://192.168.7.37:9713'

  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      wsUrl = `ws://${settings.ip}:${settings.port}`
    } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    const newWs = new WebSocket(wsUrl)

    newWs.onopen = () => {
      ws = newWs
      resolve(newWs)
    }

    newWs.onerror = () => {
      reject(new Error('WebSocket连接失败'))
    }

    newWs.onclose = () => {
      ws = null
    }
  })
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

// 发送请求并等待响应
function sendRequest(socket, request, responseTopic) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('请求超时'))
    }, 5000)

    const handler = async (event) => {
      const text = await parseMessage(event.data)
      try {
        const response = JSON.parse(text)
        if (response.topic === responseTopic || response.topic?.includes(responseTopic.replace('::response', ''))) {
          clearTimeout(timeout)
          socket.removeEventListener('message', handler)
          resolve(response)
        }
      } catch (e) {}
    }

    socket.addEventListener('message', handler)
    socket.send(JSON.stringify(request))
  })
}

// 加载配置
async function loadConfig() {
  loading.value = true
  error.value = ''

  try {
    const socket = await getWebSocket()

    const request = {
      topic: 'rpc/getInfo',
      data: {},
      data_type: 'binary',
      message_id: 'rpc_get_' + Date.now(),
      timestamp: new Date().toISOString()
    }

    const response = await sendRequest(socket, request, 'rpc/getInfo::response')

    if (response.data?.success && response.data?.rpc) {
      rpcConfig.value = response.data.rpc

      // 确保新结构字段存在（兼容旧配置）
      if (!rpcConfig.value.identity) {
        rpcConfig.value.identity = {
          subarray_id: rpcConfig.value.subarray?.subarray_id || 'subarray1',
          role: rpcConfig.value.subarray?.is_subarray_master ? 'master' : 'slave1'
        }
      }
      // 兼容旧格式的 "slave"（无编号），统一为 "slave1"
      if (rpcConfig.value.identity.role === 'slave') {
        rpcConfig.value.identity.role = 'slave1'
      }
      if (!rpcConfig.value.subarray) {
        rpcConfig.value.subarray = { connections: [] }
      }
      if (!rpcConfig.value.system) {
        rpcConfig.value.system = { connections: [] }
      }
      if (!rpcConfig.value.subarray.system_id) {
        rpcConfig.value.subarray.system_id = 'system1'
      }
      if (rpcConfig.value.subarray.is_master === undefined) {
        rpcConfig.value.subarray.is_master = false
      }

      hasLoaded.value = true
      console.log('[RPC] 配置已加载:', rpcConfig.value)
    } else {
      error.value = response.data?.error || '获取配置失败'
    }
  } catch (err) {
    console.error('[RPC] 加载配置失败:', err)
    error.value = err.message || '连接失败，请检查WebSocket连接'
  } finally {
    loading.value = false
  }
}

// 扫描子阵从机
async function scanSubarray() {
  scanningSubarray.value = true
  subarrayScanMessage.value = ''
  subarrayCandidates.value = []

  try {
    const socket = await getWebSocket()
    const request = {
      topic: 'rpc/subarray/scan',
      data: {},
      data_type: 'binary',
      message_id: 'scan_sub_' + Date.now(),
      timestamp: new Date().toISOString()
    }

    const response = await sendRequest(socket, request, 'rpc/subarray/scan::response')

    if (response.data?.success) {
      const candidates = response.data.candidates || []
      const savedMap = new Map((rpcConfig.value.subarray?.connections || []).map(c => [c.name, c.enabled]))

      subarrayCandidates.value = candidates.map(c => ({
        ...c,
        selected: true,
        existing: savedMap.has(c.name)
      }))

      const newCount = subarrayCandidates.value.filter(c => !c.existing).length
      subarrayScanMessage.value = `发现 ${candidates.length} 个设备，其中 ${newCount} 个新设备`
    } else {
      subarrayScanMessage.value = response.data?.error || '扫描失败'
    }
  } catch (err) {
    console.error('[RPC] 扫描子阵失败:', err)
    subarrayScanMessage.value = err.message || '扫描失败'
  } finally {
    scanningSubarray.value = false
  }
}

// 确认子阵连接
async function confirmSubarray() {
  const selected = subarrayCandidates.value.filter(c => c.selected)
  if (selected.length === 0) {
    subarrayScanMessage.value = '请至少选择一个设备'
    return
  }

  confirmingSubarray.value = true
  subarrayScanMessage.value = ''

  try {
    const socket = await getWebSocket()
    const connections = selected.map(c => ({
      name: c.name,
      enabled: true,
      role: c.role || (c.name === rpcConfig.value.server?.name ? rpcConfig.value.identity?.role : '')
    }))

    const request = {
      topic: 'rpc/subarray/confirm',
      data: {
        connections: JSON.stringify(connections)
      },
      data_type: 'binary',
      message_id: 'confirm_sub_' + Date.now(),
      timestamp: new Date().toISOString()
    }

    const response = await sendRequest(socket, request, 'rpc/subarray/confirm::response')

    if (response.data?.success) {
      subarrayScanMessage.value = response.data.message || '子阵连接已保存'
      subarrayCandidates.value = []
      // 重新加载配置
      await loadConfig()
    } else {
      subarrayScanMessage.value = response.data?.error || '确认失败'
    }
  } catch (err) {
    console.error('[RPC] 确认子阵连接失败:', err)
    subarrayScanMessage.value = err.message || '确认失败'
  } finally {
    confirmingSubarray.value = false
  }
}

// 扫描系统子阵
async function scanSystem() {
  scanningSystem.value = true
  systemScanMessage.value = ''
  systemCandidates.value = []

  try {
    const socket = await getWebSocket()
    const request = {
      topic: 'rpc/system/scan',
      data: {},
      data_type: 'binary',
      message_id: 'scan_sys_' + Date.now(),
      timestamp: new Date().toISOString()
    }

    const response = await sendRequest(socket, request, 'rpc/system/scan::response')

    if (response.data?.success) {
      const candidates = response.data.candidates || []
      const savedMap = new Map((rpcConfig.value.system?.connections || []).map(c => [c.name, c.enabled]))

      systemCandidates.value = candidates.map(c => ({
        ...c,
        selected: true,
        existing: savedMap.has(c.name)
      }))

      const newCount = systemCandidates.value.filter(c => !c.existing).length
      systemScanMessage.value = `发现 ${candidates.length} 个子阵，其中 ${newCount} 个新子阵`
    } else {
      systemScanMessage.value = response.data?.error || '扫描失败'
    }
  } catch (err) {
    console.error('[RPC] 扫描系统失败:', err)
    systemScanMessage.value = err.message || '扫描失败'
  } finally {
    scanningSystem.value = false
  }
}

// 确认系统连接
async function confirmSystem() {
  const selected = systemCandidates.value.filter(c => c.selected)
  if (selected.length === 0) {
    systemScanMessage.value = '请至少选择一个子阵'
    return
  }

  confirmingSystem.value = true
  systemScanMessage.value = ''

  try {
    const socket = await getWebSocket()
    const connections = selected.map(c => ({
      name: c.name,
      subarray_id: c.subarray_id,
      enabled: true
    }))

    const request = {
      topic: 'rpc/system/confirm',
      data: {
        connections: JSON.stringify(connections)
      },
      data_type: 'binary',
      message_id: 'confirm_sys_' + Date.now(),
      timestamp: new Date().toISOString()
    }

    const response = await sendRequest(socket, request, 'rpc/system/confirm::response')

    if (response.data?.success) {
      systemScanMessage.value = response.data.message || '系统连接已保存'
      systemCandidates.value = []
      // 重新加载配置
      await loadConfig()
    } else {
      systemScanMessage.value = response.data?.error || '确认失败'
    }
  } catch (err) {
    console.error('[RPC] 确认系统连接失败:', err)
    systemScanMessage.value = err.message || '确认失败'
  } finally {
    confirmingSystem.value = false
  }
}

// 保存配置（identity + system 基本信息）
async function saveConfig() {
  saving.value = true
  saveMessage.value = ''

  try {
    const socket = await getWebSocket()

    // 构建changes对象，只包含需要更新的字段
    const changes = {
      enabled: rpcConfig.value.enabled,
      identity: {
        subarray_id: rpcConfig.value.identity.subarray_id,
        role: rpcConfig.value.identity.role
      }
    }

    // 添加子阵系统身份配置
    if (isMaster.value && rpcConfig.value.subarray) {
      changes.subarray = {
        ...changes.subarray,
        system_id: rpcConfig.value.subarray.system_id,
        is_master: rpcConfig.value.subarray.is_master
      }
    }

    const request = {
      topic: 'rpc/updateConfig',
      data: {
        changes: changes
      },
      data_type: 'binary',
      message_id: 'rpc_update_' + Date.now(),
      timestamp: new Date().toISOString()
    }

    const response = await sendRequest(socket, request, 'rpc/updateConfig::response')

    if (response.data?.success) {
      saveMessage.value = response.data.message || '配置已保存'
      saveSuccess.value = true

      // 如果后端返回了更新后的配置，刷新本地配置
      if (response.data?.config) {
        rpcConfig.value = response.data.config
      } else {
        setTimeout(() => loadConfig(), 1000)
      }
    } else {
      saveMessage.value = response.data?.error || '保存配置失败'
      saveSuccess.value = false
    }
  } catch (err) {
    console.error('[RPC] 保存配置失败:', err)
    saveMessage.value = err.message || '保存失败，请检查连接'
    saveSuccess.value = false
  } finally {
    saving.value = false
    setTimeout(() => { saveMessage.value = '' }, 3000)
  }
}

// 返回上一页
function goBack() {
  router.back()
}

// 页面加载
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.rpc-config-page {
  width: 100%;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  background: #f0f4f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 顶部导航 */
.header {
  background: #fff;
  padding: 8px 16px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  flex-shrink: 0;
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
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #475569;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: #10b981;
  color: #10b981;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 主内容区 */
.content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

/* 加载和错误状态 */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 40px;
}

.error-state {
  color: #ef4444;
}

/* 配置容器 */
.config-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* RPC使能区域 */
.enable-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.enable-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.enable-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.enable-slider {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  background-color: #cbd5e1;
  border-radius: 26px;
  transition: .3s;
}

.enable-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.enable-switch input:checked + .enable-slider {
  background-color: #10b981;
}

.enable-switch input:checked + .enable-slider:before {
  transform: translateX(22px);
}

.enable-label {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #bae6fd;
}

.device-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.device-value {
  font-size: 13px;
  color: #1e293b;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
}

.device-info-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 配置区块 */
.config-section {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #f1f5f9;
}

.subsection-title {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin: 10px 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item label {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 表单选择框 */
.form-select {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #1e293b;
  background: #fff;
  transition: all 0.2s;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
}

/* 扫描栏 */
.scan-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.btn-scan {
  padding: 6px 14px;
  border: 1px solid #3b82f6;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #3b82f6;
  transition: all 0.2s;
}

.btn-scan:hover:not(:disabled) {
  background: #3b82f6;
  color: #fff;
}

.btn-scan:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scan-message {
  font-size: 12px;
  color: #64748b;
}

/* 候选列表 */
.candidate-section {
  background: #f8fafc;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.candidate-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.candidate-item:hover {
  border-color: #3b82f6;
}

.candidate-item.selected {
  border-color: #10b981;
  background: #ecfdf5;
}

.candidate-item.existing {
  background: #f0f9ff;
}

.candidate-item.existing.selected {
  border-color: #3b82f6;
  background: #dbeafe;
}

.candidate-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.cand-subarray {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  min-width: 100px;
}

.cand-host {
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
  font-family: 'SF Mono', Monaco, monospace;
}

.cand-existing {
  font-size: 11px;
  color: #1e40af;
  padding: 2px 8px;
  background: #bfdbfe;
  border-radius: 4px;
  font-weight: 600;
}

.cand-self {
  font-size: 11px;
  color: #047857;
  padding: 2px 8px;
  background: #a7f3d0;
  border-radius: 4px;
  font-weight: 600;
}

.cand-master {
  font-size: 11px;
  color: #92400e;
  padding: 2px 8px;
  background: #fde68a;
  border-radius: 4px;
  font-weight: 600;
}

.cand-role {
  font-size: 11px;
  color: #64748b;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
}

.cand-addr {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
}

.conn-subarray-bold {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.conn-host-light {
  font-size: 11px;
  font-weight: 400;
  color: #94a3b8;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 确认按钮 */
.btn-confirm {
  padding: 4px 12px;
  border: 1px solid #10b981;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #10b981;
  transition: all 0.2s;
}

.btn-confirm:hover:not(:disabled) {
  background: #10b981;
  color: #fff;
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 已保存连接 */
.saved-connections {
  margin-top: 10px;
}

/* 连接网格 */
.connections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}

.system-connections-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.connection-card {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
  transition: all 0.2s;
}

.connection-card.enabled {
  background: #ecfdf5;
  border-color: #10b981;
}

.connection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.system-connection-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  min-height: 80px;
}

.system-connection-card.enabled {
  background: #ecfdf5;
  border-color: #10b981;
}

.system-connection-card.self {
  border-color: #f59e0b;
  background: #fffbeb;
}

.system-connection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.system-connection-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.tag-self {
  font-size: 11px;
  color: #047857;
  padding: 3px 8px;
  background: #a7f3d0;
  border-radius: 4px;
  font-weight: 600;
}

.tag-remote {
  font-size: 11px;
  color: #1e40af;
  padding: 3px 8px;
  background: #bfdbfe;
  border-radius: 4px;
  font-weight: 600;
}

.tag-master {
  font-size: 11px;
  color: #92400e;
  padding: 3px 8px;
  background: #fde68a;
  border-radius: 4px;
  font-weight: 600;
}

.tag-slave {
  font-size: 11px;
  color: #64748b;
  padding: 3px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-weight: 600;
}

.subarray-connections-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.subarray-connection-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  min-height: 80px;
}

.subarray-connection-card.enabled {
  background: #ecfdf5;
  border-color: #10b981;
}

.subarray-connection-card.self {
  border-color: #f59e0b;
  background: #fffbeb;
}

.subarray-connection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.subarray-connection-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.cand-master-tag {
  font-size: 11px;
  color: #92400e;
  padding: 2px 8px;
  background: #fde68a;
  border-radius: 4px;
  font-weight: 600;
}

.cand-slave-tag {
  font-size: 11px;
  color: #64748b;
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-weight: 600;
}

.cand-remote {
  font-size: 11px;
  color: #1e40af;
  padding: 2px 8px;
  background: #bfdbfe;
  border-radius: 4px;
  font-weight: 600;
}

.conn-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  font-family: 'SF Mono', Monaco, monospace;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conn-subarray {
  font-size: 11px;
  color: #64748b;
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 4px;
}

/* Switch开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: .3s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

input:checked + .slider {
  background-color: #10b981;
}

input:checked + .slider:before {
  transform: translateX(16px);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 20px;
  color: #94a3b8;
  font-size: 13px;
}

/* 保存消息 */
.save-message {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  margin-top: 10px;
}

.save-message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.save-message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: center;
  padding: 10px 0 0 0;
}

.btn-primary {
  padding: 8px 24px;
  border: none;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 原始配置 */
.raw-config {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, monospace;
  overflow-x: auto;
  margin: 0;
}

/* 按钮 */
.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

/* 响应式 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .connections-grid,
  .system-connections-grid,
  .subarray-connections-grid {
    grid-template-columns: 1fr;
  }

  .scan-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
