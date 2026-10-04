# whale-girl-pet（dsh-floating-maid）

DSH（DeepSeek Harness）Web GUI 的**悬浮女仆桌宠**插件。她住在网页右下角，实时看着你的 Agent 干活——思考时歪头、跑工具时专注、失败时陪你一起垮脸；摸头会害羞，摸太多会跑掉躲屏幕边上偷看；任务在后台跑完，你手机会收到一条推送。

不是贴纸，是有状态机的角色：宿主端把 `session/event` 投影成一份**主/子 Agent 严格隔离**的运行状态，经 SSE 零延迟推给前端；前端跑一套独立的「人格层」（耐心值 / 好感度 / 台词 / 表情 / 小动作），两者合成她此刻的表情、动作和那句话。

> 包名 `whale-girl-pet`，目录名 `dsh-floating-maid`，注入器注册名 `@dsh-external/dsh-floating-maid`——三处不一致，属历史遗留，以 `package.json` 的 `name` 为准。

---

## 特性一览

- **实时任务投影**：直接吃 DSH 官方 `sessionProjections`（`tokenUsage` / `sessionStats` / `contextPressure` / `contextBreakdown`），不靠猜。
- **主/子 Agent 绝对隔离**：子代理的 prompt、思考、工具调用 100% 只进子代理自己的时间轴，绝不污染主会话。
- **7 态状态机 + 纸片风气泡**：待命中 / 等待响应 / 思考中 / 整理回复 / 执行操作 / 已完成 / 出错了，各有配色、表情与台词。
- **人格层**：耐心值、好感度长期记忆（认识天数 + 摸头次数）、396 条台词、20 张表情、10 种日常小动作、15 个节日彩蛋。
- **悬浮置顶画中画**：Document PiP 把控制台搬到桌面最前层（Chrome/Edge 111+），老浏览器降级 `window.open`。
- **Web Push 离线推送**：任务完成 / 中断推到手机，自带 VAPID 密钥生成、订阅管理、失效端点自动剪枝。
- **全功能控制台**：时间轴（含完整长命令与单步耗时）、token/缓存命中/上下文构成遥测、会话导航、子代理切换、输入框发指令 + 传图。
- **纯 SVG 图标体系**：零 Emoji，`prefers-reduced-motion` 降级，移动端独立抽屉布局。

---

## 架构

双端插件：**宿主端**跑在 DSH 进程里（Node），**客户端**跑在浏览器里（React）。两端只通过 HTTP + SSE 通信。

| | 宿主端 (host) | 客户端 (client) |
|---|---|---|
| 入口 | `src/index.ts` (2351 行) + `src/push.ts` (490 行) | `src/client/index.ts` (4954 行) |
| 依赖注入 | `inject = ['webServer', 'timer', 'sessionProjections', 'sessions']` | `inject = ['slots', 'sessions']` |
| 构建 | `tsc` → `lib/index.js`、`lib/push.js` | `tsdown` → `lib/client.js`（CJS，`window.__ModuleLoader__.load({...})` 包裹） |
| 输出 | 18 条 `/api/maid/*` HTTP 路由 + 内存状态 + SSE 广播 | 悬浮窗 UI、召唤按钮、设置页推送面板 |

配套模块（客户端侧，与 React/DOM 解耦）：

| 文件 | 职责 |
|---|---|
| `src/client/persona.ts` | 情绪→表情、耐心值、好感度、听懂用户话、日常小动作（**纯逻辑，零 React / 零 DOM**，仅 `localStorage` 且 try/catch 降级） |
| `src/client/speech.ts` | 91 个触发场景（90 个独立 + 1 个兼容别名）× 396 条台词、4 种语气、选择去重算法、气泡与对白 CSS |
| `src/client/faces.ts` | 20 张表情，base64 内联（`FACES: Record<Face, string>`） |
| `src/client/webpush.ts` | 浏览器端订阅流程 + 设置页 UI |
| `src/client/assets.ts` | 导出 `MAID_PNG`，**当前未被引用**（冗余） |

### 挂载方式（重要）

UI **不走 slot 渲染**，而是自建两棵独立 React 树直挂 `document.body`：

| 树 | 容器 | z-index | 说明 |
|---|---|---|---|
| 主悬浮窗 | `div[data-dsh-maid-root]` | 2147483600 | `display:contents` + `pointer-events:none`，内部元素各自接管指针 |
| 召唤按钮 | `div[data-dsh-maid-summon]` | 2147483000 | 隐藏后用来把她叫回来 |

Slot 只注册两项：`shell.overlay` 的 `dsh-floating-maid-stub`（`order: 999`，渲染 `() => null`，纯占位）与 `settings.section` 的 `floating-maid-webpush`（`order: 48`，标签「离线推送 (Web Push)」）。

这样做的原因见「注意事项」——把 fixed 元素塞进别人的 flex 容器里会被父级布局规则算歪。

---

## 数据流

```
DSH 运行时
   │  ctx.on('session/event', (session, event) => ...)     ← turn/start, step/start,
   │                                                          user/message, assistant/chunk,
   │                                                          tool/call, tool/result, turn/end
   ▼
projectEvent()  ──► findTargetAgent()  主 or 子？
   │
   ├─ 主 Agent  → 全局 state（phase / line / steps / metrics / userInput）
   └─ 子 Agent  → 该子代理自己的 AgentView（steps / thinking / line），不进主时间轴
   │
   ├─ ctx.on('agent/inbox/inserted|claimed|discarded')  → 排队消息队列
   │
   ▼
updateTelemetry()  ← sessionProjections.snapshot() / stateOf()
   │                  tokenUsage · sessionStats · contextPressure · contextBreakdown
   ▼
broadcastState()  ──►  SSE  /api/maid/stream   （纯内存，无轮询、无落盘）
                          │
                          ▼
              client: new EventSource('/api/maid/stream')
                          │  失败则降级 fetch('/api/maid/state') 轮询 250ms / 1000ms
                          ▼
                    MaidOverlay  ──►  表情 / 动作 / 气泡 / 时间轴 / 遥测
```

`ctx.setInterval(5s)` 看门狗兜底：非 turn 活跃且 45 秒无更新，把状态胶囊重置回 `idle`（**只重置胶囊，绝不清空时间轴历史**）。

---

## 状态机与视觉

`Phase = 'idle' | 'waiting' | 'thinking' | 'review' | 'tool' | 'done' | 'failed'`，配色与文案定义在 `PHASE_DICT`：

| Phase | 胶囊文案 | 主色 | 触发时机 |
|---|---|---|---|
| `idle` | 待命中 | `#6b7592` 灰 | 初始 / 看门狗重置 |
| `waiting` | 等待响应 | `#1f7ae0` 蓝 | `turn/start`、`step/start`、工具跑完等下一步 |
| `thinking` | 思考中 | `#7c5ce6` 紫 | 收到 `reasoning-delta` |
| `review` | 整理回复 | `#1f7ae0` 蓝 | 收到 `text-delta` 或 `assistant/message` |
| `tool` | 执行操作 | `#d98b0c` 琥珀 | `tool/call`，未完成的工具数 > 0 时显示「剩余 N 个操作执行中」 |
| `done` | 已完成 | `#22a06b` 绿 | `turn/end` 且 `reason.kind === 'completed'` |
| `failed` | 出错了 | `#e0524f` 红 | `turn/end` 其它 reason，文案由 `extractFailureReason()` 生成 |

**Turn 生命周期锁**：`isTurnActive` 在 `turn/start` 置 `true`、`turn/end` 置 `false`；post-turn 的 `assistant/message`、`step/start`、持久化刷盘事件一律被 `if (!isTurnActive || state.phase === 'done') break` 挡掉，避免刚写好的 `done` 被回冲成 `waiting` / `review`。

**表情优先级**：`reactFace ?? moodFace ?? glowFace ?? actFace`，眨眼在白名单 `BLINKABLE`（7 个表情）内叠加。工作状态映射：`thinking`/`waiting`→`think`，`tool`/`review`→`focus`，打瞌睡→`sleepy`，其余→`neutral`。

---

## 主 / 子 Agent 隔离

这是本插件最核心的设计约束：**子代理的任何内容都不得出现在主 Agent 的时间轴上**。

判定 `isSessionSubagent()` 走多路兜底（任一命中即为子代理）：

- `session.depth > 0`
- `session.origin === 'subagent'` / `header.origin === 'subagent'`
- `session.kind === 'subagent'` / `isSubagent === true` / `isSideThread === true`
- `description` / `title` 匹配 `/^(subagent|fork|一次性子代理|子代理)/i`

分流后：

- 子代理的 `user/message` → 写入子代理自己的 `AgentView.steps`（id 前缀 `sub_user_prompt_`），**不碰 `state.userInput`**。
- 子代理的 `tool/call` / `tool/result` / `turn/end` → 只更新该 `AgentView` 的 `phase` / `line` / `steps`。
- 主 Agent 的 `subagent` / `subagent_fork` 工具调用会**创建**一个子代理卡片（`name` 取 `parsedArgs.description`），工具返回时把该卡片标为 `done` / `failed`。
- `agent/inbox/*` 事件先过 `isSessionSubagent()` 过滤，子代理的排队消息不进全局队列。

前端用 `renderAgentTabs()` 切换视角，数据源 `currentDisplaySteps = selectedAgentId === 'main' ? steps : currentAgent.steps`——主与子各有各的时间轴，互不串台。

---

## 遥测面板

数据全部来自官方 `sessionProjections`，不自行估算（除非 provider 没给采样，见下）。

| 位置 | 字段 | 说明 |
|---|---|---|
| 本轮行 | `turnCacheHitPercent` | 本轮前缀缓存命中率 |
| | `turnSteps` | 本轮已执行步数 |
| | `turnBilledInput` / `turnOutput` | 本轮计费输入（未缓存 + 缓存读 + 缓存写）与输出 |
| 全局行 | `sessionCacheHitPercent` | 全会话累计缓存命中率 |
| | `turns` / `steps` | 会话累计轮数与步数 |
| | `sessionBilledInput` / `sessionOutput` | 会话累计输入 / 输出 |
| 底座 | `modelMeta.modelName` / `.effort` | 当前模型名与推理档位（`request/context` 事件提供，缺省 `Gemini 3.7 Flash` / `High`） |
| | `modelMeta.context.*` | 上下文占用：`usedTokens` / `totalLimitTokens` / 三段构成 `systemTokens` · `toolsTokens` / `messagesTokens`（点击展开进度条与明细） |
| | `tokensPerSec` / `ttftAvgMs` | 生成速率与平均首字延迟 |

**上下文占用的取值优先级**（`usedTokens`）：`contextPressure.projectedTokens` → `pressureTokens` → `contextBreakdown` 三段之和 → `surfaceTokens + 系统 + 工具` → 上一步 prompt tokens，最后钳制在 `[0, contextWindow]`。这是「当前请求真实上下文」，**不是**累计账单量。

token 计数用 `formatTokens()` 压缩（`1.2K` / `3.45M`），耗时用 `formatStepDuration()`（`100ms` / `1.2s` / `10min5s` / `1h20min`）。

---

## 桌宠互动

### 鼠标与手势

| 动作 | 触发 | 后果 |
|---|---|---|
| **拖拽** | 按住精灵拖动 | rAF 直写 DOM（跳过 React diff，防高速甩动瞬移）、±10° 侧倾、松手持久化位置；移动端松手吸边；拖动开始说 `dragStart` + 惊讶脸 1.6s |
| **摸头** | 点击精灵上部 60% | 耐心 −8（连摸 <1.3s 间隔 −11），爱心/星星粒子，连摸 ≥3 次加脸红；累计次数上报 `/api/maid/pat` |
| **戳身体** | 点击精灵下部 40% | 耐心 −18，反应见下方耐心阶梯 |
| **长按捏** | 按住不动 650ms | 被捏扁 → `pout` + 抗议台词；继续按到 2.6s → `angry` + 生气台词 + 耐心 −20；位移 >8px 判定为拖拽而取消；松手变 `shy` 并抑制随后 click 400ms |
| **滚轮** | 在精灵上滚动（滚动量 ≥ 4px） | 转圈；10 秒内 ≥3 次 → 眩晕 `dizzy` 3.2s + 耐心 −25 + 「转晕了」台词 |
| **悬停** | 鼠标进入精灵 | 35% 概率搭话（45 秒冷却） |
| **右键** | 在精灵上右键 | 切换音效开关（非自定义菜单） |
| **点击气泡** | 点工作状态气泡 | 打开全功能控制台抽屉 |
| **点偷看的小脑袋** | 她跑掉后点屏幕边的「哼」 | 哄她回来（`comeBack(true)` → 害羞脸） |

### 人格层数值

**耐心值**（`Patience`，初始 100，回复 0.9/秒，>45 时清除「已警告」标记）：

| 剩余 | 反应 |
|---|---|
| > 72 | 正常摸头（好感 ≥45 有概率 `love` 脸；好感 ≥60 有 35% 概率走 `patClose` 亲近台词） |
| 50–72 | `patMany` 嫌弃 |
| 30–50 | `patTooMuch` 生气 |
| ≤ 30 且未警告 | `patWarn` 警告（生闷气脸 2.6s） |
| ≤ 8，或已警告且 ≤ 30 | **跑开**：冲出屏幕 → 躲边上偷看（6.5–11.5s 后探头说话）→ 自己回来或被你哄回来 |

跑开后进入 70 秒闹别扭期；回来越快取决于好感度——`sulkMs = (34000 − 好感 × 150) × (0.8 + random × 0.4)`。**画中画里没地方跑**，跑开被禁用并改说 `patTooMuch`。

哄她回来的两种方式：点屏幕边上探头的小脑袋，或者**在生闷气期间发一句道歉 / 夸奖 / 亲昵的话**（命中 `userSorry` / `userPraise` / `userAffection` 正则即触发）。

**好感度**（长期记忆，`localStorage['whale-girl-memory-v1']`）：

```
affinity = min(100, round(认识天数 × 6 + sqrt(摸头次数) × 4))
```

记录 `firstMet` / `lastSeen` / `lastLateNight` / `daysMet` / `pats` / `runs`。打招呼会挑场景：初次见面 → 久别（>3 天）→ 节日 → 凌晨还在（0–5 点）→ 熬夜后问候（20 小时内且现在 6–13 点）→ 短时间内又见面（<2 小时）→ 早上 → 周五下午 → 周末 → 晚上 → 通用。

**听懂你说的话**（11 条正则，按序首匹配）：道歉 / 骂她 / 道谢 / 夸奖 / 晚安 / 早安 / 亲昵 / 催她 / 报 bug / 吃饭 / 打招呼；超过 400 字判定为长文（`userLong`）。

**日常小动作**（10 种，带持续时长，不是闪一下）：哼歌、伸懒腰、偷吃（饭点权重 ×6）、发呆、沉思、得意、张望、无聊（13–16 点权重 ×2）、打喷嚏、散步。按 `weight(小时)` 加权随机，并排除最近 2 个做过的，避免连着重复。

**被动搭话**：整点报时（50% 概率）、长思考 30s / 120s 提醒、连续失败 ≥3 次、打瞌睡被叫醒（嘴硬「我没睡」）、任务完成 / 快速完成 / 长时间完成 / 缓存命中率高等。

### 调试钩子

控制台可用 `window.__maidDebug` 和 PiP 窗口的 `window.__maidDebugPip`：

```js
__maidDebug.say('pat')      // 强制说某个触发的台词
__maidDebug.act('snack')    // 强制做某个小动作
__maidDebug.pat()           // 模拟摸头
__maidDebug.flee()          // 跑开
__maidDebug.comeBack()      // 回来
__maidDebug.spin()          // 转圈
__maidDebug.squeeze()       // 被捏
__maidDebug.state()         // 打印当前状态
```

---

## 台词与表情

**台词**（`src/client/speech.ts`）：**396 条**，覆盖 **91 个触发场景**，按注释分 8 组——见面 9 / 摸戳跑开 13 / 鼠标拖拽 6 / 你说的话 13 / 干活 19 / 闲着 18 / 新互动 12 / 兼容 `waiting` 1。

四种语气 `kind`：`say` 275 条、`whisper` 73 条、`shout` 29 条、`think` 19 条，对应四种漫画气泡形态（普通 / 虚线小声 / 暖底冲击线 / 云朵）。文本约定：`（…）` 是内心戏（浅色），`**词**` 高亮。

选择算法 `pickLine(trigger)`：从该触发池里**排除最近 60 条说过的**，纯随机取一条；池子被掏空则回退全池。另有 **6% 概率**的彩蛋台词「好模型……」（5 条变体），只在 17 个不需要接话的场景（自言自语 / 干活顺利 / 被夸）冒出，打招呼、被摸、报时这类明确互动一律说正经台词，避免答非所问。

工具场景通过 `toolTrigger(toolName)` 用正则归并到 `toolRead` / `toolWrite` / `toolBash` / `toolSearch` / `toolOther`，识别到提问类工具（`ask_user_question` 等）则直接走 `needYou`。

> 91 个场景中有 **6 个已写台词但当前未接线**：`cursorNear`、`cursorShake`、`dragLong`（光标靠近 / 抖动 / 拖太久）、`userAway`、`restRemind`（用户离开 / 提醒休息）、`bubbleClick`（点气泡）。属于预留位，接了调用点即可生效。

**表情**（`src/client/faces.ts`）：20 张——`neutral` `blink` `happy` `shy` `sad` `surprised` `pout` `think` `focus` `sleepy` `talk` `angry` `cry` `smug` `wink` `eat` `dizzy` `love` `yawn` `hmph`。情绪名到表情名有 12 个别名映射（`proud→focus`、`bored→pout`、`excited→love`、`worried→think`、`tired→sleepy`…），其余同名直通；11 个表情自带头顶漫符（问号 / zzz / 汗滴 / 惊叹号 / 青筋 / 星星 / 爱心 / 音符 / 蒸汽）；只有「平常脸」会做说话口型，其它表情嘴型是画死的。

---

## 离线推送（Web Push）

任务在后台跑完，手机收到通知——不用一直盯着网页。

**工作流程**：宿主端首次启动自生成 VAPID 密钥对并持久化到 `data/webpush.json` → 浏览器端 `Notification.requestPermission()` → 注册 Service Worker（`/api/maid/sw.js`，`scope: /`）→ 取公钥 → `pushManager.subscribe()` → 订阅上报宿主端。

**自动推送时机**：`turn/end` 且是主 Agent。

| 结果 | 标题 | 正文 |
|---|---|---|
| 完成 | `任务完成 · <会话名前 16 字>` | `「提问前 50 字」\n执行完毕（N 步，耗时 X）` |
| 中断 | `任务中断 · <会话名前 16 字>` | `中断原因: <前 80 字>` |

通知 `tag` 为 `dsh-turn-<sessionId>`，同一会话的旧通知会被覆盖而不是堆叠。点击通知时 SW 先 `POST /api/maid/select-session` 预选对应会话，再聚焦或打开窗口（**绝不跨源截胡**——只 focus URL 完全一致的窗口，否则 `openWindow`）。

**配置项**（`data/webpush.json` 的 `config`，可从设置页改）：

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 总开关 |
| `notifyOnDone` | `true` | 完成时推送 |
| `notifyOnFailed` | `true` | 失败/中断时推送 |
| `proxyUrl` | `''` | 出站代理（回落 `HTTPS_PROXY` / `https_proxy` 环境变量） |
| `subject` | `mailto:admin@example.com` | VAPID sub 字段（需填你自己可收信的联系邮箱） |
| `baseUrl` | `''` | 通知点击跳转的基地址（反代场景需填） |
| `sound` | `true` | **当前无任何消费点（死配置）** |

失效端点（HTTP 404 / 410）在发送后自动剪枝并落盘。**无重试机制**——其它错误（429 / 5xx）设备保留但静默失败。

`web-push` 声明在 `optionalDependencies`。依赖缺失时宿主端会打印一行错误并**静默禁用推送**，插件其余功能完全正常；但此时 `getPublicKey()` 返回空串，前端订阅会停在「获取公钥失败」。

发送选项固定为 `TTL: 24 小时` + `urgency: 'high'`（高优先级，设备休眠也会唤醒）。每条订阅的跳转 URL 会按其自身 `origin` 拼成绝对地址，多设备 / 多入口场景各自落地。

---

## HTTP API

全部注册在 `ctx.webServer.register({ kind: 'exact', path, handler })`，共 18 条。

### 状态与交互

| 路径 | 方法 | 用途 |
|---|---|---|
| `/api/maid/stream` | GET | **SSE** 状态流，连上即推一份全量，之后每次状态变化广播 |
| `/api/maid/state` | GET | 一次性拉全量状态（SSE 失败时的降级轮询端点） |
| `/api/maid/send` | POST | 向当前主会话发指令，body `{ prompt, images[] }`（images 为 dataURL） |
| `/api/maid/select-session` | POST | 切换当前追踪的会话，body `{ sessionId }` |
| `/api/maid/pat` | POST | 摸头计数 +1 |

### 静态资源

| 路径 | 方法 | 用途 |
|---|---|---|
| `/api/maid/maid.png` | GET | 女仆立绘（推送通知图标 / badge 也用它） |
| `/api/maid/rua.gif` | GET | 揉脸动图（当前 UI 未引用） |
| `/api/maid/dsniang1.png` | GET | 备用素材（当前 UI 未引用） |
| `/api/maid/sound/press.mp3` | GET | 按下音效，查询参数 `set=duck`（`Ya1.mp3`）或 `set=fx1`（`D1.mp3`） |
| `/api/maid/sound/release.mp3` | GET | 松开音效，查询参数 `set=duck`（`Ya2.mp3`）或 `set=fx1`（`D2.mp3`） |

静态资源从 `assets/` 读取，带内存缓存（`Cache-Control: public, max-age=86400`）。音效走 HTTP 而非内联 base64，避免撑大 `client.js`。

### Web Push

| 路径 | 方法 | 用途 |
|---|---|---|
| `/api/maid/sw.js` | GET | 下发 Service Worker 脚本（带 `Service-Worker-Allowed: /`） |
| `/api/maid/webpush/public-key` | GET | 取 VAPID 公钥 |
| `/api/maid/webpush/status` | GET | 公钥 + 配置 + 订阅列表（密钥字段已脱敏） |
| `/api/maid/webpush/subscribe` | POST | 新增/更新订阅（UA 由服务端从请求头取） |
| `/api/maid/webpush/unsubscribe` | POST | 按 `endpoint` 或 `id` 移除订阅 |
| `/api/maid/webpush/config` | POST | 部分更新配置 |
| `/api/maid/webpush/test` | POST | 发一条测试推送 |
| `/api/maid/webpush/clear` | POST | 清空全部订阅 |

### 局域网访问

| 路径 | 方法 | 用途 |
|---|---|---|
| `/api/maid/lan/status` | GET | 局域网接入状态：地址、端口、token 是否就绪、带 token 的入口 |
| `/api/maid/lan/config` | POST | 开启/关闭局域网反代，body `{ enabled, port? }` |

---

## 局域网访问

让同一局域网内的其他设备（手机 / 平板 / 另一台电脑）打开这台机器上的 DSH。

### 为什么不能直接访问

`dsh web` 默认只绑 `127.0.0.1`，且带**authority 绑定的会话鉴权**：

- cookie 名是 `dsh-auth-<hash(authority)>`，签名载荷里也存了 authority；
- authority 由请求的 `Host` 头算出。

于是别的设备用 `http://<局域网IP>:3080` 访问会**永远停在 401**——即使端口对外可达，cookie 的 authority 也对不上。

### 怎么解决

设置页 → **局域网访问** → 开启。插件会在 host 端起一个反向代理：

- 监听 `0.0.0.0:<port>`（默认 3084），转发到 `127.0.0.1:3080`；
- **路径白名单**：默认只放行 `/api/maid/*`，其余一律 `403`（含 DSH 主界面与其它插件）；
- **原样透传 `Host` 头**——这是关键，一旦改写 Host，DSH 下发的 cookie 立刻失效；
- 转发 `Upgrade` 请求，DSH 的 RPC 与流式输出（`/api/remote.mux`）照常工作。

打开这个端口看到的是插件自己的落地页，**不是 DSH 主界面**：

```
$ curl -s http://192.168.50.24:3084/
<title>maid 局域网接入</title>       # 插件落地页

$ curl -s http://192.168.50.24:3084/api/sessions
{"ok":false,"error":"forbidden"}     # 403，DSH 接口进不来

$ curl -s http://192.168.50.24:3084/api/maid/state
{...}                                # 200，插件接口可用
```

### 访问范围

| 模式 | 白名单 | 效果 |
|---|---|---|
| **仅插件自身**（默认） | `/api/maid/` | 这个端口只服务于 maid 插件，DSH 主界面与其它插件全部 403 |
| 放行整个 DSH | `/` | 等于把整台 DSH 暴露给局域网，此时才显示带 token 的免登录入口 |

设置页里可一键切换，默认是前者。**除非你明确要把 DSH 开给局域网，否则保持默认。**

> 白名单用「前缀 + 边界」比较，`/api/maid/` 不会放行 `/api/maid-evil`；
> 路径穿越（`/api/maid/../sessions`）、大小写变形、URL 编码、空字节均已验证被拦。

### launch token 从哪来

token 由 DSH 启动时随机生成（32 字节），只存在于进程内存，唯一的落地处是启动时打印的那行：

```
dsh web: http://127.0.0.1:3080/?token=<token>
```

所以插件只能从日志里读。按以下顺序找：

1. `$DSH_LOG_FILE` 环境变量指向的文件；
2. `$DSH_HOME/logs/dsh.log`、`$DSH_HOME/dsh.log`；
3. `$HOME/.dsh/logs/dsh.log`；
4. 从进程 cwd 逐级向上找 `logs/dsh.log`（systemd 部署的 `WorkingDirectory` 通常就是项目根，这一步多数情况直接命中）。

> 日志里会累积历史启动的多条 token，**只有最后一条属于当前进程**——插件取的就是最后一条。
> 若全部找不到，设置页会提示「尚未取到 token」，点「刷新」重试。

### 与 DSH Pocket 的区别

[DSH Pocket](https://github.com/shaobeichen/dsh-pocket) 也提供局域网访问，但它的代理**会把 Host 改写成 `127.0.0.1:3080`**（`loopbackAuthority()`，见其 `lib/proxy.mjs`）。这恰好触发了上面说的 authority 绑定问题——DSH 下发的 cookie 绑 `127.0.0.1:3080`，而浏览器地址栏是局域网 IP，cookie 名对不上，于是卡在「无法完成登录握手」页（实测返回 503）。

本插件的反代**不改写 Host**，因此绕开了这个问题。两者可以共存，但一般没必要同时开。

---

## 持久化

| 存储 | Key / 路径 | 内容 |
|---|---|---|
| `localStorage` | `dsh-floating-maid:pos:v1` | 悬浮窗位置 `{ right, bottom }` |
| `localStorage` | `dsh-floating-maid:hidden:v1` | 是否隐藏（`'1'` / `'0'`） |
| `localStorage` | `dsh-floating-maid:cfg:v1` | 配置 `{ soundOn, soundSet }` |
| `localStorage` | `whale-girl-memory-v1` | 人格记忆：认识天数、摸头次数、跑开次数、上次见面时间 |
| 文件 | `data/webpush.json` | VAPID 密钥对 + 推送配置 + 订阅列表 |
| 跨窗口 | `BroadcastChannel('dsh-maid-sync-channel-v2')` | 主窗口 ↔ PiP 窗口同步（`hidden-change` / `pip-change` / `session-change` / `open-session-req`） |
| DOM 事件 | `dsh-maid-hidden-change` / `dsh-maid-pip-change` / `dsh-maid-web-session-change` / `dsh-maid-open-drawer` | 同一窗口内的状态广播 |

`data/` 已在 `.gitignore` 中（含私钥，不入库）。宿主端状态存在 `globalThis.__DSH_MAID_STORE__`，纯内存、热重载不清空。

---

## 运行环境

| 项 | 要求 |
|---|---|
| DSH | `@deepseek-ai/dsh-host-webserver` / `dsh-llm` / `dsh-tools` / `dsh-client-ui-slots` 均在 `>=0.0.1-rc <2` |
| 宿主 | Node ESM，`cordis >=4.0.0-rc <5`，`schemastery ^3.18` |
| 浏览器 | Chrome / Edge 111+（Document PiP）；其余功能现代浏览器均可 |
| 推送 | HTTPS 安全上下文 + 能出网到 APNs / FCM；iOS 16.4+ 且需 PWA 主屏启动 |

---

## 安装

网页版插件（DSH 悬浮窗）与桌面版独立应用是**两套东西**，按需要选一个装。

### 方式一：从 npm 安装（推荐）

```bash
dsh plugin --profile web add whale-girl-pet
```

`--profile` 换成你要装的 profile（`web` / `tui` / 自定义名），装完**重启 dsh** 或让 profile 热重载生效。

`package.json` 声明了 `dsh.bundle.patch → ./cordis.patch.yml`，安装器会自动把插件写进该 profile 的 cordis 加载树，无需手改 patch：

```yaml
- insert:
    - id: whale-girl-pet
      name: 'whale-girl-pet'
```

卸载 / 查看：

```bash
dsh plugin --profile web remove whale-girl-pet
dsh plugin --profile web list
```

### 方式二：从源码安装（本地构建）

仓库**只含源码，不含编译产物 `lib/`**（`lib/` 与 `node_modules/` 都在 `.gitignore` 里）。所以**不能**直接用 `dsh plugin add github:...`——那样装出来的包没有 `lib/index.js`，插件会加载失败。

正确做法是先克隆、构建，再以本地路径安装：

```bash
git clone https://github.com/12398k/dsh-floating-maid.git
cd dsh-floating-maid

bash scripts/build.sh        # 需要能访问到 DSH 安装目录，见下方「从源码构建」
cd ..

dsh plugin --profile web add "$PWD/dsh-floating-maid"
```

`scripts/build.sh` 会自动探测 DSH 布局（源码 checkout 或已安装包）并链接依赖，无需手工准备 `node_modules`。

> 也可以只用源码跑构建、不走 `dsh plugin`：构建完成后 `lib/` 就位，用 `dsh plugin --profile web add <绝对路径>` 安装即可。

### 方式三：桌面独立版（Windows，免安装）

不依赖 DSH、不依赖浏览器、不联网的**独立桌宠**——透明无边框窗口 + 系统托盘，屏幕上只有角色和台词。

到 [Releases](https://github.com/12398k/dsh-floating-maid/releases) 下载 `whale-girl-pet-win-x64.zip`，解压后双击 `鲸鱼娘桌宠.exe` 即可。详见 release 说明。

### 装完之后

1. 打开 DSH Web GUI（默认 `http://127.0.0.1:3080`），右下角会出现她。
2. **浏览器缓存**：客户端 bundle 有缓存，装完/更新后强制刷新一次（`Ctrl+Shift+R`）。
3. 想收手机推送，进「设置 → 离线推送 (Web Push)」按页面提示申请权限并订阅。
4. 把她藏起来了？点右下角的「召唤 maid」按钮叫回来。

### 从源码构建

```bash
bash scripts/build.sh          # = npm run build
```

`scripts/build.sh` 自动探测 DSH 布局并分别处理：

- **源码 checkout 布局**（存在 `<checkout>/packages`）：从 `vendor/` 与 `packages/` 链接依赖。
- **已安装包布局**（存在 `<checkout>/node_modules/@deepseek-ai/dsh-tools`）：从 DSH 全局安装目录与 `~/.dsh/profiles/web/node_modules` 链接依赖。

探测顺序：`$DSH_CHECKOUT` → NVM 全局安装路径 → `$HOME/dsh-harness` / `$HOME/dsh` / `$HOME/.dsh/dsh-harness` → `dsh` 可执行文件所在目录 → `$NVM_DIR/versions/node/*/lib/node_modules/@deepseek-ai/dsh`。

流程：链接依赖 → `tsc -p tsconfig.json`（`src/` → `lib/`，含 `.d.ts` 与 sourcemap）→ `node ./node_modules/tsdown/dist/run.mjs`（`src/client/index.ts` → `lib/client.js`）。

其它脚本：

```bash
npm run typecheck      # tsc --noEmit
npm run build:client   # 只重建客户端 bundle
```

### 开发期热注入

本机装有 `dsh-super-injector`，可跳过 npm 安装直接注入：

```
dev_build_plugin  <插件目录>
dev_inject_plugin <插件目录>      # junction 链接 + loader.create，不重启生效
dev_reload_package whale-girl-pet # 改完源码热重载
dev_uninject_plugin whale-girl-pet
```

---

## 目录结构

```
dsh-floating-maid/
├── src/
│   ├── index.ts            # 宿主端：事件投影、状态机、遥测、18 条路由
│   ├── push.ts             # 宿主端：VAPID、订阅管理、SW 脚本、发送
│   └── client/
│       ├── index.ts        # 悬浮窗 UI、交互、PiP、CSS 体系、挂载
│       ├── persona.ts      # 人格层纯逻辑（耐心值 / 好感度 / 小动作）
│       ├── speech.ts       # 396 条台词 + 气泡 CSS
│       ├── faces.ts        # 20 张表情（base64）
│       ├── webpush.ts      # 浏览器端订阅 + 设置页 UI
│       └── assets.ts       # 未使用的立绘常量
├── assets/                 # maid-new.png / dsniang1-rgba.png / rua.gif / Ya*.mp3 / D*.mp3
├── data/                   # webpush.json（运行时生成，含私钥，已 gitignore）
├── scripts/build.sh        # 双布局构建脚本
├── lib/                    # 构建产物（已 gitignore）
├── cordis.patch.yml        # bundle patch，让 dsh plugin add 自动装配
├── tsdown.config.ts        # 客户端 bundle 配置
└── tsconfig.json
```

---

## 注意事项与已知限制

**部署相关**

- **HTTPS 是硬要求**。Service Worker 与 Push API 只在安全上下文可用（`localhost` 例外）。若通过反向代理从外网访问（如 `https://your-host:7414`），记得在设置页把 `baseUrl` 填成外网地址，否则通知点击会跳到内网 IP。
- **推送需要能出网到 APNs / FCM**。网络不通时在设置页填 `proxyUrl`（如 `http://127.0.0.1:1081`）。
- **iOS 需 16.4+ 且必须「添加到主屏幕」后从图标启动**，普通 Safari 标签页无法订阅。仓库没有 `manifest.json`，安装体验走浏览器默认行为。
- **推送有 3 秒全局节流**（模块级 `lastPushTime`，跨会话共享），多会话同时结束只会收到一条。

**数据安全**

- **VAPID 私钥明文落盘**在 `data/webpush.json`，无加密，靠目录权限兜底。该目录已 gitignore，切勿手动提交。

**实现细节上的坑**

- `require('react-dom/client')` 在客户端代码里是运行时 require，依赖宿主模块系统保持可用。
- SSE 连接失败会**静默降级**为 250ms/1000ms 轮询，UI 上没有提示——排查「数据不动」时先看 Network 面板的 `/api/maid/stream`。
- 前端建立连接的 effect 依赖 `phase`，状态切换会重建 `EventSource`；状态抖动频繁时会产生较多重连。
- 长按捏与拖拽共用 pointer 事件，靠 8px 位移阈值和 400ms 的 `suppressClickRef` 区分，交互边界偏脆弱。
- `src/client/assets.ts` 的 `MAID_PNG` 当前无引用；`shell.overlay` 注册的是渲染 `null` 的占位 stub，真正 UI 全靠 body 直挂——**两套挂载路径并行存在**，改动挂载逻辑时注意别只改一边。
- 客户端代码里大量 `try/catch { /* ignore */ }`（无痕模式下 localStorage 会抛、`sessions` API 可能不存在），功能会静默降级，排查问题时别只看有没有报错。
- 上下文用量在 provider 未返回采样时会回退到 `contextBreakdown` 三段之和，数值与真实请求可能有偏差。

**命名不一致**

包名 `whale-girl-pet`、目录名 `dsh-floating-maid`、注入器注册名 `@dsh-external/dsh-floating-maid` 三处不同，属历史遗留。`package.json` 的 `name` 是权威值。

---

## 许可

BSD-3-Clause
