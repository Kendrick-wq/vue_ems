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
        <!-- RPC使能按钮 -->
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
            <div v-if="rpcConfig.enabled && newDeviceName && newDeviceName !== rpcConfig.server?.name" class="device-info new-device">
              <span class="device-label">新设备名:</span>
              <span class="device-value">{{ newDeviceName }}</span>
            </div>
          </div>
        </div>

        <!-- 系统配置 -->
        <div v-if="rpcConfig.enabled && rpcConfig.system" class="config-section">
          <h3 class="section-title">系统配置</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>系统ID</label>
              <select v-model="rpcConfig.system.system_id" class="form-select">
                <option value="system1">system1</option>
                <option value="system2">system2</option>
                <option value="system3">system3</option>
                <option value="system4">system4</option>
              </select>
            </div>
            <div class="info-item">
              <label>是否系统主机</label>
              <select v-model="rpcConfig.system.is_system_master" class="form-select">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
          </div>

          <!-- 系统子阵主机连接 - 只在是系统主机时显示 -->
          <div v-if="rpcConfig.system.is_system_master && rpcConfig.system.connections && rpcConfig.system.connections.length > 0" class="connections-container">
            <h4 class="subsection-title">子阵主机连接 ({{ enabledSystemMasterCount }}/{{ totalSystemMasterCount }})</h4>
            <div class="connections-grid">
              <div
                v-for="(conn, index) in rpcConfig.system.connections"
                :key="index"
                class="connection-card"
                :class="{ enabled: conn.enabled }"
              >
                <div class="connection-header">
                  <span class="conn-name">{{ conn.name }}</span>
                  <label class="switch">
                    <input type="checkbox" v-model="conn.enabled">
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="connection-role">{{ getRoleText(conn.role) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 子阵配置 -->
        <div v-if="rpcConfig.enabled && rpcConfig.subarray" class="config-section">
          <h3 class="section-title">子阵配置</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>子阵ID</label>
              <select v-model="rpcConfig.subarray.subarray_id" class="form-select" @change="updateNewDeviceName">
                <option value="subarray1">subarray1</option>
                <option value="subarray2">subarray2</option>
                <option value="subarray3">subarray3</option>
                <option value="subarray4">subarray4</option>
                <option value="subarray5">subarray5</option>
                <option value="subarray6">subarray6</option>
                <option value="subarray7">subarray7</option>
                <option value="subarray8">subarray8</option>
              </select>
            </div>
            <div class="info-item">
              <label>是否子阵主机</label>
              <select v-model="rpcConfig.subarray.is_subarray_master" class="form-select" @change="updateNewDeviceName">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
            <!-- 从机ID选择 - 只在不是子阵主机时显示 -->
            <div class="info-item" v-if="!rpcConfig.subarray.is_subarray_master">
              <label>从机ID</label>
              <select v-model="slaveId" class="form-select" @change="updateNewDeviceName">
                <option v-for="id in 16" :key="id" :value="id">{{ id }}</option>
              </select>
            </div>
          </div>

          <!-- 子阵从机连接 - 只在是子阵主机时显示 -->
          <div v-if="rpcConfig.subarray.is_subarray_master" class="connections-container">
            <h4 class="subsection-title">
              <span>从机连接 ({{ currentSubarrayConnections.filter(c => c.enabled).length }}/{{ currentSubarrayConnections.length }})</span>
              <div class="conn-actions">
                <button class="add-conn-btn" @click="addSlaveConnection">➕ 添加</button>
                <button class="remove-conn-btn" @click="removeSlaveConnection">➖ 删除</button>
              </div>
            </h4>
            <div class="connections-grid">
              <div
                v-for="(conn, index) in currentSubarrayConnections"
                :key="conn.name"
                class="connection-card"
                :class="{ enabled: conn.enabled }"
              >
                <div class="connection-header">
                  <span class="conn-name">{{ conn.name }}</span>
                  <label class="switch" @click.stop>
                    <input type="checkbox" v-model="conn.enabled">
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="connection-role">{{ getRoleText(conn.role) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 即将下发的设备名称提示 -->
        <div v-if="newDeviceName && newDeviceName !== rpcConfig.server?.name" class="new-name-preview">
          <span class="preview-label">即将下发的设备名称:</span>
          <span class="preview-value">{{ newDeviceName }}</span>
        </div>

        <!-- 即将下发的从机连接提示（仅在子阵ID改变时显示） -->
        <div v-if="rpcConfig.subarray?.is_subarray_master && hasSubarrayIdChanged && previewConnections.length > 0" class="new-name-preview connections-preview">
          <span class="preview-label">即将下发的从机连接:</span>
          <div class="preview-connections">
            <span
              v-for="(conn, index) in previewConnections"
              :key="index"
              class="preview-conn-tag"
              :class="{ enabled: conn.enabled }"
            >
              {{ conn.name }} {{ conn.enabled ? '(启用)' : '(禁用)' }}
            </span>
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

// RPC配置数据
const rpcConfig = ref({
  enabled: false,
  server: null,
  subarray: null,
  system: null,
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
const slaveId = ref(1)
const newDeviceName = ref('')
const originalSubarrayId = ref('') // 记录原始的子阵ID，用于检测是否改变
const originalConnections = ref([]) // 记录原始从机连接配置，用于子阵ID改变时正确删除旧连接

// 计算属性：子阵已启用从机数量
const enabledSlaveCount = computed(() => {
  if (!rpcConfig.value.subarray?.connections) return 0
  return rpcConfig.value.subarray.connections.filter(c => c.enabled).length
})

// 计算属性：系统已启用子阵主机数量（包含自己）
const enabledSystemMasterCount = computed(() => {
  if (!rpcConfig.value.system?.connections) return 1
  return 1 + rpcConfig.value.system.connections.filter(c => c.enabled).length
})

// 计算属性：系统总子阵主机数量（包含自己）
const totalSystemMasterCount = computed(() => {
  if (!rpcConfig.value.system?.connections) return 1
  return 1 + rpcConfig.value.system.connections.length
})

// 更新新设备名称预览
function updateNewDeviceName() {
  if (!rpcConfig.value.subarray?.subarray_id) {
    newDeviceName.value = ''
    return
  }

  const subarrayNum = rpcConfig.value.subarray.subarray_id.replace('subarray', '')

  if (rpcConfig.value.subarray.is_subarray_master) {
    // 主机命名: master{子阵数字}
    newDeviceName.value = `master${subarrayNum}`
  } else {
    // 从机命名: slave{子阵数字}_{从机ID}
    newDeviceName.value = `slave${subarrayNum}_${slaveId.value}`
  }
}

// 计算属性：从机连接列表（不过滤，后端传什么就显示什么）
const currentSubarrayConnections = computed(() => {
  return rpcConfig.value.subarray?.connections || []
})

// 计算属性：子阵ID是否已改变
const hasSubarrayIdChanged = computed(() => {
  return originalSubarrayId.value &&
         originalSubarrayId.value !== rpcConfig.value.subarray?.subarray_id
})

// 计算属性：即将下发的从机连接预览（不修改原始数据）
// 逻辑：优先使用原始数据中本身就属于新子阵的连接；如果没有，才把旧子阵的连接变换过去
const previewConnections = computed(() => {
  if (!rpcConfig.value.subarray?.is_subarray_master || !rpcConfig.value.subarray?.connections) {
    return []
  }

  const subarrayNum = rpcConfig.value.subarray.subarray_id.replace('subarray', '')
  const connections = rpcConfig.value.subarray.connections

  // 先尝试找出原始数据中本身就属于新子阵的连接
  const newSubarrayConns = connections.filter(conn => {
    const match = conn.name.match(/^slave(\d+)_(\d+)$/)
    return match && match[1] === subarrayNum
  }).map(conn => ({ ...conn }))

  if (newSubarrayConns.length > 0) {
    // 有新子阵的历史连接，只返回它们，避免重复下发
    return newSubarrayConns
  }

  // 没有新子阵的历史连接，才把旧子阵的连接变换成新子阵的
  const oldSubarrayNum = originalSubarrayId.value.replace('subarray', '')
  return connections
    .filter(conn => {
      const match = conn.name.match(/^slave(\d+)_(\d+)$/)
      return match && match[1] === oldSubarrayNum
    })
    .map(conn => {
      const match = conn.name.match(/^slave(\d+)_(\d+)$/)
      const slaveNum = match[2]
      return { ...conn, name: `slave${subarrayNum}_${slaveNum}` }
    })
})

// 添加从机连接
function addSlaveConnection() {
  if (!rpcConfig.value.subarray?.is_subarray_master) return

  if (!rpcConfig.value.subarray.connections) {
    rpcConfig.value.subarray.connections = []
  }

  const subarrayNum = rpcConfig.value.subarray.subarray_id.replace('subarray', '')
  const connections = rpcConfig.value.subarray.connections

  // 找出当前最大的从机编号
  let maxId = 0
  connections.forEach(conn => {
    const match = conn.name.match(/^slave\d+_(\d+)$/)
    if (match) {
      const id = parseInt(match[1])
      if (id > maxId) maxId = id
    }
  })

  const newName = `slave${subarrayNum}_${maxId + 1}`
  connections.push({
    name: newName,
    enabled: false
  })
}

// 删除从机连接（删除编号最大的一个）
function removeSlaveConnection() {
  if (!rpcConfig.value.subarray?.is_subarray_master) return

  const connections = rpcConfig.value.subarray.connections
  if (!connections || connections.length === 0) return

  // 找出编号最大的连接索引
  let maxId = -1
  let maxIndex = -1
  connections.forEach((conn, idx) => {
    const match = conn.name.match(/^slave\d+_(\d+)$/)
    if (match) {
      const id = parseInt(match[1])
      if (id > maxId) {
        maxId = id
        maxIndex = idx
      }
    }
  })

  if (maxIndex >= 0) {
    const removed = connections.splice(maxIndex, 1)
    console.log('[RPC] 删除从机连接:', removed[0]?.name)
  }
}

// 获取角色文本
function getRoleText(role) {
  const roleMap = {
    'slave': '从机',
    'subarray_master': '子阵主机',
    'system_master': '系统主机'
  }
  return roleMap[role] || role || '-'
}

// 获取角色样式类
function getRoleClass(role) {
  if (role === 'subarray_master') return 'subarray-master'
  if (role === 'system_master') return 'system-master'
  return ''
}

// 更新从机名称
function updateSlaveName() {
  if (!rpcConfig.value.subarray || rpcConfig.value.subarray.is_subarray_master) {
    return
  }

  // 从子阵ID中提取数字，例如 "subarray2" -> "2"
  const subarrayIdMatch = rpcConfig.value.subarray.subarray_id?.match(/\d+/)
  const subarrayNum = subarrayIdMatch ? subarrayIdMatch[0] : '1'

  // 生成从机名称，格式: slave_子阵数字_从机ID
  const slaveName = `slave_${subarrayNum}_${slaveId.value}`

  // 更新server.name
  if (rpcConfig.value.server) {
    rpcConfig.value.server.name = slaveName
  }
}

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
      hasLoaded.value = true

      // 记录原始子阵ID和原始连接配置
      if (rpcConfig.value.subarray?.subarray_id) {
        originalSubarrayId.value = rpcConfig.value.subarray.subarray_id
      }
      if (rpcConfig.value.subarray?.connections) {
        originalConnections.value = JSON.parse(JSON.stringify(rpcConfig.value.subarray.connections))
      }

      // 如果是从机，从设备名称中解析从机ID
      if (rpcConfig.value.subarray && !rpcConfig.value.subarray.is_subarray_master && rpcConfig.value.server?.name) {
        const slaveIdMatch = rpcConfig.value.server.name.match(/slave_\d+_(\d+)/)
        if (slaveIdMatch) {
          slaveId.value = parseInt(slaveIdMatch[1])
        }
      }

      // 初始化新设备名称（加载配置时不重命名连接，保持后端原始数据）
      updateNewDeviceName(false)

      console.log('[RPC] 配置已加载:', rpcConfig.value)
    } else if (response.data?.success && response.data?.config) {
      // 兼容旧格式
      rpcConfig.value = response.data.config
      hasLoaded.value = true

      // 记录原始子阵ID和原始连接配置
      if (rpcConfig.value.subarray?.subarray_id) {
        originalSubarrayId.value = rpcConfig.value.subarray.subarray_id
      }
      if (rpcConfig.value.subarray?.connections) {
        originalConnections.value = JSON.parse(JSON.stringify(rpcConfig.value.subarray.connections))
      }

      // 如果是从机，从设备名称中解析从机ID
      if (rpcConfig.value.subarray && !rpcConfig.value.subarray.is_subarray_master && rpcConfig.value.server?.name) {
        const slaveIdMatch = rpcConfig.value.server.name.match(/slave_\d+_(\d+)/)
        if (slaveIdMatch) {
          slaveId.value = parseInt(slaveIdMatch[1])
        }
      }

      // 初始化新设备名称（加载配置时不重命名连接，保持后端原始数据）
      updateNewDeviceName(false)

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

// 保存配置
async function saveConfig() {
  saving.value = true
  saveMessage.value = ''

  try {
    const socket = await getWebSocket()

    // 构建changes对象，只包含需要更新的字段
    const changes = {
      enabled: rpcConfig.value.enabled
    }

    // 如果新设备名称与当前不同，添加server.name配置
    if (newDeviceName.value && newDeviceName.value !== rpcConfig.value.server?.name) {
      changes.server = {
        name: newDeviceName.value
      }
    }

    // 添加子阵配置
    if (rpcConfig.value.subarray) {
      changes.subarray = {
        subarray_id: rpcConfig.value.subarray.subarray_id,
        is_subarray_master: rpcConfig.value.subarray.is_subarray_master
      }

      // 检测子阵ID是否改变
      const subarrayIdChanged = originalSubarrayId.value &&
                                originalSubarrayId.value !== rpcConfig.value.subarray.subarray_id

      if (subarrayIdChanged && rpcConfig.value.subarray.is_subarray_master) {
        // 子阵ID改变了，先删除旧子阵连接，再添加新子阵连接
        const oldSubarrayNum = originalSubarrayId.value.replace('subarray', '')

        // 从原始连接配置中找出旧子阵的从机连接（标记删除）
        const oldConnections = originalConnections.value.filter(c => {
          const match = c.name.match(/^slave(\d+)_(\d+)$/)
          return match && match[1] === oldSubarrayNum
        })

        // 使用预览连接作为即将下发的新连接
        const newConnections = previewConnections.value

        // 构建连接配置：旧连接标记删除，新连接直接添加
        changes.subarray.connections = [
          ...oldConnections.map(c => ({
            name: c.name,
            enabled: false,
            role: c.role,
            _delete: true  // 标记为删除
          })),
          ...newConnections.map(c => ({
            name: c.name,
            enabled: c.enabled,
            role: c.role
          }))
        ]

        console.log('[RPC] 子阵ID改变，删除旧连接:', oldConnections.map(c => c.name))
        console.log('[RPC] 子阵ID改变，添加新连接:', newConnections.map(c => c.name))
      } else {
        // 子阵ID没有改变，正常更新连接配置
        // 需要找出被删除的连接（在 originalConnections 中有，但当前没有），带上 _delete 标记
        const currentConnections = rpcConfig.value.subarray.connections || []
        const currentNames = new Set(currentConnections.map(c => c.name))
        const deletedConnections = originalConnections.value.filter(c => !currentNames.has(c.name))

        changes.subarray.connections = [
          // 被删除的连接标记为删除
          ...deletedConnections.map(c => ({
            name: c.name,
            enabled: false,
            role: c.role,
            _delete: true
          })),
          // 当前保留的连接正常更新
          ...currentConnections.map(c => ({
            name: c.name,
            enabled: c.enabled,
            role: c.role
          }))
        ]

        if (deletedConnections.length > 0) {
          console.log('[RPC] 删除从机连接:', deletedConnections.map(c => c.name))
        }
      }
    }

    // 添加系统配置
    if (rpcConfig.value.system) {
      changes.system = {
        system_id: rpcConfig.value.system.system_id,
        is_system_master: rpcConfig.value.system.is_system_master
      }

      // 添加系统连接配置
      if (rpcConfig.value.system.connections && rpcConfig.value.system.connections.length > 0) {
        changes.system.connections = rpcConfig.value.system.connections.map(c => ({
          name: c.name,
          enabled: c.enabled,
          role: c.role
        }))
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
      saveMessage.value = response.data.message || '配置已保存，重启后生效'
      saveSuccess.value = true

      // 更新原始子阵ID和原始连接配置为当前值
      if (rpcConfig.value.subarray?.subarray_id) {
        originalSubarrayId.value = rpcConfig.value.subarray.subarray_id
      }
      if (rpcConfig.value.subarray?.connections) {
        originalConnections.value = JSON.parse(JSON.stringify(rpcConfig.value.subarray.connections))
      }

      // 如果后端返回了更新后的配置，刷新本地配置
      if (response.data?.config) {
        rpcConfig.value = response.data.config
        // 同步更新原始连接配置
        if (rpcConfig.value.subarray?.connections) {
          originalConnections.value = JSON.parse(JSON.stringify(rpcConfig.value.subarray.connections))
        }
        console.log('[RPC] 配置已更新:', rpcConfig.value)
      } else {
        // 否则重新加载配置
        setTimeout(() => {
          loadConfig()
        }, 1000)
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

    // 3秒后清除消息
    setTimeout(() => {
      saveMessage.value = ''
    }, 3000)
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

.new-device-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fef3c7;
  border-radius: 6px;
  border: 1px solid #fcd34d;
}

.new-device-label {
  font-size: 13px;
  color: #92400e;
  font-weight: 500;
}

.new-device-value {
  font-size: 13px;
  color: #92400e;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
}

.device-info-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 新设备名称预览 */
.new-name-preview {
  background: #fff;
  border-radius: 8px;
  padding: 12px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 12px;
  border: 2px solid #fbbf24;
  background: #fffbeb;
}

.preview-label {
  font-size: 13px;
  color: #92400e;
  font-weight: 600;
}

.preview-value {
  font-size: 14px;
  color: #92400e;
  font-weight: 700;
  font-family: 'SF Mono', Monaco, monospace;
  padding: 4px 12px;
  background: #fef3c7;
  border-radius: 6px;
  border: 1px solid #fcd34d;
}

.connections-preview {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.preview-connections {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-conn-tag {
  font-size: 13px;
  color: #92400e;
  font-weight: 600;
  font-family: 'SF Mono', Monaco, monospace;
  padding: 4px 10px;
  background: #fef3c7;
  border-radius: 6px;
  border: 1px solid #fcd34d;
}

.preview-conn-tag.enabled {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
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

.value-text {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
  padding: 6px 10px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.device-name {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
  padding: 6px 10px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #bae6fd;
  font-family: 'SF Mono', Monaco, monospace;
}

/* 状态徽章 */
.status-badge {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.status-badge.enabled {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

/* 角色徽章 */
.role-badge {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.role-badge.subarray-master {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.role-badge.system-master {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

/* 连接网格 */
.connections-container {
  margin-top: 10px;
}

.connections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
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

.conn-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-conn-btn {
  padding: 4px 10px;
  border: 1px solid #10b981;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #10b981;
  transition: all 0.2s;
}

.add-conn-btn:hover {
  background: #10b981;
  color: #fff;
}

.remove-conn-btn {
  padding: 4px 10px;
  border: 1px solid #ef4444;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #ef4444;
  transition: all 0.2s;
}

.remove-conn-btn:hover {
  background: #ef4444;
  color: #fff;
}

.connection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
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

.conn-status {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  background: #fee2e2;
  color: #991b1b;
  flex-shrink: 0;
}

.conn-status.enabled {
  background: #d1fae5;
  color: #065f46;
}

.connection-role {
  font-size: 11px;
  color: #64748b;
  padding: 3px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  display: inline-block;
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

/* Switch开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
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

  .connections-grid {
    grid-template-columns: 1fr;
  }
}
</style>
