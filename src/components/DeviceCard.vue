<template>
  <div class="device-branch">
    <div class="connection-line"></div>
    <div 
      class="device-node"
      :class="[nodeClass]"
      @click="$emit('click')"
    >
      <!-- 头部 -->
      <div class="node-header">
        <div class="header-left">
          <div class="header-tags">
            <span class="node-role">{{ roleText }}</span>
          </div>
        </div>
        <span class="work-status" :class="workStatusClass">{{ workStatusText }}</span>
      </div>
      
      <!-- PCS模块 -->
      <div class="pcs-module">
        <div class="pcs-header">
          <span>⚡</span> PCS
          <span 
            class="status-dot-inline" 
            :class="pcsStatusClass"
            style="margin-left: auto;"
          ></span>
        </div>
        <div class="pcs-data">
          <div class="pcs-item">
            <div class="pcs-value power">{{ formatValue(deviceData.pcs?.power, 'kW') }}</div>
            <div class="pcs-label">功率</div>
          </div>
          <div class="pcs-item">
            <div class="pcs-value">{{ pcsStatusText }}</div>
            <div class="pcs-label">状态</div>
          </div>
          <div class="pcs-item">
            <div class="pcs-value temp">{{ formatValue(deviceData.pcs?.temperature, '°C') }}</div>
            <div class="pcs-label">温度</div>
          </div>
        </div>
      </div>

      <!-- BMS模块 -->
      <div class="bms-module">
        <div class="bms-header">
          <span>🔋</span> BCMU
          <span 
            class="status-dot-inline" 
            :class="bmsStatusClass"
            style="margin-left: auto;"
          ></span>
        </div>
        <div class="bms-content">
          <div class="battery-display">
            <div class="battery-icon">
              <div 
                class="battery-level" 
                :class="batteryLevelClass"
                :style="{ height: (deviceData.bms?.soc || 0) + '%' }"
              ></div>
            </div>
            <div class="battery-soc">{{ formatValue(deviceData.bms?.soc, '%') }}</div>
          </div>
          <div class="bms-params">
            <div class="bms-param">
              <div class="param-icon volt">⚡</div>
              <div class="param-text">
                <div class="param-value volt">{{ formatValue(deviceData.bms?.voltage, 'V') }}</div>
                <div class="param-label">总电压</div>
              </div>
            </div>
            <div class="bms-param">
              <div class="param-icon curr">🔌</div>
              <div class="param-text">
                <div class="param-value curr">{{ formatValue(deviceData.bms?.current, 'A') }}</div>
                <div class="param-label">电流</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="node-footer">
        <div class="node-ip">🌐 {{ deviceData.ip_address || '--' }}</div>
        <div class="node-name-bottom">{{ displayName }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  device: {
    type: Object,
    default: () => ({})
  },
  type: {
    type: String,
    default: 'slave' // 'master' 或 'slave'
  },
  name: {
    type: String,
    default: '' // 配置中的名称
  },
  configuredId: {
    type: Number,
    default: null // 配置中的从机ID
  }
})

defineEmits(['click'])

// 设备数据（如果传入的device为空，使用默认值）
const deviceData = computed(() => {
  return props.device || {}
})

// 显示的名称（优先使用配置中的名称）
const displayName = computed(() => {
  if (props.name) {
    return props.name
  }
  return deviceData.value.device_name || (props.type === 'master' ? '主机' : '从机')
})

// 节点样式类
const nodeClass = computed(() => {
  const status = deviceData.value.status
  if (status === 'offline') return 'offline'
  return props.type
})

// 工作状态文本
const workStatusText = computed(() => {
  const workState = deviceData.value.work_state
  if (workState === 0) return '初始化'
  if (workState === 1) return '运行'
  if (workState === 2) return '故障'

  // 兜底：根据设备状态判断
  const status = deviceData.value.status
  if (status === 'offline') return '离线'
  if (status === 'online') return '运行中'
  return '--'
})

// 工作状态样式类
const workStatusClass = computed(() => {
  const workState = deviceData.value.work_state
  if (workState === 0) return 'init'
  if (workState === 1) return 'running'
  if (workState === 2) return 'fault'

  const status = deviceData.value.status
  if (status === 'offline') return 'offline'
  if (status === 'online') return 'online'
  return ''
})

// 角色文本
const roleText = computed(() => {
  return deviceData.value.role || props.type || 'slave'
})

// 标签文本
const badgeText = computed(() => {
  if (props.type === 'master') return '主机'
  // 使用配置的ID或设备数据的slave_id
  const id = props.configuredId || deviceData.value.slave_id || 0
  return `从机#${id}`
})

// PCS状态
const pcsStatusClass = computed(() => {
  return deviceData.value.status === 'online' ? 'online' : 'offline'
})

// BMS状态
const bmsStatusClass = computed(() => {
  return deviceData.value.bms?.status === 'online' ? 'online' : 'offline'
})

// PCS状态文本
const pcsStatusText = computed(() => {
  const map = {
    'charging': '充电',
    'discharging': '放电',
    'standby': '待机',
    'offline': '离线'
  }
  return map[deviceData.value.pcs?.status] || deviceData.value.pcs?.status || '--'
})

// 运行状态文本
const runningStatusText = computed(() => {
  const map = {
    'normal': '正常',
    'warning': '告警',
    'error': '故障',
    'offline': '离线'
  }
  return map[deviceData.value.pcs?.running_status] || deviceData.value.pcs?.running_status || '--'
})

// 电池电量等级
const batteryLevelClass = computed(() => {
  const soc = deviceData.value.bms?.soc || 0
  if (soc < 30) return 'low'
  if (soc < 70) return 'medium'
  return ''
})

// 格式化数值
function formatValue(value, unit) {
  if (value === undefined || value === null) return '--'
  return value.toFixed(1) + unit
}
</script>

<style scoped>
.device-branch {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 200px;
  min-width: 160px;
}

.connection-line {
  width: 2px;
  height: 40px;
  background: linear-gradient(180deg, #d97706 0%, #94a3b8 100%);
  position: relative;
}

.connection-line::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 6px solid #d97706;
}

.device-node {
  width: 100%;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.device-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.device-node.master {
  border-color: #10b981;
  border-left-width: 4px;
  cursor: pointer;
}

.device-node.master:hover {
  border-color: #059669;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2);
}

.device-node.master:active {
  transform: translateY(0);
}

.device-node.slave {
  border-color: #3b82f6;
  border-left-width: 4px;
  cursor: pointer;
}

.device-node.slave:hover {
  border-color: #2563eb;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
}

.device-node.slave:active {
  transform: translateY(0);
}

.device-node.offline {
  border-color: #ef4444;
  opacity: 0.7;
  background: #f1f5f9;
}

/* 头部 */
.node-header {
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.node-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.header-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-role {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.device-node.master .node-role {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.device-node.slave .node-role {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.device-node.offline .node-role {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.work-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  margin-left: auto;
  flex-shrink: 0;
  align-self: flex-start;
}

.work-status.online {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.work-status.offline {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.work-status.init {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
}

.work-status.running {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.work-status.fault {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  font-weight: 600;
}

/* PCS模块 */
.pcs-module {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.pcs-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.pcs-data {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pcs-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pcs-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.pcs-value.power { color: #d97706; }
.pcs-value.temp { color: #dc2626; }

.pcs-label {
  font-size: 10px;
  color: #64748b;
}

/* BMS模块 */
.bms-module {
  padding: 10px 12px;
  background: #ffffff;
}

.bms-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.bms-content {
  display: flex;
  gap: 10px;
}

.battery-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.battery-icon {
  width: 28px;
  height: 44px;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  position: relative;
  background: #fff;
  overflow: hidden;
}

.battery-icon::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 3px;
  background: #cbd5e1;
  border-radius: 2px;
}

.battery-level {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
  transition: height 0.3s ease;
}

.battery-level.low {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.battery-level.medium {
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
}

.battery-soc {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
}

.bms-params {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bms-param {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.param-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.param-icon.volt { background: rgba(59, 130, 246, 0.1); }
.param-icon.curr { background: rgba(245, 158, 11, 0.1); }

.param-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.param-value {
  font-weight: 600;
  color: #1e293b;
}

.param-value.volt { color: #2563eb; }
.param-value.curr { color: #d97706; }

.param-label {
  font-size: 9px;
  color: #64748b;
}

/* 底部信息 */
.node-footer {
  padding: 8px 12px;
  background: #f1f5f9;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;
  color: #64748b;
}

.node-ip {
  display: flex;
  align-items: center;
  gap: 4px;
}

.node-name-bottom {
  font-size: 10px;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 状态指示 */
.status-dot-inline {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot-inline.online { background: #10b981; }
.status-dot-inline.offline { background: #ef4444; }
.status-dot-inline.warning { background: #f59e0b; }
</style>
