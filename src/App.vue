<template>
  <div class="app-container">
    <router-view />
    <GlobalFooter @open-settings="showSettings = true" />
    
    <!-- 全局连接设置对话框 -->
    <div v-if="showSettings" class="settings-modal" @click.self="showSettings = false">
      <div class="settings-panel">
        <div class="settings-header">
          <h3>🔌 连接设置</h3>
          <button class="close-btn" @click="showSettings = false">×</button>
        </div>
        <div class="settings-body">
          <div class="form-group">
            <label>WebSocket IP 地址</label>
            <input v-model="settings.ip" type="text" placeholder="例如: 192.168.7.37" />
          </div>
          <div class="form-group">
            <label>WebSocket 端口</label>
            <input v-model.number="settings.port" type="number" placeholder="例如: 9713" />
          </div>
          <div class="form-group">
            <label>当前连接地址</label>
            <div class="current-url">{{ wsUrl }}</div>
          </div>
        </div>
        <div class="settings-footer">
          <button class="btn-secondary" @click="showSettings = false">取消</button>
          <button class="btn-primary" @click="saveSettings">保存并重新连接</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalWebSocket } from './composables/useGlobalWebSocket.js'
import GlobalFooter from './components/GlobalFooter.vue'

const router = useRouter()
const { settings, wsUrl, systemData, connectWebSocket, saveSettings: wsSaveSettings } = useGlobalWebSocket()

// 设置对话框显示状态
const showSettings = ref(false)

// 保存设置
function saveSettings() {
  if (!settings.value.ip || !settings.value.port) {
    alert('请填写完整的IP地址和端口')
    return
  }
  wsSaveSettings(settings.value)
  showSettings.value = false
}

// 页面加载时连接WebSocket
onMounted(() => {
  connectWebSocket()
})

// deviceinfo 响应加载后，根据角色矫正路由
watch(() => systemData.value.cluster?.system_id, (systemId) => {
  if (!systemId) return
  
  const isSystemMaster = systemData.value.cluster?.is_system_master
  const isSubarrayMaster = systemData.value.cluster?.is_subarray_master
  const subarrayId = systemData.value.cluster?.cluster_id
  const currentRoute = router.currentRoute.value
  
  if (isSystemMaster) {
    // 系统主机：从机首页需要跳回系统首页
    if (currentRoute.name === 'SlaveHome') {
      router.replace({ name: 'SystemHome' })
    }
  } else if (isSubarrayMaster) {
    // 子阵主机：应该在子阵详情页
    if (currentRoute.name === 'SystemHome' || currentRoute.name === 'SlaveHome') {
      router.replace({
        name: 'SubarrayHome',
        params: { clusterId: subarrayId || 'subarray1' }
      })
    }
  } else {
    // 从机：应该在从机首页
    if (currentRoute.name !== 'SlaveHome') {
      router.replace({ name: 'SlaveHome', params: { id: 1 } })
    }
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f7fa;
}

/* 为所有页面预留底栏空间 */
.app-container {
  min-height: 100vh;
  padding-bottom: 40px;
}

/* 设置对话框样式 */
.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.settings-panel {
  background: #ffffff;
  border-radius: 12px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.settings-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #334155;
}

.settings-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.current-url {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #64748b;
  font-family: 'SF Mono', Monaco, monospace;
  word-break: break-all;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.btn-primary {
  padding: 8px 16px;
  border: none;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
</style>
