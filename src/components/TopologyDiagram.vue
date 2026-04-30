<template>
  <div class="topology-diagram">
    <div class="topology-svg-container">
      <svg class="topology-svg" viewBox="0 0 900 480">
        <!-- 定义 -->
        <defs>
          <!-- 母线渐变 -->
          <linearGradient id="busGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- 背景网格 -->
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f8fafc" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- AC母线 -->
        <g class="bus-section">
          <!-- 母线主体 - 匹配卡片界面样式 -->
          <rect x="50" y="30" width="800" height="6" rx="3" fill="url(#busGradient)" />
          <!-- 左侧圆点 -->
          <circle cx="50" cy="33" r="6" fill="#d97706" />
          <!-- 右侧圆点 -->
          <circle cx="850" cy="33" r="6" fill="#d97706" />
          <!-- 标签 -->
          <text x="450" y="24" class="bus-label" text-anchor="middle" font-size="11" font-weight="500" fill="#64748b">
            交流母线
          </text>
        </g>
        
        <!-- 设备组 -->
        <g v-for="(device, index) in topologyDevices" :key="device.id">
          <!-- ===== 连接线：母线 → Meter（交流线-黄色）===== -->
          <line 
            :x1="device.x" y1="36" 
            :x2="device.x" y2="70" 
            class="ac-line"
            :class="{ active: device.isMeterOnline }"
            stroke-width="2"
          />
          
          <!-- ===== 第一层：Meter（电表）===== -->
          <g class="meter-section" @click="$emit('device-click', { type: 'meter', device: device.rawData, deviceId: device.id, isMaster: device.isMaster })">
            <!-- Meter图标 -->
            <image 
              :x="device.x - 22" y="75" 
              width="44" height="44" 
              href="/icon/meter.png"
              class="device-icon"
            />
            
            <!-- Meter标签 -->
            <text :x="device.x" y="140" class="device-label" text-anchor="middle" font-size="10" font-weight="700" fill="#7c3aed">
              {{ device.isMaster ? 'METER-M' : 'METER' + device.id }}
            </text>
            
            <!-- 电表数据（显示在图标右下方）- 三相电压和电流 -->
            <g :transform="`translate(${device.x + 30}, 115)`">
              <!-- Ua -->
              <text x="0" y="0" class="phase-label" font-size="9" fill="#64748b">Ua</text>
              <text x="16" y="0" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.voltageA) }}V
              </text>
              <text x="58" y="0" class="current-label" font-size="9" fill="#64748b">Ia</text>
              <text x="72" y="0" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.currentA) }}A
              </text>
              
              <!-- Ub -->
              <text x="0" y="16" class="phase-label" font-size="9" fill="#64748b">Ub</text>
              <text x="16" y="16" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.voltageB) }}V
              </text>
              <text x="58" y="16" class="current-label" font-size="9" fill="#64748b">Ib</text>
              <text x="72" y="16" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.currentB) }}A
              </text>
              
              <!-- Uc -->
              <text x="0" y="32" class="phase-label" font-size="9" fill="#64748b">Uc</text>
              <text x="16" y="32" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.voltageC) }}V
              </text>
              <text x="58" y="32" class="current-label" font-size="9" fill="#64748b">Ic</text>
              <text x="72" y="32" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.currentC) }}A
              </text>
            </g>
            
            <!-- 状态指示点 -->
            <circle :cx="device.x + 20" cy="83" r="4" :fill="device.isMeterOnline ? '#10b981' : '#ef4444'" stroke="#fff" stroke-width="1.5" />
          </g>
          
          <!-- ===== 连接线：Meter → PCS（交流线-黄色）===== -->
          <line 
            :x1="device.x" y1="150" 
            :x2="device.x" y2="185" 
            class="ac-line"
            :class="{ active: device.isPcsOnline }"
            stroke-width="2"
          />
          
          <!-- ===== 第二层：PCS ===== -->
          <g class="pcs-section" @click="$emit('device-click', { type: 'pcs', device: device.rawData, deviceId: device.id, isMaster: device.isMaster })">
            <!-- PCS图标（44x44，和Meter一样大） -->
            <image 
              :x="device.x - 22" y="190" 
              width="44" height="44" 
              href="/icon/pcs.png"
              class="device-icon pcs-icon"
            />
            
            <!-- PCS标签 -->
            <text :x="device.x" y="255" class="device-label" text-anchor="middle" font-size="10" font-weight="700" fill="#2563eb">
              {{ device.isMaster ? 'PCS-M' : 'PCS' + device.id }}
            </text>
            
            <!-- PCS数据（显示在图标右下方，分两行） -->
            <g :transform="`translate(${device.x + 30}, 230)`">
              <!-- 第一行：功率 -->
              <text x="0" y="0" class="data-label" font-size="9" fill="#64748b">P</text>
              <text x="10" y="0" class="data-value power" font-size="11" font-weight="700" fill="#d97706">
                {{ formatNumber(device.power) }}kW
              </text>
              
              <!-- 第二行：状态 -->
              <text x="0" y="16" class="data-label" font-size="9" fill="#64748b">状态</text>
              <text x="24" y="16" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ device.pcsStatus }}
              </text>
            </g>
            
            <!-- 状态指示点 -->
            <circle :cx="device.x + 20" cy="198" r="4" :fill="device.isPcsOnline ? '#10b981' : '#ef4444'" stroke="#fff" stroke-width="1.5" />
          </g>
          
          <!-- ===== 连接线：PCS → BCMU（直流线-蓝色）===== -->
          <line 
            :x1="device.x" y1="265" 
            :x2="device.x" y2="300" 
            class="dc-line"
            :class="{ active: device.isBcmuOnline }"
            stroke-width="2"
          />
          
          <!-- ===== 第三层：BCMU（电池图形）===== -->
          <g class="bcmu-section" @click="$emit('device-click', { type: 'bcmu', device: device.rawData, deviceId: device.id, isMaster: device.isMaster })">
            <!-- 电池外壳 -->
            <rect 
              :x="device.x - 25" y="305" 
              width="50" height="70" rx="6" 
              fill="#f8fafc" 
              stroke="#e2e8f0" 
              stroke-width="1.5"
            />
            
            <!-- 电池正极 -->
            <rect :x="device.x - 8" y="299" width="16" height="8" rx="2" fill="#94a3b8" />
            
            <!-- 电池电量填充 -->
            <rect 
              :x="device.x - 22" 
              :y="305 + 64 - (device.soc / 100) * 60" 
              width="44" 
              :height="(device.soc / 100) * 60" 
              rx="4" 
              :fill="device.batteryColor"
              opacity="0.9"
            />
            
            <!-- 电池边框 -->
            <rect 
              :x="device.x - 25" y="305" 
              width="50" height="70" rx="6" 
              fill="none" 
              stroke="#cbd5e1" 
              stroke-width="1.5"
            />
            
            <!-- 电量百分比文字 -->
            <text 
              :x="device.x" 
              :y="305 + 40" 
              class="battery-percent" 
              text-anchor="middle" 
              font-size="16" 
              font-weight="800" 
              fill="#fff"
              style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);"
            >
              {{ Math.round(device.soc || 0) }}%
            </text>
            
            <!-- BCMU标签 -->
            <text :x="device.x" y="390" class="device-label" text-anchor="middle" font-size="10" font-weight="700" fill="#059669">
              {{ device.isMaster ? 'BCMU-M' : 'BCMU' + device.id }}
            </text>
            
            <!-- 状态指示点 -->
            <circle :cx="device.x + 22" cy="312" r="3.5" :fill="device.isBcmuOnline ? '#10b981' : '#ef4444'" stroke="#fff" stroke-width="1.5" />
            
            <!-- 电池数据（显示在图标右下方，换行显示） -->
            <g :transform="`translate(${device.x + 32}, 320)`">
              <!-- 第一行：总电压 -->
              <text x="0" y="0" class="data-label" font-size="9" fill="#64748b">U</text>
              <text x="10" y="0" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.totalVoltage) }}V
              </text>
              
              <!-- 第二行：电流 -->
              <text x="0" y="16" class="data-label" font-size="9" fill="#64748b">I</text>
              <text x="10" y="16" class="data-value" font-size="10" font-weight="600" fill="#334155">
                {{ formatNumber(device.current) }}A
              </text>
            </g>
          </g>
        </g>
        
        <!-- 图例：线型说明（放在底部） -->
        <g transform="translate(50, 430)">
          <line x1="0" y1="8" x2="35" y2="8" stroke="#f59e0b" stroke-width="2" />
          <text x="40" y="12" font-size="10" fill="#64748b">交流线 AC</text>
          
          <line x1="110" y1="8" x2="145" y2="8" stroke="#3b82f6" stroke-width="2" />
          <text x="150" y="12" font-size="10" fill="#64748b">直流线 DC</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  devices: {
    type: Array,
    default: () => []
  },
  config: {
    type: Object,
    default: () => ({
      clusterName: '',
      masterName: '',
      slaves: [],
      slaveStatusMap: {}
    })
  }
})

defineEmits(['device-click'])

// 拓扑图设备数据（包含主机和所有从机）
const topologyDevices = computed(() => {
  const list = []
  
  // 按配置生成设备列表（主机 + 所有 enabled=true 的从机）
  const enabledSlaves = props.config.slaves.filter(s => s.enabled)
  
  // 总共有多少个设备（主机算一个）
  const totalDevices = 1 + enabledSlaves.length
  if (totalDevices <= 1) return list
  
  // 设备宽度约200px，均匀分布
  const deviceWidth = 200
  const totalWidth = totalDevices * deviceWidth
  const startX = (900 - totalWidth) / 2 + deviceWidth / 2
  
  // 1. 首先添加主机（id=0）
  const masterData = props.devices.find(d => d.role === 'master')
  const masterOnline = masterData?.status === 'online'
  const masterSoc = masterData?.bms?.soc || 0
  const masterVoltage = masterData?.bms?.voltage || 0
  const masterCurrent = masterData?.bms?.current || 0
  
  list.push({
    id: 0,
    x: startX,
    isMaster: true,
    
    // Meter数据（三相）- 主机数据
    voltageA: masterVoltage * 0.98 / 10 || 220,
    voltageB: masterVoltage / 10 || 220,
    voltageC: masterVoltage * 1.02 / 10 || 220,
    currentA: masterCurrent * 0.95 || 10,
    currentB: masterCurrent || 10,
    currentC: masterCurrent * 1.05 || 10,
    isMeterOnline: masterOnline,
    
    // PCS数据
    power: masterData?.pcs?.power || 0,
    pcsStatus: getPcsStatusText(masterData?.pcs?.status),
    isPcsOnline: masterOnline,
    
    // BCMU数据
    soc: masterSoc,
    totalVoltage: masterVoltage,
    current: masterCurrent,
    isBcmuOnline: masterOnline,
    batteryColor: getBatteryColor(masterSoc),
    
    rawData: masterData || { role: 'master', slave_id: 0 }
  })
  
  // 2. 然后添加所有从机
  enabledSlaves.forEach((slaveConfig, index) => {
    // 查找对应的数据
    const slaveData = props.devices.find(d => d.role === 'slave' && d.slave_id === slaveConfig.id)
    
    // 使用 status.connections 中的在线状态
    const isOnline = props.config.slaveStatusMap[slaveConfig.id] === true
    const soc = slaveData?.bms?.soc || 0
    
    // 模拟三相数据
    const voltage = slaveData?.bms?.voltage || 0
    const current = slaveData?.bms?.current || 0
    
    list.push({
      id: slaveConfig.id,
      x: startX + (index + 1) * deviceWidth,
      isMaster: false,
      
      // Meter数据（三相）
      voltageA: voltage * 0.98 / 10 || 220,
      voltageB: voltage / 10 || 220,
      voltageC: voltage * 1.02 / 10 || 220,
      currentA: current * 0.95 || 10,
      currentB: current || 10,
      currentC: current * 1.05 || 10,
      isMeterOnline: isOnline,
      
      // PCS数据
      power: slaveData?.pcs?.power || 0,
      pcsStatus: getPcsStatusText(slaveData?.pcs?.status),
      isPcsOnline: isOnline,
      
      // BCMU数据
      soc: soc,
      totalVoltage: voltage,
      current: current,
      isBcmuOnline: isOnline,
      batteryColor: getBatteryColor(soc),
      
      rawData: slaveData || { role: 'slave', slave_id: slaveConfig.id }
    })
  })
  
  return list
})

// 获取电池颜色
function getBatteryColor(soc) {
  if (soc <= 20) return '#ef4444'
  if (soc <= 40) return '#f97316'
  if (soc <= 60) return '#eab308'
  if (soc <= 80) return '#84cc16'
  return '#10b981'
}

// 获取PCS状态文本
function getPcsStatusText(status) {
  const map = {
    'charging': '充电中',
    'discharging': '放电中',
    'standby': '待机',
    'offline': '离线',
    'fault': '故障',
    'running': '运行中'
  }
  return map[status] || status || '待机'
}

// 格式化数字
function formatNumber(value) {
  if (value === undefined || value === null || isNaN(value)) return '--'
  return value.toFixed(0)
}
</script>

<style scoped>
.topology-diagram {
  height: 100%;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.topology-svg-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px;
  min-height: 0;
}

.topology-svg {
  width: 100%;
  height: 100%;
  max-width: 900px;
  max-height: 460px;
}

/* 母线样式 */
.bus-section {
  filter: drop-shadow(0 1px 2px rgba(245, 158, 11, 0.3));
}

/* 交流线 - 黄色/橙色 */
.ac-line {
  fill: none;
  stroke: #f59e0b;
  stroke-linecap: round;
}

.ac-line.active {
  stroke: #10b981;
}

/* 直流线 - 蓝色 */
.dc-line {
  fill: none;
  stroke: #3b82f6;
  stroke-linecap: round;
}

.dc-line.active {
  stroke: #2563eb;
}

/* 设备图标 */
.device-icon {
  cursor: pointer;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

/* 设备标签 */
.device-label {
  font-size: 10px;
  font-weight: 700;
}

/* 相标签 */
.phase-label {
  font-size: 9px;
  font-weight: 600;
  fill: #059669;
}

.current-label {
  font-size: 9px;
  font-weight: 600;
  fill: #2563eb;
}

/* 数据标签和数值 */
.data-label {
  font-size: 9px;
  fill: #64748b;
}

.data-value {
  font-size: 10px;
  font-weight: 600;
  fill: #334155;
}

.data-value.power {
  fill: #d97706;
  font-weight: 700;
}

/* 电池百分比 */
.battery-percent {
  font-size: 16px;
  font-weight: 800;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* 响应式 */
@media (max-width: 768px) {
  .topology-svg {
    transform: scale(0.85);
    transform-origin: center center;
  }
}
</style>
