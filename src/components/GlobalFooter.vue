<template>
  <div class="global-footer">
    <div class="footer-item">
      <span class="footer-label">工作状态</span>
      <span class="footer-value" :class="getWorkStateClass">{{ systemData.workState }}</span>
    </div>
    <div class="footer-divider"></div>
    <div class="footer-item">
      <span class="footer-label">工作模式</span>
      <span class="footer-value">{{ systemData.workMode }}</span>
    </div>
    <div class="footer-divider"></div>
    <div class="footer-item">
      <span class="footer-label">控制模式</span>
      <span class="footer-value">{{ systemData.controlMode }}</span>
    </div>
    <div class="footer-divider"></div>
    <div class="footer-item">
      <span class="footer-label">系统模式</span>
      <span class="footer-value">{{ systemData.systemMode }}</span>
    </div>
    <div class="footer-divider"></div>
    <div class="footer-item">
      <span class="footer-label">从机在线</span>
      <span class="footer-value online">{{ systemData.onlineCount }}</span>
    </div>
    <div class="footer-divider"></div>
    <div class="footer-item">
      <span class="footer-label">从机离线</span>
      <span class="footer-value offline">{{ systemData.offlineCount }}</span>
    </div>
    <div class="footer-divider"></div>
    <!-- 连接状态和设置 -->
    <div class="footer-item connection-item" @click="openSettings">
      <span class="footer-label">连接状态</span>
      <span class="footer-value connection-status" :class="wsStatus">
        <span class="status-dot" :class="wsStatus"></span>
        {{ wsStatusText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGlobalWebSocket } from '../composables/useGlobalWebSocket.js'

const emit = defineEmits(['open-settings'])

// 使用全局WebSocket
const { wsStatus, wsStatusText, systemData } = useGlobalWebSocket()

// 工作状态样式
const getWorkStateClass = computed(() => {
  const state = systemData.value.workState
  if (state === '运行中' || state === '正常') return 'state-running'
  if (state === '停止' || state === '故障') return 'state-stopped'
  if (state === '待机') return 'state-standby'
  return ''
})

// 打开设置
function openSettings() {
  emit('open-settings')
}
</script>

<style scoped>
.global-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 16px;
  z-index: 9999;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.footer-label {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.footer-value {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.footer-value.online {
  color: #4ade80;
}

.footer-value.offline {
  color: #f87171;
}

.footer-value.state-running {
  color: #4ade80;
}

.footer-value.state-stopped {
  color: #f87171;
}

.footer-value.state-standby {
  color: #fbbf24;
}

/* 连接状态样式 */
.connection-item {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.connection-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.connected {
  background: #4ade80;
  box-shadow: 0 0 4px #4ade80;
}

.status-dot.connecting {
  background: #fbbf24;
  animation: blink 1s infinite;
}

.status-dot.disconnected,
.status-dot.error {
  background: #f87171;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.connection-status.connected {
  color: #4ade80;
}

.connection-status.connecting {
  color: #fbbf24;
}

.connection-status.disconnected,
.connection-status.error {
  color: #f87171;
}

.footer-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
}

/* 响应式 */
@media (max-width: 900px) {
  .global-footer {
    gap: 8px;
    padding: 0 10px;
    font-size: 11px;
  }
  
  .footer-label {
    font-size: 10px;
  }
  
  .footer-value {
    font-size: 11px;
  }
  
  .footer-divider {
    height: 14px;
  }
}

@media (max-width: 768px) {
  .global-footer {
    gap: 6px;
    padding: 0 8px;
    flex-wrap: wrap;
    height: auto;
    min-height: 40px;
    padding-top: 6px;
    padding-bottom: 6px;
  }
}
</style>
