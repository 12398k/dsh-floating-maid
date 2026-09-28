// 鲸鱼娘「人格层」：网页插件与桌面版共用的纯逻辑（不依赖 React / DOM）
//  - 情绪 → 表情帧、哪些表情会眨眼、头顶漫符
//  - 耐心值：连摸会从害羞 → 嫌弃 → 生气 → 警告 → 跑开躲起来；过一会儿自己回来（或被你哄回来）
//  - 好感度：长期记忆（摸头次数、认识天数、上次见面时间），影响打招呼和被摸时的反应
//  - 你发的话 → 她听懂一点点（谢谢 / 夸奖 / 骂她 / 催她 / 晚安 / 吃饭……）
//  - 日常小动作：哼歌、伸懒腰、偷吃、发呆、得意……有持续时间，不是闪一下
import type { Face } from './faces.js'
import type { SpeechLine, Trigger } from './speech.js'

// ───────── 表情 ─────────
const FACE_NAMES: Face[] = ['neutral', 'blink', 'happy', 'shy', 'sad', 'surprised', 'pout', 'think', 'focus', 'sleepy',
  'talk', 'angry', 'cry', 'smug', 'wink', 'eat', 'dizzy', 'love', 'yawn', 'hmph']

/** 台词情绪 → 表情。新台词直接用表情名当情绪，旧名字在这里做别名 */
export const MOOD_FACE: Record<string, Face> = {
  ...Object.fromEntries(FACE_NAMES.map((f) => [f, f])) as Record<Face, Face>,
  plain: 'neutral', proud: 'focus', guilty: 'shy', curious: 'think', ask: 'think', worried: 'think',
  nervous: 'sad', hungry: 'sad', tired: 'sleepy', bored: 'pout', excited: 'love', relieved: 'happy',
}

/** 睁着眼、眨一下不突兀的表情才眨眼 */
export const BLINKABLE = new Set<Face>(['neutral', 'shy', 'sad', 'surprised', 'pout', 'think', 'focus'])

export type Manpu = 'think' | 'zzz' | 'sweat' | 'bang' | 'vein' | 'sparkle' | 'heart' | 'note' | 'steam'

/** 表情自带的头顶符号（表情本身已经画了的就不再叠：哭脸有眼泪、晕眼有蚊香圈） */
export const FACE_MANPU: Partial<Record<Face, Manpu>> = {
  think: 'think', sleepy: 'zzz', sad: 'sweat', surprised: 'bang', pout: 'vein', happy: 'sparkle',
  angry: 'vein', smug: 'sparkle', love: 'heart', hmph: 'steam', dizzy: 'sweat',
}

/** 一句台词该配什么脸 */
export function faceOfLine(line: SpeechLine): Face | undefined {
  if (/哈欠|揉眼|眼皮/.test(line.text)) return 'yawn'
  return MOOD_FACE[line.mood] ?? (line.kind === 'think' ? 'think' : undefined)
}

/** 说话口型：只有「平常脸」时嘴巴一张一合（其它表情嘴型是画死的，硬切会怪） */
export function lipSync(base: Face, talking: boolean, typed: number): Face {
  if (!talking || base !== 'neutral') return base
  return Math.floor(typed / 2) % 2 === 0 ? 'talk' : 'neutral'
}

/** 漫符 SVG（viewBox 0 0 26 26 的内部标记）。两端都用 dangerouslySetInnerHTML 渲染，避免重复实现 */
export function manpuMarkup(m: Manpu): string {
  switch (m) {
    case 'think': return '<text x="5" y="21" class="q">?</text><circle cx="21" cy="21" r="2"/>'
    case 'zzz': return '<text x="1" y="24" class="z z1">z</text><text x="9" y="15" class="z z2">z</text><text x="16" y="8" class="z z3">Z</text>'
    case 'sweat': return '<path class="drop" d="M13 3 C 9 10, 6 13, 6 17 a 7 7 0 0 0 14 0 C 20 13, 17 10, 13 3 Z"/><path class="shine" d="M10 16 q 0 3 3 4"/>'
    case 'bang': return '<path class="line" d="M5 5 L8.5 15"/><path class="line" d="M13 2 L13 14"/><path class="line" d="M21 5 L17.5 15"/>'
    case 'vein': return '<path class="vein" d="M4 10 Q 10 10 10 4 M16 4 Q 16 10 22 10 M22 16 Q 16 16 16 22 M10 22 Q 10 16 4 16"/>'
    case 'sparkle': return '<path class="spark" d="M8 2 L9.6 7.4 L15 9 L9.6 10.6 L8 16 L6.4 10.6 L1 9 L6.4 7.4 Z"/><path class="spark s2" d="M19 12 L20 15 L23 16 L20 17 L19 20 L18 17 L15 16 L18 15 Z"/>'
    case 'heart': return '<path class="heart" d="M13 22 C 4 15, 3 10, 6 7 C 9 4, 12 6, 13 8 C 14 6, 17 4, 20 7 C 23 10, 22 15, 13 22 Z"/><path class="heart h2" d="M21 9 C 18 7, 18 5, 19 4 C 20 3, 21 4, 21 5 C 21 4, 22 3, 23 4 C 24 5, 24 7, 21 9 Z"/>'
    case 'note': return '<path class="note" d="M8 20 a3 2.4 0 1 1 -0.1 0 Z M10.8 19.5 V6 L20 3.5 V16.5"/><path class="note n2" d="M20 17 a3 2.4 0 1 1 -0.1 0 Z"/>'
    case 'steam': return '<path class="puff" d="M4 18 q -3 -3 0 -6 q 2 -3 5 -1 q 3 -2 5 1 q 3 3 0 6 Z"/><path class="puff p2" d="M15 13 q -2 -2 0 -4 q 1.5 -2 3.5 -0.7 q 2 -1.3 3.5 0.7 q 2 2 0 4 Z"/>'
  }
}

// ───────── 长期记忆（好感度）─────────
export interface Memory {
  firstMet: number
  lastSeen: number
  lastLateNight: number
  daysMet: number
  lastDay: string
  pats: number
  runs: number
}
const MEM_KEY = 'whale-girl-memory-v1'
const dayKey = (t: number): string => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }

export function loadMemory(now = Date.now()): Memory {
  let m: Partial<Memory> = {}
  try { m = JSON.parse(localStorage.getItem(MEM_KEY) || '{}') } catch { /* 无痕模式等 */ }
  return {
    firstMet: m.firstMet || now, lastSeen: m.lastSeen || 0, lastLateNight: m.lastLateNight || 0,
    daysMet: m.daysMet || 0, lastDay: m.lastDay || '', pats: m.pats || 0, runs: m.runs || 0,
  }
}
export function saveMemory(m: Memory): void {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(m)) } catch { /* 忽略 */ }
}
/** 0~100：认识越久、摸得越多越亲近（有上限，不会一天刷满） */
export function affinity(m: Memory): number {
  return Math.min(100, Math.round(m.daysMet * 6 + Math.sqrt(m.pats) * 4))
}

/** 公历节日（月-日 → 名字）；农历的算不准就不硬猜 */
const HOLIDAYS: Record<string, string> = {
  '1-1': '元旦', '2-14': '情人节', '3-8': '女神节', '4-1': '愚人节', '5-1': '劳动节', '5-4': '青年节', '6-1': '儿童节',
  '10-1': '国庆', '10-2': '国庆', '10-3': '国庆', '10-31': '万圣节', '11-11': '双十一', '12-24': '平安夜', '12-25': '圣诞', '12-31': '跨年夜',
}
export function holidayFor(now = new Date()): string | null {
  return HOLIDAYS[`${now.getMonth() + 1}-${now.getDate()}`] ?? null
}

/** 开场白：结合「上次什么时候见」与现在几点 */
export function greetFor(m: Memory, now = new Date()): Trigger {
  const t = now.getTime()
  const h = now.getHours()
  const gap = m.lastSeen ? t - m.lastSeen : -1
  if (gap < 0) return 'greetFirst'
  if (gap > 3 * 86400000) return 'greetLongTime'
  // 节日：当天第一次见面时说一次
  if (holidayFor(now) && m.lastDay !== dayKey(t) && h >= 7) return 'greetHoliday'
  if (h >= 0 && h < 5) return 'idleLate'
  if (m.lastLateNight && t - m.lastLateNight < 20 * 3600000 && h >= 6 && h < 13) return 'greetAfterLateNight'
  if (gap < 2 * 3600000) return 'greetAgain'
  if (h >= 5 && h < 10) return 'greetMorning'
  if (now.getDay() === 5 && h >= 12) return 'greetFriday'
  if (now.getDay() === 0 || now.getDay() === 6) return 'greetWeekend'
  if (h >= 18) return 'greetEvening'
  return 'greet'
}
/** 见面打卡：更新记忆（每次启动/打开页面调用一次，之后每隔几分钟刷新 lastSeen） */
export function checkIn(m: Memory, now = Date.now()): Memory {
  const k = dayKey(now)
  const h = new Date(now).getHours()
  return {
    ...m,
    lastSeen: now,
    daysMet: m.lastDay === k ? m.daysMet : m.daysMet + 1,
    lastDay: k,
    lastLateNight: h >= 0 && h < 5 ? now : m.lastLateNight,
  }
}

// ───────── 耐心值：摸太多会跑 ─────────
export interface Patience {
  value: number
  at: number
  warned: boolean
  /** 回来后的一段时间里还在闹别扭 */
  sulkyUntil: number
  lastPat: number
}
export const newPatience = (now = Date.now()): Patience => ({ value: 100, at: now, warned: false, sulkyUntil: 0, lastPat: 0 })

const REGEN_PER_SEC = 0.9
function regen(p: Patience, now: number): Patience {
  const v = Math.min(100, p.value + Math.max(0, now - p.at) / 1000 * REGEN_PER_SEC)
  return { ...p, value: v, at: now, warned: v > 45 ? false : p.warned }
}

export interface PatResult {
  next: Patience
  trigger: Trigger
  face: Face
  /** 这一下之后她要跑开 */
  flee: boolean
  /** 表情保持多久 */
  faceMs: number
}

/**
 * 摸一下（head）或戳一下（body）。
 * 摸头：满耐心时害羞/开心（亲密度高会冒爱心眼）；耐心越低越嫌弃 → 生气 → 警告 → 跑开。
 * 戳身体：比摸头更扣耐心，第一反应是吓一跳 + 瞪你。
 */
export function touch(p0: Patience, where: 'head' | 'body', aff: number, now = Date.now()): PatResult {
  const p = regen(p0, now)
  const rapid = now - p.lastPat < 1300
  const cost = where === 'body' ? 18 : rapid ? 11 : 8
  const v = p.value - cost
  const sulky = now < p.sulkyUntil
  const base = { ...p, value: v, lastPat: now }

  if (v <= 8 || (p.warned && v <= 30)) {
    return { next: { ...base, value: 0, warned: false }, trigger: 'runAway', face: 'angry', flee: true, faceMs: 1600 }
  }
  if (v <= 30 && !p.warned) {
    return { next: { ...base, warned: true }, trigger: 'patWarn', face: 'angry', flee: false, faceMs: 2600 }
  }
  if (sulky) {
    return { next: base, trigger: 'sulkPat', face: v > 60 ? 'shy' : 'hmph', flee: false, faceMs: 2200 }
  }
  if (where === 'body') {
    return { next: base, trigger: v > 55 ? 'poke' : 'pokeAngry', face: v > 55 ? 'surprised' : 'pout', flee: false, faceMs: 1800 }
  }
  if (v > 72) {
    const face: Face = aff >= 45 && Math.random() < 0.3 ? 'love' : Math.random() < 0.5 ? 'shy' : 'happy'
    return { next: base, trigger: aff >= 60 && Math.random() < 0.35 ? 'patClose' : 'pat', face, flee: false, faceMs: 1800 }
  }
  if (v > 50) return { next: base, trigger: 'patMany', face: 'pout', flee: false, faceMs: 2000 }
  return { next: base, trigger: 'patTooMuch', face: 'angry', flee: false, faceMs: 2400 }
}

/** 跑开后躲多久：亲密度越高越快回来 */
export const sulkMs = (aff: number): number => Math.round((34000 - aff * 150) * (0.8 + Math.random() * 0.4))

/** 回来了：耐心回到一半，接下来 70 秒还在闹别扭 */
export function cameBack(p: Patience, now = Date.now()): Patience {
  return { ...p, value: 60, at: now, warned: false, sulkyUntil: now + 70000 }
}

// ───────── 听懂你说的话（一点点）─────────
const RULES: Array<[RegExp, Trigger]> = [
  [/对不起|抱歉|不好意思|sorry|我错了/i, 'userSorry'],
  [/你(真|好|太|是不是|咋这么)?(笨|蠢|傻|菜)|笨蛋|垃圾|废物|差劲|没用的/i, 'userScold'],
  [/谢谢|多谢|感谢|谢啦|thx|thank|辛苦了|辛苦啦/i, 'userThanks'],
  [/真棒|厉害|好样的|太强|牛[逼啊哇]|优秀|聪明|干得(好|漂亮)|nice|good job|great|完美/i, 'userPraise'],
  [/晚安|睡了|去睡|睡觉了|good ?night/i, 'userNight'],
  [/早安|早上好|早啊|good ?morning/i, 'userMorning'],
  [/摸摸|抱抱|贴贴|乖乖|可爱|喜欢你|爱你/i, 'userAffection'],
  [/快点|赶紧|急|尽快|马上给我|hurry|asap/i, 'userHurry'],
  [/bug|报错|错误|error|exception|崩了|崩溃|挂了|不工作|跑不起来|失败了/i, 'userBug'],
  [/吃饭|饿了|外卖|奶茶|夜宵|午饭|晚饭|早饭|零食/i, 'userFood'],
  [/^(你好|您好|hi|hello|嗨|哈喽|在吗|在不在)[!！。~～\s]*$/i, 'userHello'],
]
export function reactToUserText(text: string): Trigger | null {
  const t = (text || '').trim()
  if (!t) return null
  for (const [re, trig] of RULES) if (re.test(t)) return trig
  if ([...t].length > 400) return 'userLong'
  return null
}

// ───────── 日常小动作 ─────────
export interface Activity {
  id: string
  trigger: Trigger
  face: Face
  manpu?: Manpu
  /** 持续时间范围（毫秒） */
  ms: [number, number]
  weight: (h: number) => number
}
const meal = (h: number): boolean => (h >= 11 && h <= 12) || (h >= 17 && h <= 18)
export const ACTIVITIES: Activity[] = [
  { id: 'hum', trigger: 'actHum', face: 'happy', manpu: 'note', ms: [7000, 12000], weight: () => 3 },
  { id: 'stretch', trigger: 'actStretch', face: 'yawn', ms: [2600, 3600], weight: (h) => (h < 10 || h >= 15 ? 3 : 1.5) },
  { id: 'snack', trigger: 'actSnack', face: 'eat', ms: [8000, 13000], weight: (h) => (meal(h) ? 6 : 1.2) },
  { id: 'daydream', trigger: 'actDaydream', face: 'love', manpu: 'heart', ms: [5000, 8000], weight: () => 1.5 },
  { id: 'ponder', trigger: 'actPonder', face: 'think', manpu: 'think', ms: [6000, 10000], weight: () => 2 },
  { id: 'smug', trigger: 'actSmug', face: 'smug', manpu: 'sparkle', ms: [3500, 5000], weight: () => 1.2 },
  { id: 'look', trigger: 'actLook', face: 'neutral', ms: [4200, 4200], weight: () => 2 },
  { id: 'bored', trigger: 'actBored', face: 'pout', ms: [3500, 5000], weight: (h) => (h >= 13 && h <= 16 ? 2 : 1) },
  // 打喷嚏：一下就完，偶尔来一次
  { id: 'sneeze', trigger: 'actSneeze', face: 'surprised', ms: [1900, 1900], weight: () => 0.6 },
  // 出去溜达：网页里在原地附近踱两步；桌面版是窗口真的走出去再走回来
  { id: 'stroll', trigger: 'actStroll', face: 'neutral', ms: [7600, 7600], weight: (h) => (h >= 9 && h <= 22 ? 1.6 : 0.5) },
]
export function pickActivity(recent: string[], now = new Date()): Activity {
  const h = now.getHours()
  const pool = ACTIVITIES.filter((a) => !recent.slice(-2).includes(a.id))
  const total = pool.reduce((s, a) => s + a.weight(h), 0)
  let r = Math.random() * total
  for (const a of pool) { r -= a.weight(h); if (r <= 0) return a }
  return pool[0]
}
export const activityMs = (a: Activity): number => a.ms[0] + Math.random() * (a.ms[1] - a.ms[0])

/** 人说话前会顿一下：用户动作 → 她开口之间的自然延迟 */
export const reactionDelay = (): number => 280 + Math.random() * 620

// ───────── 共用样式：新漫符 / 小动作 / 跑开 / 躲在边上偷看 ─────────
export const PERSONA_CSS = `
.dsh-manpu--heart .h2 { fill: #ff9dbb; animation-delay: .35s; }
.dsh-manpu--note { top: 20px; right: 6px; width: 26px; height: 28px; }
.dsh-manpu--note svg { animation: wg-note 2.2s ease-in-out infinite; }
.dsh-manpu--note .note { fill: #26324f; stroke: #26324f; stroke-width: 1.8; stroke-linejoin: round; }
.dsh-manpu--note .n2 { stroke-width: 0; }
@keyframes wg-note { 0%, 100% { translate: 0 0; rotate: -8deg; } 50% { translate: 3px -6px; rotate: 10deg; } }
.dsh-manpu--steam { top: 86px; right: 28px; width: 28px; height: 24px; }
.dsh-manpu--steam .puff { fill: #fff; stroke: #26324f; stroke-width: 1.3; animation: wg-puff 1.3s ease-out infinite; }
.dsh-manpu--steam .p2 { animation-delay: .4s; }
@keyframes wg-puff { 0% { opacity: 0; translate: 0 0; scale: .5; } 30% { opacity: 1; } 100% { opacity: 0; translate: 6px -8px; scale: 1.15; } }

/* 小动作：套在精灵外面的一层，不和精灵自身的漂浮动画抢 transform */
.wg-act { position: relative; transform-origin: 50% 92%; }
/* 滚轮转圈：原地转一圈，落地时弹一下 */
.wg-act--spin { animation: wg-spin .72s cubic-bezier(.3, .1, .3, 1) 1; transform-origin: 50% 60%; }
@keyframes wg-spin { 0% { rotate: 0deg; scale: 1; } 70% { rotate: 360deg; scale: .96; } 85% { rotate: 372deg; } 100% { rotate: 360deg; scale: 1; } }
.wg-act--spin-many { animation: wg-spin-many 1.6s ease-in-out 1; transform-origin: 50% 60%; }
@keyframes wg-spin-many { 0% { rotate: 0deg; } 55% { rotate: 720deg; } 70% { rotate: 700deg; translate: -4px 0; } 85% { rotate: 730deg; translate: 4px 0; } 100% { rotate: 720deg; translate: 0 0; } }
/* 被捏住：横向压扁一点，微微挣扎 */
.wg-act--squeeze { animation: wg-squeeze 1.1s ease-in-out infinite; }
@keyframes wg-squeeze { 0%, 100% { scale: 1.08 .93; translate: 0 3px; rotate: 0deg; } 30% { scale: 1.07 .94; rotate: -2deg; } 60% { scale: 1.09 .92; rotate: 2deg; } }
/* 打喷嚏：先仰头吸气，再猛地往前一点 */
.wg-act--sneeze { animation: wg-sneeze 1.9s ease-in-out 1; }
@keyframes wg-sneeze { 0% { rotate: 0deg; } 25% { rotate: -6deg; translate: 0 -4px; scale: 1.02; } 42% { rotate: -8deg; translate: 0 -5px; scale: 1.03; } 50% { rotate: 9deg; translate: 0 5px; scale: .97 1.02; } 62% { rotate: 6deg; translate: 0 3px; } 100% { rotate: 0deg; translate: 0 0; scale: 1; } }
/* 网页里的散步：往左踱几步，站一会儿，再踱回来（身体跟着走的方向微倾、一颠一颠） */
.wg-act--stroll { animation: wg-stroll 7.6s ease-in-out 1 both; }
@keyframes wg-stroll {
  0% { translate: 0 0; rotate: 0deg; }
  6% { translate: -8px -3px; rotate: -3deg; } 12% { translate: -18px 0; rotate: -3deg; } 18% { translate: -30px -3px; rotate: -3deg; } 24% { translate: -42px 0; rotate: -3deg; } 30% { translate: -54px -3px; rotate: -3deg; }
  36% { translate: -60px 0; rotate: 0deg; } 58% { translate: -60px 0; rotate: 0deg; }
  64% { translate: -52px -3px; rotate: 3deg; } 70% { translate: -40px 0; rotate: 3deg; } 76% { translate: -28px -3px; rotate: 3deg; } 82% { translate: -16px 0; rotate: 3deg; } 88% { translate: -6px -3px; rotate: 3deg; }
  94% { translate: 0 0; rotate: 0deg; } 100% { translate: 0 0; rotate: 0deg; }
}
/* 桌面版散步：窗口在动，她在原地一颠一颠地"走"，身体朝走的方向微倾 */
.wg-act--walk-left { animation: wg-walk-l .5s ease-in-out infinite; }
.wg-act--walk-right { animation: wg-walk-r .5s ease-in-out infinite; }
@keyframes wg-walk-l { 0%, 100% { translate: 0 0; rotate: -3deg; } 50% { translate: 0 -4px; rotate: -4deg; } }
@keyframes wg-walk-r { 0%, 100% { translate: 0 0; rotate: 3deg; } 50% { translate: 0 -4px; rotate: 4deg; } }
.wg-act--hum { animation: wg-sway 1.4s ease-in-out infinite; }
.wg-act--daydream { animation: wg-sway 3.2s ease-in-out infinite; }
@keyframes wg-sway { 0%, 100% { rotate: -2.5deg; } 50% { rotate: 2.5deg; } }
.wg-act--stretch { animation: wg-stretch 2.6s ease-in-out 1; }
@keyframes wg-stretch { 0% { scale: 1 1; } 35% { scale: .97 1.07; translate: 0 -4px; } 60% { scale: .98 1.06; translate: 0 -4px; } 80% { scale: 1.03 .96; translate: 0 1px; } 100% { scale: 1 1; } }
.wg-act--snack { animation: wg-chew .36s ease-in-out infinite alternate; }
@keyframes wg-chew { from { scale: 1 1; } to { scale: 1.012 .985; } }
.wg-act--look { animation: wg-look 4.2s ease-in-out 1; }
@keyframes wg-look { 0%, 100% { rotate: 0deg; translate: 0 0; } 20%, 40% { rotate: -5deg; translate: -6px 0; } 60%, 80% { rotate: 5deg; translate: 6px 0; } }
.wg-act--smug { animation: wg-smug 1.8s ease-in-out infinite; }
@keyframes wg-smug { 0%, 100% { scale: 1; } 50% { scale: 1.025; translate: 0 -2px; } }
.wg-act--bored { animation: wg-bored 3.4s ease-in-out 1 both; }
@keyframes wg-bored { 0% { rotate: 0; } 30%, 80% { rotate: 5deg; translate: 3px 3px; } 100% { rotate: 0; } }
.wg-act--angry { animation: wg-shake .12s linear 6; }
@keyframes wg-shake { 0%, 100% { translate: 0 0; } 25% { translate: -3px 0; } 75% { translate: 3px 0; } }
.wg-act--dizzy { animation: wg-wobble .9s ease-in-out 3; }
@keyframes wg-wobble { 0%, 100% { rotate: 0; } 25% { rotate: -7deg; } 75% { rotate: 7deg; } }

/* 跑开：先蹲一下蓄力 → 跳起 → 冲出屏幕边 */
.wg-act--flee-right { animation: wg-flee-r .95s cubic-bezier(.5, 0, .9, .4) 1 forwards; }
.wg-act--flee-left { animation: wg-flee-l .95s cubic-bezier(.5, 0, .9, .4) 1 forwards; }
@keyframes wg-flee-r {
  0% { translate: 0 0; scale: 1 1; rotate: 0; }
  18% { translate: -10px 8px; scale: 1.06 .9; rotate: -4deg; }
  34% { translate: 10px -22px; scale: .96 1.06; rotate: 6deg; }
  52% { translate: 70px 4px; scale: 1 1; rotate: 10deg; }
  66% { translate: 130px -12px; rotate: 12deg; }
  100% { translate: 520px 6px; rotate: 16deg; }
}
@keyframes wg-flee-l {
  0% { translate: 0 0; scale: 1 1; rotate: 0; }
  18% { translate: 10px 8px; scale: 1.06 .9; rotate: 4deg; }
  34% { translate: -10px -22px; scale: .96 1.06; rotate: -6deg; }
  52% { translate: -70px 4px; scale: 1 1; rotate: -10deg; }
  66% { translate: -130px -12px; rotate: -12deg; }
  100% { translate: -520px 6px; rotate: -16deg; }
}
.wg-act--gone { visibility: hidden; opacity: 0; pointer-events: none; }
/* 回来：从边上探出来，小跳两下落回原位 */
.wg-act--return-right { animation: wg-ret-r 1.1s cubic-bezier(.2, .7, .3, 1) 1; }
.wg-act--return-left { animation: wg-ret-l 1.1s cubic-bezier(.2, .7, .3, 1) 1; }
@keyframes wg-ret-r { 0% { translate: 420px 0; rotate: -8deg; } 45% { translate: 40px -16px; rotate: -4deg; } 65% { translate: 0 0; scale: 1.04 .95; rotate: 0; } 82% { translate: 0 -6px; scale: 1; } 100% { translate: 0 0; } }
@keyframes wg-ret-l { 0% { translate: -420px 0; rotate: 8deg; } 45% { translate: -40px -16px; rotate: 4deg; } 65% { translate: 0 0; scale: 1.04 .95; rotate: 0; } 82% { translate: 0 -6px; scale: 1; } 100% { translate: 0 0; } }
.wg-hide-when-away { transition: opacity .2s; }
.wg-away .wg-hide-when-away { opacity: 0; pointer-events: none; }

/* 躲在屏幕边上偷看：只露出半个脑袋，时不时缩回去再探出来 */
.wg-peek {
  position: fixed; z-index: 2147483000; width: 96px; height: 128px; overflow: hidden;
  cursor: pointer; pointer-events: auto; user-select: none; -webkit-user-select: none;
}
.wg-peek--right { right: 0; }
.wg-peek--left { left: 0; }
.wg-peek__in { position: absolute; top: 0; width: 100%; height: 100%; }
.wg-peek--right .wg-peek__in { animation: wg-peek-in-r .7s cubic-bezier(.2, .8, .3, 1.2) both, wg-peek-bob-r 5.5s ease-in-out .9s infinite; }
.wg-peek--left .wg-peek__in { animation: wg-peek-in-l .7s cubic-bezier(.2, .8, .3, 1.2) both, wg-peek-bob-l 5.5s ease-in-out .9s infinite; }
.wg-peek img { position: absolute; top: 12px; width: 170px; height: auto; max-width: none; pointer-events: none; }
.wg-peek--right img { left: -26px; transform-origin: 40% 40%; rotate: -14deg; }
.wg-peek--left img { right: -26px; transform-origin: 60% 40%; rotate: 14deg; scale: -1 1; }
@keyframes wg-peek-in-r { from { translate: 100% 0; } to { translate: 0 0; } }
@keyframes wg-peek-in-l { from { translate: -100% 0; } to { translate: 0 0; } }
@keyframes wg-peek-bob-r { 0%, 55%, 100% { translate: 0 0; } 62%, 78% { translate: 70% 0; } 86% { translate: -4% 0; } }
@keyframes wg-peek-bob-l { 0%, 55%, 100% { translate: 0 0; } 62%, 78% { translate: -70% 0; } 86% { translate: 4% 0; } }
.wg-peek__tag {
  position: absolute; top: 2px; padding: 1px 7px; border-radius: 10px; background: #fff; color: #26324f;
  border: 1.5px solid #26324f; font: 800 12px/1.3 system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
  animation: wg-tag 2.4s ease-in-out infinite;
}
.wg-peek--right .wg-peek__tag { left: 4px; }
.wg-peek--left .wg-peek__tag { right: 4px; }
@keyframes wg-tag { 0%, 100% { translate: 0 0; } 50% { translate: 0 -3px; } }
@media (prefers-reduced-motion: reduce) {
  .wg-act, .wg-peek__in, .wg-peek__tag, .dsh-manpu--note svg, .dsh-manpu--steam .puff { animation-duration: .01s !important; animation-iteration-count: 1 !important; }
}
`
