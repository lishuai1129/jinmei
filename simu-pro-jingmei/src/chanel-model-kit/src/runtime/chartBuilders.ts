import type { EChartsOption } from 'echarts'
import type { ComplexPoint } from './dataNormalizer'

const palette = {
  cyan: '#10d5df',
  orange: '#ff7a45',
  green: '#57d86b',
  pink: '#f23b96',
  blue: '#3ea7ff',
  red: '#f15b62',
  grid: 'rgba(79, 144, 255, 0.16)',
  text: '#a9f5c2',
  axis: '#7aa6f7',
}

function baseOption(): EChartsOption {
  return {
    backgroundColor: 'transparent',
    animationDuration: 240,
    animationEasing: 'cubicOut',
    textStyle: { color: palette.text },
    grid: { left: 56, right: 34, top: 46, bottom: 42 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(8, 16, 39, 0.92)', borderColor: '#1f75ff' },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: palette.axis } },
      axisLabel: { color: palette.text },
      splitLine: { lineStyle: { color: palette.grid } },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: palette.axis } },
      axisLabel: { color: palette.text },
      splitLine: { lineStyle: { color: palette.grid } },
    },
  }
}

export function buildEmptyOption(message = '暂无可展示数据'): EChartsOption {
  return {
    backgroundColor: 'transparent',
    title: {
      text: message,
      left: 'center',
      top: 'middle',
      textStyle: { color: palette.text, fontSize: 14, fontWeight: 'normal' },
    },
  }
}

export function buildBitCompareOption(originalBits: number[], decodedBits: number[]): EChartsOption {
  if (!originalBits.length || !decodedBits.length) return buildEmptyOption('暂无比特流数据')
  const count = Math.min(originalBits.length, decodedBits.length, 512)
  return {
    ...baseOption(),
    title: { text: `原始比特 vs 解调比特 (${count} 位)`, left: 16, top: 8, textStyle: { color: palette.text, fontSize: 13 } },
    legend: { top: 12, right: 16, textStyle: { color: palette.text }, data: ['原始比特', '解调比特'] },
    xAxis: { ...(baseOption().xAxis as object), name: '比特索引', min: 0, max: count - 1 },
    yAxis: { ...(baseOption().yAxis as object), min: -0.2, max: 1.2 },
    series: [
      {
        name: '原始比特',
        type: 'line',
        step: 'middle',
        symbol: 'circle',
        symbolSize: 4,
        data: originalBits.slice(0, count).map((value, index) => [index, value]),
        lineStyle: { color: palette.cyan, width: 2 },
        itemStyle: { color: palette.cyan },
      },
      {
        name: '解调比特',
        type: 'line',
        step: 'middle',
        symbol: 'rect',
        symbolSize: 4,
        data: decodedBits.slice(0, count).map((value, index) => [index, value]),
        lineStyle: { color: palette.orange, width: 2, type: 'dashed' },
        itemStyle: { color: palette.orange },
      },
    ],
  }
}

export function buildConstellationOption(
  seriesList: Array<{ name: string; points: ComplexPoint[]; color?: string }>,
  title = '星座图',
  fixedRange?: number,
): EChartsOption {
  const validSeries = seriesList.filter((item) => item.points.length)
  if (!validSeries.length) return buildEmptyOption('暂无星座数据')

  const all = validSeries.flatMap((item) => item.points)
  const maxAbs = fixedRange || Math.max(0.1, ...all.flatMap((point) => [Math.abs(point.x), Math.abs(point.y)]))
  const range = fixedRange || Number((maxAbs * 1.15).toPrecision(2))

  return {
    ...baseOption(),
    title: { text: title, left: 16, top: 8, textStyle: { color: palette.text, fontSize: 13 } },
    legend: { top: 12, right: 16, textStyle: { color: palette.text }, data: validSeries.map((item) => item.name) },
    tooltip: { trigger: 'item' },
    xAxis: { ...(baseOption().xAxis as object), name: 'I路', min: -range, max: range },
    yAxis: { ...(baseOption().yAxis as object), name: 'Q路', min: -range, max: range },
    series: validSeries.map((item, index) => ({
      name: item.name,
      type: 'scatter',
      symbolSize: 5,
      data: item.points.slice(0, 4096).map((point) => [point.x, point.y]),
      itemStyle: { color: item.color || [palette.pink, palette.cyan, palette.green][index % 3] },
    })),
  }
}

export function buildIqWaveformOption(points: ComplexPoint[], title = 'IQ波形'): EChartsOption {
  if (!points.length) return buildEmptyOption('暂无IQ波形数据')
  const count = Math.min(points.length, 1024)
  return {
    ...baseOption(),
    title: { text: `${title} (${count} 点)`, left: 16, top: 8, textStyle: { color: palette.text, fontSize: 13 } },
    legend: { top: 12, right: 16, textStyle: { color: palette.text }, data: ['I(real)', 'Q(imag)'] },
    xAxis: { ...(baseOption().xAxis as object), name: '采样点', min: 0, max: count - 1 },
    yAxis: { ...(baseOption().yAxis as object), name: '幅度' },
    series: [
      {
        name: 'I(real)',
        type: 'line',
        showSymbol: false,
        smooth: 0.28,
        data: points.slice(0, count).map((point, index) => [index, point.x]),
        lineStyle: { color: palette.cyan, width: 2 },
      },
      {
        name: 'Q(imag)',
        type: 'line',
        showSymbol: false,
        smooth: 0.28,
        data: points.slice(0, count).map((point, index) => [index, point.y]),
        lineStyle: { color: palette.orange, width: 2 },
      },
    ],
  }
}

export function buildSpectrumOption(values: number[], title = '频谱图'): EChartsOption {
  if (!values.length) return buildEmptyOption('暂无频谱数据')
  return {
    ...baseOption(),
    title: { text: `${title} (${values.length} 点)`, left: 16, top: 8, textStyle: { color: palette.text, fontSize: 13 } },
    xAxis: { ...(baseOption().xAxis as object), name: '频点', min: 0, max: values.length - 1 },
    yAxis: { ...(baseOption().yAxis as object), name: '功率/dB' },
    series: [
      {
        name: '频谱',
        type: 'line',
        showSymbol: false,
        smooth: true,
        areaStyle: { color: 'rgba(16, 213, 223, 0.12)' },
        data: values.map((value, index) => [index, value]),
        lineStyle: { color: palette.blue, width: 2 },
      },
    ],
  }
}

export function buildCloudComparisonOption(before: ComplexPoint[], after: ComplexPoint[]): EChartsOption {
  return buildConstellationOption(
    [
      { name: '去导频后', points: before, color: palette.blue },
      { name: '相位补偿', points: after, color: palette.red },
    ],
    '云图对比',
    3,
  )
}
