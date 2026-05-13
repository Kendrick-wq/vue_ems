<template>
  <div class="bcmu-detail">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">←</button>
        <span class="header-title">BCMU 详情 - {{ deviceName }}</span>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="container" v-if="hasData">
      <!-- 5列布局 -->
      <div class="data-panel">
        <!-- BCMU状态数据 -->
        <div class="data-container">
          <div class="container-title">BCMU状态数据</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in bcmuStatusData" :key="index">
              <span class="data-label">{{ item.label }}</span>
              <span class="data-value" :class="item.class">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- 主控箱温度数据 -->
        <div class="data-container">
          <div class="container-title">温度数据</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in masterTempData" :key="index">
              <span class="data-label">{{ item.label }}</span>
              <span class="data-value">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- 电压极值数据 -->
        <div class="data-container">
          <div class="container-title">电压极值数据</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in voltageExtremeData" :key="index">
              <span class="data-label">{{ item.label }}</span>
              <span class="data-value">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- 充放电相关数据 -->
        <div class="data-container">
          <div class="container-title">充放电数据</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in chargeData" :key="index">
              <span class="data-label">{{ item.label }}</span>
              <span class="data-value">{{ item.value }}</span>
            </div>
          </div>
        </div>

        <!-- 拓扑区 -->
        <div class="data-container topo-container">
          <div class="container-title">第{{ clusterId }}簇 ({{ runModeText }})</div>
          <div class="container-body topo-body">
            <div class="battery-display">
              <div class="battery-box">
                <div class="battery-fill" :style="{ height: soc + '%' }"></div>
                <div class="battery-text">{{ soc }}%</div>
              </div>
              <div class="battery-info">
                <div class="info-item">SOC: {{ soc }}%</div>
                <div class="info-item">SOH: {{ soh }}%</div>
              </div>
            </div>

            <div class="temp-extreme">
              <div>最高温度: <span class="high">{{ highestTemp }}℃({{ highestTempIdx }})</span></div>
              <div>最低温度: <span class="low">{{ lowestTemp }}℃({{ lowestTempIdx }})</span></div>
            </div>

            <div class="switch-status">
              <div class="switch-row">
                <span v-for="(sw, index) in switchStatus.slice(0, 3)" :key="index" class="switch-item">
                  <span class="dot" :class="{ on: sw.on }"></span>{{ sw.name }}
                </span>
              </div>
              <div class="switch-row">
                <span v-for="(sw, index) in switchStatus.slice(3)" :key="index" class="switch-item">
                  <span class="dot" :class="{ on: sw.on }"></span>{{ sw.name }}
                </span>
              </div>
            </div>

            <div class="footer-info">
              <div>SN: {{ sn || '--' }}</div>
              <div>版本: {{ version || '--' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 无数据提示 -->
    <div v-else class="no-data">
      <div class="no-data-text">暂无数据，请返回首页重新查询</div>
      <button class="back-btn-large" @click="goBack">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGlobalWebSocket } from '../composables/useGlobalWebSocket.js'

const route = useRoute()
const router = useRouter()
const { sendMessage, onMessage } = useGlobalWebSocket()

const currentId = computed(() => route.params.id || '0')
const slaveId = computed(() => parseInt(currentId.value))
const deviceName = computed(() => currentId.value === '0' ? 'BCMU-M' : `BCMU${currentId.value}`)
const clusterId = computed(() => parseInt(currentId.value) + 1)

const bcmuData = ref(null)
const hasData = computed(() => bcmuData.value !== null)

const runModeMap = {
  'Standby': { text: '待机', style: 'color: #409eff;' },
  'Charging': { text: '充电', style: 'color: #67c23a;' },
  'Discharging': { text: '放电', style: 'color: #e6a23c;' },
  'Fault': { text: '故障', style: 'color: #f56c6c;' }
}

const runModeText = computed(() => {
  if (!bcmuData.value) return '--'
  const state = bcmuData.value.system_state || bcmuData.value.battery_state || '未知'
  return runModeMap[state]?.text || state
})

const runModeStyle = computed(() => {
  if (!bcmuData.value) return ''
  const state = bcmuData.value.system_state || bcmuData.value.battery_state || '未知'
  return runModeMap[state]?.style || ''
})

const soc = computed(() => bcmuData.value?.group_end_SOC ?? '--')
const soh = computed(() => bcmuData.value?.group_end_SOH ?? '--')
const sn = computed(() => bcmuData.value?.sn || '')
const version = computed(() => bcmuData.value?.version || '')
const highestTemp = computed(() => bcmuData.value?.highest_cell_temperature ?? '--')
const highestTempIdx = computed(() => bcmuData.value?.highest_cell_temperature_idx ?? '--')
const lowestTemp = computed(() => bcmuData.value?.lowest_cell_temperature ?? '--')
const lowestTempIdx = computed(() => bcmuData.value?.lowest_cell_temperature_idx ?? '--')

const switchStatus = computed(() => {
  if (!bcmuData.value) return []
  const diStatus = parseInt(bcmuData.value.DI_status || '0x0', 16)
  return [
    { name: '隔离开关', on: (diStatus >> 6) & 1 },
    { name: '主正接触器', on: (diStatus >> 1) & 1 },
    { name: '负极接触器', on: (diStatus >> 0) & 1 },
    { name: '预充接触器', on: (diStatus >> 2) & 1 },
    { name: '熔断器', on: (diStatus >> 4) & 1 }
  ]
})

const bcmuStatusData = computed(() => {
  const d = bcmuData.value
  if (!d) return []
  return [
    { label: '电压(V):', value: formatValue(d.group_end_voltage, 1) },
    { label: '电流(A):', value: formatValue(d.group_end_current, 1) },
    { label: '功率(kW):', value: calculatePower(d.group_end_voltage, d.group_end_current) },
    { label: 'SOC(%):', value: d.group_end_SOC ?? '--', class: 'highlight' },
    { label: 'SOH(%):', value: d.group_end_SOH ?? '--' },
    { label: '电池状态:', value: d.battery_state || '--' },
    { label: '系统状态:', value: d.system_state || '--' },
    { label: '充电SOE(%):', value: d.charge_SOE ?? '--' },
    { label: '放电SOE(%):', value: d.discharge_SOE ?? '--' },
    { label: '平均单体电压(mV):', value: d.average_cell_voltage ?? '--' },
    { label: '单体电压差(mV):', value: d.cell_voltage_difference ?? '--' },
    { label: '平均温度(℃):', value: d.average_cell_temperature ?? '--' },
    { label: '温度差(℃):', value: d.cell_temperature_difference ?? '--' },
    { label: '绝缘电阻+(kΩ):', value: d.insulation_R_positive ?? '--' },
    { label: '绝缘电阻-(kΩ):', value: d.insulation_R_negative ?? '--' }
  ]
})

const masterTempData = computed(() => {
  const d = bcmuData.value
  if (!d) return []
  return [
    { label: '主控温度1(℃):', value: d.master_temperature_1 ?? '--' },
    { label: '主控温度2(℃):', value: d.master_temperature_2 ?? '--' },
    { label: '主控温度3(℃):', value: d.master_temperature_3 ?? '--' },
    { label: '主控温度4(℃):', value: d.master_temperature_4 ?? '--' },
    { label: '供电电压(V):', value: d.supply_voltage ?? '--' },
    { label: '负载电压(V):', value: d.load_voltage ?? '--' },
    { label: '最高电极温度模块:', value: d.highest_electrode_temperature_module ?? '--' },
    { label: '最高电极温度序号:', value: d.highest_electrode_temperature_idx ?? '--' },
    { label: '最低电极温度模块:', value: d.lowest_electrode_temperature_module ?? '--' },
    { label: '最低电极温度序号:', value: d.lowest_electrode_temperature_idx ?? '--' }
  ]
})

const voltageExtremeData = computed(() => {
  const d = bcmuData.value
  if (!d) return []
  return [
    { label: '单体电压最小值(mV):', value: d.lowest_cell_voltage ?? '--' },
    { label: '最小值序号:', value: d.lowest_cell_voltage_idx ?? '--' },
    { label: '单体电压最大值(mV):', value: d.highest_cell_voltage ?? '--' },
    { label: '最大值序号:', value: d.highest_cell_voltage_idx ?? '--' },
    { label: '总单体数:', value: d.total_cell_num ?? '--' },
    { label: '从机模块数:', value: d.slave_module_num ?? '--' },
    { label: 'DI状态:', value: d.DI_status || '--' },
    { label: 'DO状态:', value: d.DO_status || '--' }
  ]
})

const chargeData = computed(() => {
  const d = bcmuData.value
  if (!d) return []
  return [
    { label: '最大充电功率(kW):', value: d.max_charge_power ?? '--' },
    { label: '最大放电功率(kW):', value: d.max_discharge_power ?? '--' },
    { label: '最大充电电流(A):', value: d.max_charge_current ?? '--' },
    { label: '最大放电电流(A):', value: d.max_discharge_current ?? '--' },
    { label: '单次充电(Ah):', value: d.single_charge ?? '--' },
    { label: '单次放电(Ah):', value: d.single_discharge ?? '--' },
    { label: '累计充电(Ah):', value: d.cumulative_charge ?? '--' },
    { label: '累计放电(Ah):', value: d.cumulative_discharge ?? '--' },
    { label: '日充电(Ah):', value: d.daily_charge ?? '--' },
    { label: '日放电(Ah):', value: d.daily_discharge ?? '--' },
    { label: '温度采样点数:', value: d.total_temperature_sample_num ?? '--' }
  ]
})

function formatValue(value, decimals = 1) {
  if (value === undefined || value === null) return '--'
  return Number(value).toFixed(decimals)
}

function calculatePower(voltage, current) {
  if (voltage === undefined || current === undefined) return '--'
  return ((voltage * current) / 1000).toFixed(2)
}

function queryBCMUData() {
  return new Promise((resolve, reject) => {
    const clusterId = route.query.clusterId
    const deviceName = route.query.name
    
    if (!clusterId || !deviceName) {
      reject(new Error('缺少子阵ID或设备名称'))
      return
    }
    
    const request = {
      topic: '/api/ems/bcmu_data/get',
      data: { device: `${clusterId}/${deviceName}` },
      data_type: 'binary',
      message_id: 'bcmu_' + slaveId.value,
      timestamp: new Date().toISOString()
    }
    
    const unsubscribe = onMessage((response) => {
      if (response.topic === '/api/ems/bcmu_data/get/response' || 
          response.topic?.includes('bcmu_data')) {
        unsubscribe()
        
        const bcmuData = response.data?.bcmu_data || response.data?.bcmu
        if (response.data?.ret === true && bcmuData) {
          resolve(bcmuData)
        } else {
          reject(new Error(response.data?.error || '获取失败'))
        }
      }
    })
    
    sendMessage(request)
    
    setTimeout(() => {
      unsubscribe()
      reject(new Error('超时'))
    }, 5000)
  })
}

async function loadData() {
  const cachedData = sessionStorage.getItem(`bcmu_data_${currentId.value}`)
  if (cachedData) {
    try { bcmuData.value = JSON.parse(cachedData) } catch (e) {}
  }
  
  if (!bcmuData.value) {
    try {
      const data = await queryBCMUData()
      bcmuData.value = data
      sessionStorage.setItem(`bcmu_data_${currentId.value}`, JSON.stringify(data))
    } catch (error) {
      console.error('[BCMU] 查询失败:', error)
    }
  }
}

function goBack() {
  router.back()
}

onMounted(() => { loadData() })
watch(() => route.params.id, () => { bcmuData.value = null; loadData() })
</script>

<style scoped>
.bcmu-detail {
  width: 100%;
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  overflow: hidden;
}

/* 顶部导航 */
.header {
  background: #fff;
  padding: 6px 15px;
  height: 36px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #d9d9d9;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* 主容器 */
.container {
  flex: 1;
  display: flex;
  padding: 8px;
  overflow: hidden;
}

/* 5列布局 */
.data-panel {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  overflow: hidden;
}

/* 数据容器 */
.data-container {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.container-title {
  background: #f5f5f5;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
  white-space: nowrap;
  text-align: center;
}

.container-body {
  flex: 1;
  padding: 4px 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  line-height: 1.6;
}

.data-label {
  color: #666;
  white-space: nowrap;
}

.data-value {
  color: #1890ff;
  font-weight: 500;
  font-family: 'Consolas', monospace;
}

.data-value.highlight {
  color: #52c41a;
  font-weight: 700;
}

/* 拓扑区特殊样式 */
.topo-container {
  background: #fafafa;
}

.topo-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* 电池显示 */
.battery-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  background: #f5f5f5;
  border-radius: 4px;
  width: 100%;
}

.battery-box {
  width: 50px;
  height: 75px;
  border: 2px solid #52c41a;
  border-radius: 4px;
  position: relative;
  background: #fff;
  margin-bottom: 6px;
}

.battery-box::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 4px;
  background: #52c41a;
  border-radius: 2px;
}

.battery-fill {
  position: absolute;
  bottom: 2px;
  left: 2px;
  right: 2px;
  background: linear-gradient(180deg, #52c41a 0%, #389e0d 100%);
  border-radius: 2px;
  transition: height 0.3s ease;
}

.battery-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  font-weight: 700;
  color: #333;
  z-index: 1;
}

.battery-info {
  display: flex;
  gap: 12px;
  font-size: 11px;
}

.info-item {
  color: #666;
}

/* 温度极值 */
.temp-extreme {
  margin-bottom: 8px;
  padding: 6px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.8;
}

.temp-extreme .high {
  color: #f5222d;
  font-weight: 500;
}

.temp-extreme .low {
  color: #1890ff;
  font-weight: 500;
}

/* 开关状态 */
.switch-status {
  margin-bottom: 8px;
}

.switch-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 4px;
}

.switch-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #666;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d9d9d9;
}

.dot.on {
  background: #52c41a;
}

/* 底部信息 */
.footer-info {
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px solid #e8e8e8;
  font-size: 10px;
  color: #999;
  text-align: center;
  line-height: 1.6;
}

/* 无数据提示 */
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
