import type { EmaneConfig } from '@/types/topo'

export interface ChannelModelPreset {
  type: string
  name: string
  displayName: string
  emaneModel: string
  emaneModelFull: string
  phyType: string
  role: number
}

// 固定的emane_configs配置，所有信道模型共用
const FIXED_EMANE_CONFIGS: EmaneConfig[] = [
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      external: {
        label: "external",
        name: "external",
        value: "0",
        type: 11,
        select: ["On", "Off"],
        group: "External Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      platformendpoint: {
        label: "platformendpoint",
        name: "platformendpoint",
        value: "127.0.0.1:40001",
        type: 10,
        select: [],
        group: "External Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      transportendpoint: {
        label: "transportendpoint",
        name: "transportendpoint",
        value: "127.0.0.1:50002",
        type: 10,
        select: [],
        group: "External Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      bitrate: {
        label: "bitrate",
        name: "bitrate",
        value: "1000000",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      datarate: {
        label: "datarate",
        name: "datarate",
        value: "1000000",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      delay: {
        label: "delay",
        name: "delay",
        value: "0.000000",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      enablepromiscuousmode: {
        label: "enablepromiscuousmode",
        name: "enablepromiscuousmode",
        value: "0",
        type: 2,
        select: ["0", "1"],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      flowcontrolenable: {
        label: "flowcontrolenable",
        name: "flowcontrolenable",
        value: "0",
        type: 2,
        select: ["0", "1"],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      flowcontroltokens: {
        label: "flowcontroltokens",
        name: "flowcontroltokens",
        value: "10",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      jitter: {
        label: "jitter",
        name: "jitter",
        value: "0.000000",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      neighbormetricdeletetime: {
        label: "neighbormetricdeletetime",
        name: "neighbormetricdeletetime",
        value: "60.000000",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      pcrcurveuri: {
        label: "pcrcurveuri",
        name: "pcrcurveuri",
        value: "/usr/share/emane/xml/models/mac/rfpipe/rfpipepcr.xml",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      radiometricenable: {
        label: "radiometricenable",
        name: "radiometricenable",
        value: "0",
        type: 2,
        select: ["0", "1"],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      radiometricreportinterval: {
        label: "radiometricreportinterval",
        name: "radiometricreportinterval",
        value: "1.000000",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "rfsignaltable.averageallantennas": {
        label: "rfsignaltable.averageallantennas",
        name: "rfsignaltable.averageallantennas",
        value: "0",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "rfsignaltable.averageallfrequencies": {
        label: "rfsignaltable.averageallfrequencies",
        name: "rfsignaltable.averageallfrequencies",
        value: "0",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      fragmentcheckthreshold: {
        label: "fragmentcheckthreshold",
        name: "fragmentcheckthreshold",
        value: "2",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      fragmenttimeoutthreshold: {
        label: "fragmenttimeoutthreshold",
        name: "fragmenttimeoutthreshold",
        value: "5",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      neighbormetricupdateinterval: {
        label: "neighbormetricupdateinterval",
        name: "neighbormetricupdateinterval",
        value: "1.0",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "queue.aggregationenable": {
        label: "queue.aggregationenable",
        name: "queue.aggregationenable",
        value: "0",
        type: 2,
        select: ["0", "1"],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "queue.aggregationslotthreshold": {
        label: "queue.aggregationslotthreshold",
        name: "queue.aggregationslotthreshold",
        value: "5",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "queue.depth": {
        label: "queue.depth",
        name: "queue.depth",
        value: "256",
        type: 4,
        select: [],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "queue.fragmentationenable": {
        label: "queue.fragmentationenable",
        name: "queue.fragmentationenable",
        value: "0",
        type: 2,
        select: ["0", "1"],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "queue.strictdequeueenable": {
        label: "queue.strictdequeueenable",
        name: "queue.strictdequeueenable",
        value: "0",
        type: 2,
        select: ["0", "1"],
        group: "MAC Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      bandwidth: {
        label: "bandwidth",
        name: "bandwidth",
        value: "1000000",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      compatibilitymode: {
        label: "compatibilitymode",
        name: "compatibilitymode",
        value: "1",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      dopplershiftenable: {
        label: "dopplershiftenable",
        name: "dopplershiftenable",
        value: "1",
        type: 11,
        select: ["On", "Off"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      excludesamesubidfromfilterenable: {
        label: "excludesamesubidfromfilterenable",
        name: "excludesamesubidfromfilterenable",
        value: "1",
        type: 11,
        select: ["On", "Off"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.dlthresh": {
        label: "fading.lognormal.dlthresh",
        name: "fading.lognormal.dlthresh",
        value: "0.250000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.dmu": {
        label: "fading.lognormal.dmu",
        name: "fading.lognormal.dmu",
        value: "5.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.dsigma": {
        label: "fading.lognormal.dsigma",
        name: "fading.lognormal.dsigma",
        value: "1.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.duthresh": {
        label: "fading.lognormal.duthresh",
        name: "fading.lognormal.duthresh",
        value: "0.750000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.lmean": {
        label: "fading.lognormal.lmean",
        name: "fading.lognormal.lmean",
        value: "0.005000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.lstddev": {
        label: "fading.lognormal.lstddev",
        name: "fading.lognormal.lstddev",
        value: "0.001000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.maxpathloss": {
        label: "fading.lognormal.maxpathloss",
        name: "fading.lognormal.maxpathloss",
        value: "100.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.lognormal.minpathloss": {
        label: "fading.lognormal.minpathloss",
        name: "fading.lognormal.minpathloss",
        value: "0.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.model": {
        label: "fading.model",
        name: "fading.model",
        value: "none",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.nakagami.distance0": {
        label: "fading.nakagami.distance0",
        name: "fading.nakagami.distance0",
        value: "100.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.nakagami.distance1": {
        label: "fading.nakagami.distance1",
        name: "fading.nakagami.distance1",
        value: "250.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.nakagami.m0": {
        label: "fading.nakagami.m0",
        name: "fading.nakagami.m0",
        value: "0.750000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.nakagami.m1": {
        label: "fading.nakagami.m1",
        name: "fading.nakagami.m1",
        value: "1.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "fading.nakagami.m2": {
        label: "fading.nakagami.m2",
        name: "fading.nakagami.m2",
        value: "200.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      fixedantennagain: {
        label: "fixedantennagain",
        name: "fixedantennagain",
        value: "0.000000",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      fixedantennagainenable: {
        label: "fixedantennagainenable",
        name: "fixedantennagainenable",
        value: "1",
        type: 11,
        select: ["On", "Off"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      frequency: {
        label: "frequency",
        name: "frequency",
        value: "2347000000",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      frequencyofinterest: {
        label: "frequencyofinterest",
        name: "frequencyofinterest",
        value: "2347000000",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      noisebinsize: {
        label: "noisebinsize",
        name: "noisebinsize",
        value: "20",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      noisemaxclampenable: {
        label: "noisemaxclampenable",
        name: "noisemaxclampenable",
        value: "0",
        type: 11,
        select: ["On", "Off"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      noisemaxmessagepropagation: {
        label: "noisemaxmessagepropagation",
        name: "noisemaxmessagepropagation",
        value: "200000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      noisemaxsegmentduration: {
        label: "noisemaxsegmentduration",
        name: "noisemaxsegmentduration",
        value: "1000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      noisemaxsegmentoffset: {
        label: "noisemaxsegmentoffset",
        name: "noisemaxsegmentoffset",
        value: "300000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      noisemode: {
        label: "noisemode",
        name: "noisemode",
        value: "none",
        type: 10,
        select: ["none", "all", "outofband", "passthrough"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      processingpoolsize: {
        label: "processingpoolsize",
        name: "processingpoolsize",
        value: "0",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      propagationmodel: {
        label: "propagationmodel",
        name: "propagationmodel",
        value: "freespace",
        type: 10,
        select: ["precomputed", "2ray", "freespace"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      rxsensitivitypromiscuousmodeenable: {
        label: "rxsensitivitypromiscuousmodeenable",
        name: "rxsensitivitypromiscuousmodeenable",
        value: "0",
        type: 11,
        select: ["On", "Off"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      spectralmaskindex: {
        label: "spectralmaskindex",
        name: "spectralmaskindex",
        value: "0",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "stats.observedpowertableenable": {
        label: "stats.observedpowertableenable",
        name: "stats.observedpowertableenable",
        value: "1",
        type: 11,
        select: ["On", "Off"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "stats.receivepowertableenable": {
        label: "stats.receivepowertableenable",
        name: "stats.receivepowertableenable",
        value: "1",
        type: 11,
        select: ["On", "Off"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      subid: {
        label: "subid",
        name: "subid",
        value: "1",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      systemnoisefigure: {
        label: "systemnoisefigure",
        name: "systemnoisefigure",
        value: "4.000000",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      timesyncthreshold: {
        label: "timesyncthreshold",
        name: "timesyncthreshold",
        value: "10000",
        type: 4,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      txpower: {
        label: "txpower",
        name: "txpower",
        value: "30.0",
        type: 9,
        select: [],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      channelcode: {
        label: "channelcode",
        name: "channelcode",
        value: "none",
        type: 10,
        select: ["none", "ldpc12", "ldpc23"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      randomlossenvironment: {
        label: "randomlossenvironment",
        name: "randomlossenvironment",
        value: "none",
        type: 10,
        select: ["none", "urban", "suburban"],
        group: "PHY Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      eventservicedevice: {
        label: "eventservicedevice",
        name: "eventservicedevice",
        value: "ctrl0",
        type: 10,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      eventservicegroup: {
        label: "eventservicegroup",
        name: "eventservicegroup",
        value: "224.1.2.8:45703",
        type: 10,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      eventservicettl: {
        label: "eventservicettl",
        name: "eventservicettl",
        value: "1",
        type: 1,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagerchannelenable: {
        label: "otamanagerchannelenable",
        name: "otamanagerchannelenable",
        value: "1",
        type: 11,
        select: ["On", "Off"],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagerdevice: {
        label: "otamanagerdevice",
        name: "otamanagerdevice",
        value: "ctrl0",
        type: 10,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagergroup: {
        label: "otamanagergroup",
        name: "otamanagergroup",
        value: "224.1.2.8:45702",
        type: 10,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagerloopback: {
        label: "otamanagerloopback",
        name: "otamanagerloopback",
        value: "0",
        type: 11,
        select: ["On", "Off"],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagermtu: {
        label: "otamanagermtu",
        name: "otamanagermtu",
        value: "0",
        type: 3,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagerpartcheckthreshold: {
        label: "otamanagerpartcheckthreshold",
        name: "otamanagerpartcheckthreshold",
        value: "2",
        type: 2,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagerparttimeoutthreshold: {
        label: "otamanagerparttimeoutthreshold",
        name: "otamanagerparttimeoutthreshold",
        value: "5",
        type: 2,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      otamanagerttl: {
        label: "otamanagerttl",
        name: "otamanagerttl",
        value: "1",
        type: 1,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "stats.event.maxeventcountrows": {
        label: "stats.event.maxeventcountrows",
        name: "stats.event.maxeventcountrows",
        value: "0",
        type: 3,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "stats.ota.maxeventcountrows": {
        label: "stats.ota.maxeventcountrows",
        name: "stats.ota.maxeventcountrows",
        value: "0",
        type: 3,
        select: [],
        group: "Platform Parameters"
      }
    }
  },
  {
    ifaceId: -1,
    model: "emane_rfpipe",
    config: {
      "stats.ota.maxpacketcountrows": {
        label: "stats.ota.maxpacketcountrows",
        name: "stats.ota.maxpacketcountrows",
        value: "0",
        type: 3,
        select: [],
        group: "Platform Parameters"
      }
    }
  }
]

/**
 * 11个信道模型预设
 */
export const channelModelPresets: Record<string, ChannelModelPreset> = {
  // 测控链
  TT_LINK: {
    type: 'TT_LINK',
    name: 'tt_link',
    displayName: '测控链',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },

  // 协同链
  COOP_LINK: {
    type: 'COOP_LINK',
    name: 'coop_link',
    displayName: '协同链',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },

  // 自组网
  AD_HOC: {
    type: 'AD_HOC',
    name: 'ad_hoc',
    displayName: '自组网',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'ofdm',
    role: 2,
  },

  // VHF
  VHF: {
    type: 'VHF',
    name: 'vhf',
    displayName: 'VHF',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },

  // UHF
  UHF: {
    type: 'UHF',
    name: 'uhf',
    displayName: 'UHF',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },

  // 5G通信
  FiveG: {
    type: 'FiveG',
    name: 'five_g',
    displayName: '5G通信',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'ofdm',
    role: 2,
  },

  // DSSS - 短波
  DSSS: {
    type: 'DSSS',
    name: 'dsss',
    displayName: '短波',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'dsss',
    role: 2,
  },

  // FHSS - 中长波
  FHSS: {
    type: 'FHSS',
    name: 'fhss',
    displayName: '中长波',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },

  // GMSK - 散射
  GMSK: {
    type: 'GMSK',
    name: 'gmsk',
    displayName: '散射',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },

  // GFSK - 卫星
  GFSK: {
    type: 'GFSK',
    name: 'gfsk',
    displayName: '卫星',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },

  // 散射
  CUSTOM: {
    type: 'CUSTOM',
    name: 'custom',
    displayName: '散射',
    emaneModel: 'rfpipe',
    emaneModelFull: 'emane_rfpipe',
    phyType: 'fhss',
    role: 2,
  },
}

/**
 * 获取信道模型的emane_configs配置
 * 所有模型使用相同的固定配置
 */
export function getChannelModelEmaneConfigs(presetType: string): EmaneConfig[] | null {
  try {
    const preset = channelModelPresets[presetType]
    if (!preset) return null

    // 返回固定配置的深拷贝，避免修改原始数据
    // CUSTOM类型也使用相同的固定配置
    return JSON.parse(JSON.stringify(FIXED_EMANE_CONFIGS))
  } catch (error) {
    console.error(`获取${presetType}模型emane_configs失败:`, error)
    return null
  }
}
