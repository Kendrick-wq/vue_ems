<template>
  <div class="meter-detail">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">←</button>
        <span class="header-title">电表详情 - {{ deviceName }}</span>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="container" v-if="hasData">
      <!-- 3列数据 -->
      <div class="data-panel">
        <!-- 基础数据1 - 电压功率电能 -->
        <div class="data-container">
          <div class="container-title">电压、功率与电能</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in meterData.basic1" :key="'b1'+index">
              <span class="data-label">{{ formatLabel(item) }}</span>
              <span class="data-value">{{ formatValue(item) }}</span>
            </div>
          </div>
        </div>

        <!-- 基础数据2 - 线电压无功功率 -->
        <div class="data-container">
          <div class="container-title">线电压与无功功率</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in meterData.basic2" :key="'b2'+index">
              <span class="data-label">{{ formatLabel(item) }}</span>
              <span class="data-value">{{ formatValue(item) }}</span>
            </div>
          </div>
        </div>

        <!-- 基础数据3 - 电流功率因数 -->
        <div class="data-container">
          <div class="container-title">电流、功率因数与视在功率</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in meterData.basic3" :key="'b3'+index">
              <span class="data-label">{{ formatLabel(item) }}</span>
              <span class="data-value">{{ formatValue(item) }}</span>
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

const route = useRoute()
const router = useRouter()

const currentId = computed(() => route.params.id || '0')
const slaveId = computed(() => parseInt(currentId.value))
const deviceName = computed(() => currentId.value === '0' ? '电表-M' : `电表${currentId.value}`)

const meterData = ref({
  basic1: [],
  basic2: [],
  basic3: []
})

const hasData = computed(() => meterData.value.basic1.length > 0)

// 英文标题到中文的映射
const titleMap = {
  // 电压功率电能
  'PhaseAVoltage': 'A相电压',
  'PhaseBVoltage': 'B相电压',
  'PhaseCVoltage': 'C相电压',
  'PhaseAActivePower': 'A相有功功率',
  'PhaseBActivePower': 'B相有功功率',
  'PhaseCActivePower': 'C相有功功率',
  'TotalActivePower': '总有功功率',
  'TotalActiveEnergy': '总有功电能',
  'TotalForwardActiveEnergy': '正向有功总电能',
  'TotalReverseActiveEnergy': '反向有功总电能',
  'Frequency': '频率',
  // 线电压无功功率
  'PhaseABLineVoltage': 'AB线电压',
  'PhaseCBLineVoltage': 'CB线电压',
  'PhaseACLineVoltage': 'AC线电压',
  'PhaseAReactivePower': 'A相无功功率',
  'PhaseBReactivePower': 'B相无功功率',
  'PhaseCReactivePower': 'C相无功功率',
  'TotalReactivePower': '总无功功率',
  'TotalReactiveEnergy': '总无功电能',
  'TotalForwardReactiveEnergy': '正向无功总电能',
  'TotalReverseReactiveEnergy': '反向无功总电能',
  'NeutralCurrent': '中性线电流',
  // 电流功率因数
  'PhaseACurrent': 'A相电流',
  'PhaseBCurrent': 'B相电流',
  'PhaseCCurrent': 'C相电流',
  'PhaseAPowerFactor': 'A相功率因数',
  'PhaseBPowerFactor': 'B相功率因数',
  'PhaseCPowerFactor': 'C相功率因数',
  'TotalPowerFactor': '总功率因数',
  'PhaseAApparentPower': 'A相视在功率',
  'PhaseBApparentPower': 'B相视在功率',
  'PhaseCApparentPower': 'C相视在功率',
  'TotalApparentPower': '总视在功率'
}

// 格式化标签
function formatLabel(item) {
  if (!item) return '--'
  const chineseTitle = titleMap[item.title] || item.title
  const unit = item.unit ? `(${item.unit})` : ''
  return chineseTitle + unit + ':'
}

// 格式化数值
function formatValue(item) {
  if (!item) return '--'
  
  if (typeof item.data === 'number') {
    return Number.isInteger(item.data) ? item.data : item.data.toFixed(2)
  }
  
  return item.data || '--'
}

// 查询电表数据
function queryMeterData(slaveId) {
  return new Promise((resolve, reject) => {
    const savedSettings = localStorage.getItem('ems_ws_settings')
    let wsUrl = 'ws://192.168.7.37:9713'
    
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        wsUrl = `ws://${settings.ip}:${settings.port}`
      } catch (e) {}
    }
    
    try {
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        const request = {
          topic: '/api/ems/electric_meter_data/get',
          data: { slave_id: slaveId },
          data_type: 'binary',
          message_id: 'meter_' + slaveId,
          timestamp: new Date().toISOString()
        }
        ws.send(JSON.stringify(request))
      }
      
      ws.onmessage = (event) => {
        const parseData = async () => {
          const text = event.data instanceof Blob ? await event.data.text() : event.data
          try {
            const response = JSON.parse(text)
            if (response.topic?.includes('electric_meter_data')) {
              if (response.data?.ret === true && response.data?.electric_meter) {
                resolve(response.data.electric_meter)
              } else {
                reject(new Error(response.data?.error || '获取失败'))
              }
              ws.close()
            }
          } catch (e) {}
        }
        parseData()
      }
      
      ws.onerror = () => reject(new Error('连接失败'))
      setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.close(); reject(new Error('超时')) }, 5000)
    } catch (error) { reject(error) }
  })
}

async function loadData() {
  const cachedData = sessionStorage.getItem(`meter_data_${currentId.value}`)
  if (cachedData) {
    try { 
      const data = JSON.parse(cachedData)
      meterData.value = {
        basic1: data.basic1 || [],
        basic2: data.basic2 || [],
        basic3: data.basic3 || []
      }
    } catch (e) {}
  }
  
  if (!hasData.value) {
    try {
      const data = await queryMeterData(slaveId.value)
      meterData.value = {
        basic1: data.basic1 || [],
        basic2: data.basic2 || [],
        basic3: data.basic3 || []
      }
      sessionStorage.setItem(`meter_data_${currentId.value}`, JSON.stringify(data))
    } catch (error) {
      console.error('[Meter] 查询失败:', error)
    }
  }
}

function goBack() {
  router.back()
}

onMounted(() => { loadData() })
watch(() => route.params.id, () => { 
  meterData.value = { basic1: [], basic2: [], basic3: [] }
  loadData() 
})
</script>

<style scoped>
.meter-detail {
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

/* 3列布局 */
.data-panel {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  overflow: hidden;
}

/* 数据容器 */
.data-container {
  background: #fff;
  border-radius: 4px;
  border: 1px dashed #c0c4cc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.container-title {
  background: #f5f5f5;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: bold;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
  white-space: nowrap;
  text-align: center;
}

.container-body {
  flex: 1;
  padding: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
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
