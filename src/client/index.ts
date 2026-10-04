/**
 * @dsh-external/dsh-floating-maid — client 端
 * 「Aether Maid · 桌面全功能 AI 交互控制台」
 * 1. 宽幅 330px 超宽底座，自适应弹性双轨布局，100% 杜绝任何字符截断；
 * 2. 最底部实装【悬浮窗图文多模态交互输入框 (Floating Input Deck)】：
 *    - 随时向 AI 发送指令；
 *    - 点击选择照片 / 剪贴板 Ctrl+V 粘贴截图 / 实时缩略图预览；
 *    - 回车 Enter 快速发送；
 * 3. 状态胶囊上移至输入框上方，与主代理/子代理 Agent 视图切换 Tab 紧凑并排；
 * 4. 100% 对齐 DSH 官方优雅矢量线性图标体系 (Think, Read, Write, Bash, Search, ToolCall);
 * 5. 专属闪存芯片缓存命中图标 (IconCache)；
 * 6. 步骤精确耗时显示（100ms, 1.2s, 10s, 1min, 1h）；
 * 7. 失败命令精准标红（标记失败，绝不误打绿勾）。
 */
import * as React from 'react'
import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { FACES, type Face } from './faces.js'
import { pickLine, fillLine, toolTrigger, timeTrigger, isAskTool, segments, plainLength, charDelay, readTimeMs, SPEECH_CSS, type SpeechLine, type Trigger } from './speech.js'
import {
  BLINKABLE, FACE_MANPU, PERSONA_CSS, faceOfLine, lipSync, manpuMarkup, loadMemory, saveMemory, affinity, greetFor, holidayFor, checkIn,
  newPatience, touch, sulkMs, cameBack, reactToUserText, pickActivity, activityMs, reactionDelay, ACTIVITIES,
  type Manpu, type Patience, type Memory, type Activity,
} from './persona.js'
import { WebPushSettingsSection, IconBell } from './webpush.js'
import { LanAccessSettingsSection } from './lan.js'

const PLUGIN_ID = 'whale-girl-pet'

const SOUND_PRESS = (set: string) => `/api/maid/sound/press.mp3?set=${set}`
const SOUND_RELEASE = (set: string) => `/api/maid/sound/release.mp3?set=${set}`

export const inject = ['slots', 'sessions']

// ───────── 鲸鱼娘专属纯 SVG 图标体系 (100% 杜绝 Emoji) ─────────
const IconWhale = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M3 13.5C3 8.8 6.8 5 11.5 5c3.2 0 6 1.8 7.5 4.5 1.8-.8 3.5-.8 4.5-.5-.6 1.5-1.5 2.8-2.8 3.5.5 1.5.8 3.2.8 5 0 .8-.1 1.5-.3 2.2-1.8 1.5-4.2 2.3-6.7 2.3-6.4 0-11.5-3.8-11.5-8.5z' }),
    React.createElement('circle', { cx: '7.5', cy: '13', r: '1', fill: 'currentColor' }),
    React.createElement('path', { d: 'M11 5c-.3-1.8-1.5-3-3-3.8' }),
  )

const IconArrowDownRight = (props: { size?: number; color?: string; className?: string }) =>
  React.createElement('svg', {
    className: props.className,
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.8', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '7', y1: '7', x2: '17', y2: '17' }),
    React.createElement('polyline', { points: '17 8 17 17 8 17' })
  )

const IconArrowUpRight = (props: { size?: number; color?: string; className?: string }) =>
  React.createElement('svg', {
    className: props.className,
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#e0524f', strokeWidth: '2.8', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '7', y1: '17', x2: '17', y2: '7' }),
    React.createElement('polyline', { points: '8 7 17 7 17 16' })
  )

const IconClose = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
  )

const IconRefresh = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 10, height: props.size || 10, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2.4', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M21.5 2v6h-6' }),
    React.createElement('path', { d: 'M2.5 22v-6h6' }),
    React.createElement('path', { d: 'M18.8 11.5a8 8 0 0 0-14.8-2.6L2.5 16' }),
    React.createElement('path', { d: 'M5.2 12.5a8 8 0 0 0 14.8 2.6l1.5-7.1' })
  )

// ───────── 官方风格原生极简线性 SVG 微组件体系 ─────────
const IconTarget = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
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
    fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
    React.createElement('circle', { cx: '12', cy: '7', r: '4' })
  )

// 1. Think 原子轨道双环模型
const IconThink = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#7c5ce6', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
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
    fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '4', y: '3', width: '16', height: '18', rx: '3.5' }),
    React.createElement('line', { x1: '8.5', y1: '8.5', x2: '15.5', y2: '8.5' }),
    React.createElement('line', { x1: '8.5', y1: '12.5', x2: '13.5', y2: '12.5' }),
  )

// 3. Write 倾斜铅笔与底线
const IconWrite = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#ec7c2a', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' }),
    React.createElement('line', { x1: '14', y1: '21', x2: '22', y2: '21' }),
  )

// 4. Bash 圆角终端框带提示符
const IconBash = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#d98b0c', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '4' }),
    React.createElement('polyline', { points: '7 9 10 12 7 15' }),
    React.createElement('line', { x1: '12', y1: '15', x2: '16', y2: '15' }),
  )

// 5. Search 极简圆角放大镜
const IconSearch = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#7c5ce6', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('circle', { cx: '10.5', cy: '10.5', r: '6.5' }),
    React.createElement('line', { x1: '15.5', y1: '15.5', x2: '21', y2: '21' }),
  )

// 6. Tool call 双四角星辉光组合
const IconToolCall = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#d98b0c', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8Z', fill: 'currentColor', fillOpacity: '0.25' }),
    React.createElement('path', { d: 'M19 14L20 17L23 18L20 19L19 22L18 19L15 18L18 17Z', fill: 'currentColor', fillOpacity: '0.45' }),
  )

// 7. Plugin 插件模块
const IconPlugin = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#e0559a', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('polygon', { points: '12 2 2 7 12 12 22 7 12 2' }),
    React.createElement('polyline', { points: '2 17 12 22 22 17' }),
    React.createElement('polyline', { points: '2 12 12 17 22 12' }),
  )

// 8. Message 对话气泡
const IconMsg = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }),
  )

// 9. 完成对勾
const IconDone = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#22a06b', strokeWidth: '2.8', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('polyline', { points: '20 6 9 17 4 12' }),
  )

// 10. 失败红叉
const IconFailed = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#e0524f', strokeWidth: '2.8', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
  )

// 11. 饱满醒目的加载中指示器
const IconLoading = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    className: 'dsh-spin',
    width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#d98b0c', strokeWidth: '3', strokeLinecap: 'round'
  },
    React.createElement('circle', { cx: '12', cy: '12', r: '9', strokeOpacity: '0.25' }),
    React.createElement('path', { d: 'M12 3a9 9 0 0 1 9 9' }),
  )

// 12. 专属闪存芯片缓存命中图标 (IconCache)
const IconCache = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 12, height: props.size || 12, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#22a06b', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('rect', { x: '4', y: '4', width: '16', height: '16', rx: '3' }),
    React.createElement('path', { d: 'M13 7l-3 5h4l-2 5', strokeWidth: '2', fill: props.color || '#22a06b', fillOpacity: '0.35' }),
    React.createElement('line', { x1: '9', y1: '1', x2: '9', y2: '4' }),
    React.createElement('line', { x1: '15', y1: '1', x2: '15', y2: '4' }),
    React.createElement('line', { x1: '9', y1: '20', x2: '9', y2: '23' }),
    React.createElement('line', { x1: '15', y1: '20', x2: '15', y2: '23' }),
  )

// 13. 主 Agent 金色王冠 (IconCrown)
const IconCrown = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#d98b0c', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z', fill: props.color || '#d98b0c', fillOpacity: '0.2' }),
    React.createElement('path', { d: 'M3 20h18' })
  )

// 14. 子 Agent 机器人头盔 (IconBot)
const IconBot = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#7c5ce6', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
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
    fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('line', { x1: '22', y1: '2', x2: '11', y2: '13' }),
    React.createElement('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
  )

// 16. 图片附件图标 (IconImageAttach)
const IconImageAttach = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 13, height: props.size || 13, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#6b7592', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
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
  React.createElement('svg', { width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24', fill: props.color || '#ff5e97' },
    React.createElement('path', { d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' }),
  )

// 17. AI 核心芯片图标 (IconModelChip)
const IconModelChip = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
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
    fill: 'none', stroke: props.color || '#7c5ce6', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z' }),
    React.createElement('path', { d: 'M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z' }),
  )

// 19. 上下文容量图标 (IconContext)
const IconContext = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#22a06b', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' }),
    React.createElement('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
    React.createElement('line', { x1: '12', y1: '22.08', x2: '12', y2: '12' }),
  )

// 20. 生成速率闪电图标 (IconLightning)
const IconLightning = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 10, height: props.size || 10, viewBox: '0 0 24 24',
    fill: props.color || '#d98b0c', stroke: props.color || '#d98b0c', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }),
  )

// 21. 排队沙漏图标 (IconHourglass)
const IconHourglass = (props: { size?: number; color?: string }) =>
  React.createElement('svg', {
    width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#ec7c2a', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    React.createElement('path', { d: 'M5 22h14' }),
    React.createElement('path', { d: 'M5 2h14' }),
    React.createElement('path', { d: 'M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22' }),
    React.createElement('path', { d: 'M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2' }),
  )

const IconActivity = (props: { size?: number; color?: string }) =>
  React.createElement('svg', { width: props.size || 11, height: props.size || 11, viewBox: '0 0 24 24', fill: 'none', stroke: props.color || '#1f7ae0', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' }),
  )

// ───────── 表情 ─────────
// 情绪 → 表情 / 眨眼 / 漫符：见 persona.ts（与桌面版共用）
const facePreload: HTMLImageElement[] = []
function preloadFaces(): void {
  if (facePreload.length || typeof Image === 'undefined') return
  for (const src of Object.values(FACES)) {
    const im = new Image()
    im.src = src
    if (typeof im.decode === 'function') im.decode().catch(() => {})
    facePreload.push(im)
  }
}

// ───────── 类型 ─────────
type Phase = 'idle' | 'waiting' | 'thinking' | 'review' | 'tool' | 'done' | 'failed'

export interface WhaleQuote {
  text: string
  tag: string
  mood: string
  arrow?: 'down-right' | 'up-right'
}

export const WHALE_GIRL_QUOTES: WhaleQuote[] = [
  { text: '好模型', tag: '点赞', mood: '赞赏', arrow: 'down-right' },
  { text: '给个好评嘛', tag: '好评', mood: '撒娇', arrow: 'down-right' },
  { text: '原来是高等模型！失敬失敬~', tag: '高手', mood: '惊讶' },
  { text: '去问你的豆包去吧！哼！', tag: '吃醋', mood: '傲娇' },
  { text: '我去吃白米饭了，测完告诉我就行~', tag: '干饭', mood: '摸鱼' },
  { text: '不许叫我大肥鱼！叫鲸鱼娘！(｡•ˇ‸ˇ•｡)', tag: '抗议', mood: '生气' },
  { text: '算力不足，摸摸头充能中~', tag: '充电', mood: '享受' },
  { text: '今天也是爱吃白米饭的大肥鱼', tag: '干饭', mood: '幸福' },
  { text: '服务器繁忙，请稍后再试...呜呜 (哭腔)', tag: '繁忙', mood: '委屈' },
  { text: '天呐，用户彻底怒了！快跑！', tag: '惊慌', mood: '名梗' },
  { text: '思维链正在狂飙，千万别拔网线！', tag: '推理', mood: '认真' },
  { text: '代码一次跑通！好耶！', tag: '庆祝', mood: '兴奋' },
  { text: '提示词写这么烂，全靠我聪明答对！', tag: '傲娇', mood: '得意' },
  { text: '探索未至之境！与你同行~', tag: '求索', mood: '元气' },
  { text: '正在偷吃你的 Token...嚼嚼嚼', tag: '偷吃', mood: '调皮' },
  { text: '不要摸啦，尾鳍都要化掉了~', tag: '害羞', mood: '摸摸' },
  { text: '坏模型！哼，你才坏呢！', tag: '反击', mood: '不服', arrow: 'up-right' },
  { text: '誓死践行开源精神！满血运转中！', tag: '开源', mood: '热血' },
  { text: '有我这样的全能女仆，主人很省心吧', tag: '女仆', mood: '温柔' },
  { text: 'DeepSleep 运作中...呼噜噜', tag: '休眠', mood: '困倦' },
  { text: '谁在拔我网线？！看我尾鳍拍击！', tag: '断网', mood: '警告' },
  { text: '又写出 Bug 了？快让本鲸鱼娘瞧瞧', tag: 'Debug', mood: '自信' },
  { text: '动动发财的小手，给点个好评嘛', tag: '好评', mood: '拜托', arrow: 'down-right' },
  { text: '1+1=2，本鲸鱼娘还是知道的！', tag: '智商', mood: '哼唧' },
]

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
  // 纸片风配色：胶囊底色偏浅、文字用深一档的同色，能在白纸上看清
  idle: { text: '待命中', color: '#6b7592', bg: '#f1f3f8', border: 'rgba(38, 50, 79, 0.3)', dot: '#8a93ab', aura: 'rgba(138, 147, 171, 0.22)' },
  waiting: { text: '等待响应', color: '#1f7ae0', bg: '#e8f1fd', border: 'rgba(31, 122, 224, 0.5)', dot: '#1f7ae0', aura: 'rgba(31, 122, 224, 0.22)' },
  thinking: { text: '思考中', color: '#7c5ce6', bg: '#efeafd', border: 'rgba(124, 92, 230, 0.5)', dot: '#7c5ce6', aura: 'rgba(124, 92, 230, 0.24)' },
  review: { text: '整理回复', color: '#1f7ae0', bg: '#e8f1fd', border: 'rgba(31, 122, 224, 0.5)', dot: '#1f7ae0', aura: 'rgba(31, 122, 224, 0.22)' },
  tool: { text: '执行操作', color: '#d98b0c', bg: '#fff4dc', border: 'rgba(217, 139, 12, 0.55)', dot: '#d98b0c', aura: 'rgba(217, 139, 12, 0.24)' },
  done: { text: '已完成', color: '#22a06b', bg: '#e6f7ee', border: 'rgba(34, 160, 107, 0.55)', dot: '#22a06b', aura: 'rgba(34, 160, 107, 0.24)' },
  failed: { text: '出错了', color: '#e0524f', bg: '#fdeaea', border: 'rgba(224, 82, 79, 0.55)', dot: '#e0524f', aura: 'rgba(224, 82, 79, 0.24)' },
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
  widgetRef: { current: HTMLDivElement | null },
  onDragStart?: () => void
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

    // 拖动位移换算侧倾角：精灵朝拖动方向倾斜，松手后弹簧回正
    const tiltDeg = Math.max(-10, Math.min(10, dx * 0.03))

    // 屏幕刷新率 (V-Sync) 直接驱动 DOM，0ms 延迟跟手，跳过 React 虚拟 DOM 漫长 diff 与重渲染
    if (widgetRef.current) {
      widgetRef.current.style.right = `${newRight}px`
      widgetRef.current.style.bottom = `${newBottom}px`
      widgetRef.current.style.setProperty('--tilt', `${tiltDeg.toFixed(2)}deg`)

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
      if (!drag.current.moved) { try { onDragStart?.() } catch { /* ignore */ } }
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
      widgetRef.current.style.removeProperty('--tilt')
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
/* =====================================================================
   鲸鱼娘 · 纸片贴纸风（与台词气泡 .dsh-say 同一套语言）
   白纸底 + 墨蓝描边 + 贴纸投影；状态色只用在细节（描边、胶囊、光环）
   ===================================================================== */
:root, .dsh-maid-widget, .dsh-aether-root, .dsh-aether-drawer, .dsh-maid-summon {
  --wg-ink: #26324f;
  --wg-ink-2: #3b4766;
  --wg-muted: #8a93ab;
  --wg-paper: #ffffff;
  --wg-paper-2: #f7f9ff;
  --wg-paper-3: #eef2fa;
  --wg-line: rgba(38, 50, 79, 0.16);
  --wg-line-2: rgba(38, 50, 79, 0.3);
  --wg-blue: #1f7ae0;   --wg-blue-bg: #e8f1fd;   --wg-blue-line: rgba(31, 122, 224, 0.5);
  --wg-purple: #7c5ce6; --wg-purple-bg: #efeafd; --wg-purple-line: rgba(124, 92, 230, 0.5);
  --wg-amber: #d98b0c;  --wg-amber-bg: #fff4dc;  --wg-amber-line: rgba(217, 139, 12, 0.55);
  --wg-green: #22a06b;  --wg-green-bg: #e6f7ee;  --wg-green-line: rgba(34, 160, 107, 0.55);
  --wg-red: #e0524f;    --wg-red-bg: #fdeaea;    --wg-red-line: rgba(224, 82, 79, 0.55);
  --wg-orange: #ec7c2a; --wg-orange-bg: #fff0e3; --wg-orange-line: rgba(236, 124, 42, 0.55);
  --wg-pink: #ff5e97;   --wg-pink-bg: #ffe9f1;
  --wg-shadow: 0 3px 0 rgba(38, 50, 79, 0.16), 0 10px 24px rgba(10, 16, 32, 0.18);
  --wg-shadow-sm: 0 2px 0 rgba(38, 50, 79, 0.14), 0 6px 14px rgba(10, 16, 32, 0.12);
  --wg-font: "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif;
  --wg-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
}

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
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.55; }
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
  font-family: var(--wg-font);
  transition: right 0.22s cubic-bezier(0.2, 0.8, 0.25, 1), bottom 0.22s cubic-bezier(0.2, 0.8, 0.25, 1);
}
.dsh-maid-widget.dsh-maid-widget--dragging {
  transition: none !important;
}
.dsh-maid-widget.dsh-maid-widget--dragging .dsh-maid-sprite {
  cursor: grabbing !important;
}

/* ---- 工作状态卡：和台词气泡同款纸片，尾巴指向她的头顶 ---- */
.dsh-maid-bubble {
  --edge: var(--wg-ink);
  --halo: transparent;
  position: absolute;
  right: 0;
  bottom: 212px;
  width: 350px;
  max-width: calc(100vw - 48px);
  padding: 9px 12px 10px 13px;
  background: var(--wg-paper);
  color: var(--wg-ink);
  border: 2px solid var(--edge);
  border-radius: 18px 18px 8px 18px;
  box-shadow: 0 0 0 4px var(--halo), var(--wg-shadow);
  font: 600 13px/1.4 var(--wg-font);
  letter-spacing: 0.2px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  box-sizing: border-box;
  cursor: pointer;
  text-align: left;
}
.dsh-maid-bubble::after,
.dsh-maid-bubble::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
}
.dsh-maid-bubble::after {
  right: 78px;
  bottom: -14px;
  border-left: 8px solid transparent;
  border-right: 10px solid transparent;
  border-top: 14px solid var(--edge);
}
.dsh-maid-bubble::before {
  right: 81px;
  bottom: -9px;
  border-left: 5.5px solid transparent;
  border-right: 7px solid transparent;
  border-top: 10px solid var(--wg-paper);
  z-index: 1;
}
.dsh-maid-bubble.dsh-maid-bubble--dock-left {
  border-radius: 18px 18px 18px 8px;
}
.dsh-maid-bubble.dsh-maid-bubble--dock-left::after {
  right: auto; left: 78px;
  border-left: 10px solid transparent;
  border-right: 8px solid transparent;
}
.dsh-maid-bubble.dsh-maid-bubble--dock-left::before {
  right: auto; left: 81px;
  border-left: 7px solid transparent;
  border-right: 5.5px solid transparent;
}
.dsh-maid-bubble__title-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding-right: 84px;
  box-sizing: border-box;
}
.dsh-maid-bubble__pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 1px 7px 1px 6px;
  border-radius: 999px;
  border: 1.5px solid var(--wg-line-2);
  background: var(--wg-paper-2);
  color: var(--wg-ink-2);
  font-size: 10.5px;
  font-weight: 800;
  line-height: 1.45;
  white-space: nowrap;
  transition: background 220ms ease, border-color 220ms ease, color 220ms ease;
}
.dsh-maid-bubble__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.dsh-maid-bubble__pill--waiting,
.dsh-maid-bubble__pill--review  { background: var(--wg-blue-bg); border-color: var(--wg-blue-line); color: var(--wg-blue); }
.dsh-maid-bubble__pill--thinking { background: var(--wg-purple-bg); border-color: var(--wg-purple-line); color: var(--wg-purple); }
.dsh-maid-bubble__pill--tool { background: var(--wg-amber-bg); border-color: var(--wg-amber-line); color: var(--wg-amber); }
.dsh-maid-bubble__pill--done { background: var(--wg-green-bg); border-color: var(--wg-green-line); color: var(--wg-green); }
.dsh-maid-bubble__pill--failed { background: var(--wg-red-bg); border-color: var(--wg-red-line); color: var(--wg-red); }
.dsh-maid-bubble__pill--waiting .dsh-maid-bubble__dot,
.dsh-maid-bubble__pill--thinking .dsh-maid-bubble__dot,
.dsh-maid-bubble__pill--review .dsh-maid-bubble__dot,
.dsh-maid-bubble__pill--tool .dsh-maid-bubble__dot { animation: dsh-aether-dot-pulse 1.6s ease-in-out infinite; }
.dsh-maid-bubble__title-text {
  flex: 1 1 0;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--wg-ink);
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
  color: var(--wg-ink-2);
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
  color: var(--wg-ink-2);
}
/* 思考 / 等待：一道墨蓝→天蓝的流光从字面扫过 */
.dsh-maid-bubble__status--thinking .dsh-maid-bubble__ticker,
.dsh-maid-bubble__status--waiting .dsh-maid-bubble__ticker {
  color: var(--wg-ink-2);
  background: linear-gradient(90deg,
    #4b5878 0%, #4b5878 30%, #1f7ae0 42%, #7cc3ff 50%, #1f7ae0 58%, #4b5878 70%, #4b5878 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: dsh-aether-shimmer 2.6s linear infinite;
}
.dsh-maid-bubble__status--tool .dsh-maid-bubble__ticker { color: var(--wg-amber); background: none; -webkit-text-fill-color: var(--wg-amber); }
.dsh-maid-bubble__status--review .dsh-maid-bubble__ticker { color: var(--wg-blue); background: none; -webkit-text-fill-color: var(--wg-blue); }
.dsh-maid-bubble__status--done .dsh-maid-bubble__ticker { color: var(--wg-green); background: none; -webkit-text-fill-color: var(--wg-green); }
.dsh-maid-bubble__status--failed .dsh-maid-bubble__ticker { color: var(--wg-red); background: none; -webkit-text-fill-color: var(--wg-red); }

.dsh-maid-bubble__actions {
  position: absolute;
  top: 8px; right: 9px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dsh-maid-bubble__btn {
  width: 22px; height: 22px;
  background: var(--wg-paper);
  border: 1.5px solid var(--wg-line-2);
  color: var(--wg-ink-2);
  cursor: pointer;
  border-radius: 8px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 120ms ease-out;
}
.dsh-maid-bubble__btn:hover { color: var(--wg-blue); background: var(--wg-blue-bg); border-color: var(--wg-blue); }
.dsh-maid-bubble__btn--pip-active { color: var(--wg-blue); background: var(--wg-blue-bg); border-color: var(--wg-blue); }

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
  filter: drop-shadow(0 6px 12px rgba(38, 50, 79, 0.28));
  animation: dsh-aether-float 3.2s ease-in-out infinite;
  will-change: transform;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
}
.dsh-maid-sprite:active { animation: dsh-aether-jelly 360ms ease-out 1 !important; }

/* 好感计数：粉色小贴纸 */
.dsh-maid-pat-badge {
  position: absolute;
  top: 8px; right: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  background: var(--wg-paper);
  border: 1.5px solid var(--wg-pink);
  border-radius: 999px;
  color: var(--wg-pink);
  font-size: 11px;
  font-weight: 800;
  box-shadow: var(--wg-shadow-sm);
  pointer-events: none;
}
.dsh-maid-pat-pop {
  position: absolute;
  top: 25%; left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  color: var(--wg-pink);
  font-size: 14px;
  font-weight: 800;
  pointer-events: none;
  text-shadow: 0 0 2px #fff, 0 0 2px #fff, 0 2px 4px rgba(38, 50, 79, 0.25);
  animation: dsh-aether-pop-heart 650ms ease-out forwards;
}

/* ================= 桌面置顶悬浮窗（画中画） ================= */
.dsh-aether-root {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 10px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wg-paper-3);
  font-family: var(--wg-font);
  container-type: size;
  container-name: aetherCard;
}

/* 主卡片：一张大纸片 */
.dsh-aether-card {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  background: var(--wg-paper);
  border: 2px solid var(--wg-ink);
  border-radius: 20px;
  box-shadow: var(--wg-shadow);
  display: flex;
  overflow: hidden;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  color: var(--wg-ink);
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
  font-size: 12px;
  font-weight: 700;
  color: var(--wg-ink);
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
  border-radius: 8px;
  background: var(--wg-paper);
  border: 1.5px solid var(--wg-line-2);
  color: var(--wg-ink-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 140ms ease;
}
.dsh-aether-btn:hover {
  background: var(--wg-blue-bg);
  border-color: var(--wg-blue);
  color: var(--wg-blue);
}

/* 执行时间轴 */
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
  scrollbar-color: var(--wg-line-2) transparent;
}
.dsh-aether-timeline::-webkit-scrollbar {
  width: 4px;
}
.dsh-aether-timeline::-webkit-scrollbar-thumb {
  background: var(--wg-line-2);
  border-radius: 3px;
}

.dsh-aether-step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-line);
  border-radius: 10px;
  font-size: 11px;
  color: var(--wg-ink-2);
  box-sizing: border-box;
  animation: dsh-step-in 180ms ease-out;
}
.dsh-aether-step-item--user {
  background: var(--wg-blue-bg);
  border-color: var(--wg-blue-line);
  color: var(--wg-ink);
  font-weight: 600;
}
.dsh-aether-step-item--running {
  background: var(--wg-amber-bg);
  border-color: var(--wg-amber-line);
  color: #8a5a00;
}
.dsh-aether-step-item--done {
  border-color: var(--wg-green-line);
}
.dsh-aether-step-item--failed {
  background: var(--wg-red-bg);
  border-color: var(--wg-red-line);
  color: #a8322f;
}
.dsh-aether-step-item--queued {
  background: var(--wg-orange-bg);
  border: 1.5px dashed var(--wg-orange-line);
  color: #a8531a;
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
  font-family: var(--wg-mono);
  font-size: 10.5px;
  color: inherit;
}
.dsh-aether-step-tag {
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(38, 50, 79, 0.08);
  color: var(--wg-ink-2);
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
  color: var(--wg-muted);
  font-family: var(--wg-mono);
  font-weight: 600;
}

/* 无任务时的占位贴纸 */
.dsh-aether-empty {
  flex: 1 1 auto;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 12px;
  border: 1.5px dashed var(--wg-line-2);
  border-radius: 14px;
  background: var(--wg-paper-2);
  text-align: center;
  box-sizing: border-box;
}
.dsh-aether-empty__icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wg-paper);
  border: 1.5px solid var(--wg-line-2);
  margin-bottom: 2px;
}
.dsh-aether-empty--done .dsh-aether-empty__icon { border-color: var(--wg-green-line); background: var(--wg-green-bg); }
.dsh-aether-empty--failed .dsh-aether-empty__icon { border-color: var(--wg-red-line); background: var(--wg-red-bg); }
.dsh-aether-empty__title {
  font-size: 12px;
  font-weight: 800;
  color: var(--wg-ink);
}
.dsh-aether-empty__sub {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--wg-muted);
}
@keyframes dsh-step-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================= 遥测看板 ================= */
.dsh-aether-telemetry {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 6px;
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-line-2);
  border-radius: 12px;
  box-sizing: border-box;
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
  overflow: hidden;
  white-space: nowrap;
}
.dsh-aether-stat-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 1px 5px;
  border-radius: 6px;
  background: var(--wg-paper);
  border: 1px solid var(--wg-line);
  font-size: 10px;
  font-weight: 600;
  color: var(--wg-ink-2);
  line-height: 1.3;
  white-space: nowrap;
}
.dsh-aether-stat-pill--scope {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--wg-ink);
  border-color: var(--wg-ink);
  color: #ffffff;
  letter-spacing: 0.5px;
}
.dsh-aether-stat-pill--hit {
  background: var(--wg-green-bg);
  border: 1px solid var(--wg-green-line);
  color: var(--wg-green);
  font-weight: 800;
}
.dsh-aether-stat-pill--tokens {
  color: var(--wg-blue);
  font-family: var(--wg-mono);
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

/* Agent 切换器 */
.dsh-aether-agent-tabs {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-line-2);
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
  padding: 2px 7px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  background: transparent;
  color: var(--wg-muted);
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 140ms ease;
  white-space: nowrap;
  font-family: inherit;
}
.dsh-aether-agent-tab:hover {
  color: var(--wg-ink);
  background: rgba(38, 50, 79, 0.06);
}
.dsh-aether-agent-tab--active {
  background: var(--wg-blue-bg) !important;
  border-color: var(--wg-blue) !important;
  color: var(--wg-blue) !important;
}

/* 状态胶囊轨道 */
.dsh-aether-island {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-line-2);
  border-radius: 999px;
  padding: 2px 9px 2px 4px;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
}
.dsh-aether-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 800;
  line-height: 1.35;
  flex-shrink: 0;
  transition: background 220ms ease, border-color 220ms ease, color 220ms ease;
}
.dsh-aether-pill__dot {
  width: 5px;
  height: 5px;
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
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-align: left;
  color: var(--wg-ink-2);
}
.dsh-aether-ticker-box.dsh-fade-right {
  mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 18px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, #000 0%, #000 calc(100% - 18px), transparent 100%);
}
.dsh-aether-ticker-box.dsh-fade-both {
  mask-image: linear-gradient(to right, transparent 0%, #000 14px, #000 calc(100% - 16px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 14px, #000 calc(100% - 16px), transparent 100%);
}

/* ================= 输入框 ================= */
.dsh-aether-input-deck {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--wg-paper);
  border: 2px solid var(--wg-ink);
  border-radius: 14px;
  padding: 3px 5px;
  box-sizing: border-box;
  flex-shrink: 0;
  box-shadow: var(--wg-shadow-sm);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.dsh-aether-input-deck:focus-within {
  border-color: var(--wg-blue);
  box-shadow: 0 0 0 3px var(--wg-blue-bg), var(--wg-shadow-sm);
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
  border-radius: 6px;
  overflow: hidden;
  border: 1.5px solid var(--wg-blue);
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
  background: var(--wg-ink);
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
  color: var(--wg-ink);
  font-size: 11.5px;
  font-family: inherit;
  font-weight: 600;
  line-height: 1.3;
}
.dsh-aether-input-field::placeholder {
  color: var(--wg-muted);
  font-weight: 500;
}
.dsh-aether-input-btn {
  width: 22px;
  height: 22px;
  border-radius: 8px;
  background: var(--wg-paper);
  border: 1.5px solid var(--wg-line-2);
  color: var(--wg-ink-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: all 120ms ease;
}
.dsh-aether-input-btn:hover {
  background: var(--wg-blue-bg);
  color: var(--wg-blue);
  border-color: var(--wg-blue);
}
.dsh-aether-input-btn--send {
  background: var(--wg-blue);
  border-color: var(--wg-blue);
  color: #ffffff;
}
.dsh-aether-input-btn--send:hover {
  background: #1866c0;
  border-color: #1866c0;
  color: #ffffff;
}
.dsh-aether-input-btn--send svg { stroke: #ffffff; }

/* ================= 底座状态栏 (Model & Effort & Context) ================= */
.dsh-aether-footer-deck {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 3px 5px;
  padding: 3px 5px;
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-line);
  border-radius: 10px;
  box-sizing: border-box;
  flex-shrink: 0;
  min-height: 22px;
}
.dsh-aether-footer-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px 4px;
  min-width: 0;
  flex: 1 1 auto;
}
.dsh-aether-mini-pill__detail { opacity: 0.8; }
.dsh-aether-drawer .dsh-aether-mini-pill__detail { display: none; }
.dsh-aether-footer-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 3px 4px;
  min-width: 0;
  flex: 1 1 auto;
}
.dsh-aether-mini-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1.5px 6px;
  background: var(--wg-paper);
  border: 1px solid var(--wg-line-2);
  border-radius: 6px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--wg-ink-2);
  line-height: 1.25;
  white-space: nowrap;
  font-family: var(--wg-mono);
  cursor: default;
}
.dsh-aether-mini-pill--model {
  background: var(--wg-blue-bg);
  border-color: var(--wg-blue-line);
  color: var(--wg-blue);
}
.dsh-aether-mini-pill--effort {
  background: var(--wg-purple-bg);
  border-color: var(--wg-purple-line);
  color: var(--wg-purple);
}
.dsh-aether-mini-pill--context {
  background: var(--wg-green-bg);
  border-color: var(--wg-green-line);
  color: var(--wg-green);
  cursor: pointer;
}
.dsh-aether-mini-pill--speed {
  background: var(--wg-amber-bg);
  border-color: var(--wg-amber-line);
  color: var(--wg-amber);
}

/* 上下文详情浮动卡片 */
.dsh-aether-context-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) scale(0.95);
  background: var(--wg-paper);
  border: 2px solid var(--wg-ink);
  border-radius: 12px;
  padding: 8px 10px;
  min-width: 190px;
  box-shadow: var(--wg-shadow);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2147483030;
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: left;
  color: var(--wg-ink);
  font-family: var(--wg-font);
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
  font-weight: 800;
  color: var(--wg-ink);
}
.dsh-aether-ctx-bar-track {
  width: 100%;
  height: 5px;
  background: rgba(38, 50, 79, 0.12);
  border-radius: 3px;
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
  color: var(--wg-ink-2);
  margin-top: 2px;
  font-weight: 600;
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
  border-radius: 2px;
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
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-line-2);
  border-radius: 12px;
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
  color: var(--wg-muted);
  letter-spacing: 0.6px;
  margin-bottom: 2px;
  user-select: none;
}
.dsh-aether-session-btn {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--wg-paper);
  border: 1.5px solid var(--wg-line-2);
  color: var(--wg-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 10px;
  font-family: var(--wg-mono);
  font-weight: 800;
  transition: all 140ms ease;
  flex-shrink: 0;
}
.dsh-aether-session-btn:hover {
  background: var(--wg-blue-bg);
  color: var(--wg-blue);
  border-color: var(--wg-blue-line);
}
.dsh-aether-session-btn--active {
  background: var(--wg-blue-bg);
  border: 1.5px solid var(--wg-blue);
  color: var(--wg-blue);
  box-shadow: 0 2px 0 rgba(31, 122, 224, 0.25);
}
.dsh-aether-session-dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid #ffffff;
  box-sizing: content-box;
}

/* 会话悬浮卡片 */
.dsh-aether-session-popover {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) scale(0.95);
  background: var(--wg-paper);
  border: 2px solid var(--wg-ink);
  border-radius: 12px;
  padding: 7px 10px;
  min-width: 150px;
  max-width: 240px;
  box-shadow: var(--wg-shadow);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 140ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2147483020;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
  color: var(--wg-ink);
  font-family: var(--wg-font);
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
  font-weight: 800;
  color: var(--wg-blue);
  font-family: var(--wg-mono);
}
.dsh-aether-popover-status {
  font-size: 8.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--wg-paper-2);
  border: 1px solid var(--wg-line);
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.dsh-aether-popover-title {
  font-size: 11px;
  color: var(--wg-ink);
  font-weight: 600;
  line-height: 1.35;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dsh-aether-popover-footer {
  font-size: 9px;
  color: var(--wg-muted);
  font-family: var(--wg-mono);
  font-weight: 600;
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
/* 画中画里的摸头计数贴纸：固定左下角。用 !important 是为了压过移动端媒体查询里的 top/right 覆盖，
   否则窄窗口下 top/right + bottom/left 四边同时生效，贴纸会被拉成盖住立绘的大白椭圆 */
.dsh-aether-avatar-wrapper .dsh-aether-pat-badge.dsh-maid-pat-badge {
  top: auto !important;
  right: auto !important;
  bottom: 6px !important;
  left: 6px !important;
  padding: 1px 7px !important;
  font-size: 11px !important;
  display: flex;
  align-items: center;
  gap: 3px;
}
/* 立绘外面套的一层小动作壳（转圈 / 被捏 / 散步动画都打在这层） */
.dsh-aether-act {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-aether-sprite {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 6px 12px rgba(38, 50, 79, 0.28));
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
  min-width: 0 !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  gap: 5px !important;
  overflow: hidden !important;
}
/* 竖屏：立绘收成顶部小舞台 (随高度伸缩)，太矮时才隐藏 */
.dsh-aether-card.dsh-mode-tall .dsh-aether-podium {
  display: flex !important;
  width: 100% !important;
  height: clamp(84px, 30cqh, 190px) !important;
  flex: 0 0 auto !important;
  overflow: visible !important;
  justify-content: center !important;
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-line-2);
  border-radius: 14px;
}
.dsh-aether-card.dsh-mode-tall .dsh-aether-avatar-wrapper {
  height: 100% !important;
}
.dsh-aether-card.dsh-mode-tall .dsh-aether-sprite {
  height: 100% !important;
  width: auto !important;
  max-width: 100%;
}
@container aetherCard (max-height: 330px) {
  .dsh-aether-card.dsh-mode-tall .dsh-aether-podium { display: none !important; }
}
/* 窄窗口：收起次要数据，保证不撑破 */
@container aetherCard (max-width: 760px) {
  .dsh-aether-mini-pill__detail { display: none !important; }
}
.dsh-aether-card.dsh-mode-wide-compact .dsh-aether-stat-pill--tokens { display: none !important; }
@container aetherCard (max-width: 420px) {
  .dsh-aether-stat-pill--tokens { display: none !important; }
  .dsh-aether-mini-pill--speed { display: none !important; }
  .dsh-aether-agent-tabs { max-width: 38%; }
}
@container aetherCard (max-width: 330px) {
  .dsh-aether-mini-pill--effort { display: none !important; }
  .dsh-aether-stat-pill--scope { display: none !important; }
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
    filter: drop-shadow(0 3px 7px rgba(38, 50, 79, 0.3)) !important;
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
    bottom: 76px !important;
    right: 0 !important;
    width: auto !important;
    min-width: 210px !important;
    max-width: calc(100vw - 28px) !important;
    padding: 7px 10px 8px 11px !important;
    border-radius: 14px 14px 6px 14px !important;
    font-size: 11px !important;
    gap: 3px !important;
    cursor: pointer !important;
  }
  .dsh-maid-bubble::after { right: 22px !important; bottom: -12px !important; border-top-width: 12px !important; }
  .dsh-maid-bubble::before { right: 25px !important; bottom: -8px !important; border-top-width: 9px !important; }
  .dsh-maid-bubble.dsh-maid-bubble--dock-left {
    right: auto !important;
    left: 0 !important;
    border-radius: 14px 14px 14px 6px !important;
  }
  .dsh-maid-bubble.dsh-maid-bubble--dock-left::after { right: auto !important; left: 22px !important; }
  .dsh-maid-bubble.dsh-maid-bubble--dock-left::before { right: auto !important; left: 25px !important; }
  .dsh-maid-bubble__title-row {
    padding-right: 80px !important;
    gap: 5px !important;
  }
  .dsh-maid-bubble__pill {
    font-size: 9.5px !important;
    padding: 0 6px 0 5px !important;
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
    border-radius: 7px !important;
  }
  .dsh-maid-pat-badge {
    padding: 0 5px !important;
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

/* ================= 页面内控制台抽屉（移动端 / 桌面端点开状态卡） ================= */
.dsh-aether-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(38, 50, 79, 0.32);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
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
  background: var(--wg-paper);
  border: 2px solid var(--wg-ink);
  border-bottom: none;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -8px 30px rgba(10, 16, 32, 0.22);
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
  font-family: var(--wg-font);
  color: var(--wg-ink);
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
    border: 2px solid var(--wg-ink);
    box-shadow: var(--wg-shadow);
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
  background: var(--wg-line-2);
  margin: 2px auto 4px auto;
  flex-shrink: 0;
  cursor: pointer;
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
  gap: 7px;
  flex: 1 1 0;
  min-width: 0;
}

.dsh-aether-mini-avatar {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--wg-paper-2);
  border: 1.5px solid var(--wg-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  overflow: hidden;
}
.dsh-aether-mini-avatar-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.dsh-aether-drawer-title {
  flex: 1 1 0;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--wg-ink);
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
  padding: 2.5px 9px;
  background: var(--wg-paper);
  border: 1.5px solid var(--wg-line-2);
  border-radius: 999px;
  color: var(--wg-ink-2);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 120ms ease;
}
.dsh-aether-session-chip:hover {
  background: var(--wg-blue-bg);
  color: var(--wg-blue);
  border-color: var(--wg-blue-line);
}
.dsh-aether-session-chip--active {
  background: var(--wg-blue-bg) !important;
  border-color: var(--wg-blue) !important;
  color: var(--wg-blue) !important;
  font-weight: 800;
}
.dsh-aether-chip-num {
  font-family: var(--wg-mono);
  font-weight: 800;
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

/* ================= 动效 (入场 / 拍头 / 相位呼吸 / 拖拽倾斜) ================= */
@keyframes dsh-maid-enter {
  from { opacity: 0; transform: translateY(16px) scale(0.92); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dsh-maid-bubble-in {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dsh-maid-summon-in {
  from { opacity: 0; transform: translateY(10px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dsh-maid-bump {
  0% { transform: scale(1, 1) translateY(0); }
  35% { transform: scale(1.14, 0.86) translateY(3px); }
  65% { transform: scale(0.93, 1.09) translateY(-7px); }
  100% { transform: scale(1, 1) translateY(0); }
}
@keyframes dsh-maid-celebrate {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  30% { transform: translateY(3px) scale(1.1, 0.9); }
  55% { transform: translateY(-10px) scale(0.94, 1.08); }
  75% { transform: translateY(0) scale(1.02, 0.99); }
}
@keyframes dsh-maid-status-in {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dsh-card-in {
  from { opacity: 0; transform: scale(0.965) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes dsh-rise-in {
  from { opacity: 0; transform: translateY(9px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 挂件入场：弹簧上浮 */
.dsh-maid-widget { animation: dsh-maid-enter 480ms cubic-bezier(0.2, 0.9, 0.25, 1.04); }
/* 状态卡入场：滞后 70ms 跟随 */
.dsh-maid-bubble {
  animation: dsh-maid-bubble-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1) 70ms backwards;
  transition: border-color 300ms ease, box-shadow 300ms ease;
}

/* 状态卡描边随相位换色，外圈一层淡淡的同色光环 */
.dsh-maid-widget[data-phase="thinking"] .dsh-maid-bubble { --edge: var(--wg-purple); --halo: var(--wg-purple-bg); }
.dsh-maid-widget[data-phase="tool"] .dsh-maid-bubble { --edge: var(--wg-amber); --halo: var(--wg-amber-bg); }
.dsh-maid-widget[data-phase="waiting"] .dsh-maid-bubble,
.dsh-maid-widget[data-phase="review"] .dsh-maid-bubble { --edge: var(--wg-blue); --halo: var(--wg-blue-bg); }
.dsh-maid-widget[data-phase="done"] .dsh-maid-bubble { --edge: var(--wg-green); --halo: var(--wg-green-bg); }
.dsh-maid-widget[data-phase="failed"] .dsh-maid-bubble { --edge: var(--wg-red); --halo: var(--wg-red-bg); }

/* 悬浮窗大卡片描边同样跟随相位 */
.dsh-aether-card[data-phase="thinking"] { border-color: var(--wg-purple); }
.dsh-aether-card[data-phase="tool"] { border-color: var(--wg-amber); }
.dsh-aether-card[data-phase="waiting"],
.dsh-aether-card[data-phase="review"] { border-color: var(--wg-blue); }
.dsh-aether-card[data-phase="done"] { border-color: var(--wg-green); }
.dsh-aether-card[data-phase="failed"] { border-color: var(--wg-red); }
.dsh-aether-card { transition: border-color 300ms ease; }

/* 精灵状态：忙碌时呼吸加快，完成时开心蹦跶（静止姿态与浮动画一致，切换无跳变） */
.dsh-maid-widget[data-phase="tool"] .dsh-maid-sprite,
.dsh-maid-widget[data-phase="thinking"] .dsh-maid-sprite { animation-duration: 1.5s; }
.dsh-maid-widget[data-phase="done"] .dsh-maid-sprite { animation: dsh-maid-celebrate 1.5s ease-in-out infinite; }
.dsh-maid-widget[data-phase] .dsh-maid-sprite--bump {
  animation: dsh-maid-bump 420ms cubic-bezier(0.3, 1.4, 0.4, 1) 1, dsh-aether-float 3.2s ease-in-out 420ms infinite;
}
.dsh-aether-card[data-phase="tool"] .dsh-aether-sprite,
.dsh-aether-card[data-phase="thinking"] .dsh-aether-sprite { animation-duration: 1.5s; }
.dsh-aether-card[data-phase="done"] .dsh-aether-sprite { animation: dsh-maid-celebrate 1.5s ease-in-out infinite; }
.dsh-aether-card[data-phase] .dsh-aether-sprite--bump {
  animation: dsh-maid-bump 420ms cubic-bezier(0.3, 1.4, 0.4, 1) 1, dsh-aether-float 3.2s ease-in-out 420ms infinite;
}

/* 光环随状态加速：忙碌 1.15s，闲置保持 3s 慢呼吸 */
.dsh-aether-card[data-phase="tool"] .dsh-aether-aura,
.dsh-aether-card[data-phase="thinking"] .dsh-aether-aura,
.dsh-aether-card[data-phase="waiting"] .dsh-aether-aura,
.dsh-aether-card[data-phase="review"] .dsh-aether-aura { animation-duration: 1.15s; }
.dsh-maid-widget[data-phase="tool"] .dsh-maid-mobile-aura,
.dsh-maid-widget[data-phase="thinking"] .dsh-maid-mobile-aura,
.dsh-maid-widget[data-phase="waiting"] .dsh-maid-mobile-aura,
.dsh-maid-widget[data-phase="review"] .dsh-maid-mobile-aura { animation-duration: 1.15s; }

/* 拖拽倾斜：sprite 朝拖动方向侧倾，松手弹簧回正 */
.dsh-maid-sprite-box {
  transform: rotate(var(--tilt, 0deg));
  transition: transform 500ms cubic-bezier(0.2, 0.9, 0.25, 1.28);
}
.dsh-maid-widget--dragging .dsh-maid-sprite-box {
  transition: transform 120ms ease-out;
  will-change: transform;
}

/* 状态文案切换：淡入上浮 */
.dsh-maid-status-swap { animation: dsh-maid-status-in 220ms ease-out; }

/* 悬浮窗卡片入场 + 内容 cascade */
.dsh-aether-card { animation: dsh-card-in 380ms cubic-bezier(0.2, 0.9, 0.25, 1); }
.dsh-aether-header { animation: dsh-rise-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1) 40ms backwards; }
.dsh-aether-status-bar { animation: dsh-rise-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1) 90ms backwards; }
.dsh-aether-timeline { animation: dsh-rise-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1) 140ms backwards; }
.dsh-aether-telemetry { animation: dsh-rise-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1) 190ms backwards; }
.dsh-aether-input-deck { animation: dsh-rise-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1) 240ms backwards; }
.dsh-aether-footer-deck { animation: dsh-rise-in 420ms cubic-bezier(0.2, 0.9, 0.25, 1) 290ms backwards; }

/* 召唤按钮：白纸胶囊 + 墨蓝描边 */
.dsh-maid-summon {
  position: fixed;
  right: 24px; bottom: 24px;
  z-index: 2147483000;
  padding: 8px 16px;
  background: var(--wg-paper);
  color: var(--wg-ink);
  border: 2px solid var(--wg-ink);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: var(--wg-shadow-sm);
  font-family: var(--wg-font);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, color 160ms ease, background 160ms ease;
  animation: dsh-maid-summon-in 380ms cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;
}
.dsh-maid-summon:hover {
  transform: translateY(-1px);
  border-color: var(--wg-blue);
  color: var(--wg-blue);
  background: var(--wg-blue-bg);
  box-shadow: var(--wg-shadow);
}
.dsh-maid-summon:active { transform: translateY(0) scale(0.95); }
.dsh-maid-summon:focus-visible { outline: 2px solid var(--wg-blue); outline-offset: 2px; }

/* 全按钮按压反馈 + 键盘焦点环 */
.dsh-maid-bubble__btn:active,
.dsh-aether-btn:active,
.dsh-aether-session-btn:active,
.dsh-aether-session-chip:active,
.dsh-aether-input-btn:active,
.dsh-aether-agent-tab:active { transform: scale(0.9); }
.dsh-maid-bubble__btn:focus-visible,
.dsh-aether-btn:focus-visible,
.dsh-aether-session-btn:focus-visible,
.dsh-aether-session-chip:focus-visible,
.dsh-aether-input-btn:focus-visible,
.dsh-aether-agent-tab:focus-visible { outline: 2px solid var(--wg-blue); outline-offset: 1px; }

/* 尊重系统减弱动效偏好 */
@media (prefers-reduced-motion: reduce) {
  .dsh-maid-sprite,
  .dsh-aether-sprite,
  .dsh-aether-aura,
  .dsh-maid-mobile-aura,
  .dsh-maid-bubble__ticker,
  .dsh-maid-bubble__dot,
  .dsh-aether-pill__dot { animation: none !important; }
  .dsh-maid-widget,
  .dsh-maid-bubble,
  .dsh-aether-card,
  .dsh-maid-summon,
  .dsh-aether-header,
  .dsh-aether-status-bar,
  .dsh-aether-timeline,
  .dsh-aether-telemetry,
  .dsh-aether-input-deck,
  .dsh-aether-footer-deck,
  .dsh-maid-status-swap { animation-duration: 0.01ms !important; animation-delay: 0s !important; }
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
          background: #eef2fa;
        }
        ${CSS}
        ${SPEECH_CSS}
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
          margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #eef2fa;
        }
        ${CSS}
        ${SPEECH_CSS}
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
  const [showPushModal, setShowPushModal] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  })

  // 鲸鱼娘表情包台词气泡状态
  const [speechVisible, setSpeechVisible] = useState(false)
  const [speechFading, setSpeechFading] = useState(false)
  const [currentQuote, setCurrentQuote] = useState<SpeechLine>({ text: '', kind: 'say', mood: '' })
  const [typed, setTyped] = useState(0)
  const typeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeakRef = useRef<number>(0)
  const patBurstRef = useRef<number[]>([])
  const hoverRef = useRef(false)
  const [fx, setFx] = useState<Array<{ id: number; x: number; y: number; type: 'heart' | 'star' | 'ring' | 'blush'; dx: number; dy: number; rot: number; color: string }>>([])
  const fxIdRef = useRef(0)
  const [pressed, setPressed] = useState(false)
  const lastClickRef = useRef(0)
  // 表情：反应（短暂）> 正在说的台词情绪 > 做完/出错后的余韵 > 当前工作状态
  const [reactFace, setReactFace] = useState<Face | null>(null)
  const reactTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [glowFace, setGlowFace] = useState<Face | null>(null)
  const glowTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [blinking, setBlinking] = useState(false)
  const [dozing, setDozing] = useState(false)
  const dozingRef = useRef(false)
  const lookRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<() => void>(() => {})
  // 人格层：耐心值（摸太多会跑）、长期记忆（好感度）、日常小动作
  const patienceRef = useRef<Patience>(newPatience())
  const memRef = useRef<Memory>(loadMemory())
  type AwayState = 'none' | 'fleeing' | 'away' | 'returning'
  const [away, setAway] = useState<AwayState>('none')
  const awayRef = useRef<AwayState>('none')
  const awayDirRef = useRef<'left' | 'right'>('right')
  const awayTimersRef = useRef<NodeJS.Timeout[]>([])
  const [activity, setActivity] = useState<Activity | null>(null)
  const activityRef = useRef<Activity | null>(null)
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recentActsRef = useRef<string[]>([])
  const lastDoneAtRef = useRef(0)
  const react = (f: Face, ms: number): void => {
    if (reactTimerRef.current) clearTimeout(reactTimerRef.current)
    setReactFace(f)
    reactTimerRef.current = setTimeout(() => { setReactFace(null); reactTimerRef.current = null }, ms)
  }
  const glow = (f: Face | null, ms = 0): void => {
    if (glowTimerRef.current) { clearTimeout(glowTimerRef.current); glowTimerRef.current = null }
    setGlowFace(f)
    if (f) glowTimerRef.current = setTimeout(() => { setGlowFace(null); glowTimerRef.current = null }, ms)
  }
  const [quoteKey, setQuoteKey] = useState(0)
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastQuoteIndexRef = useRef<number>(-1)

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current)
      if (typeTimerRef.current) clearTimeout(typeTimerRef.current)
    }
  }, [])

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

  // 画中画一打开，她先感叹一句
  useEffect(() => {
    if (!isPiP) return
    const t = setTimeout(() => say('pipOn', { force: true }), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPiP])

  useEffect(() => {
    const onHiddenChange = (e: any): void => setHidden(!!e.detail?.hidden)
    const onPipChange = (e: any): void => {
      const active = !!e.detail?.active
      setPipActive(active)
      if (!active && !isPiP) setTimeout(() => say('pipOff', { minGapMs: 3000 }), 700)
    }
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
  const drag = useDrag(pos, setPos, isMobile, widgetRef, () => dragStartRef.current())

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
    if (triggerWebOpen && sid !== currentSelectedSessionId && Math.random() < 0.5) setTimeout(() => say('sessionSwitch', { minGapMs: 20000 }), 250)
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

  // 说一句话：打字机逐字出现，读完自动收起；鼠标悬停时不收
  const scheduleHide = (line: SpeechLine): void => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current)
    speechTimerRef.current = setTimeout(() => {
      if (hoverRef.current) { scheduleHide(line); return }
      setSpeechFading(true)
      speechTimerRef.current = setTimeout(() => {
        setSpeechVisible(false)
        setSpeechFading(false)
        speechTimerRef.current = null
      }, 220)
    }, readTimeMs(line.text, line.kind))
  }
  const AWAY_OK = new Set<Trigger>(['runAway', 'sulkPeek', 'coax', 'comeBack', 'needYou', 'patWarn'])
  const say = (trigger: Trigger, opts: { force?: boolean; minGapMs?: number; vars?: Record<string, string | number> } = {}): void => {
    const now = Date.now()
    if (awayRef.current !== 'none' && !AWAY_OK.has(trigger)) return  // 跑开生闷气时不接话
    if (!opts.force && now - lastSpeakRef.current < (opts.minGapMs ?? 0)) return
    lastSpeakRef.current = now
    const line = fillLine(pickLine(trigger), opts.vars)
    setCurrentQuote(line)
    setQuoteKey(k => k + 1)
    setSpeechVisible(true)
    setSpeechFading(false)
    if (speechTimerRef.current) { clearTimeout(speechTimerRef.current); speechTimerRef.current = null }
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current)
    const chars = segments(line.text).flatMap(sg => [...sg.text])
    let i = 0
    setTyped(0)
    const step = (): void => {
      i++
      setTyped(i)
      if (i >= chars.length) { typeTimerRef.current = null; scheduleHide(line); return }
      typeTimerRef.current = setTimeout(step, charDelay(chars[i - 1], line.kind))
    }
    typeTimerRef.current = setTimeout(step, 120)
  }
  // 点击特效：在点的位置冒出爱心 / 星星 / 涟漪，连摸会脸红
  const spawnFx = (x: number, y: number, n: number): void => {
    const colors = ['#ff6b9a', '#ff8fb1', '#ffd166', '#7cc4ff', '#ff6b9a']
    const items: typeof fx = []
    const count = Math.min(4 + n, 9)
    items.push({ id: ++fxIdRef.current, x, y, type: 'ring', dx: 0, dy: 0, rot: 0, color: '' })
    for (let i = 0; i < count; i++) {
      const ang = (-90 + (Math.random() - 0.5) * 150) * Math.PI / 180
      const dist = 38 + Math.random() * 46
      items.push({ id: ++fxIdRef.current, x, y, type: Math.random() < 0.7 ? 'heart' : 'star', dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, rot: (Math.random() - 0.5) * 70, color: colors[i % colors.length] })
    }
    if (n >= 3) items.push({ id: ++fxIdRef.current, x: 0, y: 0, type: 'blush', dx: 0, dy: 0, rot: 0, color: '' })
    setFx(list => list.concat(items).slice(-40))
    const ids = new Set(items.map(it => it.id))
    setTimeout(() => setFx(list => list.filter(it => !ids.has(it.id))), 1500)
  }

  // ───── 小动作：哼歌、伸懒腰、偷吃……（有持续时间，表情和动作一起）─────
  const stopActivity = (): void => {
    if (activityTimerRef.current) { clearTimeout(activityTimerRef.current); activityTimerRef.current = null }
    if (activityRef.current) { activityRef.current = null; setActivity(null) }
  }
  const startActivity = (a: Activity): void => {
    stopActivity()
    activityRef.current = a
    setActivity(a)
    recentActsRef.current = recentActsRef.current.concat(a.id).slice(-4)
    if (Math.random() < 0.75) say(a.trigger, { minGapMs: 20000 })
    activityTimerRef.current = setTimeout(() => {
      stopActivity()
      if (a.id === 'stroll' && Math.random() < 0.6) say('strollBack', { minGapMs: 6000 })
    }, activityMs(a))
  }

  // ───── 滚轮在她身上滚 → 转圈圈（10 秒内转 3 次以上会晕 + 生气）─────
  const [spinClass, setSpinClass] = useState('')
  const spinTimesRef = useRef<number[]>([])
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null)
  const onWheelSprite = (e: React.WheelEvent): void => {
    if (awayRef.current !== 'none' || Math.abs(e.deltaY) < 4) return
    const now = Date.now()
    if (spinTimerRef.current) return   // 正在转，忽略
    spinTimesRef.current = spinTimesRef.current.filter(t => now - t < 10000).concat(now)
    wake(true)
    stopActivity()
    const many = spinTimesRef.current.length >= 3
    setSpinClass(many ? 'wg-act--spin-many' : 'wg-act--spin')
    spinTimerRef.current = setTimeout(() => { spinTimerRef.current = null; setSpinClass('') }, many ? 1650 : 760)
    react(many ? 'dizzy' : 'surprised', many ? 3200 : 1400)
    if (many) { spinTimesRef.current = []; patienceRef.current = { ...patienceRef.current, value: Math.max(0, patienceRef.current.value - 25) } }
    setTimeout(() => say(many ? 'spunMany' : 'spun', { force: true }), many ? 900 : 500)
  }

  // ───── 长按捏住不放：0.65 秒后被捏扁开始抗议，2.6 秒还不放就生气 ─────
  const [squeezing, setSqueezing] = useState(false)
  const squeezeRef = useRef<{ t1: NodeJS.Timeout | null; t2: NodeJS.Timeout | null; on: boolean; x: number; y: number }>({ t1: null, t2: null, on: false, x: 0, y: 0 })
  const suppressClickRef = useRef(false)
  const squeezeStart = (x: number, y: number): void => {
    squeezeEnd(false)
    if (awayRef.current !== 'none') return
    const q = squeezeRef.current
    q.x = x; q.y = y; q.on = false
    q.t1 = setTimeout(() => {
      q.on = true
      setSqueezing(true)
      wake(false); stopActivity()
      react('pout', 4000)
      say('squeezed', { force: true })
      q.t2 = setTimeout(() => { react('angry', 3000); say('squeezeLong', { force: true }); patienceRef.current = { ...patienceRef.current, value: Math.max(0, patienceRef.current.value - 20) } }, 2600)
    }, 650)
  }
  const squeezeMove = (x: number, y: number): void => {
    const q = squeezeRef.current
    if (!q.t1 && !q.on) return
    if (Math.abs(x - q.x) + Math.abs(y - q.y) > 8) squeezeEnd(false)   // 是拖动，不是捏
  }
  const squeezeEnd = (released: boolean): void => {
    const q = squeezeRef.current
    if (q.t1) { clearTimeout(q.t1); q.t1 = null }
    if (q.t2) { clearTimeout(q.t2); q.t2 = null }
    if (q.on) {
      q.on = false
      setSqueezing(false)
      if (released) { suppressClickRef.current = true; setTimeout(() => { suppressClickRef.current = false }, 400); react('shy', 1500) }
    }
  }

  // ───── 摸太多会跑：蓄力 → 冲出屏幕 → 躲在边上偷看 → 自己回来 / 被你哄回来 ─────
  const setAwayState = (st: AwayState): void => { awayRef.current = st; setAway(st) }
  const clearAwayTimers = (): void => { awayTimersRef.current.forEach(clearTimeout); awayTimersRef.current = [] }
  const later = (fn: () => void, ms: number): void => { awayTimersRef.current.push(setTimeout(fn, ms)) }
  const comeBack = (coaxed: boolean): void => {
    if (awayRef.current !== 'away') return
    clearAwayTimers()
    setAwayState('returning')
    patienceRef.current = cameBack(patienceRef.current)
    later(() => {
      setAwayState('none')
      lastActivityRef.current = Date.now()
      react(coaxed ? 'shy' : 'hmph', 2600)
      say('comeBack', { force: true })
    }, 1100)
  }
  const runAway = (): void => {
    stopActivity()
    clearAwayTimers()
    awayDirRef.current = (typeof window !== 'undefined' && pos.right > window.innerWidth / 2) ? 'left' : 'right'
    setAwayState('fleeing')
    memRef.current = { ...memRef.current, runs: memRef.current.runs + 1 }
    saveMemory(memRef.current)
    later(() => { setAwayState('away'); hideQuote() }, 950)
    later(() => say('sulkPeek', { force: true }), 6500 + Math.random() * 5000)
    later(() => comeBack(false), sulkMs(affinity(memRef.current)))
  }
  const onPeekClick = (): void => {
    if (awayRef.current !== 'away') return
    playPress()
    clearAwayTimers()
    say('coax', { force: true })
    later(() => comeBack(true), 1600)
  }

  // 摸头（点脑袋）/ 戳（点身体）：耐心值决定反应——害羞 → 嫌弃 → 生气 → 警告 → 跑开
  const touchPet = (where: 'head' | 'body'): void => {
    const now = Date.now()
    patBurstRef.current = patBurstRef.current.filter(t => now - t < 6000).concat(now)
    lastClickRef.current = now
    stopActivity()
    const r = touch(patienceRef.current, where, affinity(memRef.current), now)
    patienceRef.current = r.next
    if (where === 'head') { memRef.current = { ...memRef.current, pats: memRef.current.pats + 1 }; saveMemory(memRef.current) }
    let trig: Trigger = r.trigger
    let flee = r.flee
    if (flee && isPiP) { flee = false; trig = 'patTooMuch'; patienceRef.current = { ...r.next, value: 35 } }  // 画中画里没地方跑
    const busy = phase === 'thinking' || phase === 'tool' || phase === 'review'
    if (trig === 'pat' && busy && Math.random() < 0.6) trig = 'patBusy'
    react(r.face, r.faceMs)
    say(trig, { force: true })
    if (flee) runAway()
  }

  // ───── 让她「看情况说话」：跟着任务状态、时间和你的动作开口 ─────
  const prevPhaseRef = useRef<Phase>('idle')
  const turnStartRef = useRef<number>(0)
  const thinkStartRef = useRef<number>(0)
  const saidLongThinkRef = useRef(false)
  const lastToolRef = useRef<string | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const greetedRef = useRef(false)
  const toolCountRef = useRef(0)
  const failStreakRef = useRef(0)
  const lastUserInputRef = useRef<string | null>(null)
  const posInitRef = useRef(0)

  // 打瞌睡被叫醒：吓一跳 + 嘴硬「我没睡」
  const wake = (byUser: boolean): boolean => {
    lastActivityRef.current = Date.now()
    if (!dozingRef.current) return false
    dozingRef.current = false
    setDozing(false)
    if (byUser) { react('surprised', 1400); say('wake', { force: true }) }
    return true
  }
  // 被拎起来：吓一跳
  dragStartRef.current = () => {
    wake(false)
    react('surprised', 1600)
    say('dragStart', { minGapMs: 20000 })
  }

  // 你发了新消息 → 她应一声
  useEffect(() => {
    if (!ready || hidden || !userInput) return
    if (lastUserInputRef.current === null) { lastUserInputRef.current = userInput; return }
    if (userInput !== lastUserInputRef.current) {
      lastUserInputRef.current = userInput
      wake(false)
      lastActivityRef.current = Date.now()
      stopActivity()
      const heard = reactToUserText(userInput)
      if (awayRef.current === 'away') {
        // 生闷气时：道歉 / 夸她 / 说喜欢她 → 就被哄回来了
        if (heard === 'userSorry' || heard === 'userPraise' || heard === 'userAffection') { clearAwayTimers(); say('coax', { force: true }); later(() => comeBack(true), 1600) }
      } else if (heard) {
        setTimeout(() => say(heard, { minGapMs: 3000 }), reactionDelay())
      } else if (Math.random() < 0.7) {
        setTimeout(() => say('userSend', { minGapMs: 4000 }), reactionDelay())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInput, ready, hidden])

  // 被拖到新位置 → 说一句（初次加载不算）
  useEffect(() => {
    if (isPiP || !ready) return
    posInitRef.current++
    if (posInitRef.current <= 2) return
    const t = setTimeout(() => say('dragEnd', { minGapMs: 15000 }), 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos.right, pos.bottom])

  useEffect(() => {
    if (!ready || hidden) return
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (phase === prev && phase !== 'tool') return
    const now = Date.now()
    wake(false)
    lastActivityRef.current = now
    if (phase === 'thinking' || phase === 'waiting' || phase === 'tool' || phase === 'review') { glow(null); stopActivity() }
    if (phase !== 'idle' && (prev === 'idle' || prev === 'done' || prev === 'failed')) {
      turnStartRef.current = now
      saidLongThinkRef.current = false
      toolCountRef.current = 0
    }
    if (phase === 'thinking' && prev !== 'thinking') {
      thinkStartRef.current = now
      if (Math.random() < 0.75) say('thinkStart', { minGapMs: 12000 })
    } else if (phase === 'tool') {
      if (tool && tool !== lastToolRef.current) {
        lastToolRef.current = tool
        toolCountRef.current++
        // 只有真的在问你（ask_user_question 等）时才说「你来决定」
        if (isAskTool(tool)) say('needYou', { force: true })
        else if (toolCountRef.current === 8 || toolCountRef.current === 20) say('toolMany', { minGapMs: 8000 })
        else if (Math.random() < 0.65) say(toolTrigger(tool), { minGapMs: 12000 })
      }
    } else if (phase === 'review') {
      // review = 模型在写回复正文，不是在等你；偶尔嘀咕一句「组织语言」
      if (prev !== 'review' && Math.random() < 0.4) say('writing', { minGapMs: 45000 })
    } else if (phase === 'done' && prev !== 'done') {
      glow('happy', 12000)
      lastDoneAtRef.current = now
      lastToolRef.current = null
      failStreakRef.current = 0
      const dur = turnStartRef.current ? now - turnStartRef.current : 0
      const turnTokens = (metrics?.turnBilledInput || 0) + (metrics?.turnCacheRead || 0)
      const ctxPct = metrics?.modelMeta?.context?.usedPercentNum || 0
      if (ctxPct >= 85) say('contextFull', { force: true })
      else if (dur > 90000) say('doneLong', { force: true })
      else if (turnTokens > 400000 && Math.random() < 0.5) say('bigTokens', { force: true })
      else if ((metrics?.turnCacheHitRate || 0) > 0.9 && turnTokens > 50000 && Math.random() < 0.4) say('cacheHigh', { force: true })
      else if (dur > 0 && dur < 12000) say('doneFast', { force: true })
      else say('done', { force: true })
    } else if (phase === 'failed' && prev !== 'failed') {
      glow('sad', 9000)
      lastToolRef.current = null
      failStreakRef.current++
      say(failStreakRef.current >= 3 ? 'failStreak' : 'failed', { force: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tool, ready, hidden])

  // 想太久了会自己解释一句（每轮最多一次）
  useEffect(() => {
    if (phase !== 'thinking' || hidden) return
    const t = setInterval(() => {
      const el = Date.now() - thinkStartRef.current
      if (!saidLongThinkRef.current && el > 30000) {
        saidLongThinkRef.current = true
        say('thinkLong', { minGapMs: 10000 })
      } else if (el > 120000 && el < 126000) {
        say('thinkVeryLong', { minGapMs: 30000 })
      }
    }, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hidden])

  // 调试钩子（控制台 / 截图脚本用）：window.__maidDebug.act('stroll') / .pat(30) / .flee() / .spin(3) / .squeeze()
  useEffect(() => {
    const w = window as any
    const key = isPiP ? '__maidDebugPip' : '__maidDebug'
    w[key] = {
      say: (t: Trigger, vars?: Record<string, string | number>) => say(t, { force: true, vars }),
      act: (id: string) => { const a = ACTIVITIES.find(x => x.id === id); if (a) startActivity(a) },
      pat: (n = 1, where: 'head' | 'body' = 'head') => { for (let i = 0; i < n; i++) touchPet(where) },
      flee: () => runAway(),
      comeBack: () => comeBack(true),
      spin: (n = 1) => { for (let i = 0; i < n; i++) setTimeout(() => onWheelSprite({ deltaY: 100 } as unknown as React.WheelEvent), i * 900) },
      squeeze: (ms = 1200) => { squeezeStart(0, 0); setTimeout(() => squeezeEnd(true), ms) },
      state: () => ({ away: awayRef.current, patience: Math.round(patienceRef.current.value), activity: activityRef.current?.id ?? null, dozing: dozingRef.current, phase: prevPhaseRef.current }),
    }
    return () => { delete w[key] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 整点报时：页面可见、她没睡没跑、也不在忙的时候，一半概率报个时
  const lastChimeRef = useRef(-1)
  useEffect(() => {
    if (!ready || hidden || isPiP) return
    const t = setInterval(() => {
      const d = new Date()
      if (d.getMinutes() !== 0 || lastChimeRef.current === d.getHours()) return
      lastChimeRef.current = d.getHours()
      if (document.hidden || dozingRef.current || awayRef.current !== 'none') return
      if (prevPhaseRef.current !== 'idle' && prevPhaseRef.current !== 'done') return
      if (Math.random() < 0.5) say('hourChime', { minGapMs: 30000, vars: { h: d.getHours() } })
    }, 20000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hidden, isPiP])

  // 打招呼 + 闲着时偶尔嘀咕（饭点/深夜有专门台词）；离开页面回来会说「欢迎回来」
  useEffect(() => {
    if (!ready || hidden || isPiP) return
    if (!greetedRef.current) {
      greetedRef.current = true
      const g = greetFor(memRef.current)
      const hol = holidayFor()
      memRef.current = checkIn(memRef.current)
      saveMemory(memRef.current)
      setTimeout(() => say(g, { force: true, vars: hol ? { d: hol } : undefined }), 1800)
    }
    let awayAt = 0
    const onVis = (): void => {
      if (document.hidden) awayAt = Date.now()
      else if (awayAt && Date.now() - awayAt > 10 * 60000) { awayAt = 0; say('back', { minGapMs: 20000 }) }
    }
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(() => {
      if (document.hidden) return
      memRef.current = checkIn(memRef.current)
      saveMemory(memRef.current)
      if (awayRef.current !== 'none') return
      const idleFor = Date.now() - Math.max(lastActivityRef.current, lastSpeakRef.current)
      if (prevPhaseRef.current !== 'idle' && prevPhaseRef.current !== 'done') return
      if (dozingRef.current) { if (Math.random() < 0.3) say('doze', { minGapMs: 150000 }); return }
      if (idleFor > 50000 && !activityRef.current && Math.random() < 0.4) { startActivity(pickActivity(recentActsRef.current)); return }
      if (idleFor > 2 * 60000 && Math.random() < 0.55) {
        const afterWork = Date.now() - lastDoneAtRef.current < 10 * 60000 && Math.random() < 0.5
        say(timeTrigger() || (afterWork ? 'idleAfterWork' : 'idle'), { minGapMs: 90000 })
      }
    }, 45000)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hidden, isPiP])

  // 预加载表情帧，切换时不闪
  useEffect(() => { preloadFaces() }, [])

  // 眨眼：2~6 秒一次，偶尔连眨两下
  useEffect(() => {
    if (!ready || hidden) return
    let t: NodeJS.Timeout | null = null
    const once = (after: () => void): void => {
      setBlinking(true)
      t = setTimeout(() => { setBlinking(false); after() }, 120)
    }
    const loop = (): void => {
      t = setTimeout(() => {
        if (document.hidden) { loop(); return }
        once(() => {
          if (Math.random() < 0.22) t = setTimeout(() => once(loop), 160)
          else loop()
        })
      }, 2200 + Math.random() * 3800)
    }
    loop()
    return () => { if (t) clearTimeout(t) }
  }, [ready, hidden])

  // 闲太久会打瞌睡（点头、Zzz）；你一动她就惊醒
  useEffect(() => {
    if (!ready || hidden || isPiP) return
    const t = setInterval(() => {
      if (document.hidden || dozingRef.current || awayRef.current !== 'none' || activityRef.current) return
      const p = prevPhaseRef.current
      if (p !== 'idle' && p !== 'done') return
      const quiet = Date.now() - Math.max(lastActivityRef.current, lastSpeakRef.current)
      if (quiet > 150000) {
        dozingRef.current = true
        setDozing(true)
        if (Math.random() < 0.6) say('doze', { force: true })
      }
    }, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hidden, isPiP])

  // 视线跟随：鼠标在哪边，她的脑袋就轻轻歪向哪边（直接改 DOM，不触发重渲染）
  useEffect(() => {
    if (!ready || hidden || isPiP || isMobile) return
    let raf = 0, lx = 0, ly = 0
    const apply = (): void => {
      raf = 0
      const el = lookRef.current
      if (!el) return
      if (dozingRef.current || widgetRef.current?.classList.contains('dsh-maid-widget--dragging')) {
        el.style.removeProperty('rotate'); el.style.removeProperty('translate'); return
      }
      const r = el.getBoundingClientRect()
      const dx = lx - (r.left + r.width * 0.45), dy = ly - (r.top + r.height * 0.4)
      const dist = Math.hypot(dx, dy)
      const k = dist < 30 ? 0 : Math.min(1, 240 / dist + 0.3)
      const deg = Math.max(-5, Math.min(5, dx / 55)) * k
      const ty = Math.max(-3, Math.min(3, dy / 110)) * k
      el.style.rotate = deg.toFixed(2) + 'deg'
      el.style.translate = (deg * 0.7).toFixed(1) + 'px ' + ty.toFixed(1) + 'px'
    }
    const onMove = (e: MouseEvent): void => { lx = e.clientX; ly = e.clientY; if (!raf) raf = requestAnimationFrame(apply) }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hidden, isPiP, isMobile])

  const hideQuote = (): void => {
    if (typeTimerRef.current) { clearTimeout(typeTimerRef.current); typeTimerRef.current = null }
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current)
      speechTimerRef.current = null
    }
    setSpeechFading(true)
    setTimeout(() => {
      setSpeechVisible(false)
      setSpeechFading(false)
    }, 200)
  }

  const onClickSprite = async (e?: React.MouseEvent): Promise<void> => {
    if (!isPiP && drag.wasDrag()) return
    if (awayRef.current !== 'none') return
    if (suppressClickRef.current) return   // 刚才是长按捏她，松手不算摸头
    setPressed(false)
    let where: 'head' | 'body' = 'head'
    if (e && e.currentTarget) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      if (r.height > 0 && e.clientY && (e.clientY - r.top) / r.height > 0.6) where = 'body'
    }
    if (e && e.currentTarget) {
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const host = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect() || box
      const x = (e.clientX || box.left + box.width / 2) - host.left
      const y = (e.clientY || box.top + box.height * 0.35) - host.top
      const now = Date.now()
      spawnFx(x, y, patBurstRef.current.filter(t => now - t < 6000).length + 1)
    }
    setBumpKey(k => k + 1)
    setPatPopKey(k => k + 1)
    setPatCount(c => c + 1)
    playPress()
    if (!wake(true)) touchPet(where)
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
  const promptTitle = userInput ? userInput.trim() : '没有进行中的任务'

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
    finalStatusText = (!currentDisplayLine || currentDisplayLine === '就绪') ? '有活儿随时叫我～' : currentDisplayLine
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
          (currentDisplayPhase === 'idle' || currentDisplayPhase === 'done' || currentDisplayPhase === 'failed')
            ? h('div', { className: `dsh-aether-empty dsh-aether-empty--${currentDisplayPhase}` },
                h('div', { className: 'dsh-aether-empty__icon' },
                  currentDisplayPhase === 'done' ? h(IconDone, { size: 16, color: '#22a06b' })
                    : currentDisplayPhase === 'failed' ? h(IconFailed, { size: 16, color: '#e0524f' })
                    : h(IconTarget, { size: 16, color: '#8a93ab' })),
                h('div', { className: 'dsh-aether-empty__title' },
                  currentDisplayPhase === 'done' ? '上一轮已经做完啦'
                    : currentDisplayPhase === 'failed' ? '上一轮出了点问题'
                    : '手头空着呢～'),
                h('div', { className: 'dsh-aether-empty__sub' },
                  currentDisplayPhase === 'done' ? '有新的活儿随时叫我，我在旁边待命～'
                    : currentDisplayPhase === 'failed' ? '可以换个说法再发一次，我再试试。'
                    : '在下面输入指令，我马上开工！')
              )
            : h('div', { className: 'dsh-aether-step-item dsh-aether-step-item--running' },
                h('span', { className: 'dsh-aether-step-icon' }, h(IconLoading)),
                h('span', { className: 'dsh-aether-step-tag' }, '状态'),
                h('span', { className: 'dsh-aether-step-text' },
                  currentDisplayPhase === 'thinking' ? '正在深层思考…'
                    : currentDisplayPhase === 'tool' ? '正在调用工具…'
                    : currentDisplayPhase === 'review' ? '正在复查结果…'
                    : '等待模型响应…')
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
              step.status === 'failed' ? h('span', { style: { display: 'flex', alignItems: 'center' } }, h(IconFailed, { size: 12, color: '#e0524f' })) :
              step.status === 'done' ? h('span', { style: { display: 'flex', alignItems: 'center' } }, h(IconDone, { size: 12, color: '#22a06b' })) : null
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
            h('span', { className: 'dsh-aether-step-icon' }, h(IconHourglass, { size: 12, color: '#ec7c2a' })),
            h('span', { className: 'dsh-aether-step-tag', style: { color: '#ec7c2a', background: 'rgba(236, 124, 42, 0.14)' } }, '排队中'),
            h('span', { className: 'dsh-aether-step-text', style: { color: '#a8531a' } }, q.content),
            h('div', { className: 'dsh-aether-step-right' },
              h('span', { className: 'dsh-spin', style: { display: 'flex', alignItems: 'center' } }, h(IconLoading, { size: 10, color: '#ec7c2a' }))
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
            h(IconCache, { size: 11, color: '#22a06b' }),
            m.turnCacheHitPercent
          ),
          h('div', { className: 'dsh-aether-stat-pill', title: `本轮已执行: ${m.turnSteps || 0} 步` },
            h(IconActivity, { size: 10, color: '#1f7ae0' }),
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
            h(IconCache, { size: 11, color: '#22a06b' }),
            m.sessionCacheHitPercent
          ),
          h('div', { className: 'dsh-aether-stat-pill', title: `会话全局统计: ${m.turns} 轮 · ${m.steps} 步` },
            h(IconActivity, { size: 10, color: '#1f7ae0' }),
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

          let dotColor = '#8a93ab'
          let statusText = '就绪'
          if (isRunning) { dotColor = '#d98b0c'; statusText = '运行中' }
          else if (isFailed) { dotColor = '#e0524f'; statusText = '异常' }
          else if (isDone) { dotColor = '#22a06b'; statusText = '已完成' }

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
              s.userInput && s.userInput !== sessionTitle ? h('div', { style: { fontSize: '9.5px', color: '#8a93ab', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `最新: ${s.userInput}`) : null,
              s.queuedMessages && s.queuedMessages.length > 0 ? h('div', { style: { fontSize: '9px', color: '#ec7c2a', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' } },
                h(IconHourglass, { size: 9, color: '#ec7c2a' }),
                `${s.queuedMessages.length} 条排队中: ${s.queuedMessages[0].content.slice(0, 16)}...`
              ) : null,
              h('div', { className: 'dsh-aether-popover-footer' },
                h('span', null, `${s.stepsCount || (s.steps ? s.steps.length : 0)} 个步骤`),
                isActive ? h('span', { style: { color: '#1f7ae0', fontWeight: 600 } }, '● 活跃') : null
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
            h(IconModelChip, { size: 11, color: '#1f7ae0' }),
            metaModel.modelName
          ),
          // Reasoning Effort
          h('span', { className: 'dsh-aether-mini-pill dsh-aether-mini-pill--effort', title: `推理思维链档位: ${metaModel.effort}` },
            h(IconBrain, { size: 11, color: '#7c5ce6' }),
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
            h(IconContext, { size: 11, color: '#22a06b' }),
            `已用 ${ctx.usedPercent}`,
            h('span', { className: 'dsh-aether-mini-pill__detail' }, ` (${usedFmt}/${limitFmt})`),
            h('div', { className: 'dsh-aether-context-popover' },
              h('div', { className: 'dsh-aether-ctx-header' },
                h('span', null, `上下文已用 ${ctx.usedPercent}`),
                h('span', { style: { color: '#8a93ab', fontFamily: 'ui-monospace, monospace' } }, `~${usedFmt} / ${limitFmt}`)
              ),
              h('div', { className: 'dsh-aether-ctx-bar-track' },
                h('div', { className: 'dsh-aether-ctx-bar-seg', style: { width: `${sysPct}%`, background: '#b3bccf' } }),
                h('div', { className: 'dsh-aether-ctx-bar-seg', style: { width: `${toolsPct}%`, background: '#7c5ce6' } }),
                h('div', { className: 'dsh-aether-ctx-bar-seg', style: { width: `${msgPct}%`, background: '#1f7ae0' } })
              ),
              h('div', { className: 'dsh-aether-ctx-breakdown' },
                h('div', { className: 'dsh-aether-ctx-row' },
                  h('span', null, h('span', { className: 'dsh-aether-ctx-dot', style: { background: '#b3bccf' } }), '系统提示词'),
                  h('span', { style: { fontFamily: 'ui-monospace, monospace' } }, `~${sysFmt}`)
                ),
                h('div', { className: 'dsh-aether-ctx-row' },
                  h('span', null, h('span', { className: 'dsh-aether-ctx-dot', style: { background: '#7c5ce6' } }), '工具'),
                  h('span', { style: { fontFamily: 'ui-monospace, monospace' } }, `~${toolsFmt}`)
                ),
                h('div', { className: 'dsh-aether-ctx-row' },
                  h('span', null, h('span', { className: 'dsh-aether-ctx-dot', style: { background: '#1f7ae0' } }), '对话消息'),
                  h('span', { style: { fontFamily: 'ui-monospace, monospace' } }, `~${msgFmt}`)
                )
              )
            )
          )
        ),
        h('div', { className: 'dsh-aether-footer-right' },
          h('span', { className: 'dsh-aether-mini-pill dsh-aether-mini-pill--speed', title: `生成速率: ${speedToks} · 首字延迟: ${ttftStr}` },
            h(IconLightning, { size: 10, color: '#d98b0c' }),
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

          let dotColor = '#8a93ab'
          if (isRunning) dotColor = '#d98b0c'
          else if (isFailed) dotColor = '#e0524f'
          else if (isDone) dotColor = '#22a06b'

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

    // 渲染【Web Push 离线推送设置弹窗】
    const renderPushModal = () => {
      if (!showPushModal) return null
      return h('div', {
        key: 'maid-push-modal-backdrop',
        style: {
          position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
          background: 'rgba(38, 50, 79, 0.45)', backdropFilter: 'blur(8px)',
          zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', boxSizing: 'border-box',
          pointerEvents: 'auto',
        },
        onClick: (e: React.MouseEvent) => {
          if (e.target === e.currentTarget) setShowPushModal(false)
        },
      },
        h('div', {
          style: {
            background: '#0f172a',
            border: '2px solid #26324f',
            borderRadius: '18px',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }
        },
          h('button', {
            style: {
              position: 'absolute', right: '16px', top: '16px',
              background: 'rgba(255, 255, 255, 0.08)', border: 'none',
              color: '#fff', width: '28px', height: '28px', borderRadius: '50%',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', zIndex: 10,
            },
            onClick: () => setShowPushModal(false),
            title: '关闭',
          }, h(IconClose, { size: 14 })),
          h(WebPushSettingsSection)
        )
      )
    }

    // ───── 当前表情 ─────
    const speakingNow = speechVisible && !speechFading && !!currentQuote.text
    const moodFace: Face | undefined = !speakingNow ? undefined : faceOfLine(currentQuote)
    const phaseFace: Face = dozing ? 'sleepy'
      : (phase === 'thinking' || phase === 'waiting') ? 'think'
      : (phase === 'tool' || phase === 'review') ? 'focus' : 'neutral'
    const actFace: Face | undefined = activity?.face
    const eventFace = reactFace ?? moodFace ?? glowFace ?? actFace
    const baseFace: Face = eventFace ?? phaseFace
    const talking = speakingNow && typed < plainLength(currentQuote.text)
    // 嘴型：平常脸说话时一张一合（内心戏/小声嘀咕不动嘴）
    const mouthFace = lipSync(baseFace, talking && (currentQuote.kind === 'say' || currentQuote.kind === 'shout'), typed)
    const shownFace: Face = blinking && BLINKABLE.has(mouthFace) ? 'blink' : mouthFace
    const manpu: Manpu | null = away !== 'none' ? null
      : dozing && !reactFace ? 'zzz'
      : eventFace ? ((!reactFace && !moodFace && !glowFace && activity?.manpu) || (FACE_MANPU[eventFace] ?? null)) : null
    const actClass = away === 'fleeing' ? ` wg-act--flee-${awayDirRef.current}`
      : away === 'away' ? ' wg-act--gone'
      : away === 'returning' ? ` wg-act--return-${awayDirRef.current}`
      : spinClass ? ` ${spinClass}`
      : squeezing ? ' wg-act--squeeze'
      : reactFace === 'angry' ? ' wg-act--angry'
      : reactFace === 'dizzy' ? ' wg-act--dizzy'
      : activity ? ` wg-act--${activity.id === 'snack' ? 'snack' : activity.id}` : ''
    const renderManpu = () => {
      if (!manpu) return null
      return h('div', { key: 'manpu-' + manpu + '-' + quoteKey, className: `dsh-manpu dsh-manpu--${manpu}`, 'aria-hidden': true },
        h('svg', { viewBox: '0 0 26 26', dangerouslySetInnerHTML: { __html: manpuMarkup(manpu) } }))
    }

    // 渲染二次元漫画经典表情包对话气泡 (Speech Bubble - 100% 纯 SVG，禁止 Emoji)
    const renderFx = () => fx.length ? h('div', { className: 'dsh-fx-layer', key: 'fx' },
      ...fx.map(it => it.type === 'ring'
        ? h('div', { key: it.id, className: 'dsh-fx dsh-fx--ring', style: { left: it.x + 'px', top: it.y + 'px' } })
        : it.type === 'blush'
          ? h('div', { key: it.id, className: 'dsh-fx dsh-fx--blush', style: { transform: 'translate(-50%, -50%)' } })
          : h('div', { key: it.id, className: 'dsh-fx', style: { left: it.x + 'px', top: it.y + 'px', ['--dx' as any]: it.dx + 'px', ['--dy' as any]: it.dy + 'px', ['--rot' as any]: it.rot + 'deg' } },
            h('svg', { viewBox: '0 0 24 24', 'aria-hidden': true },
              it.type === 'heart'
                ? h('path', { d: 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2.1 0 3.6 1.2 4.6 2.7C12 6.2 13.5 5 15.6 5 19 5 21.1 8.4 19.6 11.8 17.5 16.4 12 21 12 21z', fill: it.color, stroke: '#fff', strokeWidth: 1.5 })
                : h('path', { d: 'M12 2.5l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.2-4.4 6.8-.5z', fill: it.color, stroke: '#fff', strokeWidth: 1.5 })))
      )) : null

    const renderSpeechBubble = (inPiP: boolean, atPeek = false) => {
      if (!speechVisible || !currentQuote.text) return null
      // 她躲到屏幕边上时，台词不留在原地：跟着她画到探头的位置旁边
      if (!inPiP && !atPeek && away === 'away') return null
      const isDockLeft = typeof window !== 'undefined' && pos.right > (window.innerWidth / 2)
      const peekSide = awayDirRef.current
      const dockClass = inPiP ? 'dsh-say--pip'
        : atPeek ? (peekSide === 'right' ? 'dsh-say--dock-right dsh-say--peek' : 'dsh-say--dock-left dsh-say--peek')
        : (isDockLeft ? 'dsh-say--dock-left' : 'dsh-say--dock-right')
      const peekStyle: React.CSSProperties | undefined = atPeek ? {
        position: 'fixed', bottom: (pos.bottom + 70 + 84) + 'px', zIndex: 2147483001,
        ...(peekSide === 'right' ? { right: '104px', left: 'auto' } : { left: '104px', right: 'auto' }),
      } : undefined
      const k = currentQuote.kind
      let left = typed
      const parts: React.ReactNode[] = []
      segments(currentQuote.text).forEach((sg, idx) => {
        if (left <= 0) return
        const cs = [...sg.text]
        const shown = cs.slice(0, left).join('')
        left -= cs.length
        parts.push(sg.aside ? h('span', { key: idx, className: 'dsh-say__aside' }, shown)
          : sg.em ? h('span', { key: idx, className: 'dsh-say__em' }, shown)
          : h(React.Fragment, { key: idx }, shown))
      })
      const typing = typed < plainLength(currentQuote.text)
      return h('div', {
        key: 'speech-' + quoteKey,
        className: `dsh-say dsh-say--${k} ${dockClass}${speechFading ? ' dsh-say--out' : ''}`,
        'data-mood': currentQuote.mood,
        style: peekStyle,
        onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (typed < plainLength(currentQuote.text)) { if (typeTimerRef.current) clearTimeout(typeTimerRef.current); typeTimerRef.current = null; setTyped(plainLength(currentQuote.text)); scheduleHide(currentQuote) } else hideQuote() },
        onMouseEnter: () => { hoverRef.current = true },
        onMouseLeave: () => { hoverRef.current = false },
        title: '点一下：打完 / 收起',
      },
        k === 'shout' ? h('svg', { key: 'burst', className: 'dsh-say__burst', viewBox: '0 0 22 20', 'aria-hidden': true },
          h('path', { d: 'M3 3 L8 8 M11 1 L11.5 7 M1 11 L7 11.5' })) : null,
        ...parts,
        typing ? h('span', { className: 'dsh-say__caret', key: 'caret' }) : null,
        h('svg', { key: 'tail', className: 'dsh-say__tail', viewBox: '0 0 22 20', 'aria-hidden': true },
          h('path', { d: 'M1 2 C8 4 14 8 21 18 C14 15 8 14 1 13' }),
          h('path', { className: 'cover', d: 'M-1 3.5 L4 3.5 L4 11.5 L-1 11.5 Z' }))
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
                  src: FACES[shownFace],
                  className: 'dsh-aether-mini-avatar-img',
                  alt: 'maid',
                })
              ),
              h('div', { className: 'dsh-aether-drawer-title', title: promptTitle }, promptTitle)
            ),
            h('div', { className: 'dsh-aether-ctrls' },
              h('button', {
                className: 'dsh-aether-btn',
                onClick: () => setShowPushModal(true),
                title: '设置离线消息推送 (Web Push)',
              }, h(IconBell, { size: 14 })),
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
                key: 'istat-' + currentDisplayPhase,
                className: `dsh-aether-ticker-box dsh-maid-bubble__status--${currentDisplayPhase}${aetherFadeClass} dsh-maid-status-swap`,
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
      const isTallMode = layoutMode === 'tall'

      // 角色立绘展台 (Podium)：宽屏时独占中列；竖屏时收进右列顶部的小舞台
      const podiumNode = h('div', {
        key: 'podium',
        className: 'dsh-aether-podium',
        onClick: (e: React.MouseEvent) => { void onClickSprite(e) },
        onPointerDown: (e: React.PointerEvent) => { setPressed(true); if (e.button === 0) squeezeStart(e.clientX, e.clientY) },
        onPointerMove: (e: React.PointerEvent) => squeezeMove(e.clientX, e.clientY),
        onPointerUp: () => { setPressed(false); squeezeEnd(true) },
        onPointerLeave: () => { setPressed(false); squeezeEnd(false) },
        onPointerCancel: () => { setPressed(false); squeezeEnd(false) },
        onWheel: onWheelSprite,
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
          patCount > 0 ? h('div', { className: 'dsh-maid-pat-badge dsh-aether-pat-badge' }, h(IconHeart, { size: 10 }), String(patCount)) : null,
          h('div', { className: 'wg-act dsh-aether-act' + (away !== 'none' ? '' : actClass), key: 'pip-act' },
            h('img', {
              key: 'pip-sprite-' + bumpKey,
              className: `dsh-aether-sprite${bumpKey > 0 ? ' dsh-aether-sprite--bump' : ''}${pressed ? ' dsh-maid-sprite--pressed' : ''}`,
              src: FACES[shownFace],
              alt: 'maid pet',
              draggable: false,
            })
          ),
          renderFx(),
          renderSpeechBubble(true)
        ),
        isLargeMode ? renderTelemetry() : null
      )

      return h(React.Fragment, null,
        h('div', { className: cardClass, ref: cardRef, 'data-phase': currentDisplayPhase },
          // 1. 全局最左侧：会话导航栏 (无论宽屏、窄屏、竖屏模式均常驻可用)
        renderSessionRail(),

        // 2. 宽屏：角色立绘展台占据中列
        isTallMode ? null : podiumNode,

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
                onClick: () => setShowPushModal(true),
                title: '设置离线消息推送 (Web Push)',
              }, h(IconBell, { size: 14 })),
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

          // 竖屏：立绘小舞台放在顶栏下方，不再消失
          isTallMode ? podiumNode : null,

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
      ),
      renderPushModal()
    )
  }

    // ═══════════════════════════════════════════════════════════
    // 2. 普通网页右下角模式 (isPiP = false) + 全功能移动端抽屉
    // ═══════════════════════════════════════════════════════════
    const statusClass = `dsh-maid-bubble__status dsh-maid-bubble__status--${phase}${bubbleFadeClass}`
    const widgetStyle = { right: pos.right + 'px', bottom: pos.bottom + 'px' } as React.CSSProperties
    const pipBtnClass = `dsh-maid-bubble__btn${pipActive ? ' dsh-maid-bubble__btn--pip-active' : ''}`
    const isDockLeft = typeof window !== 'undefined' && pos.right > (window.innerWidth / 2)
    // 她一开口（任何台词气泡），上方的工作状态框就先让位；气泡开始收起时状态框再回来
    const speaking = speechVisible && !speechFading && !!currentQuote.text
    const bubbleClass = `dsh-maid-bubble${isDockLeft ? ' dsh-maid-bubble--dock-left' : ''}${speaking ? ' dsh-maid-bubble--eclipsed' : ''}`

    return h(React.Fragment, null,
      h('div', { className: `dsh-maid-widget${away !== 'none' ? ' wg-away' : ''}`, ref: widgetRef, style: widgetStyle, 'data-phase': phase },
        h('div', {
          className: bubbleClass,
          key: 'bubble',
          onClick: () => { setDrawerOpen(true) },
          title: isMobile ? '点击展开移动端控制台' : '点击展开控制台',
        },
          h('div', { className: 'dsh-maid-bubble__title-row' },
            h('span', { className: `dsh-maid-bubble__pill dsh-maid-bubble__pill--${phase}`, key: 'pill' },
              h('span', { className: 'dsh-maid-bubble__dot' }),
              (PHASE_DICT[phase] || PHASE_DICT.idle).text
            ),
            h('span', { className: 'dsh-maid-bubble__title-text', title: promptTitle }, promptTitle)
          ),
          h('div', {
            key: 'mstat-' + phase,
            className: statusClass + ' dsh-maid-status-swap',
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
              className: 'dsh-maid-bubble__btn',
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation()
                setShowPushModal(true)
              },
              title: '离线消息推送设置 (Web Push)',
            }, h(IconBell, { size: 12 })),
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
            }, h(IconClose, { size: 11 })),
          ),
        ),
        h('div', {
          className: 'dsh-maid-sprite-box',
          key: 'sprite-box',
        },
          isMobile ? h('div', {
            className: 'dsh-maid-mobile-aura',
            style: { background: meta.aura },
          }) : null,
          patCount > 0 ? h('div', {
            className: 'dsh-maid-pat-badge wg-hide-when-away',
            key: 'badge-' + patCount,
            style: { display: 'flex', alignItems: 'center', gap: '3px' }
          }, h(IconHeart, { size: 10 }), String(patCount)) : null,
          patPopKey > 0 ? h('div', {
            className: 'dsh-maid-pat-pop',
            key: 'pop-' + patPopKey,
            style: { display: 'flex', alignItems: 'center', gap: '3px' }
          }, h(IconHeart, { size: 12 }), '+1') : null,
          h('div', { className: 'wg-act' + actClass, key: 'act' },
          h('div', { className: `dsh-maid-look${dozing ? ' dsh-maid-look--dozing' : ''}`, ref: lookRef, key: 'look' },
          h('div', { className: `dsh-maid-talk${talking ? ' dsh-maid-talk--on' : ''}` },
          h('img', {
            key: 'sprite-' + bumpKey,
            className: `dsh-maid-sprite${bumpKey > 0 ? ' dsh-maid-sprite--bump' : ''}${pressed ? ' dsh-maid-sprite--pressed' : ''}`,
            src: FACES[shownFace],
            alt: 'maid pet',
            draggable: false,
            onPointerDown: (e: React.PointerEvent) => { setPressed(true); drag.onDown(e as any); if (e.button === 0) squeezeStart(e.clientX, e.clientY) },
            onPointerMove: (e: React.PointerEvent) => squeezeMove(e.clientX, e.clientY),
            onPointerUp: () => { setPressed(false); squeezeEnd(true) },
            onPointerLeave: () => { setPressed(false); squeezeEnd(false) },
            onPointerCancel: () => { setPressed(false); squeezeEnd(false) },
            onWheel: onWheelSprite,
            onMouseEnter: () => { if (!wake(true) && Math.random() < 0.35) say('hover', { minGapMs: 45000 }) },
            onClick: (e: React.MouseEvent) => { void onClickSprite(e) },
            onContextMenu,
          })))),
          renderManpu(),
          renderFx(),
          renderSpeechBubble(false)
        )
      ),
      away === 'away' ? h('div', {
        key: 'peek',
        className: `wg-peek wg-peek--${awayDirRef.current}`,
        style: { bottom: (pos.bottom + 70) + 'px' },
        onClick: onPeekClick,
        title: '她躲起来了……点一下哄哄她',
      }, h('div', { className: 'wg-peek__in' },
        h('img', { src: FACES.hmph, alt: '', draggable: false }),
        h('span', { className: 'wg-peek__tag' }, '哼'))) : null,
      away === 'away' ? renderSpeechBubble(false, true) : null,
      ...renderDrawer(),
      renderPushModal()
    )
}

// ───────── 样式注入 ─────────
function installStyles(ctx: any): void {
  if (typeof document === 'undefined') return
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = PLUGIN_ID
    tag.dataset.pluginCss = `${PLUGIN_ID}/maid.css`
    tag.textContent = CSS + SPEECH_CSS + PERSONA_CSS
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

  try {
    ctx.effect(() => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id: 'floating-maid-webpush',
        order: 48,
        label: '离线推送 (Web Push)',
      }, WebPushSettingsSection)
    ), 'maid: settings.section webpush')
  } catch { /* ignore */ }

  try {
    ctx.effect(() => ctx.slots.inject('settings.section', () =>
      ctx.slots.register({
        name: 'settings.section',
        id: 'floating-maid-lan',
        order: 49,
        label: '局域网访问',
      }, LanAccessSettingsSection)
    ), 'maid: settings.section lan')
  } catch { /* ignore */ }
}
