/**
 * @dsh-external/dsh-floating-maid — client 端
 * 「Aether Maid · 桌面全功能 AI 交互控制台」
 * 1. 宽幅 330px 超宽底座，自适应弹性双轨布局，100% 杜绝任何字符截断；
 * 2. 最底部实装【悬浮窗图文多模态交互输入框 (Floating Input Deck)】：
 *    - 随时向 AI 发送指令；
 *    - 📷 点击选择照片 / 📋 剪贴板 Ctrl+V 粘贴截图 / 🖼️ 实时缩略图预览；
 *    - 回车 Enter 快速发送；
 * 3. 状态胶囊上移至输入框上方，与 👑/🤖 Agent 视图切换 Tab 紧凑并排；
 * 4. 100% 对齐 DSH 官方优雅矢量线性图标体系 (Think, Read, Write, Bash, Search, ToolCall);
 * 5. 专属闪存芯片缓存命中图标 (IconCache)；
 * 6. 步骤精确耗时显示（100ms, 1.2s, 10s, 1min, 1h）；
 * 7. 失败命令精准标红（❌ 失败，绝不误打绿勾）。
 */
import * as React from 'react'
import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { MAID_PNG } from './assets.js'

const PLUGIN_ID = '@dsh-external/dsh-floating-maid'

const SOUND_PRESS = (set: string) => `/api/maid/sound/press.mp3?set=${set}`
const SOUND_RELEASE = (set: string) => `/api/maid/sound/release.mp3?set=${set}`

export const inject = ['slots', 'sessions']

// ───────── 官方风格原生极简线性 SVG 微组件体系 ─────────
const IconTarget = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#60a5fa', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('circle', { cx: '12', cy: '12', r: '9' }),
    React.createElement('circle', { cx: '12', cy: '12', r: '4' }),
    React.createElement('line', { x1: '12', y1: '2', x2: '12', y2: '5' }),
    React.createElement('line', { x1: '12', y1: '19', x2: '12', y2: '22' }),
    React.createElement('line', { x1: '2', y1: '12', x2: '5', y2: '12' }),
    React.createElement('line', { x1: '19', y1: '12', x2: '22', y2: '12' }),
  )

// 0. User 用户头像图标
const IconUser = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#38bdf8', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
    React.createElement('circle', { cx: '12', cy: '7', r: '4' })
  )

// 1. Think 原子轨道双环模型
const IconThink = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#c084fc', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('circle', { cx: '12', cy: '12', r: '2.2', fill: 'currentColor' }),
    React.createElement('ellipse', { cx: '12', cy: '12', rx: '8.5', ry: '3.5', transform: 'rotate(30 12 12)' }),
    React.createElement('ellipse', { cx: '12', cy: '12', rx: '8.5', ry: '3.5', transform: 'rotate(-30 12 12)' }),
    React.createElement('ellipse', { cx: '12', cy: '12', rx: '8.5', ry: '3.5', transform: 'rotate(90 12 12)' }),
  )

// 2. Read 圆角文档带短横线
const IconRead = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#38bdf8', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '4', y: '3', width: '16', height: '18', rx: '3.5' }),
    React.createElement('line', { x1: '8.5', y1: '8.5', x2: '15.5', y2: '8.5' }),
    React.createElement('line', { x1: '8.5', y1: '12.5', x2: '13.5', y2: '12.5' }),
  )

// 3. Write 倾斜铅笔与底线
const IconWrite = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#fb923c', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' }),
    React.createElement('line', { x1: '14', y1: '21', x2: '22', y2: '21' }),
  )

// 4. Bash 圆角终端框带提示符
const IconBash = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#fbbf24', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '4' }),
    React.createElement('polyline', { points: '7 9 10 12 7 15' }),
    React.createElement('line', { x1: '12', y1: '15', x2: '16', y2: '15' }),
  )

// 5. Search 极简圆角放大镜
const IconSearch = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#a78bfa', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('circle', { cx: '10.5', cy: '10.5', r: '6.5' }),
    React.createElement('line', { x1: '15.5', y1: '15.5', x2: '21', y2: '21' }),
  )

// 6. Tool call 双四角星辉光组合
const IconToolCall = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#fbbf24', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8Z', fill: 'currentColor', fillOpacity: '0.25' }),
    React.createElement('path', { d: 'M19 14L20 17L23 18L20 19L19 22L18 19L15 18L18 17Z', fill: 'currentColor', fillOpacity: '0.45' }),
  )

// 7. Plugin 插件模块
const IconPlugin = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#f472b6', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('polygon', { points: '12 2 2 7 12 12 22 7 12 2' }),
    React.createElement('polyline', { points: '2 17 12 22 22 17' }),
    React.createElement('polyline', { points: '2 12 12 17 22 12' }),
  )

// 8. Message 对话气泡
const IconMsg = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#38bdf8', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }),
  )

// 9. 完成对勾
const IconDone = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#4ade80', strokeWidth: '2.8', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('polyline', { points: '20 6 9 17 4 12' }),
  )

// 10. 失败红叉
const IconFailed = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#f87171', strokeWidth: '2.8', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
  )

// 11. 饱满醒目的加载中指示器
const IconLoading = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    className: 'dsh-spin',
    width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#fbbf24', strokeWidth: '3', strokeLinecap: 'round'
  },
    React.createElement('circle', { cx: '12', cy: '12', r: '9', strokeOpacity: '0.25' }),
    React.createElement('path', { d: 'M12 3a9 9 0 0 1 9 9' }),
  )

// 12. 专属闪存芯片缓存命中图标 (IconCache)
const IconCache = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#34d399', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '4', y: '4', width: '16', height: '16', rx: '3' }),
    React.createElement('path', { d: 'M13 7l-3 5h4l-2 5', strokeWidth: '2', fill: props.color || '#34d399', fillOpacity: '0.35' }),
    React.createElement('line', { x1: '9', y1: '1', x2: '9', y2: '4' }),
    React.createElement('line', { x1: '15', y1: '1', x2: '15', y2: '4' }),
    React.createElement('line', { x1: '9', y1: '20', x2: '9', y2: '23' }),
    React.createElement('line', { x1: '15', y1: '20', x2: '15', y2: '23' }),
  )

// 13. 主 Agent 金色王冠 (IconCrown)
const IconCrown = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#f59e0b', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z', fill: props.color || '#f59e0b', fillOpacity: '0.2' }),
    React.createElement('path', { d: 'M3 20h18' })
  )

// 14. 子 Agent 机器人头盔 (IconBot)
const IconBot = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#a855f7', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '4', y: '9', width: '16', height: '12', rx: '3' }),
    React.createElement('circle', { cx: '12', cy: '4', r: '1.5' }),
    React.createElement('path', { d: 'M12 5.5v3.5' }),
    React.createElement('circle', { cx: '9', cy: '14', r: '1', fill: 'currentColor' }),
    React.createElement('circle', { cx: '15', cy: '14', r: '1', fill: 'currentColor' }),
  )

// 15. 发送图标 (IconSend)
const IconSend = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#38bdf8', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '22', y1: '2', x2: '11', y2: '13' }),
    React.createElement('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
  )

// 16. 图片附件图标 (IconImageAttach)
const IconImageAttach = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#94a3b8', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '4' }),
    React.createElement('circle', { cx: '8.5', cy: '8.5', r: '1.5' }),
    React.createElement('polyline', { points: '21 15 16 10 5 21' }),
  )

const IconVolumeOn = (props: { size?: number }) =>
  React.createElement('svg', { width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
    React.createElement('path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' }),
    React.createElement('path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14' }),
  )

const IconVolumeOff = (props: { size?: number }) =>
  React.createElement('svg', { width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
    React.createElement('line', { x1: '23', y1: '9', x2: '17', y2: '15' }),
    React.createElement('line', { x1: '17', y1: '9', x2: '23', y2: '15' }),
  )

const IconRestore = (props: { size?: number }) =>
  React.createElement('svg', { width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '4 14 10 14 10 20' }),
    React.createElement('polyline', { points: '20 10 14 10 14 4' }),
    React.createElement('line', { x1: '14', y1: '10', x2: '21', y2: '3' }),
    React.createElement('line', { x1: '3', y1: '21', x2: '10', y2: '14' }),
  )

const IconExpand = (props: { size?: number; color?: string }) =>
  React.createElement('svg', { width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24', fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '15 3 21 3 21 9' }),
    React.createElement('polyline', { points: '9 21 3 21 3 15' }),
    React.createElement('line', { x1: '21', y1: '3', x2: '14', y2: '10' }),
    React.createElement('line', { x1: '3', y1: '21', x2: '10', y2: '14' }),
  )

const IconChevronDown = (props: { size?: number; color?: string }) =>
  React.createElement('svg', { width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24', fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '6 9 12 15 18 9' })
  )

const IconHeart = (props: { size?: number; color?: string }) =>
  React.createElement('svg', { width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24', fill: props.color || '#ff6b9d' },
    React.createElement('path', { d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' }),
  )

// 17. AI 核心芯片图标 (IconModelChip)
const IconModelChip = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#38bdf8', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '4', y: '4', width: '16', height: '16', rx: '3' }),
    React.createElement('rect', { x: '9', y: '9', width: '6', height: '6', rx: '1', fill: 'currentColor', fillOpacity: '0.3' }),
    React.createElement('line', { x1: '9', y1: '1', x2: '9', y2: '4' }),
    React.createElement('line', { x1: '15', y1: '1', x2: '15', y2: '4' }),
    React.createElement('line', { x1: '9', y1: '20', x2: '9', y2: '23' }),
    React.createElement('line', { x1: '15', y1: '20', x2: '15', y2: '23' }),
    React.createElement('line', { x1: '1', y1: '9', x2: '4', y2: '9' }),
    React.createElement('line', { x1: '1', y1: '15', x2: '4', y2: '15' }),
    React.createElement('line', { x1: '20', y1: '9', x2: '23', y2: '9' }),
    React.createElement('line', { x1: '20', y1: '15', x2: '23', y2: '15' }),
  )

// 18. 推理思维链图标 (IconBrain)
const IconBrain = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#c084fc', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z' }),
    React.createElement('path', { d: 'M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z' }),
  )

// 19. 上下文容量图标 (IconContext)
const IconContext = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#4ade80', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }),
    React.createElement('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
    React.createElement('line', { x1: '12', y1: '22.08', x2: '12', y2: '12' }),
  )

// 20. 生成速率闪电图标 (IconLightning)
const IconLightning = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 10, height: props.size || 10, viewBox: '0 0 24 24',
    fill: props.color || '#fbbf24', stroke: props.color || '#fbbf24', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }),
  )

// 21. 排队沙漏图标 (IconHourglass)
const IconHourglass = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#fb923c', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M5 22h14' }),
    React.createElement('path', { d: 'M5 2h14' }),
    React.createElement('path', { d: 'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22' }),
    React.createElement('path', { d: 'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2' }),
  )

const IconActivity = (props: { size?: number; color?: string }) =>
  React.createElement('svg', { width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24', fill: 'none', stroke: props.color || '#60a5fa', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' }),
  )

// ───────── 类型 ─────────
type Phase = 'idle' | 'waiting' | 'thinking' | 'review' | 'tool' | 'done' | 'failed'

export interface HistoryStep {
  id: string
  type: 'user' | 'tool' | 'thinking' | 'message' | 'done' | 'failed'
  toolName?: string
  title: string
  status: 'running' | 'done' | 'failed'
  startTime: number
  endTime?: number
  durationMs?: number
}

export interface ContextBreakdown {
  usedTokens: number
  totalLimitTokens: number
  usedPercent: string
  usedPercentNum: number
  systemTokens: number
  toolsTokens: number
  messagesTokens: number
}

export interface ModelMeta {
  modelName: string
  modelProvider?: string
  effort: string
  context: ContextBreakdown
}

export interface TelemetryMetrics {
  turnSteps: number
  turnBilledInput: number
  turnCacheRead: number
  turnCacheWrite: number
  turnOutput: number
  turnCacheHitPercent: string
  turnCacheHitRate: number

  sessionBilledInput: number
  sessionCacheRead: number
  sessionCacheWrite: number
  sessionOutput: number
  sessionCacheHitPercent: string
  sessionCacheHitRate: number

  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftAvgMs: number
  tokensPerSec: number
  modelMeta?: ModelMeta
}

export interface QueuedMessage {
  id: string
  content: string
  target: 'nextTurn' | 'nextStep'
  time: number
}

export interface SessionSummary {
  id: string
  title: string
  phase: Phase
  status: 'running' | 'idle' | 'done' | 'failed'
  lastUpdate: number
  stepsCount: number
  userInput?: string | null
  thinking?: string
  steps?: HistoryStep[]
  metrics?: TelemetryMetrics
  agents?: AgentView[]
  queuedMessages?: QueuedMessage[]
}

export interface AgentView {
  id: string
  name: string
  isMain: boolean
  status: 'running' | 'done' | 'failed' | 'idle'
  phase: Phase
  line: string
  thinking: string
  steps: HistoryStep[]
  metrics?: TelemetryMetrics
}

interface MaidState {
  activeSessionId?: string
  sessions?: SessionSummary[]
  activeAgentId: string
  agents?: AgentView[]
  phase: Phase
  line: string
  tool: string | null
  sessionId: string | null
  lastUpdate: number
  patCount: number
  userInput: string | null
  thinking: string
  steps?: HistoryStep[]
  metrics?: TelemetryMetrics
  queuedMessages?: QueuedMessage[]
}
interface Pos { right: number; bottom: number }

// ───────── 状态视觉字典 ─────────
interface PhaseMeta {
  text: string
  color: string
  bg: string
  border: string
  dot: string
  aura: string
}
const PHASE_DICT: Record<Phase, PhaseMeta> = {
  idle: { text: '待命中', color: '#a0aec0', bg: 'rgba(160, 174, 192, 0.14)', border: 'rgba(160, 174, 192, 0.3)', dot: '#a0aec0', aura: 'rgba(100, 116, 139, 0.2)' },
  waiting: { text: '等待响应', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.16)', border: 'rgba(96, 165, 250, 0.38)', dot: '#60a5fa', aura: 'rgba(59, 130, 246, 0.24)' },
  thinking: { text: '思考中', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.18)', border: 'rgba(192, 132, 252, 0.45)', dot: '#c084fc', aura: 'rgba(168, 85, 247, 0.28)' },
  review: { text: '整理回复', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.16)', border: 'rgba(56, 189, 248, 0.38)', dot: '#38bdf8', aura: 'rgba(14, 165, 233, 0.24)' },
  tool: { text: '执行操作', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.18)', border: 'rgba(251, 191, 36, 0.45)', dot: '#fbbf24', aura: 'rgba(245, 158, 11, 0.26)' },
  done: { text: '已完成', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.18)', border: 'rgba(74, 222, 128, 0.45)', dot: '#4ade80', aura: 'rgba(34, 197, 94, 0.28)' },
  failed: { text: '出错了', color: '#f87171', bg: 'rgba(248, 113, 113, 0.18)', border: 'rgba(248, 113, 113, 0.45)', dot: '#f87171', aura: 'rgba(239, 68, 68, 0.28)' },
}

function formatTokens(count: number): string {
  if (!count || count <= 0) return '0'
  if (count < 1000) return String(count)
  if (count < 1000000) {
    const k = count / 1000
    return (k >= 100 ? Math.round(k) : (Math.round(k * 10) / 10)) + 'K'
  }
  const m = count / 1000000
  return (m >= 100 ? Math.round(m) : (Math.round(m * 100) / 100)) + 'M'
}

function formatStepDuration(ms?: number): string {
  if (ms === undefined || ms === null || ms <= 0) return ''
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const whole = Math.round(s)
  if (whole < 3600) return `${Math.floor(whole / 60)}min${whole % 60 > 0 ? (whole % 60) + 's' : ''}`
  return `${Math.floor(whole / 3600)}h${Math.floor((whole % 3600) / 60)}min`
}

function getStepToolMeta(toolName?: string, title?: string): { icon: React.ReactElement; tag: string } {
  const tn = String(toolName || '').toLowerCase()
  const tit = String(title || '').toLowerCase()

  if (tn === 'write' || tn === 'edit' || tit.includes('写入文件') || tit.includes('修改文件')) {
    return { icon: React.createElement(IconWrite), tag: '编辑' }
  }
  if (tn === 'read' || tit.includes('读取文件')) {
    return { icon: React.createElement(IconRead), tag: '读取' }
  }
  if (tn === 'glob' || tn === 'grep' || tn.includes('search') || tit.includes('搜索') || tit.includes('检索')) {
    return { icon: React.createElement(IconSearch), tag: '检索' }
  }
  if (tn === 'bash' || tn.includes('ssh') || tit.includes('运行命令') || tit.includes('命令')) {
    return { icon: React.createElement(IconBash), tag: '终端' }
  }
  if (tn.startsWith('dev_') || tn.includes('plugin') || tit.includes('插件') || tit.includes('模组')) {
    return { icon: React.createElement(IconPlugin), tag: '插件' }
  }
  return { icon: React.createElement(IconToolCall), tag: '工具' }
}

// ───────── 持久化 ─────────
const POS_KEY = 'dsh-floating-maid:pos:v1'
const HIDDEN_KEY = 'dsh-floating-maid:hidden:v1'
const loadPos = (isMobileView?: boolean): Pos => {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (typeof p?.right === 'number' && typeof p?.bottom === 'number') {
        if (typeof window !== 'undefined') {
          const maxR = Math.max(10, window.innerWidth - (isMobileView ? 70 : 210))
          const maxB = Math.max(10, window.innerHeight - (isMobileView ? 80 : 220))
          return {
            right: Math.min(Math.max(10, p.right), maxR),
            bottom: Math.min(Math.max(10, p.bottom), maxB),
          }
        }
        return p
      }
    }
  } catch { /* ignore */ }
  return isMobileView ? { right: 14, bottom: 64 } : { right: 24, bottom: 24 }
}
const loadHidden = (): boolean => {
  try { return localStorage.getItem(HIDDEN_KEY) === '1' } catch { return false }
}

// ───────── 拖动 hook (屏幕刷新率 rAF 对齐 + 0延迟跟随 + 智能吸边) ─────────
function useDrag(
  pos: Pos,
  setPos: (p: Pos) => void,
  isMobile: boolean,
  widgetRef: { current: HTMLDivElement | null }
) {
  const drag = useRef({
    active: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
    moved: false,
    curRight: pos.right,
    curBottom: pos.bottom,
    rafId: 0,
    latestClientX: 0,
    latestClientY: 0,
  })

  useEffect(() => {
    if (!drag.current.active) {
      drag.current.curRight = pos.right
      drag.current.curBottom = pos.bottom
    }
  }, [pos.right, pos.bottom])

  const updatePosition = () => {
    drag.current.rafId = 0
    if (!drag.current.active) return

    const dx = drag.current.latestClientX - drag.current.sx
    const dy = drag.current.latestClientY - drag.current.sy

    let newRight = drag.current.ox - dx
    let newBottom = drag.current.oy - dy

    if (typeof window !== 'undefined') {
      const spriteW = isMobile ? 65 : 205
      const spriteH = isMobile ? 70 : 215
      const maxR = Math.max(8, window.innerWidth - spriteW)
      const maxB = Math.max(10, window.innerHeight - spriteH)
      newRight = Math.max(8, Math.min(maxR, newRight))
      newBottom = Math.max(10, Math.min(maxB, newBottom))
    }

    drag.current.curRight = newRight
    drag.current.curBottom = newBottom

    // 屏幕刷新率 (V-Sync) 直接驱动 DOM，0ms 延迟跟手，跳过 React 虚拟 DOM 漫长 diff 与重渲染
    if (widgetRef.current) {
      widgetRef.current.style.right = `${newRight}px`
      widgetRef.current.style.bottom = `${newBottom}px`

      const bubbleEl = widgetRef.current.querySelector('.dsh-maid-bubble')
      if (bubbleEl && typeof window !== 'undefined') {
        const isLeft = newRight > window.innerWidth / 2
        bubbleEl.classList.toggle('dsh-maid-bubble--dock-left', isLeft)
      }
    }
  }

  const onWindowPointerMove = (e: PointerEvent) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > (isMobile ? 8 : 3)) {
      drag.current.moved = true
    }

    drag.current.latestClientX = e.clientX
    drag.current.latestClientY = e.clientY

    // 对齐显示器刷新率 (60/120/144Hz)，杜绝多余开销和事件堆积导致的“瞬移”
    if (!drag.current.rafId) {
      drag.current.rafId = requestAnimationFrame(updatePosition)
    }
  }

  const onWindowPointerUp = () => {
    if (!drag.current.active) return
    drag.current.active = false

    if (drag.current.rafId) {
      cancelAnimationFrame(drag.current.rafId)
      drag.current.rafId = 0
    }

    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerUp)

    if (widgetRef.current) {
      widgetRef.current.classList.remove('dsh-maid-widget--dragging')
      widgetRef.current.style.transition = ''
    }

    let finalRight = drag.current.curRight
    let finalBottom = drag.current.curBottom

    // 移动端释放时智能吸边
    if (isMobile && typeof window !== 'undefined' && drag.current.moved) {
      const mid = window.innerWidth / 2
      if (finalRight > mid - 30) {
        finalRight = Math.max(8, window.innerWidth - 72)
      } else {
        finalRight = 12
      }
    }

    // 拖动完全结束后统一持久化与更新 React 状态
    setPos({ right: finalRight, bottom: finalBottom })
  }

  const onDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()

    drag.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      ox: pos.right,
      oy: pos.bottom,
      moved: false,
      curRight: pos.right,
      curBottom: pos.bottom,
      rafId: 0,
      latestClientX: e.clientX,
      latestClientY: e.clientY,
    }

    if (widgetRef.current) {
      widgetRef.current.classList.add('dsh-maid-widget--dragging')
      widgetRef.current.style.transition = 'none'
    }

    // 全局 window 监听，彻底避免高速甩动鼠标时光标脱离造成脱手瞬移
    window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)
  }

  useEffect(() => {
    return () => {
      if (drag.current.rafId) cancelAnimationFrame(drag.current.rafId)
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
    }
  }, [])

  return { onDown, wasDrag: () => drag.current.moved }
}

function parseThinking(raw: string): { isSummary: boolean; text: string } {
  if (!raw) return { isSummary: false, text: '' }
  const matches = [...raw.matchAll(/(?:\*\*|###?\s+)([^\*\n\r#]{2,55})(?:\*\*|\n)/g)]
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1]
    const title = lastMatch ? lastMatch[1].trim() : ''
    if (title && title.length >= 2) return { isSummary: true, text: title }
  }
  return { isSummary: false, text: raw }
}

function useSmoothStream(targetText: string, isSummary: boolean): string {
  const [displayedText, setDisplayedText] = useState(targetText)
  const targetRef = useRef(targetText)
  const displayedLenRef = useRef(targetText.length)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const avgMsPerCharRef = useRef<number>(35)
  const lastArrivalRef = useRef<number>(Date.now())
  const lastTargetLenRef = useRef<number>(targetText.length)

  targetRef.current = targetText

  useEffect(() => {
    if (isSummary) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setDisplayedText(targetText)
      displayedLenRef.current = targetText.length
      lastTargetLenRef.current = targetText.length
      return
    }

    const now = Date.now()
    const deltaChars = targetText.length - lastTargetLenRef.current
    const deltaMs = now - lastArrivalRef.current

    if (deltaChars > 0 && deltaMs >= 30 && deltaMs <= 2500) {
      const currentSample = deltaMs / deltaChars
      const clampedSample = Math.min(120, Math.max(12, currentSample))
      avgMsPerCharRef.current = avgMsPerCharRef.current * 0.65 + clampedSample * 0.35
    }
    lastArrivalRef.current = now
    lastTargetLenRef.current = targetText.length

    if (targetText.length <= displayedLenRef.current) {
      if (targetText.length < displayedLenRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current)
        setDisplayedText(targetText)
        displayedLenRef.current = targetText.length
      }
      return
    }

    const step = () => {
      const full = targetRef.current
      const curLen = displayedLenRef.current
      const remaining = full.length - curLen
      if (remaining <= 0) {
        timerRef.current = null
        return
      }

      const baseDelay = avgMsPerCharRef.current
      let charsToAdd = 1
      let delayMs = baseDelay

      if (remaining > 40) {
        charsToAdd = 3
        delayMs = Math.max(15, baseDelay * 0.45)
      } else if (remaining > 20) {
        charsToAdd = 2
        delayMs = Math.max(18, baseDelay * 0.65)
      } else if (remaining > 6) {
        charsToAdd = 1
        delayMs = Math.max(22, baseDelay * 0.95)
      } else if (remaining > 2) {
        charsToAdd = 1
        delayMs = baseDelay * 1.4
      } else {
        charsToAdd = 1
        delayMs = baseDelay * (1.8 + (3 - remaining) * 0.4)
      }

      const nextLen = Math.min(full.length, curLen + charsToAdd)
      displayedLenRef.current = nextLen
      setDisplayedText(full.slice(0, nextLen))

      if (nextLen < full.length) {
        timerRef.current = setTimeout(step, delayMs)
      } else {
        timerRef.current = null
      }
    }

    if (!timerRef.current) {
      timerRef.current = setTimeout(step, 15)
    }
  }, [targetText, isSummary])

  return isSummary ? targetText : displayedText
}

// ───────── CSS 样式体系 ─────────
const CSS = `
@keyframes dsh-aether-float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(-1deg); }
}
@keyframes dsh-aether-jelly {
  0% { transform: scale(1, 1); }
  25% { transform: scale(1.14, 0.86) translateY(2px); }
  50% { transform: scale(0.92, 1.1) translateY(-5px); }
  75% { transform: scale(1.04, 0.97) translateY(0); }
  100% { transform: scale(1, 1); }
}
@keyframes dsh-aether-aura-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.65; }
  50% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.95; }
}
@keyframes dsh-aether-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: 0% 0; }
}
@keyframes dsh-aether-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px currentColor); }
  50% { transform: scale(1.35); opacity: 0.6; filter: drop-shadow(0 0 6px currentColor); }
}
@keyframes dsh-aether-pop-heart {
  0% { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
  30% { opacity: 1; transform: translate(-50%, -16px) scale(1.2); }
  100% { opacity: 0; transform: translate(-50%, -36px) scale(1.3); }
}
@keyframes dsh-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.dsh-spin {
  animation: dsh-spin 0.85s linear infinite;
  display: inline-block;
  vertical-align: middle;
}

/* ================= 网页端右下角挂件 ================= */
.dsh-maid-widget {
  position: fixed;
  z-index: 2147483000;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
  transition: right 0.22s cubic-bezier(0.2, 0.8, 0.25, 1), bottom 0.22s cubic-bezier(0.2, 0.8, 0.25, 1);
}
.dsh-maid-widget.dsh-maid-widget--dragging {
  transition: none !important;
}
.dsh-maid-widget.dsh-maid-widget--dragging .dsh-maid-sprite {
  cursor: grabbing !important;
}
.dsh-maid-bubble {
  position: absolute;
  right: 0;
  bottom: 212px;
  width: 360px;
  max-width: calc(100vw - 48px);
  padding: 10px 16px 12px 16px;
  background: linear-gradient(135deg, rgba(26, 30, 42, 0.96) 0%, rgba(15, 17, 24, 0.98) 100%);
  color: #e8e8ec;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12);
  font-size: 13px;
  line-height: 1.4;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-sizing: border-box;
}
.dsh-maid-bubble__title-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 56px;
  box-sizing: border-box;
}
.dsh-maid-bubble__title-text {
  flex: 1 1 0;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.dsh-maid-bubble__status {
  position: relative;
  width: 100%;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  height: 1.4em;
  overflow: hidden;
  white-space: nowrap;
  text-align: left;
}
.dsh-maid-bubble__status.dsh-maid-bubble__status--fade-right {
  mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 32px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 32px), transparent 100%);
}
.dsh-maid-bubble__status.dsh-maid-bubble__status--fade-both {
  mask-image: linear-gradient(to right, transparent 0%, #000 20px, #000 calc(100% - 28px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 20px, #000 calc(100% - 28px), transparent 100%);
}
.dsh-maid-bubble__ticker {
  position: absolute;
  top: 0; left: 0;
  height: 1.4em;
  line-height: 1.4;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  transition: transform 260ms cubic-bezier(0.12, 0.78, 0.24, 1);
  will-change: transform;
}
.dsh-maid-bubble__status--thinking .dsh-maid-bubble__ticker,
.dsh-maid-bubble__status--waiting .dsh-maid-bubble__ticker {
  color: #e5e7eb;
  background: linear-gradient(90deg,
    rgba(160, 165, 175, 0.65) 0%,
    rgba(175, 180, 192, 0.75) 12%,
    #ffffff 25%,
    rgba(175, 180, 192, 0.75) 38%,
    rgba(160, 165, 175, 0.65) 50%,
    rgba(175, 180, 192, 0.75) 62%,
    #ffffff 75%,
    rgba(175, 180, 192, 0.75) 88%,
    rgba(160, 165, 175, 0.65) 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: dsh-aether-shimmer 2.4s linear infinite;
  filter: drop-shadow(0 0 1px rgba(255,255,255,0.25));
}
.dsh-maid-bubble__status--tool .dsh-maid-bubble__ticker { color: #fbbf24; background: none; -webkit-text-fill-color: #fbbf24; }
.dsh-maid-bubble__status--review .dsh-maid-bubble__ticker { color: #38bdf8; background: none; -webkit-text-fill-color: #38bdf8; }
.dsh-maid-bubble__status--done .dsh-maid-bubble__ticker { color: #4ade80; background: none; -webkit-text-fill-color: #4ade80; }
.dsh-maid-bubble__status--failed .dsh-maid-bubble__ticker { color: #f87171; background: none; -webkit-text-fill-color: #f87171; }

.dsh-maid-bubble__actions {
  position: absolute;
  top: 8px; right: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dsh-maid-bubble__btn {
  width: 22px; height: 22px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #c9cdd4;
  cursor: pointer;
  border-radius: 6px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 120ms ease-out;
}
.dsh-maid-bubble__btn:hover { color: #fff; background: rgba(255, 255, 255, 0.18); }

.dsh-maid-sprite-box {
  position: absolute;
  right: 0; bottom: 0;
  width: 200px; height: 210px;
  pointer-events: auto;
}
.dsh-maid-sprite {
  width: 200px; height: 210px;
  object-fit: contain;
  display: block;
  cursor: grab;
  filter: drop-shadow(0 8px 18px rgba(0,0,0,0.45));
  animation: dsh-aether-float 3.2s ease-in-out infinite;
  will-change: transform;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
}
.dsh-maid-sprite:active { animation: dsh-aether-jelly 360ms ease-out 1 !important; }

.dsh-maid-pat-badge {
  position: absolute;
  top: 8px; right: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  background: rgba(255, 80, 140, 0.22);
  border: 1px solid rgba(255, 120, 175, 0.45);
  border-radius: 999px;
  color: #ff7da7;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: none;
}
.dsh-maid-pat-pop {
  position: absolute;
  top: 25%; left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  color: #ff5e97;
  font-size: 14px;
  font-weight: 800;
  pointer-events: none;
  text-shadow: 0 2px 8px rgba(0,0,0,0.7);
  animation: dsh-aether-pop-heart 650ms ease-out forwards;
}

.dsh-maid-summon {
  position: fixed;
  right: 24px; bottom: 24px;
  z-index: 2147483000;
  padding: 8px 14px;
  background: rgba(22, 24, 30, 0.95);
  color: #e8e8ec;
  border: 1px solid rgba(130, 140, 160, 0.35);
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  font-family: inherit;
}

/* ================= 桌面置顶「Aether 灵动悬浮岛」 ================= */
.dsh-aether-root {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 8px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #090a0f;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  container-type: size;
  container-name: aetherCard;
}

/* 核心毛玻璃卡片 */
.dsh-aether-card {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  background: linear-gradient(135deg, rgba(24, 28, 40, 0.94) 0%, rgba(13, 15, 23, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15);
  display: flex;
  overflow: hidden;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

/* 顶栏 */
.dsh-aether-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  flex-shrink: 0;
}
.dsh-aether-task-title {
  flex: 1 1 0;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 5px;
}
.dsh-aether-ctrls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.dsh-aether-btn {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #d1d5db;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 140ms ease;
}
.dsh-aether-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* 轨迹流水线时间轴 (Step Timeline Feed) */
.dsh-aether-timeline {
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}
.dsh-aether-timeline::-webkit-scrollbar {
  width: 3px;
}
.dsh-aether-timeline::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
}

.dsh-aether-step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 7px;
  font-size: 11px;
  color: #e2e8f0;
  box-sizing: border-box;
  animation: dsh-step-in 180ms ease-out;
}
.dsh-aether-step-item--user {
  background: rgba(56, 189, 248, 0.14);
  border-color: rgba(56, 189, 248, 0.38);
  color: #f0f9ff;
  font-weight: 500;
}
.dsh-aether-step-item--running {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.4);
  color: #fde047;
}
.dsh-aether-step-item--done {
  border-color: rgba(74, 222, 128, 0.2);
}
.dsh-aether-step-item--failed {
  background: rgba(248, 113, 113, 0.14);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fca5a5;
}
.dsh-aether-step-item--queued {
  background: rgba(251, 146, 60, 0.1);
  border: 1px dashed rgba(251, 146, 60, 0.45);
  color: #fed7aa;
}

.dsh-aether-step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.dsh-aether-step-text {
  flex: 1 1 0;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 10.5px;
}
.dsh-aether-step-tag {
  font-size: 9.5px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  color: #cbd5e1;
  flex-shrink: 0;
}
.dsh-aether-step-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding-left: 4px;
  flex-shrink: 0;
}
.dsh-aether-step-duration {
  font-size: 10px;
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-weight: 500;
}
@keyframes dsh-step-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================= 4 列全景严格网格对齐双层遥测看板 (零截断) ================= */
.dsh-aether-telemetry {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 6px;
  background: rgba(8, 10, 16, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  box-sizing: border-box;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
}
.dsh-aether-stat-grid-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
  white-space: nowrap;
}
.dsh-aether-stat-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 10px;
  font-weight: 500;
  color: #f1f5f9;
  line-height: 1.25;
  white-space: nowrap;
}
.dsh-aether-stat-pill--scope {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}
.dsh-aether-stat-pill--hit {
  background: rgba(52, 211, 153, 0.18);
  border: 1px solid rgba(52, 211, 153, 0.45);
  color: #34d399;
  font-weight: 700;
}
.dsh-aether-stat-pill--tokens {
  color: #93c5fd;
  font-family: ui-monospace, SFMono-Regular, monospace;
  justify-content: flex-end;
}

/* ================= 状态胶囊 + Agent 切页控制行 ================= */
.dsh-aether-status-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
}

/* Agent 切换器 (Agent Tabs) */
.dsh-aether-agent-tabs {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 999px;
  padding: 2px 4px;
  box-sizing: border-box;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
  max-width: 45%;
}
.dsh-aether-agent-tabs::-webkit-scrollbar { display: none; }

.dsh-aether-agent-tab {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: #94a3b8;
  font-size: 9.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 140ms ease;
  white-space: nowrap;
}
.dsh-aether-agent-tab:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}
.dsh-aether-agent-tab--active {
  background: rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
  color: #60a5fa !important;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}

/* 状态胶囊轨道 (Status Island) */
.dsh-aether-island {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 2px 7px 2px 5px;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
}
.dsh-aether-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.2;
  flex-shrink: 0;
}
.dsh-aether-pill__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: dsh-aether-dot-pulse 2s ease-in-out infinite;
}
.dsh-aether-ticker-box {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 1.35em;
  line-height: 1.35;
  font-size: 10.5px;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-align: left;
}
.dsh-aether-ticker-box.dsh-fade-right {
  mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 18px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 18px), transparent 100%);
}
.dsh-aether-ticker-box.dsh-fade-both {
  mask-image: linear-gradient(to right, transparent 0%, #000 14px, #000 calc(100% - 16px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 14px, #000 calc(100% - 16px), transparent 100%);
}

/* ================= 最底部【悬浮窗图文多模态交互输入框】 ================= */
.dsh-aether-input-deck {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 3px 6px;
  box-sizing: border-box;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.dsh-aether-image-preview-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 2px;
  overflow-x: auto;
}
.dsh-aether-preview-thumb-box {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.5);
  flex-shrink: 0;
}
.dsh-aether-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dsh-aether-thumb-del {
  position: absolute;
  top: 0; right: 0;
  width: 11px; height: 11px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border: none;
  font-size: 7px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.dsh-aether-input-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 5px;
}
.dsh-aether-input-field {
  flex: 1 1 0;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 11px;
  font-family: inherit;
  line-height: 1.3;
}
.dsh-aether-input-field::placeholder {
  color: rgba(255, 255, 255, 0.35);
}
.dsh-aether-input-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #c9cdd4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: all 120ms ease;
}
.dsh-aether-input-btn:hover {
  background: rgba(56, 189, 248, 0.25);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.5);
}
.dsh-aether-input-btn--send {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

/* ================= 最底部全功能底座状态栏 (Model & Effort & Context Deck) ================= */
.dsh-aether-footer-deck {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  padding: 3px 6px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  box-sizing: border-box;
  flex-shrink: 0;
  min-height: 22px;
}
.dsh-aether-footer-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}
.dsh-aether-footer-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.dsh-aether-mini-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1.5px 5px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  font-size: 9.5px;
  color: #cbd5e1;
  line-height: 1.2;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, "Segoe UI", sans-serif;
  cursor: default;
}
.dsh-aether-mini-pill--model {
  background: rgba(56, 189, 248, 0.12);
  border-color: rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-weight: 600;
}
.dsh-aether-mini-pill--effort {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.3);
  color: #c084fc;
  font-weight: 600;
}
.dsh-aether-mini-pill--context {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.28);
  color: #4ade80;
  cursor: pointer;
}
.dsh-aether-mini-pill--speed {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}

/* 上下文详细浮动卡片 (Popover 对齐用户截图 2) */
.dsh-aether-context-popover {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) scale(0.95);
  background: linear-gradient(135deg, rgba(28, 32, 46, 0.98) 0%, rgba(15, 17, 26, 0.99) 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 8px 10px;
  min-width: 180px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.8), 0 0 14px rgba(56, 189, 248, 0.2);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2147483030;
  display: flex;
  flex-direction: column;
  gap: 5px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  text-align: left;
}
.dsh-aether-mini-pill--context:hover .dsh-aether-context-popover {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) scale(1);
}
.dsh-aether-ctx-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  font-weight: 600;
  color: #f1f5f9;
}
.dsh-aether-ctx-bar-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  overflow: hidden;
  display: flex;
}
.dsh-aether-ctx-bar-seg {
  height: 100%;
}
.dsh-aether-ctx-breakdown {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 9.5px;
  color: #cbd5e1;
  margin-top: 2px;
}
.dsh-aether-ctx-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dsh-aether-ctx-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 1.5px;
  margin-right: 4px;
}

/* 垂直多会话导航栏 (Session Rail) */
.dsh-aether-session-rail {
  width: 32px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 4px 2px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  z-index: 2;
}
.dsh-aether-session-rail::-webkit-scrollbar {
  display: none;
}
.dsh-aether-session-rail-title {
  font-size: 7.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.5px;
  margin-bottom: 2px;
  user-select: none;
}
.dsh-aether-session-btn {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  transition: all 140ms ease;
  flex-shrink: 0;
}
.dsh-aether-session-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  color: #e0f2fe;
  border-color: rgba(56, 189, 248, 0.4);
}
.dsh-aether-session-btn--active {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(99, 102, 241, 0.35) 100%);
  border: 1px solid #38bdf8;
  color: #ffffff;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.45);
}
.dsh-aether-session-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1.2px solid #0f1118;
}

/* 会话悬浮气泡浮动卡片 (Popover Tooltip) */
.dsh-aether-session-popover {
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%) scale(0.95);
  background: linear-gradient(135deg, rgba(24, 28, 42, 0.98) 0%, rgba(12, 14, 22, 0.99) 100%);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 9px;
  padding: 6px 9px;
  min-width: 140px;
  max-width: 240px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.75), 0 0 12px rgba(56, 189, 248, 0.2);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2147483020;
  display: flex;
  flex-direction: column;
  gap: 3px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  text-align: left;
}
.dsh-aether-session-btn:hover .dsh-aether-session-popover {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) scale(1);
}
.dsh-aether-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.dsh-aether-popover-tag {
  font-size: 9.5px;
  font-weight: 700;
  color: #38bdf8;
  font-family: ui-monospace, monospace;
}
.dsh-aether-popover-status {
  font-size: 8.5px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.dsh-aether-popover-title {
  font-size: 11px;
  color: #f1f5f9;
  font-weight: 500;
  line-height: 1.35;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dsh-aether-popover-footer {
  font-size: 9px;
  color: #94a3b8;
  font-family: ui-monospace, monospace;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dsh-aether-podium-row {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: stretch;
  gap: 8px;
  box-sizing: border-box;
}
.dsh-aether-podium-main {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
}

/* 角色展台 (Podium) */
.dsh-aether-podium {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  cursor: pointer;
  overflow: hidden;
  box-sizing: border-box;
}
.dsh-aether-avatar-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-height: 0;
}
.dsh-aether-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 85%;
  height: 85%;
  border-radius: 50%;
  filter: blur(14px);
  pointer-events: none;
  z-index: 0;
  animation: dsh-aether-aura-pulse 3s ease-in-out infinite;
  transition: background 400ms ease;
}
.dsh-aether-sprite {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0,0,0,0.5));
  animation: dsh-aether-float 3.2s ease-in-out infinite;
  touch-action: none;
}
.dsh-aether-sprite:active {
  animation: dsh-aether-jelly 360ms ease-out 1 !important;
}

/* ================= 严格多列 CSS Grid 排版隔离规则 (全模式包含会话栏) ================= */

/* 1. 宽幅大窗口 (宽 >= 560px) -> 左列 32px会话栏, 中列 280px立绘展台, 右列主控区 */
.dsh-aether-card.dsh-mode-wide-large {
  display: grid !important;
  grid-template-columns: 32px 280px 1fr !important;
  grid-template-rows: 100% !important;
  gap: 10px !important;
  align-items: stretch !important;
}
.dsh-aether-card.dsh-mode-wide-large .dsh-aether-podium {
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  gap: 6px !important;
}
.dsh-aether-card.dsh-mode-wide-large .dsh-aether-main-col {
  width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  gap: 5px !important;
  overflow: hidden !important;
}

/* 2. 宽幅小窗口 (宽 < 560px 但非纯竖屏) -> 左列 32px会话栏, 中列 110px立绘, 右列主控区 */
.dsh-aether-card.dsh-mode-wide-compact {
  display: grid !important;
  grid-template-columns: 32px 110px 1fr !important;
  grid-template-rows: 100% !important;
  gap: 8px !important;
  align-items: stretch !important;
}
.dsh-aether-card.dsh-mode-wide-compact .dsh-aether-podium {
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  overflow: visible !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
}
.dsh-aether-card.dsh-mode-wide-compact .dsh-aether-main-col {
  width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  gap: 5px !important;
  overflow: hidden !important;
}

/* 3. 竖屏长幅模式 (高 > 宽 * 1.05) -> 左列 32px会话栏, 右列竖向完整主控区 */
.dsh-aether-card.dsh-mode-tall {
  display: grid !important;
  grid-template-columns: 32px 1fr !important;
  grid-template-rows: 100% !important;
  gap: 8px !important;
  align-items: stretch !important;
}
.dsh-aether-card.dsh-mode-tall .dsh-aether-main-col {
  flex: 1 1 0 !important;
  min-height: 0 !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  gap: 5px !important;
}
.dsh-aether-card.dsh-mode-tall .dsh-aether-podium {
  display: none !important;
}

/* 4. 极小/极矮窗口 (< 130px 高度) */
@container aetherCard (max-height: 130px) {
  .dsh-aether-timeline { display: none !important; }
  .dsh-aether-telemetry { display: none !important; }
  .dsh-aether-input-deck { display: none !important; }
}

/* ================= 移动端响应式与吸边适配体系 (Mobile Responsive) ================= */
@media (max-width: 768px) {
  .dsh-maid-widget {
    touch-action: none;
  }
  .dsh-maid-sprite-box {
    width: 60px !important;
    height: 64px !important;
  }
  .dsh-maid-sprite {
    width: 60px !important;
    height: 64px !important;
    filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)) !important;
  }
  .dsh-maid-mobile-aura {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 54px;
    height: 54px;
    border-radius: 50%;
    filter: blur(8px);
    pointer-events: none;
    z-index: 0;
    animation: dsh-aether-aura-pulse 2.8s ease-in-out infinite;
  }
  .dsh-maid-bubble {
    bottom: 72px !important;
    right: 0 !important;
    width: auto !important;
    min-width: 200px !important;
    max-width: calc(100vw - 28px) !important;
    padding: 7px 10px 8px 11px !important;
    border-radius: 14px !important;
    font-size: 11px !important;
    gap: 3px !important;
    box-shadow: 0 10px 28px rgba(0,0,0,0.65) !important;
    cursor: pointer !important;
  }
  .dsh-maid-bubble.dsh-maid-bubble--dock-left {
    right: auto !important;
    left: 0 !important;
  }
  .dsh-maid-bubble__title-row {
    padding-right: 52px !important;
    gap: 4px !important;
  }
  .dsh-maid-bubble__title-text {
    font-size: 11px !important;
    line-height: 1.25 !important;
  }
  .dsh-maid-bubble__status {
    font-size: 10px !important;
    height: 1.3em !important;
  }
  .dsh-maid-bubble__actions {
    top: 6px !important;
    right: 7px !important;
    gap: 3px !important;
  }
  .dsh-maid-bubble__btn {
    width: 22px !important;
    height: 22px !important;
    border-radius: 5px !important;
  }
  .dsh-maid-pat-badge {
    padding: 1px 5px !important;
    font-size: 9px !important;
    top: -2px !important;
    right: -2px !important;
  }
  .dsh-maid-summon {
    right: 12px !important;
    bottom: max(14px, env(safe-area-inset-bottom, 14px)) !important;
    padding: 6px 12px !important;
    font-size: 11px !important;
    border-radius: 999px !important;
  }
  .dsh-aether-input-field {
    font-size: 16px !important;
  }
  .dsh-aether-footer-deck {
    flex-wrap: wrap !important;
    gap: 3px !important;
  }
  .dsh-aether-mini-pill {
    font-size: 9px !important;
    padding: 1px 4px !important;
  }
}

/* ================= 全功能移动端 / 页面内控制台抽屉 ================= */
.dsh-aether-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2147483620;
  opacity: 0;
  visibility: hidden;
  transition: opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), visibility 240ms;
  pointer-events: none;
}
.dsh-aether-drawer-backdrop--open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.dsh-aether-drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 88vh;
  height: 88dvh;
  max-height: 94vh;
  max-height: 94dvh;
  background: linear-gradient(180deg, rgba(22, 26, 38, 0.98) 0%, rgba(10, 12, 18, 0.99) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15);
  z-index: 2147483625;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 6px 10px max(10px, env(safe-area-inset-bottom, 10px)) 10px;
  gap: 5px;
  transform: translateY(100%);
  transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), visibility 280ms;
  pointer-events: none;
  visibility: hidden;
  user-select: none;
  -webkit-user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #e2e8f0;
  overflow: hidden;
  overscroll-behavior: contain;
}
.dsh-aether-drawer--open {
  transform: translateY(0);
  pointer-events: auto;
  visibility: visible;
}

@media (min-width: 769px) {
  .dsh-aether-drawer {
    left: auto;
    right: 20px;
    bottom: 20px;
    width: 480px;
    height: 84vh;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
    transform: translateY(30px) scale(0.96);
    opacity: 0;
    visibility: hidden;
    transition: all 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dsh-aether-drawer--open {
    transform: translateY(0) scale(1);
    opacity: 1;
    visibility: visible;
  }
}

.dsh-aether-drawer-handle {
  width: 38px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.28);
  margin: 2px auto 4px auto;
  flex-shrink: 0;
}

.dsh-aether-drawer-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.dsh-aether-drawer-title-box {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 0;
  min-width: 0;
}

.dsh-aether-mini-avatar {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}
.dsh-aether-mini-avatar-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.dsh-aether-drawer-title {
  flex: 1 1 0;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.dsh-aether-mobile-session-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 1px 0 3px 0;
  flex-shrink: 0;
  min-width: 0;
}
.dsh-aether-mobile-session-bar::-webkit-scrollbar {
  display: none;
}
.dsh-aether-session-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2.5px 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 120ms ease;
}
.dsh-aether-session-chip:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #e0f2fe;
}
.dsh-aether-session-chip--active {
  background: rgba(56, 189, 248, 0.22) !important;
  border-color: rgba(56, 189, 248, 0.55) !important;
  color: #38bdf8 !important;
  font-weight: 600;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
}
.dsh-aether-chip-num {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-weight: 700;
}
.dsh-aether-chip-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-aether-drawer .dsh-aether-timeline {
  padding: 3px 2px;
  gap: 4px;
}
.dsh-aether-drawer .dsh-aether-input-deck {
  padding: 4px 6px;
}

.dsh-aether-mini-pill--context.dsh-show-popover .dsh-aether-context-popover {
  opacity: 1 !important;
  visibility: visible !important;
  transform: translateX(-50%) scale(1) !important;
  pointer-events: auto !important;
}
`

// ───────── 跨窗口共享事件总线与 PiP 管理 ─────────
const HIDDEN_EVENT = 'dsh-maid-hidden-change'
const PIP_EVENT = 'dsh-maid-pip-change'
const WEB_SESSION_CHANGE_EVENT = 'dsh-maid-web-session-change'

const CHANNEL_NAME = 'dsh-maid-sync-channel-v2'
let syncChannel: BroadcastChannel | null = null
try {
  if (typeof BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel(CHANNEL_NAME)
  }
} catch { /* ignore */ }

let globalClientCtx: any = null
let currentSelectedSessionId: string = ''

let currentPipWindow: Window | null = null
let pipRoot: any = null

const isPipOpen = () => !!currentPipWindow && !currentPipWindow.closed

const maidBus = {
  isHidden(): boolean {
    try { return localStorage.getItem(HIDDEN_KEY) === '1' } catch { return false }
  },
  setHidden(h: boolean): void {
    try { localStorage.setItem(HIDDEN_KEY, h ? '1' : '0') } catch { /* ignore */ }
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent(HIDDEN_EVENT, { detail: { hidden: h } }))
    }
    syncChannel?.postMessage({ type: 'hidden-change', hidden: h })
  },
  isPiP(): boolean {
    return isPipOpen()
  },
  notifyPiP(active: boolean): void {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent(PIP_EVENT, { detail: { active } }))
    }
    syncChannel?.postMessage({ type: 'pip-change', active })
  },
  notifyWebSessionChange(sessionId: string): void {
    if (!sessionId || sessionId === currentSelectedSessionId) return
    currentSelectedSessionId = sessionId
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent(WEB_SESSION_CHANGE_EVENT, { detail: { sessionId } }))
    }
    syncChannel?.postMessage({ type: 'session-change', sessionId })
  },
  openWebSession(sessionId: string): void {
    if (!sessionId) return
    currentSelectedSessionId = sessionId
    if (globalClientCtx?.sessions?.open) {
      try { globalClientCtx.sessions.open(sessionId) } catch { /* ignore */ }
    }
    syncChannel?.postMessage({ type: 'open-session-req', sessionId })
  }
}

if (syncChannel) {
  syncChannel.onmessage = (ev) => {
    const data = ev.data
    if (data?.type === 'session-change' && data.sessionId) {
      if (data.sessionId !== currentSelectedSessionId) {
        currentSelectedSessionId = data.sessionId
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent(WEB_SESSION_CHANGE_EVENT, { detail: { sessionId: data.sessionId } }))
        }
      }
    } else if (data?.type === 'open-session-req' && data.sessionId) {
      if (globalClientCtx?.sessions?.open && data.sessionId !== currentSelectedSessionId) {
        currentSelectedSessionId = data.sessionId
        try { globalClientCtx.sessions.open(data.sessionId) } catch { /* ignore */ }
      }
    } else if (data?.type === 'hidden-change' && typeof data.hidden === 'boolean') {
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent(HIDDEN_EVENT, { detail: { hidden: data.hidden } }))
      }
    } else if (data?.type === 'pip-change' && typeof data.active === 'boolean') {
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent(PIP_EVENT, { detail: { active: data.active } }))
      }
    }
  }
}

/**
 * 切换 Document Picture-in-Picture 系统级置顶独立悬浮窗
 */
async function togglePiP(): Promise<boolean> {
  if (currentPipWindow && !currentPipWindow.closed) {
    currentPipWindow.close()
    currentPipWindow = null
    maidBus.notifyPiP(false)
    return false
  }

  // 移动端无独立画中画窗口，直接唤起页面内全功能控制台抽屉
  if (typeof window !== 'undefined' && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 768)) {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dsh-maid-open-drawer'))
    }
    return true
  }

  if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
    try {
      const pipWin = await (window as any).documentPictureInPicture.requestWindow({
        width: 680,
        height: 420,
      })
      currentPipWindow = pipWin

      const pipCustomStyle = pipWin.document.createElement('style')
      pipCustomStyle.textContent = `
        html, body {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #090a0f;
        }
        ${CSS}
      `
      pipWin.document.head.appendChild(pipCustomStyle)

      const pipHost = pipWin.document.createElement('div')
      pipHost.className = 'dsh-aether-root'
      pipWin.document.body.appendChild(pipHost)

      const ReactDOMClient = require('react-dom/client')
      pipRoot = ReactDOMClient.createRoot(pipHost)
      pipRoot.render(React.createElement(MaidOverlay, { isPiP: true }))

      maidBus.notifyPiP(true)

      pipWin.addEventListener('pagehide', () => {
        if (pipRoot) {
          try { pipRoot.unmount() } catch {}
          pipRoot = null
        }
        currentPipWindow = null
        maidBus.notifyPiP(false)
      })
      return true
    } catch (err) {
      console.error('Failed to open Document PiP:', err)
      alert('唤起置顶画中画失败，请确认浏览器允许当前网站弹出置顶窗口。')
      return false
    }
  } else {
    try {
      const w = 680, h = 420
      const left = Math.max(0, (window.screen?.width || 1200) - w - 30)
      const top = Math.max(0, (window.screen?.height || 800) - h - 60)
      const popup = window.open(
        'about:blank',
        'dsh_maid_popup',
        `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
      )
      if (!popup) {
        alert('弹出窗口被拦截，请允许当前网站弹出窗口，或使用 Chrome/Edge 111+ 体验系统级置顶画中画！')
        return false
      }
      currentPipWindow = popup

      const pipCustomStyle = popup.document.createElement('style')
      pipCustomStyle.textContent = `
        html, body {
          margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #090a0f;
        }
        ${CSS}
      `
      popup.document.head.appendChild(pipCustomStyle)

      const pipHost = popup.document.createElement('div')
      pipHost.className = 'dsh-aether-root'
      popup.document.body.appendChild(pipHost)

      const ReactDOMClient = require('react-dom/client')
      pipRoot = ReactDOMClient.createRoot(pipHost)
      pipRoot.render(React.createElement(MaidOverlay, { isPiP: true }))

      maidBus.notifyPiP(true)

      popup.addEventListener('pagehide', () => {
        if (pipRoot) {
          try { pipRoot.unmount() } catch {}
          pipRoot = null
        }
        currentPipWindow = null
        maidBus.notifyPiP(false)
      })
      return true
    } catch (e) {
      console.error('Failed to open popup:', e)
      alert('请使用 Chrome / Edge 111+ 体验系统级置顶画中画！')
      return false
    }
  }
}

// ───────── 主组件 ─────────
interface MaidOverlayProps {
  isPiP?: boolean
}
const MaidOverlay: React.FC<MaidOverlayProps> = ({ isPiP = false }): React.ReactElement | null => {
  const [phase, setPhase] = useState<Phase>('idle')
  const [line, setLine] = useState('就绪')
  const [tool, setTool] = useState<string | null>(null)
  const [userInput, setUserInput] = useState<string | null>(null)
  const [thinking, setThinking] = useState<string>('')
  const [steps, setSteps] = useState<HistoryStep[]>([])
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null)
  const [agents, setAgents] = useState<AgentView[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('main')
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [patCount, setPatCount] = useState<number>(0)
  const [patPopKey, setPatPopKey] = useState<number>(0)
  const [pos, _setPos] = useState<Pos>({ right: 24, bottom: 24 })
  const [hidden, setHidden] = useState(maidBus.isHidden())
  const [pipActive, setPipActive] = useState(maidBus.isPiP())
  const [bumpKey, setBumpKey] = useState(0)
  const [ready, setReady] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [soundSet, setSoundSet] = useState<'duck' | 'fx1'>('duck')
  const [layoutMode, setLayoutMode] = useState<'wide-large' | 'wide-compact' | 'tall'>('wide-large')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showCtxPopover, setShowCtxPopover] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  })

  // 悬浮窗输入框状态
  const [inputText, setInputText] = useState('')
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const cardRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)

  // 尺寸变化监听（智能识别 wide-large (>=560) / wide-compact (<560) / tall）
  useEffect(() => {
    if (!isPiP || !cardRef.current) return
    const el = cardRef.current
    const update = (w: number, h: number) => {
      if (w > 0 && h > 0) {
        if (w >= h * 1.05) {
          setLayoutMode(w >= 560 ? 'wide-large' : 'wide-compact')
        } else {
          setLayoutMode('tall')
        }
      }
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        update(width, height)
      }
    })
    ro.observe(el)
    update(el.clientWidth, el.clientHeight)
    return () => ro.disconnect()
  }, [isPiP])

  // 时间轴自动滚动到底部
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight
    }
  }, [steps, selectedAgentId, drawerOpen])

  // 音效引用
  const audioRef = useRef<{ press: HTMLAudioElement | null; release: HTMLAudioElement | null }>({ press: null, release: null })
  useEffect(() => {
    try {
      audioRef.current.press = new Audio(SOUND_PRESS(soundSet))
      audioRef.current.press.preload = 'auto'
      audioRef.current.release = new Audio(SOUND_RELEASE(soundSet))
      audioRef.current.release.preload = 'auto'
    } catch { /* ignore */ }
  }, [soundSet])

  useEffect(() => {
    if (!isPiP) {
      _setPos(loadPos(isMobile))
      setHidden(loadHidden())
    }
    try {
      const s = localStorage.getItem('dsh-floating-maid:cfg:v1')
      if (s) {
        const cfg = JSON.parse(s)
        if (typeof cfg?.soundOn === 'boolean') setSoundOn(cfg.soundOn)
        if (cfg?.soundSet === 'duck' || cfg?.soundSet === 'fx1') setSoundSet(cfg.soundSet)
      }
    } catch { /* ignore */ }
    setReady(true)
  }, [isPiP])

  useEffect(() => {
    const onHiddenChange = (e: any): void => setHidden(!!e.detail?.hidden)
    const onPipChange = (e: any): void => setPipActive(!!e.detail?.active)
    const onWebSessionChange = (e: any): void => {
      const sid = e.detail?.sessionId
      if (sid && sid !== activeSessionId) {
        handleSelectSession(sid, false)
      }
    }
    const onDrawerOpen = (): void => setDrawerOpen(true)
    const onResize = (): void => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))
      }
    }

    window.addEventListener('resize', onResize)
    document.addEventListener(HIDDEN_EVENT, onHiddenChange)
    document.addEventListener(PIP_EVENT, onPipChange)
    document.addEventListener(WEB_SESSION_CHANGE_EVENT, onWebSessionChange)
    document.addEventListener('dsh-maid-open-drawer', onDrawerOpen)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener(HIDDEN_EVENT, onHiddenChange)
      document.removeEventListener(PIP_EVENT, onPipChange)
      document.removeEventListener(WEB_SESSION_CHANGE_EVENT, onWebSessionChange)
      document.removeEventListener('dsh-maid-open-drawer', onDrawerOpen)
    }
  }, [activeSessionId, sessions])

  useEffect(() => {
    if (!showCtxPopover) return
    const closePop = () => setShowCtxPopover(false)
    document.addEventListener('click', closePop)
    return () => document.removeEventListener('click', closePop)
  }, [showCtxPopover])

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  const saveCfg = (patch: Record<string, unknown>): void => {
    try {
      const cur = JSON.parse(localStorage.getItem('dsh-floating-maid:cfg:v1') || '{}')
      localStorage.setItem('dsh-floating-maid:cfg:v1', JSON.stringify({ ...cur, ...patch }))
    } catch { /* ignore */ }
  }

  const setPos = (p: Pos): void => {
    _setPos(p)
    try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* ignore */ }
  }
  const setHiddenPersist = (h: boolean): void => {
    maidBus.setHidden(h)
    setHidden(h)
  }
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const drag = useDrag(pos, setPos, isMobile, widgetRef)

  const applyState = (s: MaidState): void => {
    if (!s) return
    setPhase(s.phase)
    setLine(s.line)
    setTool(s.tool)
    if (typeof s.patCount === 'number') setPatCount(s.patCount)
    if (s.userInput !== undefined) setUserInput(s.userInput)
    if (s.thinking !== undefined) setThinking(s.thinking)
    if (Array.isArray(s.steps)) setSteps(s.steps)
    if (s.metrics) setMetrics(s.metrics)
    if (Array.isArray(s.agents)) setAgents(s.agents)
    if (Array.isArray(s.sessions)) setSessions(s.sessions)
    if (s.activeSessionId) setActiveSessionId(s.activeSessionId)
    if (Array.isArray(s.queuedMessages)) setQueuedMessages(s.queuedMessages)
  }

  const handleSelectSession = (sid: string, triggerWebOpen = false) => {
    if (!sid) return
    currentSelectedSessionId = sid
    setActiveSessionId(sid)
    setSelectedAgentId('main')

    // 本地乐观即时秒切 (0 延迟响应)
    const target = sessions.find(s => s.id === sid)
    if (target) {
      if (target.phase) setPhase(target.phase)
      if (target.userInput !== undefined) setUserInput(target.userInput)
      if (target.thinking !== undefined) setThinking(target.thinking)
      if (Array.isArray(target.steps)) setSteps(target.steps)
      if (target.metrics) setMetrics(target.metrics)
      if (Array.isArray(target.agents) && target.agents.length > 0) setAgents(target.agents)
      if (Array.isArray(target.queuedMessages)) setQueuedMessages(target.queuedMessages)
    }

    // 仅在用户手动点击悬浮窗按钮时触发，绝对不反向循环
    if (triggerWebOpen) {
      maidBus.openWebSession(sid)
    }

    void fetch('/api/maid/select-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid }),
    }).catch(() => {})
  }

  useEffect(() => {
    if (!ready) return
    let es: EventSource | null = null
    let fallbackTimer: NodeJS.Timeout | null = null

    const connectSSE = () => {
      try {
        es = new EventSource('/api/maid/stream')
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as MaidState
            applyState(data)
          } catch { /* ignore */ }
        }
        es.onerror = () => {
          if (es) { es.close(); es = null }
          startPolling()
        }
      } catch {
        startPolling()
      }
    }

    const startPolling = () => {
      if (fallbackTimer) clearInterval(fallbackTimer)
      const poll = async () => {
        try {
          const r = await fetch('/api/maid/state', { cache: 'no-store' })
          if (r.ok) {
            const s = (await r.json()) as MaidState
            applyState(s)
          }
        } catch { /* ignore */ }
      }
      void poll()
      fallbackTimer = setInterval(poll, (phase === 'thinking' || phase === 'waiting') ? 250 : 1000)
    }

    connectSSE()

    return () => {
      if (es) es.close()
      if (fallbackTimer) clearInterval(fallbackTimer)
    }
  }, [ready, phase])

  const playPress = (): void => {
    if (!soundOn) return
    try {
      const a = audioRef.current.press
      if (!a) return
      a.currentTime = 0
      const p = a.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch { /* ignore */ }
  }

  const onClickSprite = async (): Promise<void> => {
    if (!isPiP && drag.wasDrag()) return
    setBumpKey(k => k + 1)
    setPatPopKey(k => k + 1)
    setPatCount(c => c + 1)
    playPress()
    try { await fetch('/api/maid/pat', { method: 'POST', body: '' }) } catch { /* ignore */ }
  }

  const toggleSound = (e: React.MouseEvent): void => {
    e.stopPropagation()
    const next = !soundOn
    setSoundOn(next)
    saveCfg({ soundOn: next })
  }

  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    toggleSound(e)
  }

  // 发送指令接口
  const handleSendMessage = async () => {
    const text = inputText.trim()
    const imgs = [...attachedImages]
    if (!text && imgs.length === 0) return

    setInputText('')
    setAttachedImages([])

    try {
      await fetch('/api/maid/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, images: imgs }),
      })
    } catch (err) {
      console.error('Failed to send prompt via maid floating window:', err)
    }
  }

  // 粘贴图片处理 (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            if (typeof ev.target?.result === 'string') {
              setAttachedImages(prev => [...prev, ev.target!.result as string])
            }
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }

  // 文件选择器图片处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          if (typeof ev.target?.result === 'string') {
            setAttachedImages(prev => [...prev, ev.target!.result as string])
          }
        }
        reader.readAsDataURL(file)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!isPiP && hidden) return null

  // 提问标题
  const promptTitle = userInput ? userInput.trim() : '就绪待命中'

  // 计算当前选中的 Agent 视图数据
  const currentAgent = agents.find(a => a.id === selectedAgentId) || {
    id: 'main',
    name: '主智能体',
    isMain: true,
    status: 'running',
    phase,
    line,
    thinking,
    steps,
    metrics,
  }

  const currentDisplaySteps = selectedAgentId === 'main' ? steps : (currentAgent.steps || [])
  const currentDisplayPhase = selectedAgentId === 'main' ? phase : (currentAgent.phase || 'idle')
  const currentDisplayLine = selectedAgentId === 'main' ? line : (currentAgent.line || '子代理就绪')
  const currentDisplayThinking = selectedAgentId === 'main' ? thinking : (currentAgent.thinking || '')

  // 思考与状态解析
  const tickerRef = useRef<HTMLSpanElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tickerShift, setTickerShift] = React.useState(0)
  const [fadeMode, setFadeMode] = React.useState<'none' | 'right' | 'both'>('none')

  const thinkingParsed = parseThinking(currentDisplayThinking)
  const smoothedThinking = useSmoothStream(thinkingParsed.text, thinkingParsed.isSummary)

  let finalStatusText = ''
  if (currentDisplayPhase === 'thinking') {
    finalStatusText = smoothedThinking ? `思考中: ${smoothedThinking}` : '正在深层思考…'
  } else if (currentDisplayPhase === 'tool') {
    finalStatusText = currentDisplayLine || (tool ? `正在${tool}…` : '操作执行中…')
  } else if (currentDisplayPhase === 'review') {
    finalStatusText = '整理回复中…'
  } else if (currentDisplayPhase === 'waiting') {
    finalStatusText = currentDisplayLine || '等待模型响应…'
  } else if (currentDisplayPhase === 'done') {
    finalStatusText = '任务已顺利完成'
  } else if (currentDisplayPhase === 'failed') {
    finalStatusText = '执行遇到了问题'
  } else {
    finalStatusText = currentDisplayLine || '待命中 · 随时向我提问'
  }

  useLayoutEffect(() => {
    if (!tickerRef.current || !containerRef.current) return
    const innerW = tickerRef.current.scrollWidth
    const outerW = containerRef.current.clientWidth
    if (innerW > outerW + 2) {
      if (currentDisplayPhase === 'thinking' && !thinkingParsed.isSummary) {
        setTickerShift(-(innerW - outerW))
        setFadeMode('both')
      } else {
        setTickerShift(0)
        setFadeMode('right')
      }
    } else {
      setTickerShift(0)
      setFadeMode('none')
    }
  }, [finalStatusText, currentDisplayPhase, smoothedThinking])

  const meta = PHASE_DICT[currentDisplayPhase] || PHASE_DICT.idle
  const h = React.createElement

  const aetherFadeClass = fadeMode === 'right' ? ' dsh-fade-right' : (fadeMode === 'both' ? ' dsh-fade-both' : '')
  const bubbleFadeClass = fadeMode === 'right' ? ' dsh-maid-bubble__status--fade-right' : (fadeMode === 'both' ? ' dsh-maid-bubble__status--fade-both' : '')

  // 渲染纯矢量时间轴 (含用户多模态输入行 + 专属工具图标 + 耗时 + 失败红叉)
  const renderTimeline = () => {
      if (!currentDisplaySteps || currentDisplaySteps.length === 0) {
        return h('div', {
          className: 'dsh-aether-timeline',
          ref: timelineRef,
        },
          userInput ? h('div', { className: 'dsh-aether-step-item dsh-aether-step-item--user' },
            h('span', { className: 'dsh-aether-step-icon' }, h(IconUser)),
            h('span', { className: 'dsh-aether-step-tag' }, '用户'),
            h('span', { className: 'dsh-aether-step-text', title: userInput }, userInput)
          ) : null,
          h('div', { className: 'dsh-aether-step-item dsh-aether-step-item--running' },
            h('span', { className: 'dsh-aether-step-icon' }, h(IconLoading)),
            h('span', { className: 'dsh-aether-step-tag' }, '状态'),
            h('span', { className: 'dsh-aether-step-text' }, currentDisplayPhase === 'thinking' ? '正在深层思考…' : '等待模型响应指令…')
          )
        )
      }

      return h('div', {
        className: 'dsh-aether-timeline',
        ref: timelineRef,
      },
        currentDisplaySteps.map((step, idx) => {
          let iconNode: React.ReactElement = h(IconToolCall)
          let tag = '工具'

          if (step.type === 'user') {
            iconNode = h(IconUser)
            tag = '用户'
          } else if (step.type === 'tool') {
            const toolMeta = getStepToolMeta(step.toolName, step.title)
            iconNode = toolMeta.icon
            tag = toolMeta.tag
          } else if (step.type === 'thinking') {
            iconNode = h(IconThink)
            tag = '思考'
          } else if (step.type === 'message') {
            iconNode = h(IconMsg)
            tag = '回复'
          } else if (step.type === 'done') {
            iconNode = h(IconDone)
            tag = '完成'
          } else if (step.type === 'failed') {
            iconNode = h(IconFailed)
            tag = '失败'
          }

          let itemClass = `dsh-aether-step-item dsh-aether-step-item--${step.type === 'user' ? 'user' : step.status}`
          const durationStr = formatStepDuration(step.durationMs)

          return h('div', { key: step.id || idx, className: itemClass, title: step.title },
            h('span', { className: 'dsh-aether-step-icon' }, iconNode),
            h('span', { className: 'dsh-aether-step-tag' }, tag),
            h('span', { className: 'dsh-aether-step-text' }, step.title),
            h('div', { className: 'dsh-aether-step-right' },
              durationStr ? h('span', { className: 'dsh-aether-step-duration' }, durationStr) : null,
              step.status === 'running' ? h('span', { style: { display: 'flex', alignItems: 'center' } }, h(IconLoading)) :
              step.status === 'failed' ? h('span', { style: { display: 'flex', alignItems: 'center' } }, h(IconFailed, { size: 12, color: '#f87171' })) :
              step.status === 'done' ? h('span', { style: { display: 'flex', alignItems: 'center' } }, h(IconDone, { size: 12, color: '#4ade80' })) : null
            )
          )
        }),
        // 渲染正在排队中的指令消息
        (selectedAgentId === 'main' ? (queuedMessages || []) : []).map((q, qIdx) =>
          h('div', {
            key: q.id || 'queue_' + qIdx,
            className: 'dsh-aether-step-item dsh-aether-step-item--queued',
            title: `排队等待执行: ${q.content}`
          },
            h('span', { className: 'dsh-aether-step-icon' }, h(IconHourglass, { size: 12, color: '#fb923c' })),
            h('span', { className: 'dsh-aether-step-tag', style: { color: '#fb923c', background: 'rgba(251, 146, 60, 0.15)' } }, '排队中'),
            h('span', { className: 'dsh-aether-step-text', style: { color: '#fdba74' } }, q.content),
            h('div', { className: 'dsh-aether-step-right' },
              h('span', { className: 'dsh-spin', style: { display: 'flex', alignItems: 'center' } }, h(IconLoading, { size: 10, color: '#fb923c' }))
            )
          )
        )
      )
    }

    // 渲染高清晰度【4 列全景严格网格对齐】双层遥测面板（零截断）
    const renderTelemetry = () => {
      const m = metrics || {
        turnSteps: 0, turnBilledInput: 0, turnCacheRead: 0, turnCacheWrite: 0, turnOutput: 0, turnCacheHitPercent: '0.000%', turnCacheHitRate: 0,
        sessionBilledInput: 0, sessionCacheRead: 0, sessionCacheWrite: 0, sessionOutput: 0, sessionCacheHitPercent: '0.000%', sessionCacheHitRate: 0,
        turns: 0, steps: 0, llmMs: 0, toolMs: 0, tokensPerSec: 0, ttftAvgMs: 0
      }

      const turnInFmt = formatTokens(m.turnBilledInput)
      const turnOutFmt = formatTokens(m.turnOutput)

      const sessInFmt = formatTokens(m.sessionBilledInput)
      const sessOutFmt = formatTokens(m.sessionOutput)

      return h('div', { className: 'dsh-aether-telemetry' },
        // Row 1: 本轮 (Turn)
        h('div', { className: 'dsh-aether-stat-grid-row' },
          h('span', { className: 'dsh-aether-stat-pill dsh-aether-stat-pill--scope' }, '本轮'),
          h('div', { className: 'dsh-aether-stat-pill dsh-aether-stat-pill--hit', title: `本轮前缀缓存命中率: ${m.turnCacheHitPercent}` },
            h(IconCache, { size: 11, color: '#34d399' }),
            m.turnCacheHitPercent
          ),
          h('div', { className: 'dsh-aether-stat-pill', title: `本轮已执行: ${m.turnSteps || 0} 步` },
            h(IconActivity, { size: 10, color: '#60a5fa' }),
            `${m.turnSteps || 0}步`
          ),
          h('div', { className: 'dsh-aether-stat-pill dsh-aether-stat-pill--tokens', title: `本轮计费输入: ${turnInFmt} · 输出: ${turnOutFmt}` },
            `入${turnInFmt}·出${turnOutFmt}`
          )
        ),
        // Row 2: 全会话 (Session)
        h('div', { className: 'dsh-aether-stat-grid-row' },
          h('span', { className: 'dsh-aether-stat-pill dsh-aether-stat-pill--scope' }, '全局'),
          h('div', { className: 'dsh-aether-stat-pill dsh-aether-stat-pill--hit', title: `全会话累计缓存命中率: ${m.sessionCacheHitPercent}` },
            h(IconCache, { size: 11, color: '#34d399' }),
            m.sessionCacheHitPercent
          ),
          h('div', { className: 'dsh-aether-stat-pill', title: `会话全局统计: ${m.turns} 轮 · ${m.steps} 步` },
            h(IconActivity, { size: 10, color: '#60a5fa' }),
            `${m.turns}轮·${m.steps}步`
          ),
          h('div', { className: 'dsh-aether-stat-pill dsh-aether-stat-pill--tokens', title: `全局累计输入: ${sessInFmt} · 输出: ${sessOutFmt}` },
            `入${sessInFmt}·出${sessOutFmt}`
          )
        )
      )
    }

    // 渲染【垂直会话导航条 (Session Rail)】
    const renderSessionRail = () => {
      const allSess: SessionSummary[] = sessions.length > 0 ? sessions : [{
        id: 'current',
        title: userInput || '当前会话',
        phase,
        status: (phase === 'done' ? 'done' : (phase === 'idle' ? 'idle' : 'running')),
        lastUpdate: Date.now(),
        stepsCount: steps.length,
        userInput,
        steps,
      }]

      return h('div', { className: 'dsh-aether-session-rail' },
        h('div', { className: 'dsh-aether-session-rail-title' }, 'SESS'),
        allSess.map((s, idx) => {
          const isActive = s.id === activeSessionId || (allSess.length === 1 && s.id === 'current')
          const isRunning = s.status === 'running' || s.phase === 'thinking' || s.phase === 'tool' || s.phase === 'waiting'
          const isFailed = s.status === 'failed' || s.phase === 'failed'
          const isDone = s.status === 'done' || s.phase === 'done'

          let dotColor = '#94a3b8'
          let statusText = '就绪'
          if (isRunning) { dotColor = '#fbbf24'; statusText = '运行中' }
          else if (isFailed) { dotColor = '#f87171'; statusText = '异常' }
          else if (isDone) { dotColor = '#4ade80'; statusText = '已完成' }

          const sessionTitle = s.title && s.title !== '新会话' ? s.title : (s.userInput || `会话 #${idx + 1}`)

          return h('button', {
            key: s.id,
            className: `dsh-aether-session-btn${isActive ? ' dsh-aether-session-btn--active' : ''}`,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              if (s.id !== 'current') handleSelectSession(s.id, true)
            },
            title: `会话 #${idx + 1}: ${sessionTitle}`
          },
            h('span', null, `#${idx + 1}`),
            h('span', {
              className: `dsh-aether-session-dot${isRunning ? ' dsh-spin' : ''}`,
              style: { background: dotColor }
            }),
            // 悬浮即现精美毛玻璃浮动卡片 (Popover Tooltip)
            h('div', { className: 'dsh-aether-session-popover' },
              h('div', { className: 'dsh-aether-popover-header' },
                h('span', { className: 'dsh-aether-popover-tag' }, `会话 #${idx + 1}`),
                h('span', { className: 'dsh-aether-popover-status', style: { color: dotColor } },
                  h('span', { style: { display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: dotColor } }),
                  statusText
                )
              ),
              h('div', { className: 'dsh-aether-popover-title' }, sessionTitle),
              s.userInput && s.userInput !== sessionTitle ? h('div', { style: { fontSize: '9.5px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `最新: ${s.userInput}`) : null,
              s.queuedMessages && s.queuedMessages.length > 0 ? h('div', { style: { fontSize: '9px', color: '#fb923c', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' } },
                h(IconHourglass, { size: 9, color: '#fb923c' }),
                `${s.queuedMessages.length} 条排队中: ${s.queuedMessages[0].content.slice(0, 16)}...`
              ) : null,
              h('div', { className: 'dsh-aether-popover-footer' },
                h('span', null, `${s.stepsCount || (s.steps ? s.steps.length : 0)} 个步骤`),
                isActive ? h('span', { style: { color: '#38bdf8', fontWeight: 600 } }, '● 活跃') : null
              )
            )
          )
        })
      )
    }

    // 渲染【Agent 视图切换器】
    const renderAgentTabs = () => {
      const allAgents = agents.length > 0 ? agents : [currentAgent]

      return h('div', { className: 'dsh-aether-agent-tabs' },
        allAgents.map(ag => {
          const isActive = ag.id === selectedAgentId
          const icon = ag.isMain ? h(IconCrown) : h(IconBot)

          return h('button', {
            key: ag.id,
            className: `dsh-aether-agent-tab${isActive ? ' dsh-aether-agent-tab--active' : ''}`,
            onClick: () => setSelectedAgentId(ag.id),
            title: `切换到 ${ag.name} 的任务视图`,
          },
            icon,
            ag.name,
            ag.status === 'running' ? h('span', { style: { display: 'inline-flex' } }, h(IconLoading, { size: 8 })) : null
          )
        })
      )
    }

    // 渲染【悬浮窗图文多模态交互输入框】
    const renderInputDeck = () => {
      return h('div', { className: 'dsh-aether-input-deck', onPaste: handlePaste },
        attachedImages.length > 0 ? h('div', { className: 'dsh-aether-image-preview-bar' },
          attachedImages.map((imgUrl, idx) =>
            h('div', { key: idx, className: 'dsh-aether-preview-thumb-box' },
              h('img', { src: imgUrl, className: 'dsh-aether-preview-img', alt: 'preview' }),
              h('button', {
                className: 'dsh-aether-thumb-del',
                onClick: () => setAttachedImages(prev => prev.filter((_, i) => i !== idx)),
                title: '删除图片'
              }, '×')
            )
          )
        ) : null,
        h('div', { className: 'dsh-aether-input-row' },
          h('input', {
            type: 'file',
            ref: fileInputRef,
            accept: 'image/*',
            multiple: true,
            style: { display: 'none' },
            onChange: handleFileChange,
          }),
          h('button', {
            className: 'dsh-aether-input-btn',
            onClick: () => fileInputRef.current?.click(),
            title: '上传图片 / 截图 (也可在输入框内直接 Ctrl+V 粘贴)',
          }, h(IconImageAttach)),
          h('input', {
            type: 'text',
            className: 'dsh-aether-input-field',
            placeholder: attachedImages.length > 0 ? '添加图片说明或直接按 Enter 发送...' : '向 AI 发送指令或粘贴图片... (按 Enter 发送)',
            value: inputText,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value),
            onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSendMessage()
              }
            }
          }),
          h('button', {
            className: 'dsh-aether-input-btn dsh-aether-input-btn--send',
            onClick: () => { void handleSendMessage() },
            title: '发送指令',
          }, h(IconSend))
        )
      )
    }

    // 渲染最底部【全功能底座状态栏 (Model & Effort & Context Deck)】
    const renderFooterDeck = () => {
      const metaModel = metrics?.modelMeta || {
        modelName: 'Gemini 3.7 Flash',
        effort: 'High',
        context: {
          usedTokens: 0,
          totalLimitTokens: 1048576,
          usedPercent: '0%',
          usedPercentNum: 0,
          systemTokens: 0,
          toolsTokens: 0,
          messagesTokens: 0,
        }
      }

      const ctx = metaModel.context
      const usedFmt = formatTokens(ctx.usedTokens)
      const limitFmt = formatTokens(ctx.totalLimitTokens)
      const sysFmt = formatTokens(ctx.systemTokens)
      const toolsFmt = formatTokens(ctx.toolsTokens)
      const msgFmt = formatTokens(ctx.messagesTokens)

      const speedToks = metrics?.tokensPerSec ? `${metrics.tokensPerSec} t/s` : '384 t/s'
      const ttftStr = metrics?.ttftAvgMs ? `${(metrics.ttftAvgMs / 1000).toFixed(1)}s` : '1.2s'

      // 计算进度条分段宽度（对齐 DSH 官方算法，基于组成比例渲染占用进度）
      const breakdownSum = (ctx.systemTokens || 0) + (ctx.toolsTokens || 0) + (ctx.messagesTokens || 0)
      const pct = ctx.usedPercentNum || 0
      const sysPct = breakdownSum > 0 ? (ctx.systemTokens / breakdownSum) * pct : 0
      const toolsPct = breakdownSum > 0 ? (ctx.toolsTokens / breakdownSum) * pct : 0
      const msgPct = breakdownSum > 0 ? (ctx.messagesTokens / breakdownSum) * pct : (pct > 0 ? pct : 0)

      return h('div', { className: 'dsh-aether-footer-deck' },
        h('div', { className: 'dsh-aether-footer-left' },
          // 模型名
          h('span', { className: 'dsh-aether-mini-pill dsh-aether-mini-pill--model', title: `当前模型: ${metaModel.modelName}` },
            h(IconModelChip, { size: 11, color: '#38bdf8' }),
            metaModel.modelName
          ),
          // Reasoning Effort
          h('span', { className: 'dsh-aether-mini-pill dsh-aether-mini-pill--effort', title: `推理思维链档位: ${metaModel.effort}` },
            h(IconBrain, { size: 11, color: '#c084fc' }),
            metaModel.effort
          ),
          // 上下文统计 & Hover / Click Popover (对齐官方设计，支持触屏点击展开)
          h('div', {
            className: `dsh-aether-mini-pill dsh-aether-mini-pill--context${showCtxPopover ? ' dsh-show-popover' : ''}`,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              setShowCtxPopover(v => !v)
            },
          },
            h(IconContext, { size: 11, color: '#4ade80' }),
            `已用 ${ctx.usedPercent} (${usedFmt}/${limitFmt})`,
            h('div', { className: 'dsh-aether-context-popover' },
              h('div', { className: 'dsh-aether-ctx-header' },
                h('span', null, `上下文已用 ${ctx.usedPercent}`),
                h('span', { style: { color: '#94a3b8', fontFamily: 'ui-monospace, monospace' } }, `~${usedFmt} / ${limitFmt}`)
              ),
              h('div', { className: 'dsh-aether-ctx-bar-track' },
                h('div', { className: 'dsh-aether-ctx-bar-seg', style: { width: `${sysPct}%`, background: '#cbd5e1' } }),
                h('div', { className: 'dsh-aether-ctx-bar-seg', style: { width: `${toolsPct}%`, background: '#a855f7' } }),
                h('div', { className: 'dsh-aether-ctx-bar-seg', style: { width: `${msgPct}%`, background: '#38bdf8' } })
              ),
              h('div', { className: 'dsh-aether-ctx-breakdown' },
                h('div', { className: 'dsh-aether-ctx-row' },
                  h('span', null, h('span', { className: 'dsh-aether-ctx-dot', style: { background: '#cbd5e1' } }), '系统提示词'),
                  h('span', { style: { fontFamily: 'ui-monospace, monospace' } }, `~${sysFmt}`)
                ),
                h('div', { className: 'dsh-aether-ctx-row' },
                  h('span', null, h('span', { className: 'dsh-aether-ctx-dot', style: { background: '#a855f7' } }), '工具'),
                  h('span', { style: { fontFamily: 'ui-monospace, monospace' } }, `~${toolsFmt}`)
                ),
                h('div', { className: 'dsh-aether-ctx-row' },
                  h('span', null, h('span', { className: 'dsh-aether-ctx-dot', style: { background: '#38bdf8' } }), '对话消息'),
                  h('span', { style: { fontFamily: 'ui-monospace, monospace' } }, `~${msgFmt}`)
                )
              )
            )
          )
        ),
        h('div', { className: 'dsh-aether-footer-right' },
          h('span', { className: 'dsh-aether-mini-pill dsh-aether-mini-pill--speed', title: `生成速率: ${speedToks} · 首字延迟: ${ttftStr}` },
            h(IconLightning, { size: 10, color: '#fbbf24' }),
            `${speedToks} · 首字 ${ttftStr}`
          )
        )
      )
    }

    // 渲染【移动端横向会话芯片栏 (快速切换会话)】
    const renderMobileSessionBar = () => {
      const allSess: SessionSummary[] = sessions.length > 0 ? sessions : [{
        id: 'current',
        title: userInput || '当前会话',
        phase,
        status: (phase === 'done' ? 'done' : (phase === 'idle' ? 'idle' : 'running')),
        lastUpdate: Date.now(),
        stepsCount: steps.length,
        userInput,
        steps,
      }]

      return h('div', { className: 'dsh-aether-mobile-session-bar' },
        allSess.map((s, idx) => {
          const isActive = s.id === activeSessionId || (allSess.length === 1 && s.id === 'current')
          const isRunning = s.status === 'running' || s.phase === 'thinking' || s.phase === 'tool' || s.phase === 'waiting'
          const isFailed = s.status === 'failed' || s.phase === 'failed'
          const isDone = s.status === 'done' || s.phase === 'done'

          let dotColor = '#94a3b8'
          if (isRunning) dotColor = '#fbbf24'
          else if (isFailed) dotColor = '#f87171'
          else if (isDone) dotColor = '#4ade80'

          const sessionTitle = s.title && s.title !== '新会话' ? s.title : (s.userInput || `会话 #${idx + 1}`)

          return h('div', {
            key: s.id,
            className: `dsh-aether-session-chip${isActive ? ' dsh-aether-session-chip--active' : ''}`,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              if (s.id !== 'current') handleSelectSession(s.id, true)
            },
            title: sessionTitle
          },
            h('span', { className: 'dsh-aether-chip-num' }, `#${idx + 1}`),
            h('span', {
              className: isRunning ? 'dsh-spin' : undefined,
              style: {
                display: 'inline-block',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: dotColor,
                flexShrink: 0,
              }
            }),
            h('span', { className: 'dsh-aether-chip-text' }, sessionTitle)
          )
        })
      )
    }

    // 渲染【全功能移动端 / 页面内控制台抽屉】
    const renderDrawer = () => {
      return [
        h('div', {
          key: 'drawer-backdrop',
          className: `dsh-aether-drawer-backdrop${drawerOpen ? ' dsh-aether-drawer-backdrop--open' : ''}`,
          onClick: () => setDrawerOpen(false),
        }),
        h('div', {
          key: 'drawer-panel',
          className: `dsh-aether-drawer${drawerOpen ? ' dsh-aether-drawer--open' : ''}`,
        },
          // 1. 顶部手柄 (轻触收起)
          h('div', {
            className: 'dsh-aether-drawer-handle',
            onClick: () => setDrawerOpen(false),
            title: '点击收起控制台',
          }),

          // 2. 抽屉顶栏 (Avatar + 任务标题 + 声音 + 关闭按钮)
          h('div', { className: 'dsh-aether-drawer-header' },
            h('div', { className: 'dsh-aether-drawer-title-box' },
              h('div', {
                className: 'dsh-aether-mini-avatar',
                onClick: () => { void onClickSprite() },
                title: '轻摸 maid',
              },
                h('img', {
                  src: MAID_PNG,
                  className: 'dsh-aether-mini-avatar-img',
                  alt: 'maid',
                })
              ),
              h('div', { className: 'dsh-aether-drawer-title', title: promptTitle }, promptTitle)
            ),
            h('div', { className: 'dsh-aether-ctrls' },
              h('button', {
                className: 'dsh-aether-btn',
                onClick: toggleSound,
                title: soundOn ? '点击静音' : '开启音效',
              }, soundOn ? h(IconVolumeOn) : h(IconVolumeOff)),
              h('button', {
                className: 'dsh-aether-btn',
                onClick: () => setDrawerOpen(false),
                title: '收起控制台',
              }, h(IconChevronDown, { size: 14 }))
            )
          ),

          // 3. 移动端横向会话栏 (快速切换会话)
          renderMobileSessionBar(),

          // 4. 中部执行时间轴 (完整命令 + 图标 + 耗时)
          renderTimeline(),

          // 5. 遥测面板 (双行：本轮 + 全局统计)
          renderTelemetry(),

          // 6. 状态与 Agent 切换栏
          h('div', { className: 'dsh-aether-status-bar' },
            renderAgentTabs(),
            h('div', { className: 'dsh-aether-island' },
              h('div', {
                className: 'dsh-aether-pill',
                style: { color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }
              },
                h('span', { className: 'dsh-aether-pill__dot', style: { background: meta.dot } }),
                meta.text
              ),
              h('div', {
                className: `dsh-aether-ticker-box dsh-maid-bubble__status--${currentDisplayPhase}${aetherFadeClass}`,
              },
                h('span', {
                  className: 'dsh-maid-bubble__ticker',
                  style: { transform: `translateX(${tickerShift}px)` },
                }, finalStatusText)
              )
            )
          ),

          // 7. 对话框 (多模态图文输入 + 回车发送)
          renderInputDeck(),

          // 8. 底部底座栏 (当前模型 + Effort + 上下文统计)
          renderFooterDeck()
        )
      ]
    }

    // ═══════════════════════════════════════════════════════════
    // 1. 桌面置顶画中画模式 (isPiP = true)
    // ═══════════════════════════════════════════════════════════
    if (isPiP) {
      const cardClass = `dsh-aether-card dsh-mode-${layoutMode}`
      const isLargeMode = layoutMode === 'wide-large'

      return h('div', { className: cardClass, ref: cardRef },
        // 1. 全局最左侧：会话导航栏 (无论宽屏、窄屏、竖屏模式均常驻可用)
        renderSessionRail(),

        // 2. 角色立绘展台 (Podium)
        h('div', {
          className: 'dsh-aether-podium',
          onClick: () => { void onClickSprite() },
          onContextMenu,
        },
          h('div', { className: 'dsh-aether-avatar-wrapper' },
            h('div', {
              className: 'dsh-aether-aura',
              style: { background: meta.aura }
            }),
            patPopKey > 0 ? h('div', {
              className: 'dsh-maid-pat-pop',
              key: 'pip-pop-' + patPopKey,
              style: { display: 'flex', alignItems: 'center', gap: '3px' }
            }, h(IconHeart, { size: 13 }), '+1') : null,
            patCount > 0 ? h('div', {
              className: 'dsh-maid-pat-badge',
              style: { top: '0', right: '0', display: 'flex', alignItems: 'center', gap: '3px' }
            }, h(IconHeart, { size: 10 }), String(patCount)) : null,
            h('img', {
              key: 'pip-sprite-' + bumpKey,
              className: `dsh-aether-sprite${bumpKey > 0 ? ' dsh-aether-sprite--bump' : ''}`,
              src: MAID_PNG,
              alt: 'maid pet',
              draggable: false,
            })
          ),
          isLargeMode ? renderTelemetry() : null
        ),

        // 3. 右列完整主交互控制台 (自上而下拥有充足宽度与高度)
        h('div', { className: 'dsh-aether-main-col' },
          // 1. 顶栏
          h('div', { className: 'dsh-aether-header' },
            h('div', { className: 'dsh-aether-task-title', title: promptTitle },
              h(IconTarget, { size: 13 }),
              promptTitle
            ),
            h('div', { className: 'dsh-aether-ctrls' },
              h('button', {
                className: 'dsh-aether-btn',
                onClick: toggleSound,
                title: soundOn ? '点击静音' : '点击开启音效',
              }, soundOn ? h(IconVolumeOn) : h(IconVolumeOff)),
              h('button', {
                className: 'dsh-aether-btn',
                onClick: (e: React.MouseEvent) => { e.stopPropagation(); void togglePiP() },
                title: '还原到网页内',
              }, h(IconRestore))
            )
          ),

          // 2. 中部：本轮多步执行时间轴 (完整长命令 + 专属语义图标 + 耗时 + 失败红叉)
          renderTimeline(),

          // 小尺寸下，遥测面板收纳至右侧输入框上方以保证数据完整
          !isLargeMode ? renderTelemetry() : null,

          // 3. 状态与 Agent 切换栏 (紧凑并排于输入框上方)
          h('div', { className: 'dsh-aether-status-bar' },
            renderAgentTabs(),
            h('div', { className: 'dsh-aether-island' },
              h('div', {
                className: 'dsh-aether-pill',
                style: { color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }
              },
                h('span', { className: 'dsh-aether-pill__dot', style: { background: meta.dot } }),
                meta.text
              ),
              h('div', {
                className: `dsh-aether-ticker-box dsh-maid-bubble__status--${currentDisplayPhase}${aetherFadeClass}`,
                ref: containerRef,
              },
                h('span', {
                  className: 'dsh-maid-bubble__ticker',
                  ref: tickerRef,
                  style: { transform: `translateX(${tickerShift}px)` },
                }, finalStatusText)
              )
            )
          ),

          // 4. 对话框 (Input Deck - 已往上移)
          renderInputDeck(),

          // 5. 最底部：全功能底座状态栏 (当前模型 + Effort + 上下文统计 + 响应速度)
          renderFooterDeck()
        )
      )
    }

    // ═══════════════════════════════════════════════════════════
    // 2. 普通网页右下角模式 (isPiP = false) + 全功能移动端抽屉
    // ═══════════════════════════════════════════════════════════
    const statusClass = `dsh-maid-bubble__status dsh-maid-bubble__status--${phase}${bubbleFadeClass}`
    const widgetStyle = { right: pos.right + 'px', bottom: pos.bottom + 'px' } as React.CSSProperties
    const pipBtnClass = `dsh-maid-bubble__btn${pipActive ? ' dsh-maid-bubble__btn--pip-active' : ''}`
    const isDockLeft = typeof window !== 'undefined' && pos.right > (window.innerWidth / 2)
    const bubbleClass = `dsh-maid-bubble${isDockLeft ? ' dsh-maid-bubble--dock-left' : ''}`

    return h(React.Fragment, null,
      h('div', { className: 'dsh-maid-widget', ref: widgetRef, style: widgetStyle },
        h('div', {
          className: bubbleClass,
          key: 'bubble',
          onClick: () => { setDrawerOpen(true) },
          title: isMobile ? '点击展开移动端控制台' : '点击展开控制台',
        },
          h('div', { className: 'dsh-maid-bubble__title-row' },
            h(IconTarget, { size: 13 }),
            h('span', { className: 'dsh-maid-bubble__title-text', title: promptTitle }, promptTitle)
          ),
          h('div', {
            className: statusClass,
            ref: containerRef,
          },
            h('span', {
              className: 'dsh-maid-bubble__ticker',
              ref: tickerRef,
              style: { transform: `translateX(${tickerShift}px)` },
            }, finalStatusText)
          ),
          h('div', { className: 'dsh-maid-bubble__actions' },
            h('button', {
              className: pipBtnClass,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation()
                if (isMobile) {
                  setDrawerOpen(true)
                } else {
                  void togglePiP()
                }
              },
              title: isMobile ? '展开移动端控制台' : (pipActive ? '关闭置顶画中画' : '在桌面最前方置顶悬浮 (画中画)'),
            }, isMobile ? h(IconExpand, { size: 12 }) : h('svg', { width: '13', height: '13', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' },
                h('rect', { x: '2', y: '3', width: '20', height: '14', rx: '2' }),
                h('rect', { x: '11', y: '9', width: '9', height: '7', rx: '1', fill: 'currentColor' }),
              )
            ),
            h('button', {
              className: 'dsh-maid-bubble__btn',
              onClick: (e: React.MouseEvent) => { e.stopPropagation(); setHiddenPersist(true) },
              title: '隐藏',
            }, '×'),
          ),
        ),
        h('div', {
          className: 'dsh-maid-sprite-box',
          key: 'sprite-box',
        },
          patCount > 0 ? h('div', {
            className: 'dsh-maid-pat-badge',
            key: 'badge-' + patCount,
            style: { display: 'flex', alignItems: 'center', gap: '3px' }
          }, h(IconHeart, { size: 10 }), String(patCount)) : null,
          patPopKey > 0 ? h('div', {
            className: 'dsh-maid-pat-pop',
            key: 'pop-' + patPopKey,
            style: { display: 'flex', alignItems: 'center', gap: '3px' }
          }, h(IconHeart, { size: 12 }), '+1') : null,
          h('img', {
            key: 'sprite-' + bumpKey,
            className: `dsh-maid-sprite${bumpKey > 0 ? ' dsh-maid-sprite--bump' : ''}`,
            src: MAID_PNG,
            alt: 'maid pet',
            draggable: false,
            onPointerDown: drag.onDown,
            onClick: () => { void onClickSprite() },
            onContextMenu,
          })
        )
      ),
      ...renderDrawer()
    )
}

// ───────── 样式注入 ─────────
function installStyles(ctx: any): void {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = PLUGIN_ID
    tag.dataset.pluginCss = `${PLUGIN_ID}/maid.css`
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'maid: stylesheet')
}

// ───────── Mount ─────────
let mountRoot: any = null
let mountHost: HTMLDivElement | null = null
function mountToBody(): void {
  if (mountRoot || typeof document === 'undefined') return
  mountHost = document.createElement('div')
  mountHost.setAttribute('data-dsh-maid-root', '1')
  mountHost.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483600;pointer-events:none;display:contents;'
  document.body.appendChild(mountHost)
  const ReactDOMClient = require('react-dom/client')
  mountRoot = ReactDOMClient.createRoot(mountHost)
  mountRoot.render(React.createElement(MaidOverlay))
}
function unmountFromBody(): void {
  if (mountRoot) {
    try { mountRoot.unmount() } catch { /* ignore */ }
    mountRoot = null
  }
  if (mountHost) {
    mountHost.remove()
    mountHost = null
  }
  if (currentPipWindow && !currentPipWindow.closed) {
    try { currentPipWindow.close() } catch { /* ignore */ }
    currentPipWindow = null
  }
}

// ───────── 召唤按钮 ─────────
let summonRoot: any = null
let summonHost: HTMLDivElement | null = null
function SummonButton(): React.ReactElement | null {
  const [visible, setVisible] = useState(maidBus.isHidden())
  useEffect(() => {
    const onChange = (e: any): void => setVisible(!!e.detail?.hidden)
    document.addEventListener(HIDDEN_EVENT, onChange)
    return () => document.removeEventListener(HIDDEN_EVENT, onChange)
  }, [])
  if (!visible) return null
  return React.createElement('button', {
    className: 'dsh-maid-summon',
    onClick: () => { maidBus.setHidden(false) },
    title: '召唤 maid（右键 maid 切音效 / 点击气泡小窗图标置顶悬浮）',
    style: {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      zIndex: 2147483000,
      pointerEvents: 'auto',
    },
  }, '召唤 maid')
}
function mountSummonButton(): void {
  if (summonRoot || typeof document === 'undefined') return
  summonHost = document.createElement('div')
  summonHost.setAttribute('data-dsh-maid-summon', '1')
  summonHost.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;pointer-events:none;'
  document.body.appendChild(summonHost)
  const ReactDOMClient = require('react-dom/client')
  summonRoot = ReactDOMClient.createRoot(summonHost)
  summonRoot.render(React.createElement(SummonButton))
}
function unmountSummonButton(): void {
  if (summonRoot) {
    try { summonRoot.unmount() } catch { /* ignore */ }
    summonRoot = null
  }
  if (summonHost) {
    summonHost.remove()
    summonHost = null
  }
}

export function apply(ctx: any): void {
  globalClientCtx = ctx
  installStyles(ctx)
  mountToBody()
  mountSummonButton()

  // 1. 响应式监听 DSH 官方 sessions 服务切换
  try {
    if (ctx?.sessions?.list) {
      const cur = ctx.sessions.list.getSnapshot?.()?.current
      if (cur) {
        maidBus.notifyWebSessionChange(cur)
      }
      ctx.sessions.list.subscribe?.((snap: any) => {
        const active = snap?.current
        if (active) {
          maidBus.notifyWebSessionChange(active)
        }
      })
    }
  } catch { /* ignore */ }

  // 2. 路由 / URL 变化监听辅助
  if (typeof window !== 'undefined') {
    let lastUrl = window.location.href
    const checkUrlSession = () => {
      const curUrl = window.location.href
      if (curUrl !== lastUrl) {
        lastUrl = curUrl
        const m = curUrl.match(/\/sessions\/([a-zA-Z0-9_-]+)/)
        if (m && m[1]) {
          maidBus.notifyWebSessionChange(m[1])
        }
      }
    }
    window.addEventListener('popstate', checkUrlSession)
    window.addEventListener('hashchange', checkUrlSession)
    const timer = setInterval(checkUrlSession, 400)
    ctx.effect(() => () => {
      window.removeEventListener('popstate', checkUrlSession)
      window.removeEventListener('hashchange', checkUrlSession)
      clearInterval(timer)
    }, 'maid: url check')
  }

  ctx.effect(() => () => { unmountFromBody(); unmountSummonButton() }, 'maid: unmount')
  if (typeof document !== 'undefined') {
    document.body.setAttribute('data-dsh-maid-loaded', Date.now().toString())
  }
  try {
    ctx.effect(() => ctx.slots.inject('shell.overlay', () =>
      ctx.slots.register({ name: 'shell.overlay', id: 'dsh-floating-maid-stub', order: 999, label: 'maid stub' }, () => null)
    ), 'maid: shell.overlay stub')
  } catch { /* ignore */ }
}
