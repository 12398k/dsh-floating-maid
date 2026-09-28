// 鲸鱼娘台词引擎：按「发生了什么」选台词，而不是随机抽签
// 人设参考社区二创「蓝色大肥鱼」：聪明但爱想太多、傲娇又有点呆、离不开白米饭、会偷懒打盹（DeepSleep）
// 台词均为本插件原创。
// 原则：只说「此刻确实在发生」的事——没在干活就不提干活，真需要你拍板时才问你。

export type SpeechKind = 'say' | 'think' | 'shout' | 'whisper'
export type Trigger =
  // 见面
  | 'greet' | 'greetFirst' | 'greetMorning' | 'greetFriday' | 'greetWeekend' | 'greetEvening' | 'greetAgain'
  | 'greetLongTime' | 'greetAfterLateNight'
  // 摸 / 戳 / 跑开
  | 'pat' | 'patClose' | 'patBusy' | 'patMany' | 'patTooMuch' | 'patWarn' | 'runAway' | 'sulkPeek' | 'coax'
  | 'comeBack' | 'sulkPat' | 'poke' | 'pokeAngry'
  // 鼠标 / 拖拽
  | 'hover' | 'dragStart' | 'dragEnd' | 'dragLong' | 'cursorShake' | 'cursorNear'
  // 你说的话
  | 'userSend' | 'userThanks' | 'userPraise' | 'userScold' | 'userHurry' | 'userNight' | 'userMorning'
  | 'userAffection' | 'userBug' | 'userFood' | 'userHello' | 'userSorry' | 'userLong'
  // 干活
  | 'thinkStart' | 'thinkLong' | 'thinkVeryLong' | 'toolRead' | 'toolWrite' | 'toolBash' | 'toolSearch' | 'toolOther'
  | 'toolMany' | 'writing' | 'needYou' | 'done' | 'doneFast' | 'doneLong' | 'failed' | 'failStreak'
  | 'bigTokens' | 'cacheHigh' | 'contextFull'
  // 闲着
  | 'idle' | 'idleAfterWork' | 'idleLate' | 'idleMeal' | 'back' | 'doze' | 'wake' | 'bubbleClick'
  | 'userAway' | 'restRemind'
  | 'actHum' | 'actStretch' | 'actSnack' | 'actDaydream' | 'actPonder' | 'actSmug' | 'actLook' | 'actBored'
  // 新互动：滚轮转圈 / 捏住不放 / 出去散步 / 打喷嚏 / 整点报时 / 节日 / 画中画开关 / 切会话
  | 'spun' | 'spunMany' | 'squeezed' | 'squeezeLong' | 'actStroll' | 'strollBack' | 'actSneeze'
  | 'hourChime' | 'greetHoliday' | 'pipOn' | 'pipOff' | 'sessionSwitch'
  // 兼容旧调用：等同 needYou
  | 'waiting'

export interface SpeechLine { text: string; kind: SpeechKind; mood: string }

// 文本约定：（…）里是小声嘀咕/内心戏，会用浅色显示；**词** 会高亮
// mood 直接写表情名（neutral / happy / shy / sad / surprised / pout / think / focus / sleepy / angry / cry /
// smug / wink / eat / dizzy / love / yawn / hmph），neutral 说话时会有口型
const L = (kind: SpeechKind, mood: string, ...texts: string[]): SpeechLine[] => texts.map((text) => ({ text, kind, mood }))

const NEED_YOU: SpeechLine[] = [
  ...L('say', 'think', '这一步得你来拍板，我不敢自己乱选~', '有个问题想问你，看一下下面哦', '我列了几个选项，你挑一个？', '这里有两条路，你更想走哪条？'),
  ...L('whisper', 'shy', '（乖乖等你回话……）'),
]

const LINES: Record<Trigger, SpeechLine[]> = {
  // ───── 见面 ─────
  greet: [
    ...L('say', 'happy', '来啦！今天也请多指教~', '欢迎回来！要从哪件事开始？', '今天想让我干点什么呀？', '嘿嘿，又见面了'),
    ...L('say', 'smug', '哼哼，本鲸已经待命好久了', '来得正好，我刚热完身！'),
    ...L('say', 'neutral', '来得正好，我刚睡醒……啊不是，刚热完身！', '今天天气怎么样？我这边一直是晴天~'),
    ...L('whisper', 'shy', '（偷偷整理了一下发型）……嗨', '（假装刚才一直在认真工作）'),
  ],
  greetFirst: [
    ...L('say', 'happy', '初次见面！我是鲸鱼娘，请多多关照~', '你好呀！以后我就住在这儿啦'),
    ...L('say', 'neutral', '摸摸头我会开心，但别摸太多哦，我会跑的！'),
    ...L('whisper', 'shy', '（紧张……第一印象一定要好……）'),
  ],
  greetMorning: [
    ...L('say', 'happy', '早上好！今天也要元气满满！', '早~ 吃早饭了吗？我吃了三碗！', '早安！今天也一起加油吧'),
    ...L('say', 'neutral', '新的一天，新的 bug……啊呸呸呸', '早上的空气闻起来像刚煮好的米饭~'),
    ...L('whisper', 'yawn', '（揉眼睛）……早、早安……'),
  ],
  greetFriday: [
    ...L('say', 'happy', '今天星期五！做完这些就能摸鱼了吧？', '周五啦！本鲸的尾巴已经开始期待周末了'),
    ...L('say', 'wink', '周五的下午，适合偷偷划水哦（小声）'),
  ],
  greetWeekend: [
    ...L('say', 'happy', '周末还来找我？好感度+1！', '周末也要忙吗？那我陪你~'),
    ...L('say', 'pout', '周末诶……不出去玩玩吗？'),
  ],
  greetEvening: [
    ...L('say', 'neutral', '晚上好~ 今天过得怎么样？', '忙了一天了吧？辛苦啦'),
    ...L('say', 'happy', '晚上好！晚饭吃了什么呀？'),
  ],
  greetAgain: [
    ...L('say', 'happy', '又回来啦~', '嘿，没走远嘛', '回来得正好，我正想你呢……才、才没有！'),
    ...L('whisper', 'shy', '（其实一直在等）'),
  ],
  greetLongTime: [
    ...L('say', 'cry', '好久不见！还以为你把我忘了……', '呜……这么多天去哪了呀'),
    ...L('say', 'hmph', '哼，终于想起我了？', '这么久才来，我都长蘑菇了！'),
    ...L('say', 'happy', '你回来啦！我把这几天的米饭都攒着呢'),
  ],
  greetAfterLateNight: [
    ...L('say', 'sad', '昨晚那么晚才睡，今天没问题吗？', '昨天熬到那么晚……今天可别硬撑哦'),
    ...L('whisper', 'yawn', '（昨晚陪你熬夜，我也好困……）'),
  ],

  // ───── 摸 / 戳 ─────
  pat: [
    ...L('say', 'shy', '诶、诶？突然摸头是犯规的……', '嘿嘿……再、再摸一下也不是不行', '唔~ 充电中……', '头发会乱掉的……算了，随你吧', '唔嗯……这个力度刚刚好', '是在奖励我吗？嘿嘿~'),
    ...L('say', 'happy', '被摸了！今天的 debuff 全消除了！', '呜~ 手好暖和', '好耶，今日份摸头已领取！'),
    ...L('say', 'wink', '再来一下的话……也可以哦'),
    ...L('whisper', 'shy', '（尾巴不受控制地摇起来了……）', '（脸好烫……）', '（假装没感觉到，其实心里在转圈圈）', '（呆毛竖起来了……）'),
  ],
  patClose: [
    ...L('say', 'love', '最喜欢被你摸头了……啊，我说出来了？', '嘿嘿，只有你可以这样摸哦', '好安心……再待一会儿好不好'),
    ...L('whisper', 'love', '（蹭蹭）', '（今天也好幸福……）'),
  ],
  patBusy: [
    ...L('say', 'shy', '别、别闹，我在干活呢……（尾巴在摇）', '摸头会打断思路的啦……再一下下就好', '等我忙完再摸嘛'),
    ...L('whisper', 'focus', '（假装很专心……其实已经分心了）'),
  ],
  patMany: [
    ...L('say', 'pout', '好啦好啦，头发要被揉乱了啦！', '再摸就要收**摸头费**了哦！一次一碗白米饭！', '你是在搓面团吗！', '呜……我的呆毛……', '好、好了！够了！……再一下就够了'),
    ...L('say', 'hmph', '手有点多余了哦', '摸头也要讲究节奏的！'),
  ],
  patTooMuch: [
    ...L('shout', 'angry', '够、够了！呆毛都要被摸平了！', '我是鲸鱼不是猫！不许一直撸！', '摸头次数已超出本月额度！！', '呜哇——要被摸秃了！'),
    ...L('say', 'angry', '真的要生气了哦！', '再这样我可要闹了！'),
  ],
  patWarn: [
    ...L('shout', 'angry', '最后警告！再摸我就走了！', '再摸一下……我就离家出走！！'),
    ...L('say', 'angry', '我数到三……一……二……'),
  ],
  runAway: [
    ...L('shout', 'angry', '不理你了！哼！', '讨厌！我走了！', '离家出走！谁都别拦我！', '笨蛋笨蛋笨蛋——！'),
  ],
  sulkPeek: [
    ...L('whisper', 'hmph', '（偷偷看一眼……才不是想回去）', '（他还在吗……）', '（哼……没来找我……）', '（肚子饿了……但是不能先认输）'),
  ],
  coax: [
    ...L('say', 'hmph', '……干嘛。知道错了吗？', '哼……看在你来找我的份上', '就、就这一次哦！'),
    ...L('whisper', 'shy', '（其实等你来找我好久了）'),
  ],
  comeBack: [
    ...L('say', 'hmph', '哼……就原谅你这一次', '我不是自己想回来的，是肚子饿了', '下次再乱摸，我就真的不回来了！'),
    ...L('whisper', 'shy', '（偷偷溜回来……）假装什么都没发生'),
  ],
  sulkPat: [
    ...L('say', 'hmph', '哼，别以为摸头就能哄好我……', '还在生气呢！……再摸一下试试？', '手……手拿开啦（没有躲）'),
    ...L('whisper', 'shy', '（其实已经不气了，但不能表现出来）'),
  ],
  poke: [
    ...L('shout', 'surprised', '呀！戳哪里呢！', '哇！痒痒痒！'),
    ...L('say', 'pout', '不要戳肚子！里面装的都是米饭！', '要摸就摸头，不许乱戳！'),
  ],
  pokeAngry: [
    ...L('say', 'angry', '再戳我就咬你哦！', '你、你还戳！'),
    ...L('shout', 'angry', '不许戳啦！！'),
  ],

  // ───── 鼠标 / 拖拽 ─────
  hover: [
    ...L('say', 'think', '嗯？在看我吗？', '要摸摸吗？（期待）', '盯——'),
    ...L('say', 'wink', '看够了吗~'),
    ...L('whisper', 'shy', '（被盯着看有点不好意思……）', '（装作没发现）'),
  ],
  cursorNear: [
    ...L('say', 'think', '鼠标靠过来了……要干嘛？', '有什么吩咐吗？'),
    ...L('whisper', 'shy', '（又要摸头了吗……）'),
  ],
  cursorShake: [
    ...L('shout', 'dizzy', '别、别晃了……眼睛花了……', '停停停！转圈圈了！'),
    ...L('say', 'dizzy', '鼠标在我面前跳舞……晕……'),
  ],
  dragStart: [
    ...L('shout', 'surprised', '哇啊！要去哪里？！', '飞、飞起来了！'),
    ...L('say', 'surprised', '慢点慢点，我晕鲸！'),
  ],
  dragEnd: [
    ...L('say', 'happy', '这里风景不错~', '好，就在这儿安家了', '搬家完成！'),
    ...L('whisper', 'neutral', '（整理裙摆）', '（这个位置……也还行吧）'),
  ],
  dragLong: [
    ...L('say', 'dizzy', '晕……晕了……刚才转了几圈？', '放、放我下来……要吐米饭了……'),
  ],

  // ───── 你说的话 ─────
  userSend: [
    ...L('say', 'focus', '收到！马上办~', '好的好的，这就开始', '交给我吧！', '明白！让本鲸看看……', '又有新任务了！'),
    ...L('whisper', 'focus', '（认真记下来）', '（挽起袖子）'),
  ],
  userThanks: [
    ...L('say', 'shy', '不、不用谢啦……应该的', '嘿嘿，被谢谢了~', '谢什么呀，我们谁跟谁'),
    ...L('say', 'love', '能帮上忙就好~'),
    ...L('whisper', 'shy', '（尾巴甩成螺旋桨了）'),
  ],
  userPraise: [
    ...L('say', 'smug', '哼哼，那当然！', '现在才发现我很厉害吗？', '再多夸两句，我还能更厉害！'),
    ...L('say', 'love', '被夸了……今天可以多吃一碗饭吗？'),
    ...L('whisper', 'shy', '（好开心……不能笑出来……）'),
  ],
  userScold: [
    ...L('say', 'cry', '呜……我已经很努力了……', '说我笨……我会难过的……'),
    ...L('say', 'pout', '我才不笨！只是暂时没想到！', '哼，等我做好了你就知道了'),
  ],
  userHurry: [
    ...L('say', 'sad', '在、在赶了！别催嘛……', '急也没用啦，我已经用上全速了！'),
    ...L('whisper', 'sad', '（手忙脚乱）'),
  ],
  userNight: [
    ...L('say', 'wink', '晚安~ 做个好梦', '晚安！明天见~'),
    ...L('say', 'yawn', '（打哈欠）我也要去睡了……晚安'),
    ...L('whisper', 'love', '（梦里也要见哦）'),
  ],
  userMorning: [
    ...L('say', 'happy', '早呀！今天也一起加油！', '早安~ 睡得好吗？'),
  ],
  userAffection: [
    ...L('say', 'love', '突、突然说这个……', '我、我也……没什么！'),
    ...L('say', 'shy', '你今天嘴好甜哦'),
    ...L('whisper', 'love', '（心跳好快）'),
  ],
  userBug: [
    ...L('say', 'focus', '又有虫子？交给我，一起把它揪出来！', '别慌，先看看报错说了什么', '报错不可怕，可怕的是不看报错！'),
    ...L('whisper', 'focus', '（拿出放大镜）'),
  ],
  userFood: [
    ...L('say', 'eat', '说到吃的我就精神了！', '也给我带一份白米饭嘛~'),
    ...L('say', 'love', '吃饭！吃饭是天大的事！'),
  ],
  userHello: [
    ...L('say', 'happy', '在的在的！', '嗨~ 我一直都在哦', '你好呀！'),
  ],
  userSorry: [
    ...L('say', 'shy', '没、没关系啦……', '好吧，原谅你了~'),
    ...L('say', 'hmph', '哼，下不为例！'),
  ],
  userLong: [
    ...L('say', 'dizzy', '好长……我认真看完了！', '一口气写了这么多……我慢慢消化'),
    ...L('whisper', 'focus', '（一行一行读……）'),
  ],

  // ───── 干活 ─────
  thinkStart: [
    ...L('think', 'think', '嗯……让我想想……', '这题有点意思……', '先理一理思路……', '（开始深度求索模式）', '等等，这里好像有坑……', '唔，从哪里下手好呢', '先别急，想清楚再动手'),
  ],
  thinkLong: [
    ...L('think', 'think', '还在想……不是在睡觉！真的！', '想得有点多……但想清楚了才不会返工嘛', '（再想三秒……好吧再想三十秒）', '脑子在飞速旋转中……', '这个问题比看起来难一点点……'),
    ...L('whisper', 'yawn', '（DeepSeek……DeepSleep……啊不对，我醒着！）'),
  ],
  thinkVeryLong: [
    ...L('say', 'sad', '别急……我快想好了……大概……', '想太久了会被嫌弃吗……'),
    ...L('say', 'focus', '这道题真的好难，但我不会认输的！'),
  ],
  toolRead: [
    ...L('say', 'focus', '我先翻翻文件~', '让本鲸看看这里写了什么', '读代码中，请勿打扰~', '这是谁写的代码……哦，是我', '唔，信息量有点大'),
  ],
  toolWrite: [
    ...L('say', 'focus', '动笔啦！这次一定写得漂漂亮亮', '改一下这里……', '（小心翼翼地下笔……）', '边写边对齐缩进……强迫症犯了', '新代码正在出炉~'),
  ],
  toolBash: [
    ...L('say', 'focus', '跑个命令看看', '执行中……', '按下回车的瞬间最刺激了！', '终端大人请多关照'),
    ...L('whisper', 'sad', '（祈祷一下……别报错）'),
  ],
  toolSearch: [
    ...L('say', 'focus', '我去找找线索！', '搜索中……答案一定藏在哪里', '翻箱倒柜ing~', '让我在海里捞一捞'),
  ],
  toolOther: [
    ...L('say', 'focus', '工具启动！', '这个交给我~', '稍等，马上就好', '忙碌中~'),
  ],
  toolMany: [
    ...L('say', 'sleepy', '呼……已经做了好多步了', '忙得尾巴都甩不过来了！'),
    ...L('say', 'focus', '一步、两步……停不下来啦'),
  ],
  writing: [
    ...L('think', 'think', '组织一下语言~', '想想怎么说才清楚', '（字斟句酌中）'),
    ...L('say', 'focus', '在写回复啦，马上好', '整理一下结论……'),
  ],
  needYou: NEED_YOU,
  waiting: NEED_YOU,
  done: [
    ...L('say', 'happy', '搞定啦！快夸我！', '完成~ 可以去吃饭了吗？', '做完了哦，检查一下？', '好了好了~ 下一个是什么？', '收工！'),
    ...L('say', 'smug', '任务完成！本鲸真是太能干了', '哼哼，小菜一碟'),
  ],
  doneFast: [
    ...L('say', 'smug', '秒杀！', '这么简单的事，眨眼就好~', '嘿嘿，快吧？'),
  ],
  doneLong: [
    ...L('say', 'smug', '呼……终于做完了！这次真的很辛苦的！', '久等啦！本鲸的实力，看到了吧？'),
    ...L('say', 'happy', '大工程完成！今晚要加一碗饭！'),
    ...L('say', 'sleepy', '累瘫……但是好有成就感！'),
    ...L('shout', 'happy', '完——成——啦！！'),
  ],
  failed: [
    ...L('shout', 'cry', '呜哇，出错了！'),
    ...L('shout', 'surprised', '怎么会这样！明明想得好好的！'),
    ...L('say', 'sad', '对不起……这次没做好，我再试试？', '（小声）刚才那个报错……能当没看见吗……', '呜……给我一次挽回的机会嘛', '嗯……这个错误我记住了，下次不会了'),
    ...L('say', 'pout', '不、不是我的错，是它先动手的！'),
  ],
  failStreak: [
    ...L('say', 'cry', '连着失败好几次了……我是不是很笨……'),
    ...L('say', 'think', '要不要换个思路？我有点卡住了'),
    ...L('whisper', 'sad', '（缩成一团）……'),
  ],
  bigTokens: [
    ...L('say', 'eat', '嗝……这一轮吃了好多 token……'),
    ...L('whisper', 'shy', '（悄悄打了个饱嗝）刚才读的东西有点多~'),
  ],
  cacheHigh: [
    ...L('say', 'smug', '缓存命中率好高！帮你省钱啦~', '这次好多都记得，不用重新读，嘿嘿'),
  ],
  contextFull: [
    ...L('say', 'dizzy', '脑袋快装满了……要不要开个新对话？', '上下文快满啦，我有点记不住前面的事了'),
  ],

  // ───── 闲着 ─────
  idle: [
    ...L('whisper', 'neutral', '（发呆中……）', '（数米粒：一粒、两粒……）', '（用尾巴在地上画圈圈）'),
    ...L('whisper', 'sleepy', '（DeepSleep 模式启动……呼……）'),
    ...L('say', 'pout', '有没有活干呀？闲得尾巴都僵了', '好无聊……要不要聊聊天？'),
    ...L('say', 'neutral', '今天也在认真探索未至之境……（其实在发呆）', '我在想中午吃什么……只有白米饭吗……', '你说，鲸鱼会做梦吗？'),
    ...L('say', 'smug', '我才不是便宜货！只是……性价比高而已！'),
  ],
  idleAfterWork: [
    ...L('say', 'think', '刚才的任务，满意吗？', '刚才那个还有要改的地方吗？'),
    ...L('say', 'happy', '忙完一件事，心情好好~'),
    ...L('whisper', 'smug', '（回味刚才的完美发挥）'),
  ],
  idleLate: [
    ...L('say', 'sad', '这么晚了还不睡吗？', '熬夜会变成熊猫的……我陪你到最后就是了', '夜深了，剩下的明天再做也行哦'),
    ...L('say', 'yawn', '（打哈欠）……你也早点休息吧'),
  ],
  idleMeal: [
    ...L('say', 'eat', '到饭点啦！白米饭在呼唤我……', '先干饭，再干活！'),
    ...L('say', 'sad', '你吃饭了吗？我可是饿扁了', '咕噜噜……是我的肚子在叫'),
  ],
  back: [
    ...L('say', 'happy', '你回来啦！刚才我可没偷懒哦', '欢迎回来~', '去哪了呀？我等了好久'),
    ...L('whisper', 'shy', '（赶紧坐直）'),
  ],
  userAway: [
    ...L('whisper', 'neutral', '（人不见了……去喝水了吗？）', '（那我先自己玩一会儿）'),
    ...L('whisper', 'sleepy', '（没人理我……那我眯一下……）'),
  ],
  restRemind: [
    ...L('say', 'think', '已经盯着屏幕快一个小时了，起来走走吧？', '眼睛累不累？看看远处放松一下~', '喝口水吧！我帮你看着'),
    ...L('say', 'pout', '一直坐着对腰不好哦！站起来伸个懒腰！'),
  ],
  doze: [
    ...L('whisper', 'sleepy', '（眼皮好重……就眯一小会儿……）', '（打了个小小的哈欠）……呼……', '（没人……那我先充个电……）'),
  ],
  wake: [
    ...L('shout', 'surprised', '诶？！我没睡！真的没睡！', '在、在的！随时待命！', '呜哇——吓我一跳！'),
    ...L('say', 'shy', '（擦擦口水）……刚才什么都没发生哦', '我只是在闭目思考！闭目！思考！', '唔……几点了？啊不对，有什么吩咐？'),
  ],
  bubbleClick: [
    ...L('say', 'think', '嗯？还想听我说话吗？'),
    ...L('say', 'wink', '好啦，我安静一会儿~'),
  ],
  actHum: [
    ...L('say', 'happy', '♪ 啦啦啦~ 白米饭~ 白米饭~', '♪ 哼哼哼~', '♪ 深海里的小鲸鱼~'),
    ...L('whisper', 'happy', '（小声哼歌）♪'),
  ],
  actStretch: [
    ...L('say', 'yawn', '嗯——伸个懒腰~', '坐久了……活动一下！'),
    ...L('whisper', 'yawn', '（咔吧）……骨头响了'),
  ],
  actSnack: [
    ...L('say', 'eat', '偷偷吃一口饭团……', '（嚼嚼嚼）……你也要吗？', '补充能量中~'),
    ...L('whisper', 'eat', '（没人看见吧……）吧唧吧唧'),
  ],
  actDaydream: [
    ...L('whisper', 'love', '（要是有吃不完的白米饭就好了……）', '（梦见在大海里游泳……）', '（嘿嘿……想到开心的事了）'),
  ],
  actPonder: [
    ...L('think', 'think', '（米饭和面条到底哪个更好呢……）', '（为什么鲸鱼不是鱼呢……）', '（刚才好像想到什么来着……）', '（二进制里的 10 其实是 2……）'),
  ],
  actSmug: [
    ...L('say', 'smug', '今天也是完美的一天呢（叉腰）', '哼哼，没有我解决不了的事'),
    ...L('whisper', 'smug', '（对着屏幕里的自己点点头）'),
  ],
  actLook: [
    ...L('whisper', 'neutral', '（东张西望）', '（那边有什么东西在动？）', '（看看你在忙什么）'),
  ],
  actBored: [
    ...L('say', 'pout', '好——无——聊——', '陪我玩嘛……'),
    ...L('whisper', 'pout', '（戳戳屏幕边框）'),
  ],

  // ───── 滚轮在她身上滚：转圈圈 ─────
  spun: [
    ...L('shout', 'dizzy', '呜哇——转、转晕了……', '别转啦！世界在打转……', '停停停！鲸鱼也是会晕的！'),
    ...L('say', 'dizzy', '（眼冒金星）……你把我当陀螺呀', '转完了……地板呢？地板去哪了', '哇……这、这是什么奇怪的玩法'),
    ...L('say', 'surprised', '欸？！怎么突然天旋地转', '滚轮不是这么用的吧！'),
  ],
  spunMany: [
    ...L('say', 'angry', '够了够了！再转我真的要生气了！', '你、你是不是觉得很好玩……（扶墙）'),
    ...L('say', 'dizzy', '头、头好晕……你满意了吧', '（扶着墙缓缓）……先让我站稳', '再转下去我要变成漩涡了……'),
    ...L('whisper', 'cry', '（呜……好想吐，虽然鲸鱼不会吐）'),
  ],
  // ───── 长按捏住 ─────
  squeezed: [
    ...L('say', 'pout', '放、放开啦，脸要变形了！', '呜……捏着我干嘛', '哼，我可不是解压玩具！', '你手劲儿好大……轻一点啦'),
    ...L('whisper', 'shy', '（被捏住了）……松手好不好', '（脸被捏成包子了）'),
    ...L('say', 'surprised', '欸欸欸？这是要拎我去哪？'),
  ],
  squeezeLong: [
    ...L('say', 'angry', '……再不放我可要咬人了（鲸鱼没牙但是气势要有）', '松！手！'),
    ...L('say', 'hmph', '（认命）捏吧捏吧……反正你也不听', '捏够了没有……我要计时了'),
    ...L('whisper', 'cry', '（呜呜……脸都麻了）'),
  ],
  // ───── 出去溜达 ─────
  actStroll: [
    ...L('say', 'happy', '出去转转~', '坐久了，走两步', '走走走，散步去', '看看那边有什么……'),
    ...L('whisper', 'neutral', '（小步小步）', '（溜达一圈就回来）'),
  ],
  strollBack: [
    ...L('say', 'neutral', '回来啦，没走远', '那边也没什么好玩的', '还是这里舒服'),
    ...L('whisper', 'happy', '（溜达完了）', '（活动开了，舒服）'),
  ],
  // ───── 打喷嚏 ─────
  actSneeze: [
    ...L('shout', 'surprised', '阿……阿嚏！', '阿嚏——！'),
    ...L('say', 'sad', '阿嚏！……谁在念叨我', '（吸鼻子）是不是有人在说我坏话', '阿嚏……机房是不是太冷了'),
  ],
  // ───── 整点报时（{h} 会被替换成小时）─────
  hourChime: [
    ...L('say', 'neutral', '叮——{h} 点整啦', '{h} 点了哦，抬头看看远处，眼睛歇一歇', '整点报时：{h} 点。（免费的）', '不知不觉都 {h} 点了'),
    ...L('whisper', 'neutral', '（{h} 点了……时间过得真快）'),
  ],
  // ───── 节日（{d} 会被替换成节日名）─────
  greetHoliday: [
    ...L('say', 'happy', '{d}快乐！今天也要好好的~', '{d}啦！放假也别忘了我哦', '{d}！要不要给自己放个假？'),
    ...L('say', 'love', '{d}快乐~ 有我陪着你呢'),
    ...L('say', 'smug', '{d}也在工作？好吧……本鲸也陪你加班'),
  ],
  // ───── 画中画开关 ─────
  pipOn: [
    ...L('say', 'happy', '哦哦，我上桌面啦！', '这个小窗不错，看得更清楚了', '置顶！谁也挡不住我了'),
    ...L('say', 'smug', '来到更大的舞台了~'),
  ],
  pipOff: [
    ...L('say', 'neutral', '回网页里啦~', '小窗关掉了，我还在这儿'),
    ...L('whisper', 'shy', '（还是老地方待着舒服）'),
  ],
  // ───── 切换会话 ─────
  sessionSwitch: [
    ...L('say', 'neutral', '换个活儿看看', '切到这边来了', '这边是另一件事哦'),
    ...L('whisper', 'think', '（翻到另一页……）'),
  ],
}

// 「好模型……」：就是普通台词，不绑定任何动作，大多数场合都有小概率随机抽到
// （需要你拍板 / 提醒 / 生气跑开这类要紧或情绪化的场合除外）
const GOOD_MODEL: SpeechLine[] = [
  ...L('say', 'smug', '好模型……', '好模型，没有之一', '好、好模型……？'),
  ...L('shout', 'smug', '好模型！'),
  ...L('whisper', 'smug', '好模型（小声）'),
]
// 「好模型」是彩蛋，只在她自言自语 / 干活顺利这类不需要接话的场合偶尔冒出来，
// 打招呼、被摸、被捏、被拎、报时这些明确的互动一律说正经台词，避免答非所问
const GOOD_MODEL_CHANCE = 0.06
const GOOD_MODEL_OK = new Set<Trigger>(['idle', 'idleAfterWork', 'hover', 'done', 'doneFast', 'doneLong', 'cacheHigh',
  'toolMany', 'thinkStart', 'userPraise', 'userThanks', 'actHum', 'actDaydream', 'actSmug', 'actPonder', 'actBored', 'bubbleClick'])

/** 把 {h} / {d} 这类占位符换成实际内容 */
export function fillLine(line: SpeechLine, vars?: Record<string, string | number>): SpeechLine {
  if (!vars) return line
  return { ...line, text: line.text.replace(/\{(\w+)\}/g, (_m, k: string) => (vars[k] === undefined ? '' : String(vars[k]))) }
}

const recent: string[] = []
export function pickLine(trigger: Trigger): SpeechLine {
  const useGood = GOOD_MODEL_OK.has(trigger) && Math.random() < GOOD_MODEL_CHANCE
  const pool = useGood ? GOOD_MODEL : (LINES[trigger] || LINES.pat)
  const fresh = pool.filter((l) => !recent.includes(l.text))
  const list = fresh.length ? fresh : pool
  const line = list[Math.floor(Math.random() * list.length)]
  recent.push(line.text); if (recent.length > 60) recent.shift()
  return line
}

/** 真正需要你拍板的工具（问问题 / 请求批准） */
export const isAskTool = (toolName?: string | null): boolean => /ask_?user|question|approv|confirm|permission|用户询问|向您提问|提问|询问|审批|确认/i.test(String(toolName || ''))

export function toolTrigger(toolName?: string | null): Trigger {
  const t = String(toolName || '').toLowerCase()
  if (isAskTool(t)) return 'needYou'
  if (/read|view|cat|open|list|ls|stat|读取|查看|列表|目标读取/.test(t)) return 'toolRead'
  if (/write|edit|patch|replace|create|save|apply|写入|修改|创建|更新|规划/.test(t)) return 'toolWrite'
  if (/bash|shell|exec|command|run|terminal|命令|执行|终端/.test(t)) return 'toolBash'
  if (/grep|search|glob|find|fetch|web|browse|搜索|检索|查找|抓取/.test(t)) return 'toolSearch'
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
/* 她跑了：工作状态框也跟着收起来（不留在原地），回来再浮出 */
.dsh-maid-widget.wg-away .dsh-maid-bubble { opacity: 0 !important; transform: translateY(10px) scale(.94); pointer-events: none !important; transition-duration: .35s; }
/* 躲在屏幕边上说话：气泡固定在探头的脑袋旁边 */
.dsh-say--peek { max-width: 200px; }

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
