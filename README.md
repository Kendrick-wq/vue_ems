# Vue EMS 并机拓扑系统

基于 Vue 3 + Vite 的能源管理系统并机拓扑展示页面。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Composition API** - Vue 3 组合式 API

## 功能特性

- ✅ 卡片/拓扑双视图切换
- ✅ WebSocket 实时数据通信
- ✅ 响应式布局设计
- ✅ 主机/从机设备管理
- ✅ PCS/BCMU 拓扑图展示
- ✅ 实时状态监测

## 项目结构

```
vue-ems/
├── src/
│   ├── components/
│   │   ├── EmsTopology.vue    # 主组件
│   │   └── DeviceCard.vue     # 设备卡片组件
│   ├── App.vue                # 根组件
│   └── main.js                # 入口文件
├── index.html                 # HTML 模板
├── vite.config.js             # Vite 配置
├── package.json               # 包配置
└── README.md                  # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
cd vue-ems
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

默认访问地址：http://localhost:3000

### 3. 构建生产版本

```bash
npm run build
```

构建输出目录：`dist/`

### 4. 预览生产版本

```bash
npm run preview
```

## 配置说明

### WebSocket 配置

在 `src/components/EmsTopology.vue` 中修改 WebSocket 地址：

```javascript
const WS_IP = '192.168.7.37'  // 修改为你的服务器IP
const WS_PORT = 9713           // 修改为你的服务器端口
```

## 数据接口

### 1. 获取设备配置

```javascript
// 请求
{
  topic: "rpc/getInfo",
  type: "",
  data: { transaction_id: 1 }
}

// 响应
{
  data: {
    config: {
      cluster: { cluster_id: "cluster1" },
      server: { name: "com.sunwoda.bms.master" },
      client: {
        connections: [
          { id: 1, name: "com.sunwoda.bms.slave1", enabled: true },
          { id: 2, name: "com.sunwoda.bms.slave2", enabled: false }
        ]
      }
    },
    status: { running: true, connections: [{ id: 1, online: true }] },
    success: true
  }
}
```

### 2. 获取首页数据

```javascript
// 请求
{
  topic: "/api/bcmu/EMS/homePage/get",
  type: "",
  data: { transaction_id: 2 }
}

// 响应
{
  data: {
    ret: true,
    overview: {
      total_power: 100.5,
      today_charge: 500.2,
      system_soc: 85.6,
      today_discharge: 300.1
    },
    devices: [
      {
        role: "master",
        device_name: "主机",
        status: "online",
        pcs: { power: 50.2, temperature: 35.5, status: "charging" },
        bms: { soc: 85.6, voltage: 720.5, current: 25.3 }
      }
    ]
  }
}
```

## 组件说明

### EmsTopology.vue

主组件，包含：
- 顶部状态栏（集群名称、系统状态）
- 概览卡片（总功率、充电量、SOC、放电量）
- 标签页切换（卡片/拓扑）
- WebSocket 连接管理
- 设备数据管理

### DeviceCard.vue

设备卡片组件，显示单个设备的：
- PCS 信息（功率、温度、状态）
- BMS 信息（SOC、电压、电流）
- 网络信息（IP、SN）

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 许可证

MIT
