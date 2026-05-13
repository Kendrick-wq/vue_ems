<template>
  <div class="pcs-detail">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">←</button>
        <span class="header-title">PCS 详情 - {{ deviceName }}</span>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="container" v-if="hasData">
      <!-- 基础控制行 - 放在最上面横向排列 -->
      <div class="control-row-top">
        <div class="control-item">
          <span class="control-label">启动/停止:</span>
          <button 
            class="control-btn" 
            :class="{ active: startStopValue === 1 }"
            @click="toggleStartStop"
          >
            {{ startStopValue === 1 ? '停止' : '启动' }}
          </button>
        </div>
        <div class="control-item">
          <span class="control-label">故障复位:</span>
          <button class="control-btn reset-btn" @click="faultReset">
            复位
          </button>
        </div>
        <div class="control-item">
          <span class="control-label">有功功率设定(kW):</span>
          <input 
            type="number" 
            class="power-input"
            v-model="powerSetValue"
            :min="-125"
            :max="125"
            step="0.1"
          />
          <button class="set-btn" @click="setPower">设置</button>
        </div>
      </div>

      <!-- 数据区 - 4列 -->
      <div class="data-panel">
        <!-- 系统状态 -->
        <div class="data-container">
          <div class="container-title">系统状态</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in pcsData.systemState" :key="'ss'+index">
              <span class="data-label">{{ formatLabel(item) }}</span>
              <span class="data-value" :class="getStateClass(item)">{{ formatValue(item) }}</span>
            </div>
          </div>
        </div>

        <!-- 基础数据1 - 电参量 -->
        <div class="data-container">
          <div class="container-title">基础电参量</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in pcsData.basic1" :key="'b1'+index">
              <span class="data-label">{{ formatLabel(item) }}</span>
              <span class="data-value">{{ formatValue(item) }}</span>
            </div>
          </div>
        </div>

        <!-- 基础数据2 - 功率数据 -->
        <div class="data-container">
          <div class="container-title">功率与母线</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in pcsData.basic2" :key="'b2'+index">
              <span class="data-label">{{ formatLabel(item) }}</span>
              <span class="data-value">{{ formatValue(item) }}</span>
            </div>
          </div>
        </div>

        <!-- 基础数据3 - 温度电能 -->
        <div class="data-container">
          <div class="container-title">温度与电能</div>
          <div class="container-body">
            <div class="data-row" v-for="(item, index) in pcsData.basic3" :key="'b3'+index">
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
import { useGlobalWebSocket } from '../composables/useGlobalWebSocket.js'

const route = useRoute()
const router = useRouter()
const { sendMessage, onMessage } = useGlobalWebSocket()

const currentId = computed(() => route.params.id || '0')
const slaveId = computed(() => parseInt(currentId.value))
const deviceName = computed(() => currentId.value === '0' ? 'PCS-M' : `PCS${currentId.value}`)

const pcsData = ref({
  basic1: [],
  basic2: [],
  basic3: [],
  systemState: [],
  baseControl: []
})

// 控制值
const startStopValue = ref(0)
const powerSetValue = ref(0)

const hasData = computed(() => pcsData.value.basic1.length > 0)

// 英文标题到中文的映射
const titleMap = {
  // 系统状态
  'WorkState': '工作状态',
  'OperationMode': '运行模式',
  'ModuleHost': '主机/从机',
  // 基础电参量
  'ABLineVol': 'AB线电压',
  'BCLineVol': 'BC线电压',
  'CALineVol': 'CA线电压',
  'PhaseAVolt': 'A相电压',
  'PhaseBVolt': 'B相电压',
  'PhaseCVolt': 'C相电压',
  'PhaseACurr': 'A相电流',
  'PhaseBCurr': 'B相电流',
  'PhaseCCurr': 'C相电流',
  'GridFreq': '电网频率',
  'GridPhaseSeq': '电网相序',
  'ModuleSn': '模块序列号',
  // 功率与母线
  'ActivePwr': '有功功率',
  'ReactivePwr': '无功功率',
  'ApparentPwr': '视在功率',
  'PowerFactor': '功率因数',
  'DcPower': '直流功率',
  'TotalBusVolt': '总母线电压',
  'PosBusVolt': '正母线电压',
  'NegBusVolt': '负母线电压',
  'BattVolt': '电池电压',
  'BattCurr': '电池电流',
  'DcTotalCurr': '直流总电流',
  'DspVersion': 'DSP版本',
  // 温度与电能
  'EnvTemp': '环境温度',
  'IndTemp': '内部温度',
  'IgbtTemp': 'IGBT温度',
  'DcTotalCharge': '直流总充电量',
  'DcDayCharge': '直流日充电量',
  'DcTotalDischarge': '直流总放电量',
  'DcDayDischarge': '直流日放电量',
  'AcTotalCharge': '交流总充电量',
  'AcDayCharge': '交流日充电量',
  'AcTotalDischarge': '交流总放电量',
  'AcDayDischarge': '交流日放电量',
  'CpldVersion': 'CPLD版本'
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
  
  // 如果有 map，根据 data 值查找对应的 key
  if (item.map && Array.isArray(item.map)) {
    const mapItem = item.map.find(m => m.value === item.data)
    if (mapItem) return mapItem.key
  }
  
  // 如果是数字，格式化
  if (typeof item.data === 'number') {
    return Number.isInteger(item.data) ? item.data : item.data.toFixed(1)
  }
  
  return item.data || '--'
}

// 获取状态样式类
function getStateClass(item) {
  if (!item || !item.map) return ''
  
  if (item.title === 'WorkState') {
    const stateMap = {
      0: 'stop',
      1: 'starting',
      2: 'standby',
      3: 'offgrid',
      4: 'ongrid',
      5: 'fault',
      6: 'debug'
    }
    return stateMap[item.data] || ''
  }
  
  return ''
}

// 启动/停止切换
function toggleStartStop() {
  const newValue = startStopValue.value === 1 ? 0 : 1
  startStopValue.value = newValue
  sendControlCommand('StartStop', newValue)
}

// 故障复位
function faultReset() {
  sendControlCommand('FaultReset', 1)
  setTimeout(() => {
    sendControlCommand('FaultReset', 0)
  }, 500)
}

// 设置功率
function setPower() {
  const value = parseFloat(powerSetValue.value)
  if (isNaN(value)) {
    alert('请输入有效的功率值')
    return
  }
  if (value < -125 || value > 125) {
    alert('功率值必须在 -125 ~ 125 kW 之间')
    return
  }
  sendControlCommand('ActivePowerSet', value)
}

// 发送控制命令
function sendControlCommand(param, value) {
  console.log(`[PCS Control] ${param} = ${value}`)
  alert(`发送命令: ${param} = ${value}`)
}

// 查询 PCS 数据
function queryPCSData() {
  return new Promise((resolve, reject) => {
    const clusterId = route.query.clusterId
    const deviceName = route.query.name
    
    if (!clusterId || !deviceName) {
      reject(new Error('缺少子阵ID或设备名称'))
      return
    }
    
    const request = {
      topic: '/api/ems/pcs_data/get',
      data: { device: `${clusterId}/${deviceName}` },
      data_type: 'binary',
      message_id: 'pcs_' + slaveId.value,
      timestamp: new Date().toISOString()
    }
    
    const unsubscribe = onMessage((response) => {
      if (response.topic === '/api/ems/pcs_data/get/response' || 
          response.topic?.includes('pcs_data')) {
        unsubscribe()
        
        const pcsData = response.data?.pcs_data || response.data?.pcs
        if (response.data?.ret === true && pcsData) {
          resolve(pcsData)
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
  const cachedData = sessionStorage.getItem(`pcs_data_${currentId.value}`)
  if (cachedData) {
    try { 
      const data = JSON.parse(cachedData)
      pcsData.value = {
        basic1: data.basic1 || [],
        basic2: data.basic2 || [],
        basic3: data.basic3 || [],
        systemState: data.systemState || [],
        baseControl: data.baseControl || []
      }
      initControlValues(data.baseControl)
    } catch (e) {}
  }
  
  if (!hasData.value) {
    try {
      const data = await queryPCSData()
      pcsData.value = {
        basic1: data.basic1 || [],
        basic2: data.basic2 || [],
        basic3: data.basic3 || [],
        systemState: data.systemState || [],
        baseControl: data.baseControl || []
      }
      initControlValues(data.baseControl)
      sessionStorage.setItem(`pcs_data_${currentId.value}`, JSON.stringify(data))
    } catch (error) {
      console.error('[PCS] 查询失败:', error)
    }
  }
}

// 初始化控制值
function initControlValues(baseControl) {
  if (!baseControl || !Array.isArray(baseControl)) return
  
  baseControl.forEach(item => {
    if (item.title === 'StartStop') {
      startStopValue.value = item.data || 0
    } else if (item.title === 'ActivePowerSet') {
      powerSetValue.value = item.data || 0
    }
  })
}

function goBack() {
  router.back()
}

onMounted(() => { loadData() })
watch(() => route.params.id, () => { 
  pcsData.value = { basic1: [], basic2: [], basic3: [], systemState: [], baseControl: [] }
  startStopValue.value = 0
  powerSetValue.value = 0
  loadData() 
})
</script>

<style scoped>
.pcs-detail {
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
  flex-direction: column;
  padding: 8px;
  gap: 8px;
  overflow: hidden;
}

/* 控制行 - 横向排列在顶部 */
.control-row-top {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 10px 15px;
  background: #e6f7ff;
  border: 1px solid #1890ff;
  border-radius: 4px;
  flex-shrink: 0;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  color: #333;
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
}

.control-btn {
  padding: 5px 16px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s;
}

.control-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.control-btn.active {
  background: #52c41a;
  border-color: #52c41a;
  color: #fff;
}

.reset-btn {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: #fff;
}

.reset-btn:hover {
  background: #ff7875;
  border-color: #ff7875;
  color: #fff;
}

.power-input {
  width: 70px;
  padding: 4px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
}

.power-input:focus {
  outline: none;
  border-color: #1890ff;
}

.set-btn {
  padding: 5px 12px;
  border: none;
  background: #1890ff;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.set-btn:hover {
  background: #40a9ff;
}

/* 数据面板 - 4列 */
.data-panel {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  position: relative;
}

.container-title {
  background: #f5f5f5;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
  border-bottom: 1px solid #e8e8e8;
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
  font-size: 11px;
  line-height: 1.5;
}

.data-label {
  color: #666;
  white-space: nowrap;
}

.data-value {
  color: #0e02ff;
  font-weight: 500;
  font-family: 'Consolas', monospace;
}

/* 状态颜色 */
.data-value.stop { color: #999; }
.data-value.starting { color: #faad14; }
.data-value.standby { color: #1890ff; }
.data-value.offgrid { color: #52c41a; }
.data-value.ongrid { color: #52c41a; }
.data-value.fault { color: #f5222d; font-weight: 700; }
.data-value.debug { color: #722ed1; }

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
