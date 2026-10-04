/**
 * @dsh-external/dsh-floating-maid — 宿主端
 * 职责：
 * 1. 严格主/子 Agent 隔离引擎：
 *    - 基于 mainSessionId 绝对隔离主会话与子代理会话；
 *    - 子代理的所有 prompt、思考和工具操作 100% 仅归属于子代理独立时间轴，绝对不污染主 Agent；
 * 2. 深度对齐 DSH 官方 sessionProjections / tokenUsage / sessionStats；
 * 3. 跨轮次平滑流动，绝不清空白屏；
 * 4. 步骤耗时记录与长命令完整下发；
 * 5. 纯内存 0 延迟 SSE 广播。
 */
import { existsSync, readFileSync } from 'node:fs'
import { extname, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { pushManager, WebPushManager } from './push.js'
import { lanManager } from './lan.js'

type Ctx = any

export const name = 'whale-girl-pet'
export const inject = ['webServer', 'timer', 'sessionProjections', 'sessions']

export type Phase = 'idle' | 'waiting' | 'thinking' | 'review' | 'tool' | 'done' | 'failed'

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
  sessionId?: string
  name: string
  isMain: boolean
  status: 'running' | 'done' | 'failed' | 'idle'
  phase: Phase
  line: string
  thinking: string
  steps: HistoryStep[]
  metrics?: TelemetryMetrics
}

export interface SessionData {
  sessionId: string
  title: string
  phase: Phase
  line: string
  tool: string | null
  userInput: string | null
  thinking: string
  steps: HistoryStep[]
  metrics: TelemetryMetrics
  lastUpdate: number
  subagents: AgentView[]
  modelName?: string
  effort?: string
  contextWindow?: number
  queuedMessages: QueuedMessage[]
}

export interface MaidState {
  activeSessionId: string
  sessions: SessionSummary[]
  activeAgentId: string
  agents: AgentView[]
  phase: Phase
  line: string
  tool: string | null
  sessionId: string | null
  lastUpdate: number
  patCount: number
  userInput: string | null
  thinking: string
  steps: HistoryStep[]
  metrics: TelemetryMetrics
  queuedMessages: QueuedMessage[]
}

const TOOL_DICT: Record<string, { verb: string; noun: string }> = {
  bash: { verb: '运行命令', noun: '命令执行' },
  read: { verb: '读取文件', noun: '读取文件' },
  write: { verb: '写入文件', noun: '写入文件' },
  edit: { verb: '修改文件', noun: '修改文件' },
  glob: { verb: '搜索文件', noun: '文件搜索' },
  grep: { verb: '检索内容', noun: '内容检索' },
  web_search: { verb: '网络搜索', noun: '网络搜索' },
  ask_user_question: { verb: '向您提问', noun: '用户询问' },
  todo_write: { verb: '规划任务清单', noun: '任务规划' },
  subagent: { verb: '调度子代理', noun: '子代理任务' },
  subagent_fork: { verb: '派生子代理', noun: '子代理派生' },
  send_message: { verb: '发送代理消息', noun: '代理通信' },
  interrupt_agent: { verb: '中断子代理', noun: '中断代理' },
  list_agents: { verb: '查看子代理', noun: '子代理列表' },
  get_goal: { verb: '查看长期目标', noun: '目标读取' },
  create_goal: { verb: '创建长期目标', noun: '目标创建' },
  update_goal: { verb: '更新长期目标', noun: '目标更新' },
  ralph: { verb: '启动 Ralph 循环', noun: 'Ralph 循环' },
  workflow: { verb: '执行工作流', noun: '工作流执行' },
  image_generate: { verb: '生成图像', noun: '图像生成' },
  codex_image_generate: { verb: '生成图像', noun: '图像生成' },
  video_generate: { verb: '生成视频', noun: '视频生成' },
  x_search: { verb: '检索社交动态', noun: '社交检索' },
  ssh_exec: { verb: '远程执行命令', noun: '远程命令' },
  ssh_upload: { verb: '上传远程文件', noun: '远程上传' },
  ssh_download: { verb: '下载远程文件', noun: '远程下载' },
  ssh_tunnel: { verb: '配置 SSH 隧道', noun: 'SSH 隧道' },
  ssh_cluster: { verb: '集群并发执行', noun: '集群执行' },
  dev_build_plugin: { verb: '构建插件', noun: '插件构建' },
  dev_inject_plugin: { verb: '注入插件模组', noun: '模组注入' },
  dev_reload_package: { verb: '热重载插件', noun: '插件重载' },
  dev_uninject_plugin: { verb: '卸载插件模组', noun: '模组卸载' },
  dev_plugin_status: { verb: '检查插件状态', noun: '插件检查' },
  dev_self_test: { verb: '执行插件自检', noun: '插件自检' },
  dev_scaffold_plugin: { verb: '生成插件骨架', noun: '创建骨架' },
  housekeeper_report: { verb: '环境体检', noun: '环境体检' },
  housekeeper_clean: { verb: '清理系统缓存', noun: '缓存清理' },
  mnemon_recall: { verb: '回忆项目记忆', noun: '记忆召回' },
  mnemon_remember: { verb: '沉淀长期记忆', noun: '记忆存储' },
  mnemon_runtime_memory: { verb: '更新即时记忆', noun: '记忆更新' },
  mnemon_document_manage: { verb: '管理项目文档', noun: '文档管理' },
  mnemon_document_search: { verb: '检索项目文档', noun: '文档检索' },
}

function formatToolRunning(toolName: string, rawArgs: any): { line: string; toolLabel: string; parsedArgs: any } {
  const meta = TOOL_DICT[toolName]
  const verb = meta?.verb || `执行 ${toolName}`
  const noun = meta?.noun || toolName

  let hint = ''
  let parsedArgs: any = {}
  try {
    if (rawArgs) {
      parsedArgs = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs
      if (parsedArgs.command) {
        hint = String(parsedArgs.command).replace(/\s+/g, ' ').trim()
      } else if (parsedArgs.file_path || parsedArgs.localPath || parsedArgs.remotePath || parsedArgs.dir) {
        hint = String(parsedArgs.file_path || parsedArgs.localPath || parsedArgs.remotePath || parsedArgs.dir).trim()
      } else if (parsedArgs.pattern) {
        hint = String(parsedArgs.pattern).trim()
      } else if (parsedArgs.query) {
        hint = String(parsedArgs.query).trim()
      } else if (parsedArgs.prompt) {
        hint = String(parsedArgs.prompt).replace(/\s+/g, ' ').trim()
      } else if (parsedArgs.objective || parsedArgs.description) {
        hint = String(parsedArgs.objective || parsedArgs.description).replace(/\s+/g, ' ').trim()
      } else if (parsedArgs.packageName || parsedArgs.match || parsedArgs.name) {
        hint = String(parsedArgs.packageName || parsedArgs.match || parsedArgs.name).trim()
      } else if (parsedArgs.topic || parsedArgs.key) {
        hint = String(parsedArgs.topic || parsedArgs.key).trim()
      }
    }
  } catch { /* ignore */ }

  const line = hint ? `${verb}: ${hint}` : verb
  return { line, toolLabel: noun, parsedArgs }
}

function isToolError(data: any): boolean {
  if (!data) return false
  if (data.error !== undefined && data.error !== null) return true
  if (data.isError === true || data.is_error === true) return true
  if (data.message?.isError === true || data.message?.is_error === true) return true
  if (data.message?.source?.error !== undefined && data.message?.source?.error !== null) return true
  if (data.result?.is_error === true || data.result?.isError === true) return true

  const content = typeof data.result === 'string'
    ? data.result
    : typeof data.message?.content === 'string'
      ? data.message.content
      : Array.isArray(data.message?.content)
        ? data.message.content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join(' ')
        : ''

  if (/\[exit code:\s*[1-9]\d*\]/i.test(content)) return true
  if (/^Error:/i.test(content) || /\[sandbox:.*denied/i.test(content)) return true
  return false
}

/**
 * 思维链采集：把 `llm/stream` 产出的流「原样透传 + 顺手旁听」。
 *
 * 为什么必须走这里：`reasoning-delta` 是 **LLM 适配器实时产出的流式 chunk**，
 * 它只在 `llm/stream` waterfall 里出现，**不写进会话日志**（实测会话 jsonl 里
 * 0 条 chunk/delta 事件）。所以监听 `session/event` 永远拿不到思维链——
 * 早期那版就是这么写的，结果 `state.thinking` 恒为空。
 *
 * 这是 waterfall：必须把流原样交还下游，只做旁听。任何消费/丢弃 chunk 的写法
 * 都会掐断本次模型调用，所以这里逐块 yield，绝不过滤。
 *
 * @param source 下游适配器产出的 chunk 流
 * @param onDelta 收到一段思维链文本的回调
 */
async function* tapReasoningStream(
  source: AsyncIterable<any>,
  onDelta: (text: string) => void,
): AsyncIterable<any> {
  for await (const chunk of source) {
    try {
      if (chunk && chunk.type === 'reasoning-delta' && typeof chunk.text === 'string' && chunk.text) {
        onDelta(chunk.text)
      }
    } catch { /* 旁听失败绝不能影响主流程 */ }
    yield chunk
  }
}

function formatModelName(name?: string | null): string {
  if (!name) return 'Gemini 3.7 Flash'
  if (name.includes('/')) name = name.split('/').pop() || name
  name = name.replace(/^agy:|^gmi:|^openai:|^anthropic:/, '').replace(/-tiered$/, '')
  if (/[A-Z]/.test(name) || name.includes(' ')) return name
  return name
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const defaultMetrics: TelemetryMetrics = {
  turnSteps: 0,
  turnBilledInput: 0,
  turnCacheRead: 0,
  turnCacheWrite: 0,
  turnOutput: 0,
  turnCacheHitPercent: '0.000%',
  turnCacheHitRate: 0,
  sessionBilledInput: 0,
  sessionCacheRead: 0,
  sessionCacheWrite: 0,
  sessionOutput: 0,
  sessionCacheHitPercent: '0.000%',
  sessionCacheHitRate: 0,
  turns: 0,
  steps: 0,
  llmMs: 0,
  toolMs: 0,
  ttftAvgMs: 0,
  tokensPerSec: 0,
}

declare global {
  // eslint-disable-next-line no-var
  var __DSH_MAID_STORE__: {
    rootSessionMap: Map<string, SessionData>
    activeRootSessionId: string
    patCount: number
    state: MaidState
  } | undefined
}

const gStore = globalThis.__DSH_MAID_STORE__ || {
  rootSessionMap: new Map<string, SessionData>(),
  activeRootSessionId: '',
  patCount: 0,
  state: {
    activeSessionId: '',
    sessions: [],
    activeAgentId: 'main',
    agents: [{
      id: 'main',
      name: '主智能体',
      isMain: true,
      status: 'idle',
      phase: 'idle',
      line: '就绪',
      thinking: '',
      steps: [],
      metrics: { ...defaultMetrics },
    }],
    phase: 'idle',
    line: '就绪',
    tool: null,
    sessionId: null,
    lastUpdate: Date.now(),
    patCount: 0,
    userInput: null,
    thinking: '',
    steps: [],
    metrics: { ...defaultMetrics },
    queuedMessages: [],
  }
}
globalThis.__DSH_MAID_STORE__ = gStore

const rootSessionMap = gStore.rootSessionMap
let activeRootSessionId: string = gStore.activeRootSessionId
const state: MaidState = gStore.state
if (!Array.isArray(state.queuedMessages)) state.queuedMessages = []

function getOrCreateSessionData(sid: string, title?: string): SessionData {
  if (!rootSessionMap.has(sid)) {
    rootSessionMap.set(sid, {
      sessionId: sid,
      title: title || '新会话',
      phase: 'idle',
      line: '就绪',
      tool: null,
      userInput: null,
      thinking: '',
      steps: [],
      metrics: { ...defaultMetrics },
      lastUpdate: Date.now(),
      subagents: [],
      queuedMessages: [],
    })
  }
  const data = rootSessionMap.get(sid)!
  if (!Array.isArray(data.queuedMessages)) data.queuedMessages = []
  if (title && (!data.title || data.title === '新会话')) {
    data.title = title
  }
  return data
}

const mainAgentView: AgentView = state.agents.find(a => a.id === 'main') || {
  id: 'main',
  name: '主智能体',
  isMain: true,
  status: 'idle',
  phase: 'idle',
  line: '就绪',
  thinking: '',
  steps: [],
  metrics: { ...defaultMetrics },
}

let mainSessionId: string | null = state.sessionId

function getSessionObj(sessionId: string, sessionObj?: any): any {
  if (sessionObj) return sessionObj
  if (hostCtx?.sessions?.get) {
    try {
      const s = hostCtx.sessions.get(sessionId)
      if (s) return s
    } catch {}
  }
  if (hostCtx?.sessions?.list) {
    try {
      const list = hostCtx.sessions.list()
      if (Array.isArray(list)) {
        const found = list.find((item: any) => String(item.id || item.sessionId) === String(sessionId))
        if (found) return found
      }
    } catch {}
  }
  return null
}

function isSessionSubagent(sessionId: string, sessionObj?: any): boolean {
  if (!sessionId || sessionId === 'global') return false
  const s = getSessionObj(sessionId, sessionObj)
  if (s) {
    if (typeof s.depth === 'number' && s.depth > 0) return true
    if (s.parentSessionId || s.parentId) return true
    if (s.header?.parentSessionId || s.header?.parentId) return true
    if (s.origin === 'subagent' || s.header?.origin === 'subagent') return true
    if (s.kind === 'subagent' || s.isSubagent === true || s.isSideThread === true) return true
    if (s.agentId && s.agentId !== 'main') return true
    if (typeof s.description === 'string' && /^(subagent|fork|一次性子代理|子代理)/i.test(s.description)) return true
    if (typeof s.title === 'string' && /^(subagent|fork|一次性子代理|子代理)/i.test(s.title)) return true
  }
  return false
}

function getSubagentParentId(sessionId: string, sessionObj?: any): string {
  const s = getSessionObj(sessionId, sessionObj)
  if (s) {
    const p = s.parentSessionId || s.parentId || s.header?.parentSessionId || s.header?.parentId
    if (p) return String(p)
  }
  return activeRootSessionId || state.sessionId || 'global'
}

function isSessionMain(sessionId: string, sessionObj?: any): boolean {
  if (!sessionId || sessionId === 'global') return true
  const isSub = isSessionSubagent(sessionId, sessionObj)
  if (isSub) return false

  // 确认为顶级根会话（Root Session）
  if (activeRootSessionId !== sessionId) {
    activeRootSessionId = sessionId
    mainSessionId = sessionId
    state.activeSessionId = sessionId
    state.sessionId = sessionId
    currentSessionObj = sessionObj || currentSessionObj
  }
  return true
}

// 统计跟踪器
const sessionStatsMap = new Map<string, {
  turns: number
  steps: number
  turnSteps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
  sessionUncachedInput: number
  sessionCacheRead: number
  sessionCacheWrite: number
  sessionOutput: number
  turnUncachedInput: number
  turnCacheRead: number
  turnCacheWrite: number
  turnOutput: number
  turnBaselineTokens: { uncached: number; cacheRead: number; cacheWrite: number; output: number } | null
  lastPromptTokens: number
  openStep: { startTime: number; firstTokenTime: number | null } | null
  openCalls: Map<string, number>
  turnStartTime: number
}>()

function getOrCreateStats(sid: string) {
  if (!sessionStatsMap.has(sid)) {
    sessionStatsMap.set(sid, {
      turns: 0,
      steps: 0,
      turnSteps: 0,
      llmMs: 0,
      toolMs: 0,
      ttftMs: 0,
      ttftSteps: 0,
      decodeMs: 0,
      decodeTokens: 0,
      sessionUncachedInput: 0,
      sessionCacheRead: 0,
      sessionCacheWrite: 0,
      sessionOutput: 0,
      turnUncachedInput: 0,
      turnCacheRead: 0,
      turnCacheWrite: 0,
      turnOutput: 0,
      turnBaselineTokens: null,
      lastPromptTokens: 0,
      openStep: null,
      openCalls: new Map(),
      turnStartTime: 0,
    })
  }
  return sessionStatsMap.get(sid)!
}

let hostCtx: Ctx = null
let currentSessionObj: any = null

function extractFailureReason(event: any, sessionObj?: any): string {
  const reasonObj = event.data?.reason || event.reason
  const kind = reasonObj?.kind || event.data?.kind || ''

  let detail = ''
  if (typeof reasonObj?.message === 'string' && reasonObj.message.trim()) {
    detail = reasonObj.message.trim()
  } else if (typeof reasonObj?.error === 'string' && reasonObj.error.trim()) {
    detail = reasonObj.error.trim()
  } else if (typeof reasonObj?.error?.message === 'string' && reasonObj.error.message.trim()) {
    detail = reasonObj.error.message.trim()
  } else if (typeof event.data?.error === 'string' && event.data.error.trim()) {
    detail = event.data.error.trim()
  } else if (typeof event.data?.error?.message === 'string' && event.data.error.message.trim()) {
    detail = event.data.error.message.trim()
  } else if (typeof event.data?.message === 'string' && event.data.message.trim()) {
    detail = event.data.message.trim()
  } else if (typeof sessionObj?.lastError === 'string' && sessionObj.lastError.trim()) {
    detail = sessionObj.lastError.trim()
  }

  if (detail) {
    const clean = detail.replace(/\s+/g, ' ').slice(0, 120).trim()
    return `失败: ${clean}`
  }

  if (kind === 'terminated') return '失败: 会话已终止 (terminated)'
  if (kind === 'interrupted') return '失败: 任务已被手动中断 (interrupted)'
  if (kind === 'max-tokens' || kind === 'length') return '失败: 超出模型最大 Token 限制'
  if (kind === 'aborted') return '失败: 运行已被取消 (aborted)'
  if (kind === 'error') return '失败: 模型接口调用异常'
  if (kind) return `失败: ${kind}`

  return '失败: 任务执行异常中断'
}

function isSystemNotificationPrompt(p?: string | null): boolean {
  if (!p) return true
  const lower = p.toLowerCase().trim()
  if (lower.startsWith('the approval policy changed')) return true
  if (lower.startsWith('current runtime context')) return true
  if (lower.startsWith('[system message]')) return true
  if (lower.startsWith('[system-reminder]')) return true
  if (lower.startsWith('[mnemon]')) return true
  if (lower.startsWith('mnemon runtime memory')) return true
  return false
}

function extractSessionTitle(s: any, sData?: SessionData): string {
  // 1. DSH 官方命名的会话标题 / 投影 (优先采用权威的官方标题)
  if (hostCtx?.sessionProjections && s) {
    try {
      const snap = hostCtx.sessionProjections.snapshot(s)
      const officialTitle = snap?.values?.title || snap?.values?.sessionTitle || hostCtx.sessionProjections.stateOf(s, 'title')
      const val = typeof officialTitle === 'object' && officialTitle ? (officialTitle.val || officialTitle.title) : officialTitle
      if (typeof val === 'string' && val.trim() && val !== '新会话' && !isSystemNotificationPrompt(val)) {
        return cleanUserPrompt(val)
      }
    } catch {}
  }

  // 2. 如果 sData 已经有了稳定的初始标题且不是系统通知/通用占位符，保留它
  if (sData?.title && sData.title !== '新会话' && sData.title !== '当前会话' && !isSystemNotificationPrompt(sData.title)) {
    return sData.title
  }

  // 3. Session 对象的直接标题属性
  const direct = s?.title || s?.description || s?.label || s?.header?.title || s?.header?.description
  if (direct && typeof direct === 'string' && direct.trim() && direct !== '新会话' && !isSystemNotificationPrompt(direct)) {
    return cleanUserPrompt(direct)
  }

  // 4. 从事件日志中提取【第一条真正的用户提问】作为整个会话的持久标题
  if (Array.isArray(s?.events)) {
    for (const ev of s.events) {
      if (ev?.type === 'user/message') {
        const raw = ev.data?.content ?? ev.message?.content ?? ev.content
        const p = extractUserPromptAndMedia(raw)
        if (p && !isSystemNotificationPrompt(p)) return p
      }
    }
  }

  // 5. 兜底：若无历史事件则取 userInput
  if (sData?.userInput && !isSystemNotificationPrompt(sData.userInput)) return sData.userInput

  return '新会话'
}

function hydrateSessionHistory(sid: string, sessionObj?: any): SessionData {
  const sData = getOrCreateSessionData(sid)
  if (sData.steps.length > 0) return sData

  const s = getSessionObj(sid, sessionObj)
  const events = s?.events ?? hostCtx?.sessions?.get?.(sid)?.events ?? []
  if (!Array.isArray(events) || events.length === 0) return sData

  const reconstructedSteps: HistoryStep[] = []
  let firstPrompt: string | null = null
  let lastPrompt: string | null = null
  let reasoningBuf = ''
  const openCalls = new Map<string, number>()

  for (const ev of events) {
    if (!ev || typeof ev.type !== 'string') continue
    const evTime = typeof ev.time === 'number' ? ev.time : Date.now()

    switch (ev.type) {
      case 'request/context': {
        const data = ev.data || ev
        if (typeof data.model === 'string' && data.model) sData.modelName = data.model
        if (typeof data.reasoningEffort === 'string' && data.reasoningEffort) sData.effort = data.reasoningEffort
        if (typeof data.contextWindow === 'number' && data.contextWindow > 0) sData.contextWindow = data.contextWindow
        break
      }

      case 'user/message': {
        const raw = ev.data?.content ?? ev.message?.content ?? ev.content
        const p = extractUserPromptAndMedia(raw)
        if (p) {
          if (!firstPrompt) firstPrompt = p
          lastPrompt = p
          reconstructedSteps.push({
            id: 'hist_user_' + evTime + '_' + Math.random().toString(36).slice(2, 5),
            type: 'user',
            title: p,
            status: 'done',
            startTime: evTime,
            endTime: evTime,
            durationMs: 0,
          })
        }
        break
      }

      case 'assistant/chunk': {
        const chunk = ev.data?.chunk ?? ev.chunk
        if (chunk?.type === 'reasoning-delta' && typeof chunk.text === 'string') {
          reasoningBuf += chunk.text
          if (reasoningBuf.length > 2000) reasoningBuf = reasoningBuf.slice(-1500)
          const matches = [...reasoningBuf.matchAll(/(?:\*\*|###?\s+)([^\*\n\r#]{2,55})(?:\*\*|\n)/g)]
          for (const m of matches) {
            const rawTitle = m[1].trim()
            const cleanTitle = rawTitle.replace(/^(思考|分析|推理)[：:]\s*/, '')
            if (cleanTitle && cleanTitle.length >= 2 && !reconstructedSteps.some(st => st.id === 'think_' + cleanTitle)) {
              reconstructedSteps.push({
                id: 'think_' + cleanTitle,
                type: 'thinking',
                title: cleanTitle,
                status: 'done',
                startTime: evTime,
                endTime: evTime,
                durationMs: 500,
              })
            }
          }
        }
        break
      }

      case 'tool/call': {
        const callId = String(ev.data?.callId ?? ev.data?.id ?? `call_${evTime}`)
        openCalls.set(callId, evTime)
        const toolName = String(ev.data?.name ?? '工具')
        const rawArgs = ev.data?.arguments ?? ev.data?.input
        const { line } = formatToolRunning(toolName, rawArgs)
        reconstructedSteps.push({
          id: callId,
          type: 'tool',
          toolName,
          title: line,
          status: 'running',
          startTime: evTime,
        })
        break
      }

      case 'tool/result': {
        const callId = String(ev.data?.message?.source?.callId ?? ev.data?.callId ?? ev.data?.id ?? '')
        const hasError = isToolError(ev.data)
        const start = openCalls.get(callId) || evTime
        openCalls.delete(callId)
        const matched = reconstructedSteps.find(st => st.id === callId) || [...reconstructedSteps].reverse().find(st => st.type === 'tool' && st.status === 'running')
        if (matched) {
          matched.status = hasError ? 'failed' : 'done'
          matched.endTime = evTime
          matched.durationMs = Math.max(1, evTime - (matched.startTime || start))
        }
        break
      }

      case 'turn/end': {
        for (const st of reconstructedSteps) {
          if (st.status === 'running') {
            st.status = 'done'
            st.endTime = evTime
            st.durationMs = Math.max(1, evTime - st.startTime)
          }
        }
        const reason = ev.data?.reason?.kind
        if (reason === 'completed') {
          reconstructedSteps.push({
            id: 'turn_end_' + evTime,
            type: 'done',
            title: '本轮任务已顺利完成',
            status: 'done',
            startTime: evTime,
            endTime: evTime,
            durationMs: 0,
          })
          sData.phase = 'done'
          sData.line = '任务已顺利完成'
        } else if (reason) {
          const failTitle = extractFailureReason(ev, s)
          reconstructedSteps.push({
            id: 'turn_err_' + evTime,
            type: 'failed',
            title: failTitle,
            status: 'failed',
            startTime: evTime,
            endTime: evTime,
            durationMs: 0,
          })
          sData.phase = 'failed'
          sData.line = failTitle
        }
        break
      }
    }
  }

  if (firstPrompt && (!sData.title || sData.title === '新会话')) {
    sData.title = firstPrompt
  }
  if (lastPrompt) sData.userInput = lastPrompt
  if (reconstructedSteps.length > 0) {
    sData.steps = reconstructedSteps.slice(-50)
  }

  return sData
}

function syncActiveSessions(): void {
  if (!hostCtx?.sessions?.list) return
  try {
    const list = hostCtx.sessions.list()
    if (!Array.isArray(list)) return

    const summaries: SessionSummary[] = []
    const rootIds = new Set<string>()

    for (const s of list) {
      const sId = String(s.id || s.sessionId || '')
      if (!sId) continue
      const isSub = isSessionSubagent(sId, s)
      if (!isSub) {
        rootIds.add(sId)
        const sData = hydrateSessionHistory(sId, s)
        const title = extractSessionTitle(s, sData)
        sData.title = title

        const mainAg: AgentView = {
          id: 'main',
          name: '主智能体',
          isMain: true,
          status: (sData.phase === 'done' ? 'done' : (sData.phase === 'idle' ? 'idle' : 'running')),
          phase: sData.phase,
          line: sData.line,
          thinking: sData.thinking,
          steps: sData.steps,
          metrics: sData.metrics,
        }

        // 探测 session.inbox 里的待处理消息
        if (Array.isArray(s?.inbox?.nextTurn)) {
          for (const m of s.inbox.nextTurn) {
            const raw = m?.content ?? m?.text ?? ''
            const prompt = extractUserPromptAndMedia(raw)
            if (prompt && !sData.queuedMessages.some(q => q.content === prompt)) {
              sData.queuedMessages.push({
                id: m.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                content: prompt,
                target: 'nextTurn',
                time: Date.now(),
              })
            }
          }
        }

        summaries.push({
          id: sId,
          title,
          phase: sData.phase,
          status: s.closed || s.settled ? 'done' : (sData.phase === 'idle' ? 'idle' : 'running'),
          lastUpdate: sData.lastUpdate,
          stepsCount: sData.steps.length,
          userInput: sData.userInput,
          thinking: sData.thinking,
          steps: sData.steps,
          metrics: sData.metrics,
          agents: [mainAg, ...sData.subagents],
          queuedMessages: sData.queuedMessages,
        })
      }
    }

    // 同步子代理
    for (const s of list) {
      const sId = String(s.id || s.sessionId || '')
      if (!sId) continue
      const isSub = isSessionSubagent(sId, s)
      if (isSub) {
        const parentId = getSubagentParentId(sId, s)
        const parentData = getOrCreateSessionData(parentId)
        const desc = s.description || s.label || s.title || `子代理 #${sId.slice(0, 6)}`
        let existingSub = parentData.subagents.find((a: AgentView) => a.id === sId || a.sessionId === sId)
        if (!existingSub) {
          existingSub = {
            id: sId,
            sessionId: sId,
            name: desc,
            isMain: false,
            status: s.closed || s.settled ? 'done' : 'running',
            phase: s.closed || s.settled ? 'done' : 'waiting',
            line: s.closed || s.settled ? '任务已完成' : '子代理执行中…',
            thinking: '',
            steps: [{
              id: 'init_' + sId,
              type: 'tool',
              toolName: 'subagent',
              title: `任务指令: ${desc}`,
              status: s.closed || s.settled ? 'done' : 'running',
              startTime: Date.now(),
            }],
          }
          parentData.subagents.push(existingSub)
        } else {
          if (s.closed || s.settled) {
            existingSub.status = 'done'
            existingSub.phase = 'done'
          }
        }
      }
    }

    if (summaries.length > 0) {
      state.sessions = summaries
      if (!activeRootSessionId || !rootIds.has(activeRootSessionId)) {
        activeRootSessionId = summaries[summaries.length - 1].id
      }
      state.activeSessionId = activeRootSessionId
    }
  } catch { /* ignore */ }
}

function syncActiveStateFromSessionData(sData: SessionData): void {
  state.sessionId = sData.sessionId
  state.phase = sData.phase
  state.line = sData.line
  state.tool = sData.tool
  state.userInput = sData.userInput
  state.thinking = sData.thinking
  state.steps = sData.steps
  state.metrics = sData.metrics
  state.lastUpdate = sData.lastUpdate
  state.queuedMessages = sData.queuedMessages || []

  const mainAg = {
    id: 'main',
    name: '主智能体',
    isMain: true,
    status: (sData.phase === 'done' ? 'done' : (sData.phase === 'idle' ? 'idle' : 'running')) as any,
    phase: sData.phase,
    line: sData.line,
    thinking: sData.thinking,
    steps: sData.steps,
    metrics: sData.metrics,
  }

  state.agents = [mainAg, ...sData.subagents]
}

function updateTelemetry(session?: any): TelemetryMetrics {
  syncActiveSessions()

  const sid = session?.id || session?.sessionId || state.sessionId || 'global'
  const inMem = getOrCreateStats(sid)
  const sData = getOrCreateSessionData(sid)

  let tokenUsage: any = null
  let sessionStats: any = null
  let contextPressure: any = null
  let contextBreakdown: any = null

  if (hostCtx?.sessionProjections) {
    const sObj = session || (sid ? getSessionObj(sid) : null) || currentSessionObj
    if (sObj) {
      try {
        const snap = hostCtx.sessionProjections.snapshot(sObj)
        if (snap?.values) {
          tokenUsage = snap.values.tokenUsage || tokenUsage
          sessionStats = snap.values.sessionStats || sessionStats
          contextPressure = snap.values.contextPressure || contextPressure
          contextBreakdown = snap.values.contextBreakdown || contextBreakdown
        }
        if (!tokenUsage) tokenUsage = hostCtx.sessionProjections.stateOf(sObj, 'tokenUsage')
        if (!sessionStats) sessionStats = hostCtx.sessionProjections.stateOf(sObj, 'sessionStats')
        if (!contextPressure) contextPressure = hostCtx.sessionProjections.stateOf(sObj, 'contextPressure')
        if (!contextBreakdown) contextBreakdown = hostCtx.sessionProjections.stateOf(sObj, 'contextBreakdown')
      } catch { /* ignore */ }
    }
    if ((!contextPressure || !contextBreakdown || !tokenUsage || !sessionStats) && hostCtx.sessions?.list) {
      try {
        const list = hostCtx.sessions.list()
        if (list && list.length > 0) {
          const match = list.find((s: any) => String(s.id || s.sessionId) === String(sid)) || list[list.length - 1]
          if (match) {
            const snap = hostCtx.sessionProjections.snapshot(match)
            if (snap?.values) {
              tokenUsage = tokenUsage || snap.values.tokenUsage
              sessionStats = sessionStats || snap.values.sessionStats
              contextPressure = contextPressure || snap.values.contextPressure
              contextBreakdown = contextBreakdown || snap.values.contextBreakdown
            }
            if (!tokenUsage) tokenUsage = hostCtx.sessionProjections.stateOf(match, 'tokenUsage') || tokenUsage
            if (!sessionStats) sessionStats = hostCtx.sessionProjections.stateOf(match, 'sessionStats') || sessionStats
            if (!contextPressure) contextPressure = hostCtx.sessionProjections.stateOf(match, 'contextPressure') || contextPressure
            if (!contextBreakdown) contextBreakdown = hostCtx.sessionProjections.stateOf(match, 'contextBreakdown') || contextBreakdown
          }
        }
      } catch { /* ignore */ }
    }
  }

  const sStatsVal = sessionStats?.val || sessionStats
  const turns = sStatsVal?.turns ?? inMem.turns
  const steps = sStatsVal?.steps ?? inMem.steps
  const llmMs = sStatsVal?.llmMs ?? inMem.llmMs
  const toolMs = sStatsVal?.toolMs ?? inMem.toolMs
  const ttftSteps = sStatsVal?.ttftSteps ?? inMem.ttftSteps
  const ttftMs = sStatsVal?.ttftMs ?? inMem.ttftMs
  const decodeMs = sStatsVal?.decodeMs ?? inMem.decodeMs
  const decodeTokens = sStatsVal?.decodeTokens ?? inMem.decodeTokens

  const tUsage = tokenUsage?.val || tokenUsage
  const usageTotals = tUsage?.totals || tUsage
  const sessionUncached = usageTotals?.uncachedInputTokens ?? inMem.sessionUncachedInput
  const sessionCacheRead = usageTotals?.cacheReadTokens ?? inMem.sessionCacheRead
  const sessionCacheWrite = usageTotals?.cacheWriteTokens ?? inMem.sessionCacheWrite
  const sessionOutput = usageTotals?.outputTokens ?? inMem.sessionOutput

  const sessionBilled = sessionUncached + sessionCacheRead + sessionCacheWrite
  const sessionHitRatio = sessionBilled > 0 ? (sessionCacheRead / sessionBilled) * 100 : 0

  if (!inMem.turnBaselineTokens) {
    inMem.turnBaselineTokens = {
      uncached: sessionUncached,
      cacheRead: sessionCacheRead,
      cacheWrite: sessionCacheWrite,
      output: sessionOutput,
    }
  }

  let turnUncached = inMem.turnUncachedInput
  let turnCacheRead = inMem.turnCacheRead
  let turnCacheWrite = inMem.turnCacheWrite
  let turnOutput = inMem.turnOutput

  const hasChunkUsage = (turnUncached + turnCacheRead + turnCacheWrite + turnOutput) > 0
  if (!hasChunkUsage && tokenUsage && inMem.turnBaselineTokens) {
    turnUncached = Math.max(0, sessionUncached - inMem.turnBaselineTokens.uncached)
    turnCacheRead = Math.max(0, sessionCacheRead - inMem.turnBaselineTokens.cacheRead)
    turnCacheWrite = Math.max(0, sessionCacheWrite - inMem.turnBaselineTokens.cacheWrite)
    turnOutput = Math.max(0, sessionOutput - inMem.turnBaselineTokens.output)
  }

  let turnBilled = turnUncached + turnCacheRead + turnCacheWrite

  if (turns > 1 && sessionBilled > 0 && turnBilled >= sessionBilled) {
    if (hasChunkUsage) {
      turnBilled = inMem.turnUncachedInput + inMem.turnCacheRead + inMem.turnCacheWrite
      turnUncached = inMem.turnUncachedInput
      turnCacheRead = inMem.turnCacheRead
      turnOutput = inMem.turnOutput
    } else {
      turnBilled = Math.round(sessionBilled / turns)
      turnCacheRead = Math.round(sessionCacheRead / turns)
      turnUncached = Math.max(0, turnBilled - turnCacheRead)
      turnOutput = Math.round(sessionOutput / turns)
    }
  }

  const turnHitRatio = turnBilled > 0 ? (turnCacheRead / turnBilled) * 100 : (sessionHitRatio || 0)

  const ttftAvgMs = ttftSteps > 0 ? Math.round(ttftMs / ttftSteps) : 0
  const tokensPerSec = decodeMs > 0 ? Math.round(decodeTokens / (decodeMs / 1000)) : 0

  // 提取官方 contextPressure 与 contextBreakdown
  const cPress = contextPressure?.val || contextPressure
  const cBreak = contextBreakdown?.val || contextBreakdown

  const currentModelName = sData.modelName || 'Gemini 3.7 Flash'
  const currentEffort = sData.effort || 'High'

  // 上下文总窗口容量（优先采用 adapter 公布的真实 contextWindow）
  const totalWindow = (typeof cPress?.contextWindow === 'number' && cPress.contextWindow > 0)
    ? cPress.contextWindow
    : (sData.contextWindow || 1_048_576)

  // 细分构成 (启发式系统提示词、工具 schema、对话消息)
  const systemTokens = typeof cBreak?.systemTokens === 'number' ? cBreak.systemTokens : 0
  const toolsTokens = typeof cBreak?.toolsTokens === 'number' ? cBreak.toolsTokens : 0
  let messagesTokens = typeof cBreak?.messageTokens === 'number'
    ? cBreak.messageTokens
    : (typeof cBreak?.messagesTokens === 'number' ? cBreak.messagesTokens : 0)
  const breakdownSum = systemTokens + toolsTokens + messagesTokens

  // 当前请求上下文占用量（100% 对齐 DSH TokenMeter 规范，绝非累加账单量 sessionBilled / turnBilled）
  // 仅当底层提供方真实返回了请求用量（pressureTokens > 0）时，才使用 provider 锚定的 projectedTokens；
  // 否则（如 provider 缺失用量采样时），breakdownSum（系统提示词 + 工具 + 消息表层）是权威的真实上下文大小！
  let usedTokens = 0
  if (typeof cPress?.pressureTokens === 'number' && cPress.pressureTokens > 0) {
    if (typeof cPress?.projectedTokens === 'number' && cPress.projectedTokens > 0) {
      usedTokens = cPress.projectedTokens
    } else {
      usedTokens = cPress.pressureTokens
    }
  } else if (breakdownSum > 0) {
    usedTokens = breakdownSum
  } else if (typeof cPress?.surfaceTokens === 'number' && cPress.surfaceTokens > 0) {
    usedTokens = cPress.surfaceTokens + systemTokens + toolsTokens
  } else if (inMem.lastPromptTokens > 0) {
    usedTokens = inMem.lastPromptTokens
  } else {
    usedTokens = 0
  }

  // 严禁超过模型容量限制 (钳制在 0 ~ totalWindow)
  usedTokens = Math.min(totalWindow, Math.max(0, usedTokens))
  if (breakdownSum === 0 && usedTokens > 0) {
    messagesTokens = usedTokens
  }

  const usedPctNum = totalWindow > 0 ? Math.min(100, Math.max(0, Math.round((usedTokens / totalWindow) * 100))) : 0

  const modelMeta: ModelMeta = {
    modelName: formatModelName(currentModelName),
    effort: currentEffort,
    context: {
      usedTokens,
      totalLimitTokens: totalWindow,
      usedPercent: `${usedPctNum}%`,
      usedPercentNum: usedPctNum,
      systemTokens,
      toolsTokens,
      messagesTokens,
    }
  }

  const metrics: TelemetryMetrics = {
    turnSteps: inMem.turnSteps,
    turnBilledInput: turnBilled,
    turnCacheRead,
    turnCacheWrite,
    turnOutput,
    turnCacheHitPercent: turnHitRatio.toFixed(3) + '%',
    turnCacheHitRate: turnHitRatio,

    sessionBilledInput: sessionBilled,
    sessionCacheRead: sessionCacheRead,
    sessionCacheWrite: sessionCacheWrite,
    sessionOutput: sessionOutput,
    sessionCacheHitPercent: sessionHitRatio.toFixed(3) + '%',
    sessionCacheHitRate: sessionHitRatio,

    turns,
    steps,
    llmMs,
    toolMs,
    ttftAvgMs,
    tokensPerSec,
    modelMeta,
  }

  sData.metrics = metrics
  state.metrics = metrics
  const main = state.agents.find(a => a.id === 'main')
  if (main) {
    main.metrics = metrics
    main.steps = state.steps
    main.phase = state.phase
    main.line = state.line
  }
  return metrics
}

let isTurnActive: boolean = false
let reasoningBuffer: string = ''
/** 最近一次从 assistant/message.stream 提取到的思维链原文 */
let lastReasoningText = ''
let lastToolNoun: string = ''
let justFinishedTool: boolean = false
let recordedTitles = new Set<string>()
let lastChunkRecordedIndex = 0
let activeThinkingStepId: string | null = null

const sseClients = new Set<ServerResponse>()

function getCleanStateForClient(): any {
  return {
    ...state,
    sessions: Array.isArray(state.sessions) ? state.sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      phase: s.phase,
      status: s.status,
      lastUpdate: s.lastUpdate,
      stepsCount: s.stepsCount || (s.steps ? s.steps.length : 0),
      userInput: typeof s.userInput === 'string' ? s.userInput.slice(0, 100) : null,
    })) : [],
    steps: Array.isArray(state.steps) ? state.steps.slice(-10).map((st: any) => ({
      ...st,
      title: typeof st.title === 'string' ? (st.title.length > 200 ? st.title.slice(0, 200) + '...' : st.title) : '',
    })) : [],
    agents: Array.isArray(state.agents) ? state.agents.map((ag: any) => ({
      ...ag,
      steps: Array.isArray(ag.steps) ? ag.steps.slice(-10).map((st: any) => ({
        ...st,
        title: typeof st.title === 'string' ? (st.title.length > 200 ? st.title.slice(0, 200) + '...' : st.title) : '',
      })) : [],
    })) : [],
  }
}

let broadcastTimer: any = null
let broadcastPending = false

const broadcastState = (): void => {
  if (sseClients.size === 0) return
  if (broadcastTimer) {
    broadcastPending = true
    return
  }
  const doSend = () => {
    broadcastPending = false
    const clean = getCleanStateForClient()
    const data = `data: ${JSON.stringify(clean)}\n\n`
    for (const client of sseClients) {
      try {
        client.write(data)
      } catch {
        sseClients.delete(client)
      }
    }
  }
  doSend()
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    if (broadcastPending) {
      doSend()
    }
  }, 100)
}

const sessionTools = new Map<string, Set<string>>()

const setState = (next: Partial<MaidState>): void => {
  Object.assign(state, next, { lastUpdate: Date.now() })
  const main = state.agents.find(a => a.id === 'main')
  if (main) {
    main.phase = state.phase
    main.line = state.line
    main.thinking = state.thinking
    main.steps = state.steps
    main.metrics = state.metrics
  }
  broadcastState()
}

function addOrUpdateAgentStep(agent: AgentView, step: Partial<HistoryStep> & { id: string }): void {
  // 1. 如果是用户输入，严格查重：若最后一条步骤已是该用户消息，则更新而不新增
  if (step.type === 'user') {
    const lastStep = agent.steps[agent.steps.length - 1]
    if (lastStep && lastStep.type === 'user' && lastStep.title === step.title) {
      lastStep.status = 'done'
      return
    }
  }

  const existingIdx = agent.steps.findIndex(s => s.id === step.id)
  if (existingIdx !== -1) {
    const prev = agent.steps[existingIdx]
    agent.steps[existingIdx] = {
      ...prev,
      ...step,
      title: step.title || prev.title,
      toolName: step.toolName || prev.toolName,
      startTime: step.startTime || prev.startTime,
      durationMs: step.durationMs !== undefined ? step.durationMs : prev.durationMs,
    } as HistoryStep
  } else {
    agent.steps.push({
      startTime: Date.now(),
      ...step,
    } as HistoryStep)
    if (agent.steps.length > 50) {
      agent.steps = agent.steps.slice(-50)
    }
  }

  if (agent.isMain) {
    state.steps = agent.steps
  }
}

function cleanUserPrompt(raw: string): string {
  if (!raw) return ''
  let text = raw.trim()
  const markers = [
    'Current runtime context.',
    '[MNEMON]',
    '<system-reminder>',
    'MNEMON RUNTIME MEMORY PROTOCOL',
    'MNEMON RUNTIME MEMORY SNAPSHOT',
    'SEMANTICS AND PRIORITY',
  ]
  let minIdx = -1
  for (const m of markers) {
    const idx = text.indexOf(m)
    if (idx !== -1) {
      if (minIdx === -1 || idx < minIdx) {
        minIdx = idx
      }
    }
  }
  if (minIdx !== -1) {
    text = text.slice(0, minIdx).trim()
  }
  return text
}

function extractUserPromptAndMedia(blocks: any): string {
  if (!blocks) return ''
  if (typeof blocks === 'string') return cleanUserPrompt(blocks)

  let hasImage = false
  const texts: string[] = []

  if (Array.isArray(blocks)) {
    for (const b of blocks) {
      if (!b) continue
      if (typeof b === 'string') {
        const c = cleanUserPrompt(b)
        if (c) texts.push(c)
      } else if (b.type === 'text' && typeof b.text === 'string') {
        const c = cleanUserPrompt(b.text)
        if (c) texts.push(c)
      } else if (b.type === 'image' || b.type === 'image_url' || b.image_url || b.image || (typeof b.mime === 'string' && b.mime.startsWith('image/'))) {
        hasImage = true
      }
    }
  } else if (typeof blocks === 'object') {
    const raw = blocks.text || blocks.content || ''
    if (typeof raw === 'string') {
      const c = cleanUserPrompt(raw)
      if (c) texts.push(c)
    }
    if (blocks.type === 'image' || blocks.image || (typeof blocks.mime === 'string' && blocks.mime.startsWith('image/'))) {
      hasImage = true
    }
  }

  const combinedText = texts.join(' ').trim()
  if (hasImage && combinedText) {
    return `[图片] ${combinedText}`
  }
  if (hasImage && !combinedText) {
    return `[图片] 发送了一张图片`
  }
  return combinedText
}

/**
 * 寻找目标 Agent（主 Agent 或子 Agent）
 */
function findTargetAgent(sessionId: string, sessionObj?: any): AgentView {
  syncActiveSessions()
  const sid = String(sessionId || 'global')
  const isMain = isSessionMain(sid, sessionObj)

  if (!isMain) {
    const parentId = getSubagentParentId(sid, sessionObj)
    const parentData = getOrCreateSessionData(parentId)
    let sub = parentData.subagents.find((a: AgentView) => a.id === sid || a.sessionId === sid)
    if (!sub) {
      const desc = sessionObj?.description || sessionObj?.label || sessionObj?.title || `子代理 #${sid.slice(0, 6)}`
      sub = {
        id: sid,
        sessionId: sid,
        name: desc,
        isMain: false,
        status: 'running',
        phase: 'waiting',
        line: '子代理就绪…',
        thinking: '',
        steps: [],
      }
      parentData.subagents.push(sub)
    }
    return sub
  }

  const sData = getOrCreateSessionData(sid)
  let main = state.agents.find(a => a.isMain)
  if (!main) {
    main = { ...mainAgentView }
    state.agents.unshift(main)
  }
  return main
}

function formatDuration(ms: number): string {
  if (ms <= 0) return ''
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60000)
  const sec = Math.round((ms % 60000) / 1000)
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
}

let lastPushTime = 0
async function triggerTurnCompletionPush(sid: string, reason: string | undefined, sessionObj?: any, failReason?: string): Promise<void> {
  try {
    const config = pushManager.getConfig()
    if (!config.enabled) return
    const isCompleted = reason === 'completed'
    if (isCompleted && !config.notifyOnDone) return
    if (!isCompleted && !config.notifyOnFailed) return

    const now = Date.now()
    if (now - lastPushTime < 3000) return
    lastPushTime = now

    const sData = rootSessionMap.get(sid)
    const prompt = sData?.userInput || state.userInput || ''
    const sessionTitle = sData?.title && sData.title !== '新会话' ? sData.title : ''
    const titleText = isCompleted
      ? (sessionTitle ? `任务完成 · ${sessionTitle.slice(0, 16)}` : 'DSH 任务已完成')
      : (sessionTitle ? `任务中断 · ${sessionTitle.slice(0, 16)}` : 'DSH 任务执行中断')

    let bodyText = ''
    if (isCompleted) {
      const stats = getOrCreateStats(sid)
      const turnDurationMs = stats.turnStartTime > 0 ? Math.max(1, now - stats.turnStartTime) : 0
      const durationStr = formatDuration(turnDurationMs)
      const targetAgent = state.agents.find(a => a.isMain)
      const stepsCount = stats.turnSteps || targetAgent?.steps?.length || 0

      const metaParts: string[] = []
      if (stepsCount > 0) metaParts.push(`${stepsCount} 步`)
      if (durationStr) metaParts.push(`耗时 ${durationStr}`)
      const metaStr = metaParts.length > 0 ? `（${metaParts.join('，')}）` : ''

      if (prompt) {
        bodyText = `「${prompt.slice(0, 50)}${prompt.length > 50 ? '…' : ''}」\n执行完毕${metaStr}`
      } else {
        bodyText = `本轮任务已顺利执行完毕${metaStr}。点击即可回到会话。`
      }
    } else {
      bodyText = failReason ? `中断原因: ${failReason.slice(0, 80)}` : '任务执行遇到异常中断，点击查看详情。'
    }

    // DSH 前端是纯 SPA、无会话路径路由（/sessions/:id 会 404）；
    // 推送统一落首页，携带 sessionId 由 SW 预选 maid 会话。
    const sessionUrl = '/'

    await pushManager.sendNotification({
      title: titleText,
      body: bodyText,
      icon: '/api/maid/maid.png',
      badge: '/api/maid/maid.png',
      data: {
        url: sessionUrl,
        sessionId: sid,
        timestamp: now,
      },
      tag: `dsh-turn-${sid || 'main'}`,
      renotify: true,
    })
  } catch (err) {
    console.error('[dsh-floating-maid] 触发 Web Push 通知失败:', err)
  }
}

const projectEvent = (sessionId: string, event: any, sessionObj?: any): void => {
  if (!event || typeof event.type !== 'string') return
  const sid = String(sessionId || 'global')
  if (sessionObj) currentSessionObj = sessionObj
  const stats = getOrCreateStats(sid)
  const eventTime = typeof event.time === 'number' ? event.time : Date.now()

  // 严格确定当前事件属于哪个 Agent
  const targetAgent = findTargetAgent(sid, sessionObj)
  const isMain = targetAgent.isMain

  switch (event.type) {
    case 'request/context': {
      const data = event.data || event
      const sData = getOrCreateSessionData(sid)
      if (typeof data.model === 'string' && data.model) sData.modelName = data.model
      if (typeof data.reasoningEffort === 'string' && data.reasoningEffort) sData.effort = data.reasoningEffort
      if (typeof data.contextWindow === 'number' && data.contextWindow > 0) sData.contextWindow = data.contextWindow
      updateTelemetry(sessionObj)
      broadcastState()
      break
    }

    case 'turn/start': {
      if (isMain) {
        isTurnActive = true
        sessionTools.set(sid, new Set())
        reasoningBuffer = ''
        state.thinking = ''
        lastToolNoun = ''
        justFinishedTool = false
        recordedTitles.clear()
        lastChunkRecordedIndex = 0
        activeThinkingStepId = null

        if (state.steps.length > 35) {
          state.steps = state.steps.slice(-25)
        }
        targetAgent.steps = state.steps
        targetAgent.status = 'running'

        if (hostCtx?.sessionProjections) {
          const sObj = sessionObj || currentSessionObj
          if (sObj) {
            try {
              const u = hostCtx.sessionProjections.stateOf(sObj, 'tokenUsage')
              if (u) {
                stats.turnBaselineTokens = {
                  uncached: u.uncachedInputTokens || 0,
                  cacheRead: u.cacheReadTokens || 0,
                  cacheWrite: u.cacheWriteTokens || 0,
                  output: u.outputTokens || 0,
                }
              }
            } catch { /* ignore */ }
          }
        }

        stats.turns += 1
        stats.turnStartTime = eventTime || Date.now()
        stats.turnSteps = 0
        stats.turnUncachedInput = 0
        stats.turnCacheRead = 0
        stats.turnCacheWrite = 0
        stats.turnOutput = 0

        updateTelemetry(sessionObj)

        setState({
          phase: 'waiting',
          line: '等待模型响应…',
          sessionId: sid,
          tool: null,
          steps: state.steps,
          metrics: state.metrics,
        })
      } else {
        targetAgent.status = 'running'
        targetAgent.phase = 'waiting'
        targetAgent.line = '子代理等待模型响应…'
        broadcastState()
      }
      break
    }

    case 'step/start': {
      if (isMain) {
        if (!isTurnActive || state.phase === 'done') break
        if (!sessionTools.has(sid)) sessionTools.set(sid, new Set())

        stats.steps += 1
        stats.turnSteps += 1
        stats.openStep = { startTime: eventTime, firstTokenTime: null }
        updateTelemetry(sessionObj)

        const waitLine = justFinishedTool && lastToolNoun
          ? `等待模型响应 · 完成${lastToolNoun}`
          : '等待模型响应…'

        setState({
          phase: 'waiting',
          line: waitLine,
          sessionId: sid,
          tool: null,
          metrics: state.metrics,
        })
      } else {
        targetAgent.phase = 'waiting'
        targetAgent.line = '子代理操作进行中…'
        broadcastState()
      }
      break
    }

    case 'user/message': {
      const data = event.data || event
      const raw = data.content ?? data.message?.content
      const prompt = extractUserPromptAndMedia(raw)
      if (prompt) {
        if (isMain) {
          isTurnActive = true
          state.userInput = prompt
          state.lastUpdate = Date.now()

          addOrUpdateAgentStep(targetAgent, {
            id: 'user_prompt_' + Date.now(),
            type: 'user',
            title: prompt,
            status: 'done',
            startTime: eventTime,
            endTime: eventTime,
            durationMs: 0,
          })
          broadcastState()
        } else {
          // 子代理的 prompt 严格只写入子代理自己的任务视图
          addOrUpdateAgentStep(targetAgent, {
            id: 'sub_user_prompt_' + Date.now(),
            type: 'user',
            title: prompt,
            status: 'done',
            startTime: eventTime,
            endTime: eventTime,
            durationMs: 0,
          })
          broadcastState()
        }
      }
      break
    }

    case 'assistant/chunk': {
      const chunk = event.data?.chunk ?? event.chunk
      if (!chunk) break

      if (isMain) {
        isTurnActive = true
        justFinishedTool = false

        if (stats.openStep && stats.openStep.firstTokenTime === null) {
          stats.openStep.firstTokenTime = eventTime
          const ttft = eventTime - stats.openStep.startTime
          if (ttft > 0) {
            stats.ttftMs += ttft
            stats.ttftSteps += 1
            updateTelemetry(sessionObj)
          }
        }

        if (chunk.type === 'usage' && chunk.usage) {
          const u = chunk.usage
          const cr = Number(u.cacheReadTokens ?? u.cacheRead ?? 0)
          const cw = Number(u.cacheWriteTokens ?? u.cacheWrite ?? 0)
          const uncached = Number(u.inputTokens ?? u.uncachedInputTokens ?? u.input ?? 0)
          const out = Number(u.outputTokens ?? u.output ?? 0)
          const stepPrompt = uncached + cr + cw
          if (stepPrompt > 0) {
            stats.lastPromptTokens = stepPrompt
          }
          stats.turnCacheRead += cr
          stats.turnCacheWrite += cw
          stats.turnUncachedInput += uncached
          stats.turnOutput += out
          stats.sessionCacheRead += cr
          stats.sessionCacheWrite += cw
          stats.sessionUncachedInput += uncached
          stats.sessionOutput += out
          updateTelemetry(sessionObj)
        }

        if (chunk.type === 'reasoning-delta' && typeof chunk.text === 'string' && chunk.text.length > 0) {
          reasoningBuffer += chunk.text
          if (reasoningBuffer.length > 3000) reasoningBuffer = reasoningBuffer.slice(-2000)
          const oneLine = reasoningBuffer.replace(/\s+/g, ' ').trim()

          const matches = [...reasoningBuffer.matchAll(/(?:\*\*|###?\s+)([^\*\n\r#]{2,55})(?:\*\*|\n)/g)]
          let hasMarkdownTitle = false
          if (matches.length > 0) {
            hasMarkdownTitle = true
            for (const m of matches) {
              const rawTitle = m[1].trim()
              const cleanTitle = rawTitle.replace(/^(思考|分析|推理)[：:]\s*/, '')
              if (cleanTitle && cleanTitle.length >= 2 && !recordedTitles.has(cleanTitle)) {
                recordedTitles.add(cleanTitle)
                if (activeThinkingStepId) {
                  const prev = state.steps.find(s => s.id === activeThinkingStepId)
                  if (prev) {
                    prev.endTime = eventTime
                    prev.durationMs = eventTime - prev.startTime
                    prev.status = 'done'
                  }
                }
                const stepId = 'think_' + cleanTitle
                activeThinkingStepId = stepId
                addOrUpdateAgentStep(targetAgent, {
                  id: stepId,
                  type: 'thinking',
                  title: cleanTitle,
                  status: 'running',
                  startTime: eventTime,
                })
              }
            }
          }

          setState({
            phase: 'thinking',
            line: '正在思考…',
            sessionId: sid,
            thinking: oneLine,
            steps: state.steps,
            metrics: state.metrics,
          })
        } else if (chunk.type === 'text-delta' && typeof chunk.text === 'string' && chunk.text.length > 0) {
          if (activeThinkingStepId) {
            const prev = state.steps.find(s => s.id === activeThinkingStepId)
            if (prev) {
              prev.endTime = eventTime
              prev.durationMs = eventTime - prev.startTime
              prev.status = 'done'
            }
            activeThinkingStepId = null
          }
          setState({ phase: 'review', line: '整理回复中…', sessionId: sid, metrics: state.metrics })
        }
      } else {
        // 子代理专属 chunk 处理
        if (chunk.type === 'reasoning-delta' && typeof chunk.text === 'string') {
          targetAgent.phase = 'thinking'
          targetAgent.thinking = (targetAgent.thinking + chunk.text).slice(-1000)
          targetAgent.line = '子代理深度思考中…'
        } else if (chunk.type === 'text-delta') {
          targetAgent.phase = 'review'
          targetAgent.line = '子代理生成回复中…'
        }
        broadcastState()
      }
      break
    }

    case 'assistant/message': {
      if (isMain) {
        if (!isTurnActive || state.phase === 'done') break
        justFinishedTool = false

        if (activeThinkingStepId) {
          const prev = state.steps.find(s => s.id === activeThinkingStepId)
          if (prev) {
            prev.endTime = eventTime
            prev.durationMs = eventTime - prev.startTime
            prev.status = 'done'
          }
          activeThinkingStepId = null
        }

        if (stats.openStep) {
          const llmDuration = eventTime - stats.openStep.startTime
          if (llmDuration > 0) stats.llmMs += llmDuration
          stats.openStep = null
        }

        updateTelemetry(sessionObj)
        // 思维链不走这里——它由 llm/stream waterfall 实时提供（见 apply 里的订阅）。
        setState({ phase: 'review', line: '整理回复中…', sessionId: sid, metrics: state.metrics })
      } else {
        targetAgent.phase = 'review'
        targetAgent.line = '子代理回复已生成'
        broadcastState()
      }
      break
    }

    case 'tool/call': {
      const callId = String(event.data?.callId ?? event.data?.id ?? `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
      stats.openCalls.set(callId, eventTime)

      const toolName = String(event.data?.name ?? '工具')
      const rawArgs = event.data?.arguments ?? event.data?.input
      const { line, toolLabel, parsedArgs } = formatToolRunning(toolName, rawArgs)

      if (isMain) {
        isTurnActive = true
        const tools = sessionTools.get(sid) ?? new Set<string>()
        tools.add(callId)
        sessionTools.set(sid, tools)
        lastToolNoun = toolLabel
        justFinishedTool = false

        if (toolName === 'subagent' || toolName === 'subagent_fork') {
          const desc = parsedArgs?.description || parsedArgs?.prompt?.slice(0, 16) || '子代理任务'
          const existingSub = state.agents.find(a => a.id === callId)
          if (!existingSub) {
            state.agents.push({
              id: callId,
              name: String(desc),
              isMain: false,
              status: 'running',
              phase: 'tool',
              line: `调度中: ${desc}`,
              thinking: '',
              steps: [{
                id: 'init_' + callId,
                type: 'tool',
                toolName,
                title: `子任务: ${desc}`,
                status: 'running',
                startTime: eventTime,
              }],
            })
          }
        }

        addOrUpdateAgentStep(targetAgent, {
          id: callId,
          type: 'tool',
          toolName,
          title: line,
          status: 'running',
          startTime: eventTime,
        })

        setState({
          phase: 'tool',
          line: `正在${line}`,
          tool: toolLabel,
          sessionId: sid,
          steps: state.steps,
          metrics: state.metrics,
        })
      } else {
        // 子代理自己执行的工具（比如 ls, grep, read, bash），精准写入子代理自己的步骤列表！
        targetAgent.status = 'running'
        targetAgent.phase = 'tool'
        targetAgent.line = `正在${line}`
        addOrUpdateAgentStep(targetAgent, {
          id: callId,
          type: 'tool',
          toolName,
          title: line,
          status: 'running',
          startTime: eventTime,
        })
        broadcastState()
      }
      break
    }

    case 'tool/result': {
      const callId = String(event.data?.message?.source?.callId ?? event.data?.callId ?? event.data?.id ?? '')
      const hasError = isToolError(event.data)

      let duration = 0
      if (callId && stats.openCalls.has(callId)) {
        const start = stats.openCalls.get(callId)!
        stats.openCalls.delete(callId)
        duration = eventTime - start
        if (duration > 0) stats.toolMs += duration
        updateTelemetry(sessionObj)
      }

      let matchedStep = targetAgent.steps.find(s => s.id === callId)
      if (!matchedStep) {
        matchedStep = [...targetAgent.steps].reverse().find(s => s.type === 'tool' && s.status === 'running')
      }

      if (matchedStep) {
        const dur = duration > 0 ? duration : Math.max(1, eventTime - matchedStep.startTime)
        matchedStep.status = hasError ? 'failed' : 'done'
        matchedStep.endTime = eventTime
        matchedStep.durationMs = dur
      }

      if (isMain) {
        isTurnActive = true
        const tools = sessionTools.get(sid)
        if (tools && callId) tools.delete(callId)

        const subAgent = state.agents.find(a => a.id === callId)
        if (subAgent) {
          subAgent.status = hasError ? 'failed' : 'done'
          subAgent.phase = hasError ? 'failed' : 'done'
          subAgent.line = hasError ? '子任务执行失败' : '子任务已完成'
        }

        if (tools && tools.size > 0) {
          setState({ phase: 'tool', line: `剩余 ${tools.size} 个操作执行中`, tool: null, sessionId: sid, steps: state.steps, metrics: state.metrics })
        } else {
          justFinishedTool = true
          const waitLine = lastToolNoun
            ? `等待模型响应 · 完成${lastToolNoun}`
            : '等待模型响应…'
          setState({
            phase: hasError ? 'failed' : 'waiting',
            line: hasError ? '操作失败' : waitLine,
            sessionId: sid,
            tool: null,
            steps: state.steps,
            metrics: state.metrics,
          })
        }
      } else {
        targetAgent.phase = hasError ? 'failed' : 'waiting'
        targetAgent.line = hasError ? '子代理操作失败' : '子代理等待模型响应…'
        broadcastState()
      }
      break
    }

    case 'turn/end': {
      if (isMain) {
        isTurnActive = false
        reasoningBuffer = ''
        state.thinking = ''
        lastToolNoun = ''
        justFinishedTool = false

        for (const s of targetAgent.steps) {
          if (s.status === 'running') {
            s.status = 'done'
            s.endTime = eventTime
            s.durationMs = Math.max(1, eventTime - s.startTime)
          }
        }
        targetAgent.status = 'done'

        updateTelemetry(sessionObj)

        const reason = event.data?.reason?.kind
        if (reason === 'completed') {
          addOrUpdateAgentStep(targetAgent, {
            id: 'turn_end_' + Date.now(),
            type: 'done',
            title: '本轮任务已顺利完成',
            status: 'done',
            startTime: eventTime,
            endTime: eventTime,
            durationMs: 0,
          })
          setState({ phase: 'done', line: '完成啦', sessionId: sid, tool: null, steps: state.steps, metrics: state.metrics })
          void triggerTurnCompletionPush(sid, 'completed', sessionObj)
        } else {
          const failTitle = extractFailureReason(event, sessionObj)
          addOrUpdateAgentStep(targetAgent, {
            id: 'turn_err_' + Date.now(),
            type: 'failed',
            title: failTitle,
            status: 'failed',
            startTime: eventTime,
            endTime: eventTime,
            durationMs: 0,
          })
          setState({ phase: 'failed', line: failTitle, sessionId: sid, tool: null, steps: state.steps, metrics: state.metrics })
          void triggerTurnCompletionPush(sid, reason, sessionObj, failTitle)
        }
      } else {
        // 子代理 turn 结束
        const isFail = event.data?.reason?.kind && event.data?.reason?.kind !== 'completed'
        targetAgent.status = isFail ? 'failed' : 'done'
        targetAgent.phase = isFail ? 'failed' : 'done'
        if (isFail) {
          const failTitle = extractFailureReason(event, sessionObj)
          targetAgent.line = failTitle
          addOrUpdateAgentStep(targetAgent, {
            id: 'sub_turn_err_' + Date.now(),
            type: 'failed',
            title: failTitle,
            status: 'failed',
            startTime: eventTime,
            endTime: eventTime,
            durationMs: 0,
          })
        } else {
          targetAgent.line = '子代理任务已顺利完成'
        }
        for (const s of targetAgent.steps) {
          if (s.status === 'running') {
            s.status = isFail ? 'failed' : 'done'
            s.endTime = eventTime
            s.durationMs = Math.max(1, eventTime - s.startTime)
          }
        }
        broadcastState()
      }
      break
    }
  }
}

// JSON 响应辅助
const json = (res: ServerResponse, code: number, body: unknown): void => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

const readBody = (req: IncomingMessage): Promise<string> => new Promise((resolve, reject) => {
  let buf = ''
  req.on('data', (c) => { buf += c })
  req.on('end', () => resolve(buf))
  req.on('error', reject)
})

// 静态资源管理
const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(PLUGIN_ROOT, 'assets')

const assetCache = new Map<string, { data: Buffer; mime: string }>()

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const getAsset = (rel: string): { data: Buffer; mime: string } | null => {
  if (assetCache.has(rel)) return assetCache.get(rel)!
  const full = join(ASSETS_DIR, rel)
  if (!existsSync(full)) return null
  try {
    const data = readFileSync(full)
    const mime = MIME_MAP[extname(full).toLowerCase()] ?? 'application/octet-stream'
    const item = { data, mime }
    assetCache.set(rel, item)
    return item
  } catch {
    return null
  }
}

const serveAsset = (res: ServerResponse, rel: string): void => {
  const asset = getAsset(rel)
  if (!asset) {
    res.statusCode = 404
    res.end('Not Found')
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', asset.mime)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('Content-Length', String(asset.data.length))
  res.end(asset.data)
}

export function apply(ctx: Ctx): void {
  hostCtx = ctx

  try { updateTelemetry() } catch {}

  const dEvent = ctx.on('session/event', (session: any, event: any) => {
    const sessionId = session?.id ?? session?.sessionId ?? 'global'
    projectEvent(String(sessionId), event, session)
  })

  // ───────── 思维链实时采集 ─────────
  //
  // reasoning-delta 只在 llm/stream waterfall 里出现（不落盘），这是唯一来源。
  // 必须是 waterfall 形态：把流原样交还下游，只旁听。
  let reasoningDeltaAt = 0
  const dLlmStream = ctx.on('llm/stream', (options: any, next: any) => {
    let stream: AsyncIterable<any>
    try {
      stream = next()
    } catch (err) {
      throw err
    }
    // 只关心主 Agent 的推理；子代理的思维链不进主时间轴
    const sId = options?.sessionId ? String(options.sessionId) : ''
    if (sId && isSessionSubagent(sId)) return stream

    return tapReasoningStream(stream, (text) => {
      reasoningBuffer += text
      // 超出上限时保留尾部——客户端只渲染尾部窗口，尾部连续则裁剪不产生视觉跳变
      if (reasoningBuffer.length > 8000) reasoningBuffer = reasoningBuffer.slice(-8000)
      reasoningDeltaAt = Date.now()
      // 思维链一到就切到 thinking 态——比等 step/start 更及时
      if (!isTurnActive) isTurnActive = true
      state.thinking = reasoningBuffer.replace(/\s+/g, ' ').trim()
      setState({ phase: 'thinking', line: '正在思考…', thinking: state.thinking })
    })
  })

  // 严格过滤：仅主 Agent（depth === 0 或无 parent）的人类输入才更新全局 state.userInput 与排队队列
  const dInbox1 = ctx.on('agent/inbox/inserted', (scope: any, payload: any) => {
    try {
      const sId = scope?.session?.id || scope?.session?.sessionId || ''
      const isSub = isSessionSubagent(sId, scope?.session)
      if (isSub) return

      const msg = payload?.message
      if (!msg) return
      const raw = msg.content
      const prompt = extractUserPromptAndMedia(raw)
      if (prompt) {
        const sData = getOrCreateSessionData(sId)
        if (!sData.queuedMessages.some(q => q.content === prompt)) {
          sData.queuedMessages.push({
            id: msg.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            content: prompt,
            target: payload?.target || 'nextTurn',
            time: Date.now(),
          })
        }
        if (sId === activeRootSessionId || !activeRootSessionId) {
          state.queuedMessages = sData.queuedMessages
        }
        state.lastUpdate = Date.now()
        broadcastState()
      }
    } catch { /* ignore */ }
  })

  const dInbox2 = ctx.on('agent/inbox/claimed', (scope: any, payload: any) => {
    try {
      const sId = scope?.session?.id || scope?.session?.sessionId || ''
      const isSub = isSessionSubagent(sId, scope?.session)
      if (isSub) return

      const msg = payload?.message
      if (!msg) return
      const raw = msg.content
      const prompt = extractUserPromptAndMedia(raw)
      if (prompt) {
        const sData = getOrCreateSessionData(sId)
        sData.queuedMessages = sData.queuedMessages.filter(q => q.content !== prompt && q.id !== msg.id)
        if (sId === activeRootSessionId || !activeRootSessionId) {
          state.queuedMessages = sData.queuedMessages
        }
        state.userInput = prompt
        state.lastUpdate = Date.now()
        broadcastState()
      }
    } catch { /* ignore */ }
  })

  const dInbox3 = ctx.on('agent/inbox/discarded', (scope: any, payload: any) => {
    try {
      const sId = scope?.session?.id || scope?.session?.sessionId || ''
      const msg = payload?.message
      if (sId && msg) {
        const sData = getOrCreateSessionData(sId)
        sData.queuedMessages = sData.queuedMessages.filter(q => q.id !== msg.id)
        if (sId === activeRootSessionId || !activeRootSessionId) {
          state.queuedMessages = sData.queuedMessages
        }
        state.lastUpdate = Date.now()
        broadcastState()
      }
    } catch { /* ignore */ }
  })

  // 看门狗只重置状态胶囊，绝不清空时间轴历史
  const watchdog = ctx.setInterval(() => {
    try { updateTelemetry() } catch {}
    if (!isTurnActive && state.phase !== 'idle' && Date.now() - state.lastUpdate > 45_000) {
      setState({ phase: 'idle', line: '就绪', tool: null, thinking: '' })
    }
  }, 5_000)

  const routeStream = {
    kind: 'exact' as const,
    path: '/api/maid/stream',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      try { updateTelemetry() } catch {}
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      })
      res.write(`data: ${JSON.stringify(getCleanStateForClient())}\n\n`)
      sseClients.add(res)
      _req.on('close', () => {
        sseClients.delete(res)
      })
    },
  }

  const routeState = {
    kind: 'exact' as const,
    path: '/api/maid/state',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      try { updateTelemetry() } catch {}
      json(res, 200, getCleanStateForClient())
    },
  }

  // 悬浮窗直接向主会话发送指令/多模态图片接口
  const routeSend = {
    kind: 'exact' as const,
    path: '/api/maid/send',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const bodyStr = await readBody(req)
        const body = JSON.parse(bodyStr || '{}')
        const text = String(body.prompt || body.text || '').trim()
        const images = Array.isArray(body.images) ? body.images : []

        let userPrompt = text
        if (images.length > 0 && userPrompt) {
          userPrompt = `[图片] ${userPrompt}`
        } else if (images.length > 0 && !userPrompt) {
          userPrompt = `[图片] 发送了一张图片`
        }

        if (userPrompt) {
          state.userInput = userPrompt
          const main = state.agents.find(a => a.isMain) || mainAgentView
          addOrUpdateAgentStep(main, {
            id: 'maid_user_input_' + Date.now(),
            type: 'user',
            title: userPrompt,
            status: 'done',
            startTime: Date.now(),
            endTime: Date.now(),
            durationMs: 0,
          })
          broadcastState()
        }

        if (hostCtx?.sessions?.list) {
          try {
            const list = hostCtx.sessions.list()
            if (list && list.length > 0) {
              const targetSession = (activeRootSessionId && list.find((s: any) => String(s.id || s.sessionId) === String(activeRootSessionId))) || list[list.length - 1]
              if (typeof targetSession?.append === 'function') {
                const contentBlocks: any[] = []
                if (text) contentBlocks.push({ type: 'text', text })
                for (const img of images) {
                  if (typeof img === 'string') {
                    contentBlocks.push({ type: 'image', image: img })
                  } else if (img && typeof img === 'object') {
                    contentBlocks.push({ type: 'image', ...img })
                  }
                }
                targetSession.append('user/message', {
                  role: 'user',
                  content: contentBlocks.length === 1 && contentBlocks[0].type === 'text' ? text : contentBlocks,
                  source: { kind: 'user' },
                })
              }
            }
          } catch { /* ignore */ }
        }

        json(res, 200, { ok: true, prompt: userPrompt })
      } catch (err: any) {
        json(res, 500, { ok: false, error: String(err?.message || err) })
      }
    },
  }

  const routeSelectSession = {
    kind: 'exact' as const,
    path: '/api/maid/select-session',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const bodyStr = await readBody(req)
        const body = JSON.parse(bodyStr || '{}')
        const targetSid = String(body.sessionId || '').trim()
        if (targetSid) {
          activeRootSessionId = targetSid
          const sData = hydrateSessionHistory(targetSid)
          syncActiveStateFromSessionData(sData)
          broadcastState()
        }
        json(res, 200, { ok: true, activeSessionId: activeRootSessionId })
      } catch (err: any) {
        json(res, 500, { ok: false, error: String(err?.message || err) })
      }
    },
  }

  const routePat = {
    kind: 'exact' as const,
    path: '/api/maid/pat',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try { await readBody(req) } catch { /* ignore */ }
      state.patCount += 1
      setState({ patCount: state.patCount })
      json(res, 200, { ok: true, patCount: state.patCount })
    },
  }

  const routeSoundPress = {
    kind: 'exact' as const,
    path: '/api/maid/sound/press.mp3',
    handler: (req: IncomingMessage, res: ServerResponse) => {
      const set = new URL(req.url ?? '', 'http://localhost').searchParams.get('set') || 'duck'
      serveAsset(res, set === 'fx1' ? 'D1.mp3' : 'Ya1.mp3')
    },
  }

  const routeSoundRelease = {
    kind: 'exact' as const,
    path: '/api/maid/sound/release.mp3',
    handler: (req: IncomingMessage, res: ServerResponse) => {
      const set = new URL(req.url ?? '', 'http://localhost').searchParams.get('set') || 'duck'
      serveAsset(res, set === 'fx1' ? 'D2.mp3' : 'Ya2.mp3')
    },
  }

  const routeRua = {
    kind: 'exact' as const,
    path: '/api/maid/rua.gif',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      serveAsset(res, 'rua.gif')
    },
  }

  const routeDsniang1 = {
    kind: 'exact' as const,
    path: '/api/maid/dsniang1.png',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      serveAsset(res, 'dsniang1-rgba.png')
    },
  }

  const routeMaid = {
    kind: 'exact' as const,
    path: '/api/maid/maid.png',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      serveAsset(res, 'maid-new.png')
    },
  }

  // ───────── Web Push 离线推送系统路由 ─────────
  const routeSw = {
    kind: 'exact' as const,
    path: '/api/maid/sw.js',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      })
      res.end(WebPushManager.getServiceWorkerScript())
    },
  }

  const routePushPublicKey = {
    kind: 'exact' as const,
    path: '/api/maid/webpush/public-key',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      json(res, 200, { ok: true, publicKey: pushManager.getPublicKey() })
    },
  }

  const routePushStatus = {
    kind: 'exact' as const,
    path: '/api/maid/webpush/status',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      json(res, 200, {
        ok: true,
        publicKey: pushManager.getPublicKey(),
        config: pushManager.getConfig(),
        subscriptions: pushManager.getSubscriptions(),
      })
    },
  }

  const routePushSubscribe = {
    kind: 'exact' as const,
    path: '/api/maid/webpush/subscribe',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const bodyStr = await readBody(req)
        const body = JSON.parse(bodyStr || '{}')
        const ua = String(req.headers['user-agent'] || '')
        const result = pushManager.addSubscription(body.subscription, {
          deviceName: body.deviceName,
          userAgent: ua,
          origin: body.origin,
        })
        json(res, 200, result)
      } catch (err: any) {
        json(res, 400, { ok: false, error: String(err?.message || err) })
      }
    },
  }

  const routePushUnsubscribe = {
    kind: 'exact' as const,
    path: '/api/maid/webpush/unsubscribe',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const bodyStr = await readBody(req)
        const body = JSON.parse(bodyStr || '{}')
        const result = pushManager.removeSubscription({
          endpoint: body.endpoint,
          id: body.id,
        })
        json(res, 200, result)
      } catch (err: any) {
        json(res, 400, { ok: false, error: String(err?.message || err) })
      }
    },
  }

  const routePushConfig = {
    kind: 'exact' as const,
    path: '/api/maid/webpush/config',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const bodyStr = await readBody(req)
        const body = JSON.parse(bodyStr || '{}')
        const cfg = pushManager.updateConfig(body)
        json(res, 200, { ok: true, config: cfg })
      } catch (err: any) {
        json(res, 400, { ok: false, error: String(err?.message || err) })
      }
    },
  }

  const routePushTest = {
    kind: 'exact' as const,
    path: '/api/maid/webpush/test',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const bodyStr = await readBody(req)
        const body = JSON.parse(bodyStr || '{}')
        const result = await pushManager.sendNotification({
          title: body.title || '女仆测试推送',
          body: body.body || 'Web Push 推送通道运作正常！当任务在后台完成时，您将收到类似通知。',
          data: { url: '/', timestamp: Date.now() },
          renotify: true,
        })
        json(res, 200, { ok: true, ...result })
      } catch (err: any) {
        json(res, 500, { ok: false, error: String(err?.message || err) })
      }
    },
  }

  const routePushClear = {
    kind: 'exact' as const,
    path: '/api/maid/webpush/clear',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      const result = pushManager.clearAllSubscriptions()
      json(res, 200, result)
    },
  }

  // ───────── 局域网接入 ─────────
  const routeLanStatus = {
    kind: 'exact' as const,
    path: '/api/maid/lan/status',
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      json(res, 200, { ok: true, ...lanManager.status() })
    },
  }

  const routeLanConfig = {
    kind: 'exact' as const,
    path: '/api/maid/lan/config',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = JSON.parse((await readBody(req)) || '{}')
        if (body.port !== undefined) lanManager.setPort(body.port)
        // 白名单：默认只放行插件自身；显式传 exposeDsh=true 才放行 DSH 主界面
        if (body.exposeDsh === true) {
          lanManager.setAllowedPaths(['/'])
        } else if (body.exposeDsh === false) {
          lanManager.setAllowedPaths([])   // 空数组回落到默认（仅插件自身）
        }
        if (Array.isArray(body.allowedPaths)) {
          lanManager.setAllowedPaths(body.allowedPaths)
        }
        if (body.enabled === true) {
          const r = lanManager.start()
          if (!r.ok) return json(res, 400, { ok: false, error: r.error })
        } else if (body.enabled === false) {
          lanManager.stop()
        }
        json(res, 200, { ok: true, ...lanManager.status() })
      } catch (err: any) {
        json(res, 400, { ok: false, error: String(err?.message || err) })
      }
    },
  }

  const r0 = ctx.webServer.register(routeStream)
  const r1 = ctx.webServer.register(routeState)
  const r2 = ctx.webServer.register(routePat)
  const r3 = ctx.webServer.register(routeSoundPress)
  const r4 = ctx.webServer.register(routeSoundRelease)
  const r5 = ctx.webServer.register(routeRua)
  const r6 = ctx.webServer.register(routeDsniang1)
  const r7 = ctx.webServer.register(routeMaid)
  const r8 = ctx.webServer.register(routeSend)
  const r9 = ctx.webServer.register(routeSelectSession)
  const rSw = ctx.webServer.register(routeSw)
  const rPushKey = ctx.webServer.register(routePushPublicKey)
  const rPushStatus = ctx.webServer.register(routePushStatus)
  const rPushSub = ctx.webServer.register(routePushSubscribe)
  const rPushUnsub = ctx.webServer.register(routePushUnsubscribe)
  const rPushCfg = ctx.webServer.register(routePushConfig)
  const rPushTest = ctx.webServer.register(routePushTest)
  const rPushClr = ctx.webServer.register(routePushClear)
  const rLanStatus = ctx.webServer.register(routeLanStatus)
  const rLanCfg = ctx.webServer.register(routeLanConfig)

  ctx.effect(() => () => {
    dEvent?.()
    dLlmStream?.()
    dInbox1?.()
    dInbox2?.()
    for (const client of sseClients) {
      try { client.end() } catch { /* ignore */ }
    }
    sseClients.clear()
    r0?.(); r1?.(); r2?.(); r3?.(); r4?.(); r5?.(); r6?.(); r7?.(); r8?.(); r9?.()
    rSw?.(); rPushKey?.(); rPushStatus?.(); rPushSub?.(); rPushUnsub?.(); rPushCfg?.(); rPushTest?.(); rPushClr?.()
    rLanStatus?.(); rLanCfg?.()
    // 插件卸载时收掉局域网反代，不留孤儿监听
    try { lanManager.stop() } catch { /* ignore */ }
  }, 'maid: host lifecycle dispose')

  void watchdog
  ctx.logger?.info?.('[dsh-floating-maid] host service ready (Main vs Subagent Prompt Absolute Isolation)')
}
