<script setup>
import {onMounted, onUnmounted } from 'vue'
import BMSHeapInfo from "@/views/bms/BMSHeapInfo.vue"
import Home from "@/views/home/HomePage.vue"
import NHomeInfo from "@/views/nProject/home/NHomeInfo.vue"
import BMSClusterGTHome from "@/views/GTUDP/bms/BMSClusterGTHome.vue"
import BMSClusterInfo from "@/views/bms/BMSClusterInfo.vue"
import { apiLocalNonDBPushServer } from "@/api/httpLocal";
import {useUserStore} from '@/stores'
const userStore = useUserStore();
// import BMSClusterInfo from '@/views/GTUDP/bms/BMSClusterInfo.vue';
// import download from '@/views/download/FileDownload.vue'
// import FileCleanManagement from '@/views/operationCenter/FileCleanManagement.vue'
// import BMSPackInfo from '@/views/GTUDP/bms/BMSPackInfo.vue'
// import BMSSettingModule from '@/views/GTUDP/bms/BMSSettingModule.vue'
// import FileDownload from '@/views/download/FileDownload.vue'
// import user from '@/views/operationCenter/UserPerMission.vue'
// import E9Setting from '@/views/home/E9Setting.vue'
// import ShipInfo from '@/views/ship/ShipInfo.vue'
// import ShipSetting from '@/views/ship/ShipSetting.vue'
// import LiquidCoolerGTCAN from '@/views/auxiliaryEquipment/components/LiquidCoolerGTCAN.vue'
// import ShipBMSClusterInfo from '@/views/ship/ShipBMSClusterInfo.vue'
// import RPCSetting from '@/views/operationCenter/RPCSetting.vue'

// import BMSClusterInfoSEVB from '@/views/SEVB/bms/BMSClusterInfoSEVB.vue'
import { 
  STEMA_BMS,
  STEMA_EMS,
  STEMA_N_PROJECT,
  STEMA_GT_EMS,
  STEMA_GT_BMS,
  STEMA_XWD_CLUSTER
} from '@/utils/enum.js'
// 存储订阅信息以便清理

// 读取后端存储数据 并更新到浏览器缓存
const getCache = async () => {
  const keys = []
  Object.keys(userStore.setting).forEach(key => {
    keys.push(key)
  })

  const res = await apiLocalNonDBPushServer([{
    cmd : "read",
    keys : keys
  }])

  if (res) {
    for (const key in res.data[0].values) {
      let data = res.data[0].values[key]
      if(data.value !== 'undefined' && data.value !== 'null'){
        userStore.setSetting(data.key, data.value, true)
      }
      
    }
    // Object.keys(res.data[0].values).forEach(key => {
    //   if(res[key] && res[key] !== 'undefined' && res[key] !== 'null'){
    //     userStore.setSetting(key, res[key], true)
    //   }
    // })
  }
}

onMounted(() => {
  getCache()
})

// 组件卸载时清理
onUnmounted(() => {

})

</script>

<template>
  <!-- <RPCSetting /> -->
  <div v-if='STEMA_EMS()'>
    <Home />
  </div>
  <div v-else-if='STEMA_XWD_CLUSTER()'>
    <BMSClusterInfo />
  </div>
  <div v-else-if='STEMA_GT_EMS() || STEMA_GT_BMS()'>
    <BMSClusterGTHome />
  </div>
  <div v-else-if='STEMA_BMS()'>
    <BMSHeapInfo/>
  </div>
  <div v-else-if='STEMA_N_PROJECT()'>
    <NHomeInfo />
  </div>
  <div v-else>
    <BMSHeapInfo />
  </div>
   
</template>


