<template>
  <div class="slave-home">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">←</button>
        <span class="header-title">从机首页 - {{ slaveName }}</span>
      </div>
      <div class="device-info">
        <span class="info-tag">{{ systemId }}/{{ clusterId }}</span>
        <span class="info-tag">ID: {{ slaveId }}</span>
        <span class="info-tag">IP: {{ slaveIp || '--' }}</span>
        <span class="info-tag">SN: {{ slaveSn || '--' }}</span>
      </div>
    </header>

    <!-- 拓扑展示区域 -->
    <div class="topology-section" v-if="hasTopologyData">
      <div class="topology-svg-container">
        <svg class="topology-svg" viewBox="0 0 900 600">
          <!-- 绘制连线 -->
          <g v-for="(line, index) in svgLines" :key="'line-'+index">
            <line 
              :x1="line.x1" :y1="line.y1" 
              :x2="line.x2" :y2="line.y2"
              :stroke="line.is_active ? '#67c23a' : '#c0c4cc'"
              stroke-width="2"
              stroke-linecap="round"
            />
          </g>
          
          <!-- 绘制设备节点 -->
          <g v-for="device in positionedDevices" :key="device.name">
            <!-- 图标组 -->
            <g @click="goToDeviceDetail(device)" class="device-group">
              <!-- BCMU电池图标（如果是电池类型） -->
              <g v-if="device.type === 'bms' || device.type === 'bcmu'">
                <!-- 电池外壳 -->
                <rect 
                  :x="device.x - 20" :y="device.y - 30"
                  width="40" height="60" rx="4"
                  fill="#f5f5f5"
                  stroke="#67c23a"
                  stroke-width="2"
                />
                <!-- 电池正极 -->
                <rect 
                  :x="device.x - 6" :y="device.y - 36"
                  width="12" height="6" rx="2"
                  fill="#67c23a"
                />
                <!-- 电池电量填充 -->
                <rect 
                  :x="device.x - 16" 
                  :y="device.y + 26 - (device.soc / 100) * 48"
                  width="32" 
                  :height="(device.soc / 100) * 48"
                  rx="2"
                  fill="#67c23a"
                  opacity="0.8"
                />
                <!-- SOC文字 -->
                <text 
                  :x="device.x" :y="device.y + 5"
                  text-anchor="middle"
                  font-size="12"
                  font-weight="bold"
                  fill="#333"
                >{{ device.soc }}%</text>
              </g>
              
              <!-- junction 用小圆点表示 -->
              <g v-else-if="device.type === 'junction'">
                <circle 
                  :cx="device.x" :cy="device.y"
                  r="8"
                  fill="#1890ff"
                  stroke="#fff"
                  stroke-width="2"
                />
              </g>
              
              <!-- 其他设备使用图片 -->
              <image 
                v-else
                :x="device.x - 25" :y="device.y - 25"
                width="50" height="50"
                :href="device.img"
              />
              
              <!-- 设备名称（junction 不显示名称） -->
              <text 
                v-if="device.type !== 'junction'"
                :x="device.x" :y="device.y + 40" 
                text-anchor="middle" 
                font-size="12" 
                fill="#333"
                font-weight="500"
              >{{ device.title }}</text>
              
              <!-- 状态点 -->
              <circle 
                :cx="device.x + 20" :cy="device.y - 20"
                r="5"
                :fill="device.isActive ? '#67c23a' : '#f56c6c'"
                stroke="#fff"
                stroke-width="1"
              />
            </g>
            
            <!-- 数据显示（根据设备位置自适应显示在左侧或右侧，junction 不显示） -->
            <g v-if="device.type !== 'junction'" :transform="`translate(${device.x > 500 ? device.x - 120 : device.x + 35}, ${device.y - 20})`">
              <text
                v-for="(data, idx) in device.dataList"
                :key="idx"
                x="0"
                :y="idx * 18"
                font-size="10"
                fill="#666"
                :text-anchor="device.x > 500 ? 'end' : 'start'"
              >{{ data.label }}: <tspan fill="#1890ff" font-weight="500">{{ data.value }}</tspan></text>
            </g>
          </g>
        </svg>
      </div>
      
      <!-- 能量信息面板 -->
      <div class="energy-panel" v-if="energyData?.gEmsEnergyInfo">
        <div class="energy-panel-title">能量统计</div>
        <div class="energy-grid">
          <div class="energy-item">
            <div class="energy-label">储能总充电</div>
            <div class="energy-value charge">{{ formatEnergy(energyData.gEmsEnergyInfo[ENERGY_INDEX.BatTotalCharge], 'MWh') }}</div>
          </div>
          <div class="energy-item">
            <div class="energy-label">储能总放电</div>
            <div class="energy-value discharge">{{ formatEnergy(energyData.gEmsEnergyInfo[ENERGY_INDEX.BatTotalDischarge], 'MWh') }}</div>
          </div>
          <div class="energy-item">
            <div class="energy-label">当日充电量</div>
            <div class="energy-value charge">{{ formatEnergy(energyData.gEmsEnergyInfo[ENERGY_INDEX.BatTodayCharge], 'kWh') }}</div>
          </div>
          <div class="energy-item">
            <div class="energy-label">当日放电量</div>
            <div class="energy-value discharge">{{ formatEnergy(energyData.gEmsEnergyInfo[ENERGY_INDEX.BatTodayDischarge], 'kWh') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div v-else class="no-data">
      <div class="no-data-text">暂无拓扑数据</div>
      <button class="back-btn-large" @click="goBack">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGlobalWebSocket } from '../composables/useGlobalWebSocket.js'

// 导入图标
import imgPowerGrid from '/icon/电网.png'
import pcsImg from '/icon/pcs.png'
import loadImg from '/icon/负载.png'
import STSImg from '/icon/STS.png'

const route = useRoute()
const router = useRouter()

// 使用全局WebSocket
const { 
  systemData, 
  startSlaveHomeTimer, 
  stopSlaveHomeTimer,
  startSystemInfoTimer,
  stopSystemInfoTimer,
  sendMessage,
  onMessage
} = useGlobalWebSocket()

const slaveId = computed(() => route.params.id || '0')
const slaveName = computed(() => route.query.name || `从机#${slaveId.value}`)
const slaveIp = computed(() => route.query.ip || '')
const slaveSn = computed(() => route.query.sn || '')
const clusterId = computed(() => route.query.clusterId || '1')
const systemId = computed(() => systemData.value.cluster?.system_id || '--')

const topologyData = ref(null)
const energyData = ref(null)

// 能量信息索引映射 (对应后端 Energy_49_Enum)
const ENERGY_INDEX = {
  PcsTodayCharge: 0,      // PCS当日充电量 kWh
  PcsTodayDischarge: 1,   // PCS当日放电量 kWh
  PcsTotalCharge: 2,      // PCS累计充电量 MWh
  PcsTotalDischarge: 3,   // PCS累计放电量 MWh
  BatTodayCharge: 8,      // 电池当日充电量 kWh
  BatTodayDischarge: 9,   // 电池当日放电量 kWh
  BatTotalCharge: 10,     // 电池累计充电量 MWh
  BatTotalDischarge: 11   // 电池累计放电量 MWh
}

// 格式化能量数值
function formatEnergy(value, unit) {
  if (value === undefined || value === null || isNaN(value)) return '--'
  return Number(value).toFixed(2) + ' ' + unit
}

// 新布局 - 根据用户要求
// 电网在左侧，横线向右连接到负载
// 横线中间向下分叉到 STS
// STS → PCS → BCMU 垂直排列
const LAYOUT = {
  grid: { x: 150, y: 120 },    // 电网 - 左侧，横线起点
  load: { x: 650, y: 120 },    // 负载 - 右侧，横线终点（调整位置留出数据显示空间）
  junction: { x: 400, y: 120 },// 分支点 - 横线中间，向下分叉
  sts: { x: 400, y: 240 },     // STS - 分支点下方
  pcs: { x: 400, y: 340 },     // PCS - STS下方
  bms: { x: 400, y: 440 }      // BMS/BCMU - PCS下方
}

const hasTopologyData = computed(() => {
  return topologyData.value && topologyData.value.connection && topologyData.value.devices
})

// 处理后的设备列表
const positionedDevices = computed(() => {
  if (!topologyData.value || !topologyData.value.devices) return []
  
  const devices = []
  const devs = topologyData.value.devices
  
  // 处理电网
  if (devs.grid && devs.grid.length > 0) {
    const g = devs.grid[0]
    devices.push({
      name: 'grid',
      title: '电网',
      type: 'grid',
      x: LAYOUT.grid.x,
      y: LAYOUT.grid.y,
      img: imgPowerGrid,
      isActive: g.status === 'Connected' || g.status === 'Running',
      soc: 0,
      dataList: [
        { label: 'Ua', value: g.phase_a_voltage !== undefined ? g.phase_a_voltage.toFixed(1) + 'V' : '--' },
        { label: 'Ub', value: g.phase_b_voltage !== undefined ? g.phase_b_voltage.toFixed(1) + 'V' : '--' },
        { label: 'Uc', value: g.phase_c_voltage !== undefined ? g.phase_c_voltage.toFixed(1) + 'V' : '--' }
      ],
      raw: g
    })
  }
  
  // 处理负载
  if (devs.load && devs.load.length > 0) {
    const l = devs.load[0]
    devices.push({
      name: 'load',
      title: '负载',
      type: 'load',
      x: LAYOUT.load.x,
      y: LAYOUT.load.y,
      img: loadImg,
      isActive: l.status === 'Connected' || l.status === 'Running',
      soc: 0,
      dataList: [
        { label: '功率', value: l.active_power !== undefined ? l.active_power.toFixed(1) + 'kW' : '--' }
      ],
      raw: l
    })
  }
  
  // 处理 junction（连接 sts 和 load）
  if (devs.junction && devs.junction.length > 0) {
    const j = devs.junction[0]
    devices.push({
      name: j.name,
      title: '节点',
      type: 'junction',
      x: LAYOUT.junction.x,
      y: LAYOUT.junction.y,
      img: '', // junction 不需要图标，用圆圈表示
      isActive: true,
      soc: 0,
      dataList: [],
      raw: j
    })
  }
  
  // 处理STS（放在PCS上方）
  if (devs.sts && devs.sts.length > 0) {
    const s = devs.sts[0]
    devices.push({
      name: s.name,
      title: s.name,
      type: 'sts',
      x: LAYOUT.sts.x,
      y: LAYOUT.sts.y,
      img: STSImg,
      isActive: s.status === 'Connected' || s.status === 'Running',
      soc: 0,
      dataList: [
        { label: '状态', value: s.closed === false ? '断开' : '闭合' }
      ],
      raw: s
    })
  }
  
  // 处理PCS（中间）
  if (devs.pcs && devs.pcs.length > 0) {
    const p = devs.pcs[0]
    devices.push({
      name: p.name,
      title: p.name,
      type: 'pcs',
      x: LAYOUT.pcs.x,
      y: LAYOUT.pcs.y,
      img: pcsImg,
      isActive: p.status === 'Connected' || p.status === 'Running',
      soc: 0,
      dataList: [
        { label: '功率', value: p.active_power !== undefined ? p.active_power.toFixed(1) + 'kW' : '--' }
      ],
      raw: p
    })
  }
  
  // 处理BMS/BCMU（放在PCS下方，带电池图标）
  if (devs.bms && devs.bms.length > 0) {
    const b = devs.bms[0]
    const soc = b.soc !== undefined ? b.soc : 0
    devices.push({
      name: b.name,
      title: b.name,
      type: 'bms',
      x: LAYOUT.bms.x,
      y: LAYOUT.bms.y,
      img: '', // 使用SVG绘制电池
      isActive: b.status === 'Connected' || b.status === 'Running',
      soc: soc,
      dataList: [
        { label: '电压', value: b.voltage !== undefined ? b.voltage.toFixed(1) + 'V' : '--' },
        { label: '电流', value: b.current !== undefined ? b.current.toFixed(1) + 'A' : '--' },
        { label: 'SOC', value: soc.toFixed(1) + '%' }
      ],
      raw: b
    })
  }
  
  return devices
})

// 计算连线 - 根据实际设备位置画线
const svgLines = computed(() => {
  if (!hasTopologyData.value) return []
  
  const lines = []
  const devs = positionedDevices.value
  const hw = 25  // 图标半宽
  const hh = 30  // 图标半高
  
  // 找到各设备
  const grid = devs.find(d => d.type === 'grid')
  const load = devs.find(d => d.type === 'load')
  const junction = devs.find(d => d.type === 'junction')
  const sts = devs.find(d => d.type === 'sts')
  const pcs = devs.find(d => d.type === 'pcs')
  const bms = devs.find(d => d.type === 'bms')
  
  // 1. 电网 → 负载 水平线（经过 junction）
  if (grid && load) {
    lines.push({
      x1: grid.x + hw,
      y1: grid.y,
      x2: load.x - hw,
      y2: load.y,
      is_active: true
    })
  }
  
  // 2. junction → STS 垂直线（向下）
  if (junction && sts) {
    lines.push({
      x1: junction.x,
      y1: junction.y,
      x2: sts.x,
      y2: sts.y - hh,
      is_active: true
    })
  }
  
  // 3. STS → PCS 垂直线（向下）
  if (sts && pcs) {
    lines.push({
      x1: sts.x,
      y1: sts.y + hh,
      x2: pcs.x,
      y2: pcs.y - hh,
      is_active: true
    })
  }
  
  // 4. PCS → BCMU 垂直线（向下）
  if (pcs && bms) {
    lines.push({
      x1: pcs.x,
      y1: pcs.y + hh,
      x2: bms.x,
      y2: bms.y - hh,
      is_active: true
    })
  }
  
  return lines
})

onMounted(() => {
  const savedTopology = sessionStorage.getItem(`slave_${slaveId.value}_topology`)
  if (savedTopology) {
    try {
      topologyData.value = JSON.parse(savedTopology)
      console.log('[SlaveHome] 加载拓扑数据:', topologyData.value)
    } catch (e) {
      console.error('[SlaveHome] 解析拓扑数据失败:', e)
    }
  }
  
  const savedEnergy = sessionStorage.getItem(`slave_${slaveId.value}_energy`)
  if (savedEnergy) {
    try {
      energyData.value = JSON.parse(savedEnergy)
      console.log('[SlaveHome] 加载能量数据:', energyData.value)
    } catch (e) {
      console.error('[SlaveHome] 解析能量数据失败:', e)
    }
  }
  
  // 启动从机首页定时查询（带上子阵ID和从机名）
  startSlaveHomeTimer(slaveId.value, clusterId.value, slaveName.value)
  
  // 停止全局 systemInfo 定时器，启动带参数的（指定子阵和从机名）
  stopSystemInfoTimer()
  startSystemInfoTimer(clusterId.value, slaveName.value)
})

onUnmounted(() => {
  // 停止从机首页定时查询
  stopSlaveHomeTimer()
  
  // 停止从机 systemInfo 定时器，恢复全局的
  stopSystemInfoTimer()
  startSystemInfoTimer()
})

function goToDeviceDetail(device) {
  const queryParams = { clusterId: clusterId.value, name: slaveName.value }
  
  if (device.type === 'bms' || device.type === 'bcmu') {
    queryDeviceData('/api/ems/bcmu_data/get', 'bcmu', `bcmu_data_${slaveId.value}`)
    router.push({
      name: 'BCMUDetail',
      params: { id: String(slaveId.value) },
      query: queryParams
    })
  } else if (device.type === 'pcs') {
    queryDeviceData('/api/ems/pcs_data/get', 'pcs', `pcs_data_${slaveId.value}`)
    router.push({
      name: 'PCSDetail',
      params: { id: String(slaveId.value) },
      query: queryParams
    })
  } else if (device.type === 'meter') {
    queryDeviceData('/api/ems/electric_meter_data/get', 'electric_meter', `meter_data_${slaveId.value}`)
    router.push({
      name: 'ElectricMeterDetail',
      params: { id: String(slaveId.value) },
      query: queryParams
    })
  }
}

// 发送设备数据查询请求
function queryDeviceData(topic, dataKey, storageKey) {
  if (!sendMessage) return
  
  const request = {
    topic: topic,
    data: { device: `${clusterId.value}/${slaveName.value}` },
    data_type: 'binary',
    message_id: dataKey + '_' + slaveId.value,
    timestamp: new Date().toISOString()
  }
  
  const unsubscribe = onMessage((response) => {
    if (response.topic === `${topic}/response` || response.topic?.includes(dataKey)) {
      unsubscribe()
      const respData = response.data?.[`${dataKey}_data`] || response.data?.[dataKey]
      if (response.data?.ret === true && respData) {
        sessionStorage.setItem(storageKey, JSON.stringify(respData))
      }
    }
  })
  
  sendMessage(request)
}

function goBack() {
  router.push({
    name: 'SubarrayHome',
    params: { clusterId: clusterId.value }
  })
}
</script>

<style scoped>
.slave-home {
  width: 100%;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.header {
  background: #fff;
  padding: 10px 20px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #d9d9d9;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
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
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.back-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.device-info {
  display: flex;
  gap: 8px;
}

.info-tag {
  padding: 4px 10px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.topology-section {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  display: flex;
  gap: 15px;
}

.topology-main {
  flex: 1;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.topology-svg {
  width: 100%;
  height: 100%;
  max-width: 900px;
  max-height: 600px;
}

/* 能量信息面板 */
.energy-panel {
  width: 220px;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.energy-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.energy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.energy-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.energy-label {
  font-size: 11px;
  color: #999;
}

.energy-value {
  font-size: 14px;
  font-weight: 600;
  font-family: 'Consolas', monospace;
}

.energy-value.charge {
  color: #52c41a;
}

.energy-value.discharge {
  color: #1890ff;
}

.device-group {
  cursor: pointer;
}

.no-data {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.no-data-text {
  font-size: 14px;
  color: #999;
}

.back-btn-large {
  padding: 8px 20px;
  background: #1890ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.back-btn-large:hover {
  background: #40a9ff;
}
</style>
