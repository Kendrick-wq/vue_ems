import { createRouter, createWebHashHistory } from 'vue-router'
import SystemHome from '../components/SystemHome.vue'
import SubarrayHome from '../components/SubarrayHome.vue'
import SlaveHome from '../pages/SlaveHome.vue'
import BCMUDetail from '../pages/BCMUDetail.vue'
import PCSDetail from '../pages/PCSDetail.vue'
import ElectricMeterDetail from '../pages/ElectricMeterDetail.vue'
import RPCConfig from '../pages/RPCConfig.vue'

const routes = [
  {
    path: '/',
    name: 'SystemHome',
    component: SystemHome
  },
  {
    path: '/subarray/:clusterId',
    name: 'SubarrayHome',
    component: SubarrayHome,
    props: true
  },
  {
    path: '/slave/:id',
    name: 'SlaveHome',
    component: SlaveHome,
    props: true
  },
  {
    path: '/bcmu/:id',
    name: 'BCMUDetail',
    component: BCMUDetail,
    props: true
  },
  {
    path: '/pcs/:id',
    name: 'PCSDetail',
    component: PCSDetail,
    props: true
  },
  {
    path: '/meter/:id',
    name: 'ElectricMeterDetail',
    component: ElectricMeterDetail,
    props: true
  },
  {
    path: '/rpc-config',
    name: 'RPCConfig',
    component: RPCConfig
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
