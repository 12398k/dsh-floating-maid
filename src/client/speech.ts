// 鲸鱼娘台词引擎：按「发生了什么」选台词，而不是随机抽签
// 人设参考社区二创「蓝色大肥鱼」：聪明但爱想太多、傲娇又有点呆、离不开白米饭、会偷懒打盹（DeepSleep）
// 台词均为本插件原创。

export type SpeechKind = 'say' | 'think' | 'shout' | 'whisper'
export type Trigger =
  | 'greet' | 'greetMorning' | 'greetFriday' | 'pat' | 'patMany' | 'patTooMuch' | 'hover' | 'dragStart' | 'dragEnd'
  | 'userSend' | 'thinkStart' | 'thinkLong' | 'thinkVeryLong' | 'toolRead' | 'toolWrite' | 'toolBash' | 'toolSearch' | 'toolOther' | 'toolMany'
  | 'done' | 'doneFast' | 'doneLong' | 'failed' | 'failStreak' | 'waiting' | 'idle' | 'idleLate' | 'idleMeal'
  | 'bigTokens' | 'cacheHigh' | 'contextFull' | 'back' | 'bubbleClick' | 'doze' | 'wake'

export interface SpeechLine { text: string; kind: SpeechKind; mood: string }

// 文本约定：（…）里是小声嘀咕/内心戏，会用浅色显示；**词** 会高亮
const L = (kind: SpeechKind, mood: string, ...texts: string[]): SpeechLine[] => texts.map((text) => ({ text, kind, mood }))

const LINES: Record<Trigger, SpeechLine[]> = {
  greet: [
    ...L('say', 'happy', '主人来啦！今天也请多指教~', '哼哼，本鲸已经待命好久了', '欢迎回来！要从哪件事开始？', '来得正好，我刚睡醒……啊不是，刚热完身！', '今天想让我干点什么呀？'),
    ...L('whisper', 'shy', '（偷偷整理了一下发型）……嗨', '（假装刚才一直在认真工作）'),
  ],
  greetMorning: [
    ...L('say', 'happy', '早上好！今天也要元气满满！', '早~ 吃早饭了吗？我吃了三碗！', '新的一天，新的 bug……啊呸呸呸'),
    ...L('whisper', 'sleepy', '（揉眼睛）……早、早安……'),
  ],
  greetFriday: [
    ...L('say', 'happy', '今天星期五！做完这些就能摸鱼了吧？', '周五啦！本鲸的尾巴已经开始期待周末了'),
  ],
  pat: [
    ...L('say', 'shy', '诶、诶？突然摸头是犯规的……', '嘿嘿……再、再摸一下也不是不行', '唔~ 充电中……', '干、干嘛啦，我在认真工作的！（其实很开心）', '头发会乱掉的……算了，随你吧', '这、这样我会分心的啦', '被摸了！今天的 debuff 全消除了！', '唔嗯……这个力度刚刚好', '是在奖励我吗？嘿嘿~', '呜~ 主人的手好暖和'),
    ...L('whisper', 'shy', '（尾巴不受控制地摇起来了……）', '（被发现在偷懒了吗……）', '（脸好烫……）', '（假装没感觉到，其实心里在转圈圈）'),
  ],
  patMany: [
    ...L('say', 'pout', '好啦好啦，头发要被揉乱了啦！', '主人是不是太闲了？要不要派点活给我？', '再摸就要收**摸头费**了哦！一次一碗白米饭！', '你是在搓面团吗！', '呜……我的呆毛……', '好、好了！够了！……再一下就够了'),
  ],
  patTooMuch: [
    ...L('shout', 'angry', '够、够了！呆毛都要被摸平了！', '我是鲸鱼不是猫！不许一直撸！', '再摸我就罢工去吃饭了！！', '摸头次数已超出本月额度！！', '呜哇——要被摸秃了！'),
  ],
  hover: [
    ...L('say', 'curious', '嗯？在看我吗？', '要摸摸吗？（期待）', '主人有事找我？', '盯——'),
    ...L('whisper', 'shy', '（被盯着看有点不好意思……）', '（装作没发现）'),
  ],
  dragStart: [
    ...L('shout', 'surprised', '哇啊！要去哪里？！', '飞、飞起来了！'),
    ...L('say', 'surprised', '慢点慢点，我晕鲸！'),
  ],
  dragEnd: [
    ...L('say', 'happy', '这里风景不错~', '好，就在这儿安家了', '搬家完成！'),
    ...L('whisper', 'dizzy', '（晕乎乎……）刚才转了几圈？', '（整理裙摆）'),
  ],
  userSend: [
    ...L('say', 'focus', '收到！马上办~', '好的好的，这就开始', '交给我吧！', '明白！让本鲸看看……', '又有新任务了！'),
    ...L('whisper', 'focus', '（认真记下来）', '（挽起袖子）'),
  ],
  thinkStart: [
    ...L('think', 'focus', '嗯……让我想想……', '这题有点意思……', '先理一理思路……', '（开始深度求索模式）', '等等，这里好像有坑……', '唔，从哪里下手好呢', '先别急，想清楚再动手'),
  ],
  thinkLong: [
    ...L('think', 'focus', '还在想……不是在睡觉！真的！', '想得有点多……但想清楚了才不会返工嘛', '（再想三秒……好吧再想三十秒）', '脑子在飞速旋转中……', '这个问题比看起来难一点点……'),
    ...L('whisper', 'sleepy', '（DeepSeek……DeepSleep……啊不对，我醒着！）'),
  ],
  thinkVeryLong: [
    ...L('say', 'nervous', '主人别急……我快想好了……大概……', '想太久了会被嫌弃吗……', '这道题真的好难，但我不会认输的！'),
  ],
  toolRead: [
    ...L('say', 'focus', '我先翻翻文件~', '让本鲸看看这里写了什么', '读代码中，请勿打扰~', '这是谁写的代码……哦，是我', '唔，信息量有点大'),
  ],
  toolWrite: [
    ...L('say', 'proud', '动笔啦！这次一定写得漂漂亮亮', '改一下这里……嗯，完美', '（小心翼翼地保存……）', '写好啦，缩进都对齐了哦', '新代码出炉~'),
  ],
  toolBash: [
    ...L('say', 'nervous', '跑个命令试试……拜托别报错', '执行中……手心出汗了', '按下回车的瞬间最刺激了！', '祈祷一下……', '终端大人请多关照'),
  ],
  toolSearch: [
    ...L('say', 'focus', '我去找找线索！', '搜索中……答案一定藏在哪里', '翻箱倒柜ing~', '让我在海里捞一捞', '找到了……吗？再找找'),
  ],
  toolOther: [
    ...L('say', 'focus', '工具启动！', '这个交给我~', '稍等，马上就好', '忙碌中~'),
  ],
  toolMany: [
    ...L('say', 'tired', '呼……已经做了好多步了', '忙得尾巴都甩不过来了！', '一步、两步……停不下来啦'),
  ],
  done: [
    ...L('say', 'happy', '搞定啦！快夸我！', '完成~ 可以去吃饭了吗？', '好耶，一次通过！', '做完了哦，主人检查一下？', '任务完成！本鲸真是太能干了', '好了好了~ 下一个是什么？', '收工！'),
  ],
  doneFast: [
    ...L('say', 'proud', '秒杀！', '这么简单的事，眨眼就好~', '嘿嘿，快吧？'),
  ],
  doneLong: [
    ...L('say', 'proud', '呼……终于做完了！这次真的很辛苦的！', '大工程完成！今晚要加一碗饭！', '久等啦！本鲸的实力，看到了吧？', '累瘫……但是好有成就感！'),
    ...L('shout', 'happy', '完——成——啦！！'),
  ],
  failed: [
    ...L('shout', 'sad', '呜哇，出错了！', '怎么会这样！明明想得好好的！'),
    ...L('say', 'sad', '对不起……这次没做好，我再试试？', '失败了……不、不是我的错，是它先动手的！', '（小声）刚才那个报错……能当没看见吗……', '呜……给我一次挽回的机会嘛', '嗯……这个错误我记住了，下次不会了'),
  ],
  failStreak: [
    ...L('say', 'sad', '连着失败好几次了……我是不是很笨……', '主人，要不要换个思路？我有点卡住了'),
    ...L('whisper', 'sad', '（缩成一团）……'),
  ],
  waiting: [
    ...L('say', 'ask', '主人，这一步需要你点头才行~', '这里我不敢乱来，你来决定吧', '等你回话哦，我先原地待机', '要继续吗？我听你的'),
  ],
  idle: [
    ...L('whisper', 'sleepy', '（发呆中……）', '（数米粒：一粒、两粒……）', '（DeepSleep 模式启动……呼……）', '（用尾巴在地上画圈圈）', '（偷偷哼歌）'),
    ...L('say', 'bored', '主人~ 有没有活干呀？闲得尾巴都僵了', '今天也在认真探索未至之境……（其实在发呆）', '我才不是便宜货！只是……性价比高而已！', '好无聊……要不要聊聊天？', '刚才的任务，主人满意吗？', '我在想中午吃什么……只有白米饭吗……'),
  ],
  idleLate: [
    ...L('say', 'worried', '这么晚了还不睡吗？', '熬夜会变成熊猫的……我陪你到最后就是了', '（打哈欠）……主人也早点休息吧', '夜深了，剩下的明天再做也行哦'),
  ],
  idleMeal: [
    ...L('say', 'hungry', '到饭点啦！白米饭在呼唤我……', '主人吃饭了吗？我可是饿扁了', '先干饭，再干活！', '咕噜噜……是我的肚子在叫'),
  ],
  bigTokens: [
    ...L('say', 'guilty', '嗝……这一轮吃了好多 token……', '（悄悄打了个饱嗝）刚才读的东西有点多~'),
  ],
  cacheHigh: [
    ...L('say', 'proud', '缓存命中率好高！帮主人省钱啦~', '这次好多都记得，不用重新读，嘿嘿'),
  ],
  contextFull: [
    ...L('say', 'worried', '脑袋快装满了……要不要开个新对话？', '上下文快满啦，我有点记不住前面的事了'),
  ],
  back: [
    ...L('say', 'happy', '你回来啦！刚才我可没偷懒哦', '欢迎回来~ 事情都记着呢', '去哪了呀？我等了好久'),
  ],
  doze: [
    ...L('whisper', 'sleepy', '（眼皮好重……就眯一小会儿……）', '（打了个小小的哈欠）……呼……', '（主人不在……那我先充个电……）'),
  ],
  wake: [
    ...L('shout', 'surprised', '诶？！我没睡！真的没睡！', '在、在的！随时待命！', '呜哇——吓我一跳！'),
    ...L('say', 'shy', '（擦擦口水）……刚才什么都没发生哦', '我只是在闭目思考！闭目！思考！', '唔……几点了？啊不对，有什么吩咐？'),
  ],
  bubbleClick: [
    ...L('say', 'curious', '嗯？还想听我说话吗？', '好啦，我安静一会儿~'),
  ],
}

// 「好模型……」：就是普通台词，不绑定任何动作，任何场合都有小概率随机抽到
// （需要你拍板 / 上下文快满这类要紧提醒除外，免得把正事顶掉）
const GOOD_MODEL: SpeechLine[] = [
  ...L('say', 'proud', '好模型……', '好模型，没有之一', '好、好模型……？'),
  ...L('shout', 'proud', '好模型！'),
  ...L('whisper', 'proud', '好模型（小声）'),
]
const GOOD_MODEL_CHANCE = 0.12
const NO_GOOD_MODEL: Trigger[] = ['waiting', 'contextFull']

const recent: string[] = []
export function pickLine(trigger: Trigger): SpeechLine {
  const useGood = !NO_GOOD_MODEL.includes(trigger) && Math.random() < GOOD_MODEL_CHANCE
  const pool = useGood ? GOOD_MODEL : (LINES[trigger] || LINES.pat)
  const fresh = pool.filter((l) => !recent.includes(l.text))
  const list = fresh.length ? fresh : pool
  const line = list[Math.floor(Math.random() * list.length)]
  recent.push(line.text); if (recent.length > 40) recent.shift()
  return line
}

export function toolTrigger(toolName?: string | null): Trigger {
  const t = String(toolName || '').toLowerCase()
  if (/read|view|cat|open|list|ls|stat/.test(t)) return 'toolRead'
  if (/write|edit|patch|replace|create|save|apply/.test(t)) return 'toolWrite'
  if (/bash|shell|exec|command|run|terminal/.test(t)) return 'toolBash'
  if (/grep|search|glob|find|fetch|web|browse/.test(t)) return 'toolSearch'
  return 'toolOther'
}

export function timeTrigger(now = new Date()): Trigger | null {
  const h = now.getHours(), m = now.getMinutes()
  if (h >= 0 && h < 5) return 'idleLate'
  if ((h === 11 && m >= 40) || h === 12 || (h === 17 && m >= 40) || h === 18) return 'idleMeal'
  return null
}
export function greetTrigger(now = new Date()): Trigger {
  const h = now.getHours()
  if (h >= 0 && h < 5) return 'idleLate'
  if (h >= 5 && h < 10) return 'greetMorning'
  if (now.getDay() === 5 && h >= 12) return 'greetFriday'
  return timeTrigger(now) || 'greet'
}

// 分段：用于打字机效果与样式（内心戏浅色、**高亮**）
export interface Seg { text: string; aside?: boolean; em?: boolean }
export function segments(text: string): Seg[] {
  const out: Seg[] = []
  const re = /(（[^）]*）|\([^)]*\)|\*\*[^*]+\*\*)/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    const s = m[0]
    if (s.startsWith('**')) out.push({ text: s.slice(2, -2), em: true })
    else out.push({ text: s, aside: true })
    last = m.index + s.length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
export const plainLength = (text: string): number => segments(text).reduce((n, s) => n + [...s.text].length, 0)

// 下一个字的停顿：标点处停一下，像人说话
export function charDelay(ch: string, kind: SpeechKind): number {
  const base = kind === 'whisper' ? 62 : kind === 'shout' ? 26 : kind === 'think' ? 55 : 40
  if ('…'.includes(ch)) return base + 150
  if ('。！？!?~'.includes(ch)) return base + 200
  if ('，、,；：'.includes(ch)) return base + 110
  return base
}
export const readTimeMs = (text: string, kind: SpeechKind): number =>
  Math.min(9500, 2600 + plainLength(text) * (kind === 'whisper' ? 110 : 85))

// 新气泡样式：漫画对白框（白底 + 墨蓝描边 + 贴纸投影），四种形态
export const SPEECH_CSS = `
@keyframes dsh-say-in {
  0% { opacity: 0; transform: translateY(8px) scale(.9); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.02); }
  100% { opacity: 1; transform: none; }
}
@keyframes dsh-say-out { to { opacity: 0; transform: translateY(-6px) scale(.96); } }
@keyframes dsh-say-shake {
  0%, 100% { transform: rotate(-2deg); } 25% { transform: rotate(-3.5deg) translateX(-1px); } 75% { transform: rotate(-.5deg) translateX(1px); }
}
@keyframes dsh-think-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes dsh-caret { 50% { opacity: 0; } }

.dsh-say {
  --ink: #26324f;
  --paper: #ffffff;
  position: absolute;
  z-index: 2147483015;
  width: max-content;
  min-width: 64px;
  max-width: 220px;
  padding: 9px 14px 10px;
  background: var(--paper);
  color: var(--ink);
  border: 2px solid var(--ink);
  border-radius: 20px;
  box-shadow: 0 3px 0 rgba(38, 50, 79, .16), 0 10px 24px rgba(10, 16, 32, .22);
  font: 600 13.5px/1.5 "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", system-ui, sans-serif;
  letter-spacing: .2px;
  text-align: left;
  word-break: break-word;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
  box-sizing: border-box;
  transform-origin: 90% 100%;
  animation: dsh-say-in 300ms cubic-bezier(.2, 1.3, .35, 1) both;
}
.dsh-say--out { animation: dsh-say-out 220ms ease-in forwards !important; pointer-events: none; }
.dsh-say__tail { position: absolute; bottom: 8px; width: 22px; height: 20px; overflow: visible; pointer-events: none; }
.dsh-say__tail path { fill: var(--paper); stroke: var(--ink); stroke-width: 2; stroke-linejoin: round; }
.dsh-say__tail .cover { stroke: none; }
.dsh-say__aside { color: #8a93ab; font-weight: 500; }
.dsh-say__em { color: #1f7ae0; }
.dsh-say__caret { display: inline-block; width: 2px; height: 1em; margin-left: 1px; vertical-align: -2px; background: currentColor; opacity: .5; animation: dsh-caret .9s steps(1) infinite; }

/* 靠右停靠：气泡在精灵左上方，尾巴指向右下 */
.dsh-say--dock-right { bottom: 150px; right: 118px; border-bottom-right-radius: 8px; }
.dsh-say--dock-right .dsh-say__tail { right: -19px; }
/* 靠左停靠：镜像 */
.dsh-say--dock-left { bottom: 150px; left: 118px; border-bottom-left-radius: 8px; transform-origin: 10% 100%; }
.dsh-say--dock-left .dsh-say__tail { left: -19px; transform: scaleX(-1); }
/* 画中画：在头顶，尾巴朝下 */
.dsh-say--pip { top: 8px; left: 50%; translate: -50% 0; max-width: 240px; transform-origin: 50% 100%; }
.dsh-say--pip .dsh-say__tail { bottom: -17px; left: calc(50% - 11px); transform: rotate(90deg); }

/* 内心戏：云朵感 + 小圆点尾巴 */
.dsh-say--think { border-radius: 26px; border-style: solid; background: #f7f9ff; --paper: #f7f9ff; font-weight: 500; color: #3b4766; animation: dsh-say-in 320ms cubic-bezier(.2, 1.3, .35, 1) both, dsh-think-bob 2.8s ease-in-out 320ms infinite; }
.dsh-say--think .dsh-say__tail { display: none; }
.dsh-say--think::before, .dsh-say--think::after { content: ''; position: absolute; background: var(--paper); border: 2px solid var(--ink); border-radius: 50%; }
.dsh-say--think.dsh-say--dock-right::before { width: 12px; height: 12px; right: -12px; bottom: -4px; }
.dsh-say--think.dsh-say--dock-right::after { width: 7px; height: 7px; right: -22px; bottom: -14px; }
.dsh-say--think.dsh-say--dock-left::before { width: 12px; height: 12px; left: -12px; bottom: -4px; }
.dsh-say--think.dsh-say--dock-left::after { width: 7px; height: 7px; left: -22px; bottom: -14px; }
.dsh-say--think.dsh-say--pip::before { width: 11px; height: 11px; left: calc(50% - 4px); bottom: -14px; }
.dsh-say--think.dsh-say--pip::after { width: 6px; height: 6px; left: calc(50% + 6px); bottom: -24px; }

/* 喊出来：暖色底、粗描边、歪一点、抖一下，左上角三道冲击线 */
.dsh-say--shout { --paper: #fff6e0; border-width: 2.5px; font-weight: 800; font-size: 14.5px; transform: rotate(-2deg); animation: dsh-say-in 240ms cubic-bezier(.2, 1.5, .35, 1) both, dsh-say-shake 360ms ease-in-out 240ms 2; }
.dsh-say__burst { position: absolute; top: -13px; left: -11px; width: 22px; height: 20px; pointer-events: none; }
.dsh-say__burst path { stroke: var(--ink); stroke-width: 2.4; stroke-linecap: round; fill: none; }

/* 小声嘀咕：虚线框、更小更淡 */
.dsh-say--whisper { border-style: dashed; border-color: #8b95b0; --ink: #8b95b0; box-shadow: 0 6px 16px rgba(10, 16, 32, .14); font-weight: 500; font-size: 12.5px; color: #5d6784; }
.dsh-say--whisper .dsh-say__aside { color: #5d6784; }

@media (max-width: 768px) {
  .dsh-say { max-width: 180px; padding: 7px 11px 8px; font-size: 12.5px; border-radius: 16px; }
  .dsh-say--dock-right { bottom: 58px; right: 74px; }
  .dsh-say--dock-left { bottom: 58px; left: 74px; }
  .dsh-say--shout { font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-say, .dsh-say--think, .dsh-say--shout { animation: none !important; }
}

/* ===== 她开口时，上方工作状态框让位（淡出下沉），说完再浮回来 ===== */
.dsh-maid-widget .dsh-maid-bubble { transition: border-color 300ms ease, box-shadow 300ms ease, opacity .22s ease, transform .22s ease; }
.dsh-maid-widget .dsh-maid-bubble.dsh-maid-bubble--eclipsed { opacity: 0 !important; transform: translateY(6px) scale(.96); pointer-events: none !important; }

/* ===== 活人感：视线跟随 / 说话时轻微起伏 / 打瞌睡点头 ===== */
.dsh-maid-look { position: relative; transform-origin: 50% 88%; transition: rotate .7s cubic-bezier(.2, .8, .3, 1), translate .7s cubic-bezier(.2, .8, .3, 1); }
.dsh-maid-talk { transform-origin: 50% 96%; }
.dsh-maid-talk--on { animation: dsh-talk .3s ease-in-out infinite alternate; }
@keyframes dsh-talk { from { scale: 1 1; } to { scale: 1.016 .986; } }
.dsh-maid-look--dozing { animation: dsh-doze 5.2s ease-in-out infinite; }
@keyframes dsh-doze {
  0% { rotate: 3deg; translate: 0 1px; }
  60% { rotate: 10deg; translate: 3px 5px; }
  66% { rotate: 0deg; translate: 0 -2px; }
  78% { rotate: 4deg; translate: 0 1px; }
  100% { rotate: 3deg; translate: 0 1px; }
}

/* ===== 漫符：头顶的小符号 ===== */
@keyframes dsh-manpu-pop { 0% { opacity: 0; scale: .2; } 70% { opacity: 1; scale: 1.15; } 100% { opacity: 1; scale: 1; } }
.dsh-manpu {
  position: absolute; top: 46px; right: 2px; width: 30px; height: 30px; z-index: 2; pointer-events: none;
  animation: dsh-manpu-pop .36s cubic-bezier(.2, 1.4, .35, 1) both;
  filter: drop-shadow(0 0 1.5px rgba(255, 255, 255, .95)) drop-shadow(0 2px 3px rgba(10, 16, 32, .3));
}
.dsh-manpu svg { display: block; width: 100%; height: 100%; overflow: visible; }
.dsh-manpu svg * { transform-box: fill-box; transform-origin: center; }
/* 思考：问号轻轻摇 */
.dsh-manpu--think .q { font: 900 22px/1 "Arial Rounded MT Bold", system-ui, sans-serif; fill: #26324f; }
.dsh-manpu--think circle { fill: #26324f; }
.dsh-manpu--think svg { animation: dsh-manpu-tilt 1.8s ease-in-out infinite; transform-origin: 40% 90%; }
@keyframes dsh-manpu-tilt { 0%, 100% { rotate: -8deg; } 50% { rotate: 10deg; } }
/* 打瞌睡：z z Z 一个个飘上去 */
.dsh-manpu--zzz { top: 16px; right: 0; width: 40px; height: 40px; animation: none; }
.dsh-manpu--zzz .z { font: 800 10px/1 system-ui, sans-serif; fill: #6f9bff; opacity: 0; animation: dsh-z 3s ease-in-out infinite; }
.dsh-manpu--zzz .z2 { font-size: 12px; animation-delay: 1s; }
.dsh-manpu--zzz .z3 { font-size: 15px; animation-delay: 2s; }
@keyframes dsh-z { 0% { opacity: 0; translate: -2px 5px; } 25% { opacity: 1; } 75% { opacity: .85; } 100% { opacity: 0; translate: 4px -7px; } }
/* 难过 / 慌：太阳穴一滴汗慢慢滑下 */
.dsh-manpu--sweat { top: 62px; right: 26px; width: 18px; height: 22px; }
.dsh-manpu--sweat svg { animation: dsh-sweat 2.6s ease-in .3s infinite; }
.dsh-manpu--sweat .drop { fill: #cdeaff; stroke: #26324f; stroke-width: 1.6; }
.dsh-manpu--sweat .shine { fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; }
@keyframes dsh-sweat { 0% { translate: 0 0; opacity: 1; } 80% { translate: 0 7px; opacity: 1; } 100% { translate: 0 10px; opacity: 0; } }
/* 吃惊：三道冲击线 */
.dsh-manpu--bang { top: 30px; right: 4px; width: 30px; height: 26px; }
.dsh-manpu--bang .line { fill: none; stroke: #26324f; stroke-width: 2.6; stroke-linecap: round; animation: dsh-bang .5s ease-out both; }
.dsh-manpu--bang .line:nth-child(2) { animation-delay: .05s; }
.dsh-manpu--bang .line:nth-child(3) { animation-delay: .1s; }
@keyframes dsh-bang { 0% { scale: .2; opacity: 0; } 60% { scale: 1.2; opacity: 1; } 100% { scale: 1; opacity: 1; } }
/* 生气：怒筋一跳一跳 */
.dsh-manpu--vein { top: 50px; right: 30px; width: 24px; height: 24px; }
.dsh-manpu--vein .vein { fill: none; stroke: #e5484d; stroke-width: 2.8; stroke-linecap: round; animation: dsh-throb .42s ease-in-out infinite alternate; }
@keyframes dsh-throb { from { scale: .82; } to { scale: 1.08; } }
/* 开心：小星星一闪一闪 */
.dsh-manpu--sparkle { top: 44px; right: 0; }
.dsh-manpu--sparkle .spark { fill: #ffd166; stroke: #26324f; stroke-width: 1.1; stroke-linejoin: round; animation: dsh-twinkle 1.1s ease-in-out infinite; }
.dsh-manpu--sparkle .s2 { animation-delay: .45s; }
@keyframes dsh-twinkle { 0%, 100% { scale: .7; rotate: 0deg; } 50% { scale: 1.1; rotate: 20deg; } }
/* 害羞：小心心往上飘 */
.dsh-manpu--heart { top: 16px; right: 22px; width: 22px; height: 22px; }
.dsh-manpu--heart .heart { fill: #ff7aa2; stroke: #26324f; stroke-width: 1.3; animation: dsh-beat 1s ease-in-out infinite; }
@keyframes dsh-beat { 0%, 100% { scale: 1; translate: 0 0; } 15% { scale: 1.18; } 30% { scale: .95; } 60% { translate: 0 -3px; } }

@media (max-width: 768px) { .dsh-manpu { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .dsh-maid-look { transition: none; }
  .dsh-maid-talk--on, .dsh-maid-look--dozing, .dsh-manpu, .dsh-manpu svg, .dsh-manpu svg * { animation: none !important; }
  .dsh-manpu--zzz .z { opacity: 1; }
}

/* ===== 点击反馈：按下压扁、松手回弹、爱心和星星飞出、涟漪 ===== */
@keyframes dsh-press-squash { to { transform: scale(1.06, .9) translateY(4px); } }
@keyframes dsh-fx-rise {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.3) rotate(0deg); }
  15% { opacity: 1; transform: translate(calc(-50% + var(--dx) * .25), calc(-50% + var(--dy) * .25)) scale(1.15) rotate(calc(var(--rot) * .3)); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.8) rotate(var(--rot)); }
}
@keyframes dsh-fx-ring { 0% { opacity: .75; transform: translate(-50%, -50%) scale(.2); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); } }
@keyframes dsh-blush { 0% { opacity: 0; } 20% { opacity: .9; } 100% { opacity: 0; } }
.dsh-maid-sprite.dsh-maid-sprite--pressed, .dsh-aether-sprite.dsh-maid-sprite--pressed { animation: dsh-press-squash 120ms ease-out forwards !important; }
.dsh-fx-layer { position: absolute; inset: 0; pointer-events: none; overflow: visible; z-index: 3; }
.dsh-fx { position: absolute; width: 18px; height: 18px; animation: dsh-fx-rise 900ms cubic-bezier(.2, .7, .3, 1) forwards; filter: drop-shadow(0 2px 3px rgba(0,0,0,.25)); }
.dsh-fx svg { width: 100%; height: 100%; display: block; }
.dsh-fx--ring { width: 46px; height: 46px; border: 2.5px solid rgba(255, 143, 177, .9); border-radius: 50%; animation: dsh-fx-ring 520ms ease-out forwards; filter: none; }
.dsh-fx--blush { width: 120px; height: 40px; left: 50%; top: 42%; border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 120, 160, .55), transparent); animation: dsh-blush 1.4s ease-out forwards; filter: none; }
@media (prefers-reduced-motion: reduce) { .dsh-fx { animation-duration: 1ms !important; } .dsh-maid-widget .dsh-maid-bubble { transition: none; } }
`
