import { reactive, onUnmounted } from "vue";
import System from "@/stores/system.js";
import imgPowerGrid from "@/assets/images/home/powerGrid.png";
import pcsImg from "@/assets/images/home/pcs.png";
import pcsErrorImg from "@/assets/images/home/pcsa.png";
import loadImg from "@/assets/images/home/load.png";
import batteryImg from "@/assets/images/home/battery.png";
import batteryErrorImg from "@/assets/images/home/bata.png";
import STSImg from "@/assets/images/home/sts.png";
import STSCloseImg from "@/assets/images/home/sts-close.png";
// import pcsGrayImg from "@/assets/images/home/pcs_gray.png";
// import batteryGrayImg from "@/assets/images/home/battery_gray.png";
// import loadGrayImg from "@/assets/images/home/load_gray.png";
// import powerGridGrayImg from "@/assets/images/home/powerGrid_gray.png";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores";
import { STEMA_BMS, GTCAN, GTUDP } from "@/utils/enum.js";

/**
 * @description 主页类
 * @class  Home
 * @date  2025/2/21
 */
class Home {
  /**
   * @description 模式控制
   * @type {Object} modelInfo
   * @date  2025/2/21
   */

  // 总宽度
  TOTAL_WIDTH = 680;
  // 图片宽度
  IMG_WIDTH = 80;
  // 第一层高度
  FIRST_HEIGHT = 0;
  // 第二层sts高度
  SECOND_HEIGHT = 79;
  // 第三层电表高度
  THIRD_HEIGHT = 0;
  // 第四层pcs高度
  FOURTH_HEIGHT = 200;
  // 第五层节点高度
  FIFTH_HEIGHT = 0;
  // 第六层bms高度
  SIXTH_HEIGHT = 350;

  // 电网横坐标
  GRID_X = 60;
  // 负载横坐标
  LOAD_X = 550;

  // 是否第一次进入订阅
  isFirst = true;

  userStore = useUserStore();
  router = useRouter();

  // STATUS = "FALUT"; // 状态 FALUT:故障 NORMAL:正常
  STSNameList = [];
  STSTotal = 0;
  STSName = "";

  meterNameList = [];
  meterTotal = 0;

  pcsNum = 1; // PCS数量

  flowDirection = "-1";

  // 流图状态
  svgList = reactive([]);
  svgFlowList = reactive([]);

  // 固定位置的
  powerGrid = {
    "ac-meter-i": {
      title: "空值",
      from: "",
      to: "",
      leftTop: {
        left: "190px",
        top: `${this.FIRST_HEIGHT}px`,
      },
      list: [
        { title: "Ia", unit: "(A):" },
        { title: "Ib", unit: "(A):" },
        { title: "Ic", unit: "(A):" },
      ],
      data: [],
      style: [{ width: "65px" }, { width: "65px" }],
      styleDyn: {},
    },
    "pcs-all": {
      title: "空值",
      from: "",
      to: "",
      leftTop: {
        left: "280px",
        top: "125px",
      },
      list: [{ title: "频率", unit: "(Hz):" }],
      data: [],
      style: [{ width: "95px" }, { width: "125px" }],
      styleDyn: {},
    },
    grid: {
      title: "电网",
      from: `${this.GRID_X - 40},${this.FIRST_HEIGHT + 157} ${this.GRID_X - 40},${this.FIRST_HEIGHT + 200}`,
      to: `${this.GRID_X - 40},${this.FIRST_HEIGHT + 200} ${this.GRID_X - 40},${this.FIRST_HEIGHT + 157}`,
      leftTop: {
        left: `${this.GRID_X}px`,
        top: `${this.FIRST_HEIGHT}px`,
      },
      router: "", // "/monitoring/ammeter",
      img: imgPowerGrid,
      list: [
        { title: "Ua", unit: "(V):" },
        { title: "Ub", unit: "(V):" },
        { title: "Uc", unit: "(V):" },
      ],
      data: [],
      style: [{ width: "75px" }, { width: "75px" }],
      styleDyn: {},
    },
    load: {
      title: "负载",
      from: `${this.LOAD_X - 45},${this.FIRST_HEIGHT + 160} ${this.LOAD_X - 45},${this.FIRST_HEIGHT + 200}`,
      to: `${this.LOAD_X - 45},${this.FIRST_HEIGHT + 200} ${this.LOAD_X - 45},${this.FIRST_HEIGHT + 160}`,
      leftTop: {
        left: `${this.LOAD_X}px`,
        top: `${this.FIRST_HEIGHT}px`,
      },
      router: "",
      img: loadImg,
      list: [{ title: "功率", unit: "(kW):" }],
      data: [],
      style: [{ width: "65px" }, { width: "65px" }],
      styleDyn: {},
    },
    junction1: {
      // 节点
      title: "",
      from: `${this.TOTAL_WIDTH / 2 - this.IMG_WIDTH},${this.FIRST_HEIGHT + 200}`,
      to: `${this.TOTAL_WIDTH / 2 - this.IMG_WIDTH},${this.FIRST_HEIGHT + 200}`,
      leftTop: {
        left: `${this.FIRST_HEIGHT + 280}px`,
        top: `${this.FIRST_HEIGHT}px`,
      },
      router: "",
      // img: loadImg,
      list: [
        // { title: "功率", unit: "(kw):" }
      ],
      style: [{ width: "85px" }, { width: "85px" }],
      styleDyn: {},
    },
  };
  /**
   * @description 固定点位
   * @type {Object} FixedLocation
   */
  FixedLocation = reactive({});

  /**
   * @description 右侧展示数据
   * @type {Object}
   */
  rightInfo = reactive({
    power: {
      unit: "MWh",
      title: "储能总充电",
      data: "--",
    },
    soc: {
      unit: "MWh",
      title: "储能总放电",
      data: "--",
    },
    quantityElectricity: {
      unit: "kWh",
      title: "当日充电量",
      data: "--",
    },
    income: {
      unit: "kWh",
      title: "当日放电量",
      data: "--",
    },
  });

  /**
   * @description 初始化创建主页实例
   * @constructor
   * @param {Function} t - i18n的t方法
   * @date  2025/2/21
   */
  constructor() {
    // 首页消息数据订阅

    // 能量统计数据
    System.WS.onMessage("GetEmsEnergyInfo", (data) => {
      if (data.data?.gEmsEnergyInfo) {
        this.rightInfo.power.data = data.data.gEmsEnergyInfo[6];
        this.rightInfo.soc.data = data.data.gEmsEnergyInfo[7];
        this.rightInfo.quantityElectricity.data = data.data.gEmsEnergyInfo[4];
        this.rightInfo.income.data = data.data.gEmsEnergyInfo[5];
      }
    });

    const handleDeviceConfig = (data) => {
      if (!data?.data?.result) return;
      this.userStore.setSetting("result", data.data.result);
      // STS相关逻辑
      // 计算STS个数
      this.STSTotal =
        data.data.result?.sts?.reduce(
          (count, item) => (item.enabled ? count + 1 : count),
          0,
        ) || 0;
      // 获取STS名称列表
      this.STSNameList = data.data.result?.sts
        ?.filter((item) => item.enabled)
        .map((item) => item.name);
      // 绑定路由
      if (!(this.STSName == "" || this.STSName == undefined)) {
        this.FixedLocation[this.STSName].router =
          "/stsSetting?batteryClusterNumber=" +
          this.STSTotal +
          "&page=1&STSList=" +
          encodeURIComponent(JSON.stringify(this.STSNameList));
      }

      // 电网相关逻辑
      // 计算电网个数
      this.meterTotal =
        data.data.result?.meter?.reduce(
          (count, item) => (item.enabled ? count + 1 : count),
          0,
        ) || 0;
      // 获取电网名称列表
      this.meterNameList = data.data.result?.meter
        ?.filter((item) => item.enabled)
        .map((item) => item.name);
      // 绑定路由
      if (this.meterTotal > 0) {
        this.FixedLocation.grid.router =
          "/meterSetting?batteryClusterNumber=" +
          this.meterTotal +
          "&page=1&meterList=" +
          encodeURIComponent(JSON.stringify(this.meterNameList));
      }

      // 处理deviceSN逻辑（都需要）
      const activeSN = data.data.result.lcu.find((sn) => sn.enabled);
      if (
        activeSN &&
        this.userStore.setting.deviceSN !== activeSN.device_info.sn
      ) {
        this.userStore.setSetting("deviceSN", activeSN.device_info.sn);
      }
    };

    // 统一设置消息监听和订阅
    System.WS.onMessage("DeviceConfig::GetAll", handleDeviceConfig);

    System.WS.subscribe("GetEmsEnergyInfo");

    // 新协议处理
    const handleNewProtocol = (data) => {
      if (!data.data) return;
      const conn = data.data.connection || [];
      const devs = data.data.devices || {};
      const involved = new Set();
      conn.forEach((c) => {
        involved.add(c.from.name);
        involved.add(c.to.name);
      });
      const deviceList = Object.keys(devs);

      // 设置固定点位数据
      deviceList.forEach((k) => {
        // 如果k 包含在powerGrid中 那么则直接放入到FixedLocation里面
        if (this.powerGrid[k]) {
          this.FixedLocation[k] = this.powerGrid[k];
          if (k === "grid") {
            this.FixedLocation["ac-meter-i"] = this.powerGrid["ac-meter-i"];
            this.FixedLocation["pcs-all"] = this.powerGrid["pcs-all"];
          }
        } else if (
          k === "junction" &&
          devs.junction.some((j) => j.name === "junction1")
        ) {
          this.FixedLocation["junction1"] = this.powerGrid["junction1"];
        } else {
          return;
        }
        if (k === "grid" && devs.grid) {
          const g = devs.grid[0];
          // 判断是否显示电网数据电压
          if (g.phase_a_voltage !== null && g.phase_a_voltage !== undefined) {
            this.FixedLocation[k].list = [
              { title: "Ua", unit: "(V):" },
              { title: "Ub", unit: "(V):" },
              { title: "Uc", unit: "(V):" },
            ];
            this.FixedLocation[k].data = [
              g.phase_a_voltage,
              g.phase_b_voltage,
              g.phase_c_voltage,
            ];
          } else {
            this.FixedLocation[k].list = [];
            this.FixedLocation[k].data = [];
          }
          // 判断是否显示电网数据电流
          if (g.phase_a_current !== null && g.phase_a_current !== undefined) {
            this.FixedLocation["ac-meter-i"].list = [
              { title: "Ia", unit: "(A):" },
              { title: "Ib", unit: "(A):" },
              { title: "Ic", unit: "(A):" },
            ];
            this.FixedLocation["ac-meter-i"].data = [
              g.phase_a_current,
              g.phase_b_current,
              g.phase_c_current,
            ];
          } else {
            this.FixedLocation["ac-meter-i"].list = [];
            this.FixedLocation["ac-meter-i"].data = [];
          }
          // 判断是否显示电网数据总
          if (g.frequency !== null && g.frequency !== undefined) {
            this.FixedLocation["pcs-all"].list = [
              { title: "频率", unit: "(Hz):" },
            ];
            this.FixedLocation["pcs-all"].data = [g.frequency];
          } else {
            this.FixedLocation["pcs-all"].list = [];
            this.FixedLocation["pcs-all"].data = [];
          }
        }

        // 状态
        if (k === "grid") {
          this.FixedLocation[k].deviceStatus = devs.grid[0].status; // ← 新增 status 判断
          this.FixedLocation[k].img = this.getDeviceImage(
            imgPowerGrid,
            devs.grid[0].closed,
            devs.grid[0].status, // ← 新增 status 判断
          );
          this.FixedLocation["ac-meter-i"].deviceStatus = devs.grid[0].status; // ← 新增 status 判断
          this.FixedLocation["pcs-all"].deviceStatus = devs.grid[0].status;
        } else if (k === "load") {
          this.FixedLocation[k].deviceStatus = devs.load[0].status; // ← 新增 status 判断
          this.FixedLocation[k].img = this.getDeviceImage(
            loadImg,
            devs.load[0].closed,
            devs.load[0].status, // ← 新增 status 判断
          );
        }
      });

      // 动态 STS
      let stsList = devs.sts || [];
      stsList = stsList
        .map((s) => ({
          ...s,
          index: parseInt(s.name.match(/(\d+)/)?.[1]) || 0,
        }))
        .sort((a, b) => a.index - b.index);
      const N_sts = stsList.length;
      stsList.forEach((s, i) => {
        N_sts;
        i;
        this.STSName = s.name;
        const config = {
          title: this.STSName,
          from: "150,200",
          to: "150,200",
          top: "5px",
          leftTop: {
            left: "200px",
            top: `${this.SECOND_HEIGHT + 3}px`,
          },
          router:
            "/stsSetting?batteryClusterNumber=" +
            this.STSTotal +
            "&page=1&STSList=" +
            encodeURIComponent(JSON.stringify(this.STSNameList)),
          img: this.getDeviceImage(
            devs.sts[i].closed === false ? STSCloseImg : STSImg,
            devs.sts[i].closed,
            devs.sts[i].status, // ← 新增 status 判断
          ),
          list: [
            // { title: "功率", unit: "(kw):" }
          ],
          style: [{ width: "85px" }, { width: "85px" }],
          styleDyn: {},
        };
        this.FixedLocation[this.STSName] = config;
        this.FixedLocation[this.STSName].deviceStatus = devs.sts[i].status;
      });

      // 动态 负载
      let loadList = devs.load || [];
      loadList = loadList
        .map((s) => ({
          ...s,
          index: parseInt(s.name.match(/(\d+)/)?.[1]) || 0,
        }))
        .sort((a, b) => a.index - b.index);
      const N_load = loadList.length;
      loadList.forEach((s, i) => {
        N_load;
        i;
        if (s.active_power !== null && s.active_power !== undefined) {
          (this.powerGrid.load.list = [{ title: "功率", unit: "(kW):" }]),
            (this.powerGrid.load.data = [s.active_power]);
        } else {
          this.powerGrid.load.data = [];
          this.powerGrid.load.list = [];
        }
      });

      // 动态 PCS
      let pcsList = devs.pcs || [];
      pcsList = pcsList
        .map((p) => ({
          ...p,
          index: parseInt(p.name.match(/(\d+)/)?.[1]) || 0,
        }))
        .sort((a, b) => a.index - b.index);
      const N_pcs = pcsList.length;

      pcsList.forEach((p, i) => {
        let x;
        if (N_pcs === 1) {
          x = (this.TOTAL_WIDTH - this.IMG_WIDTH) / 2;
        } else if (N_pcs > 1) {
          const gap = (this.TOTAL_WIDTH - N_pcs * this.IMG_WIDTH) / (N_pcs - 1);
          x = i * (this.IMG_WIDTH + gap);
        } else {
          return;
        }

        const name = p.name;
        const config = {
          title: name,
          from: `${x - 40},${this.FOURTH_HEIGHT + 100}`, //
          to: `${x - 40},${this.FOURTH_HEIGHT + 100}`, //
          leftTop: {
            left: `${x}px`, // 动态 left
            top: `${this.FOURTH_HEIGHT}px`, // 高度固定
          },
          router: `/monitoring/pcs?page=${i}`,
          img: this.getDeviceImage(
            p.status === "Fault" ? pcsErrorImg : pcsImg,
            null,
            p.status, // ← 新增
          ),
          list: [{ title: "功率", unit: "(kW):" }],
          data: [],
          style: [{ width: "75px" }, { width: "60px" }],
          styleDyn: { marginTop: "20px" },
        };
        this.FixedLocation[name] = config;
        this.FixedLocation[name].deviceStatus = p.status;
        this.FixedLocation[name].data = [p.active_power];
      });

      // 动态 BMS
      let bmsList = devs.bms || [];
      bmsList = bmsList
        .map((b) => ({
          ...b,
          index: parseInt(b.name.match(/(\d+)/)?.[1]) || 0,
        }))
        .sort((a, b) => a.index - b.index);
      const N_bms = bmsList.length;

      bmsList.forEach((b, i) => {
        let x;
        if (N_bms === 1) {
          x = (this.TOTAL_WIDTH - this.IMG_WIDTH) / 2;
        } else if (N_bms > 1) {
          const gap = (this.TOTAL_WIDTH - N_bms * this.IMG_WIDTH) / (N_bms - 1);
          x = i * (this.IMG_WIDTH + gap);
        } else {
          return;
        }

        const name = b.name;
        const config = {
          title: name,
          from: `${x - 40},${this.SIXTH_HEIGHT + 100}`, //`${x-40},420 ${x-40},350`,
          to: `${x - 40},${this.SIXTH_HEIGHT + 100}`, //`${x-40},350 ${x-40},420`,
          leftTop: {
            left: `${x}px`, // 动态 left
            top: `${this.SIXTH_HEIGHT}px`, // 高度固定
          },
          // img: batteryImg,
          img: this.getDeviceImage(
            b.status === "Fault" ? batteryErrorImg : batteryImg,
            null,
            b.status, // ← 新增
          ),
          router: this.BMSRouter(i),
          list: [
            { title: "电压", unit: "(V):" },
            { title: "电流", unit: "(A):" },
            { title: "SOC", unit: "(%):" },
          ],
          data: [],
          style: [{ width: "65px" }, { width: "65px" }],
          styleDyn: {},
        };
        this.FixedLocation[name] = config;
        this.FixedLocation[name].deviceStatus = b.status;
        this.FixedLocation[name].data = [b.voltage, b.current, b.soc];
      });

      // 动态 junction（除了 junction1）
      let junctionList = devs.junction || [];
      junctionList = junctionList.filter((j) => j.name !== "junction1");
      const N_junc = junctionList.length;
      if (N_junc > 0) {
        const gap_junc = this.TOTAL_WIDTH / (N_junc + 1);
        junctionList.forEach((j, i) => {
          const x = gap_junc * (i + 1) + this.IMG_WIDTH * i + 300; // 偏移到右侧
          const name = j.name;
          const config = {
            title: "",
            from: `${x},${this.IMG_WIDTH}`,
            to: `${x},${this.IMG_WIDTH}`,
            leftTop: {
              left: `${gap_junc * (i + 1)}px`, // 动态 left,
              top: "300px",
            },
            img: "",
            styleDyn: {}, // 第二/四层 X 调整
            router: "",
            list: [],
            data: [],
            style: [{ width: "85px" }, { width: "85px" }],
          };
          this.FixedLocation[name] = config;
          this.FixedLocation[name].deviceStatus = devs.junction[i].status;
          // 无值
        });
      }
      this.svgList = [];
      this.svgFlowList = [];
      conn.forEach((c) => {
        // 简化坐标引用
        const fromFixed = this.FixedLocation[c.from.name];
        const toFixed = this.FixedLocation[c.to.name];

        let path;
        if (c.from.type !== "pcs") {
          path = `${fromFixed.from} ${toFixed.to}`;
        } else {
          if (c.to.type === "bms") {
            path = `${fromFixed.to} ${toFixed.to}`;
          } else if (c.to.name === "junction1") {
            path = `${fromFixed.from} ${toFixed.from}`;
          } else {
            path = `${fromFixed.from} ${toFixed.to}`;
          }
        }

        // 统一推送逻辑
        this.svgList.push(path);
        if (c.is_active === true) {
          this.svgFlowList.push(path);
        }
        if (this.isFirst === true) {
          this.isFirst = false;
          System.WS.subscribe("DeviceConfig::GetAll");
        }
      });
    };
    System.WS.onMessage("GetEmsHomeCmd", handleNewProtocol);
    System.WS.subscribe("GetEmsHomeCmd");
    // handleNewProtocol({
    // "data": {
    //     "connection": [
    //         {
    //             "from": {
    //                 "name": "junction1",
    //                 "type": "junction"
    //             },
    //             "is_active": false,
    //             "to": {
    //                 "name": "load",
    //                 "type": "load"
    //             }
    //         },
    //         {
    //             "from": {
    //                 "name": "grid",
    //                 "type": "grid"
    //             },
    //             "is_active": false,
    //             "to": {
    //                 "name": "junction1",
    //                 "type": "junction"
    //             }
    //         },
    //         {
    //             "from": {
    //                 "name": "enjoy_sts1",
    //                 "type": "sts"
    //             },
    //             "is_active": false,
    //             "to": {
    //                 "name": "junction1",
    //                 "type": "junction"
    //             }
    //         },
    //         {
    //             "from": {
    //                 "name": "enjoy_sts1",
    //                 "type": "sts"
    //             },
    //             "is_active": false,
    //             "to": {
    //                 "name": "enjoy_pcs1",
    //                 "type": "pcs"
    //             }
    //         },
    //         {
    //             "from": {
    //                 "name": "enjoy_pcs1",
    //                 "type": "pcs"
    //             },
    //             "is_active": false,
    //             "to": {
    //                 "name": "gold_bcmu1",
    //                 "type": "bms"
    //             }
    //         }
    //     ],
    //     "devices": {
    //         "bms": [
    //             {
    //                 "current": 0,
    //                 "name": "gold_bcmu1",
    //                 "soc": 0,
    //                 "status": "Normal",
    //                 "voltage": 0
    //             }
    //         ],
    //         "grid": [
    //             {
    //                 "name": "grid"
    //             }
    //         ],
    //         "junction": [
    //             {
    //                 "name": "junction1"
    //             }
    //         ],
    //         "load": [
    //             {
    //                 "name": "load"
    //             }
    //         ],
    //         "pcs": [
    //             {
    //                 "active_power": 0,
    //                 "name": "enjoy_pcs1",
    //                 "status": "Normal"
    //             }
    //         ],
    //         "sts": [
    //             {
    //                 "closed": false,
    //                 "name": "enjoy_sts1"
    //             }
    //         ]
    //     }
    // },
    // })
    onUnmounted(() => {
      // System.WS.unSubscribe("SendEmsInfo::GetAcMeterInfoCmd");
      System.WS.unSubscribe("GetEmsEnergyInfo");
      System.WS.unSubscribe("DeviceConfig::GetAll");
      System.WS.unSubscribe("GetEmsHomeCmd");
    });
  }

  BMSRouter(index) {
    if (GTCAN()) {
      return "/bms/bmsClusterinfoGTUDP?page=" + index;
    } else if (GTUDP()) {
      return "/bms/bmsClusterinfoGTUDP";
    } else if (STEMA_BMS()) {
      return "/monitoring/bmsAir";
    }
    return "/monitoring/bmsAir";
  }

  // getDeviceImage(baseImg, closed, status) {
  //   // status 可能是 "Normal" | "Fault" | "Disconnected"（后端返回的字符串）
  //   if (status === "Disconnected") {
  //     // 下面这些灰色图和原图文件名一一对应
  //     const grayMap = {
  //       [pcsImg]: pcsGrayImg,
  //       [pcsErrorImg]: pcsGrayImg, // 故障也走灰色
  //       [batteryImg]: batteryGrayImg,
  //       [batteryErrorImg]: batteryGrayImg,
  //       [STSImg]: STSCloseImg,
  //       [STSCloseImg]: STSCloseImg,
  //       [loadImg]: loadGrayImg,
  //       [imgPowerGrid]: powerGridGrayImg,
  //     };
  //     return grayMap[baseImg] || baseImg; // 没映射到的直接返回原图
  //   }
  //   return baseImg;
  // }

  getDeviceImage(baseImg, closed, status) {
    status;
    // 只需要根据 closed 来决定 STS 开/关图片
    // 不再根据 Disconnected 返回灰色图！
    if (baseImg === STSImg || baseImg === STSCloseImg) {
      return closed === false ? STSCloseImg : STSImg;
    }
    // 其他设备一律返回原始图片（即使是 Fault 的红色图也保留颜色）
    return baseImg;
  }

  /**
   * @description 重定向
   * @returns {void}
   */
  redirectToMonitoringSystem(path) {
    if (path) {
      this.router.push(path);
    }
  }
}

export default Home;
