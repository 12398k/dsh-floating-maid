/**
 * @dsh-external/dsh-floating-maid — 局域网接入（host 端）
 *
 * 解决什么问题：`dsh web` 默认只绑 127.0.0.1，且带 authority 绑定的会话鉴权
 * （cookie 名 = `dsh-auth-<hash(authority)>`，签名载荷里也存 authority）。
 * 于是别的机器直接用 http://<局域网IP>:3080 打不开——两个原因叠加：
 *   1. 端口没对外监听；
 *   2. 即便连上，cookie 的 authority 与访问地址不一致，永远停在 401。
 *
 * 本模块提供一个可选的局域网反代：
 *   - 监听 0.0.0.0:<port>，把请求原样转发给 127.0.0.1:<dshPort>；
 *   - **必须原样透传 Host 头**，否则 DSH 下发的 cookie 立刻失效；
 *   - 自动从 DSH 启动日志里取出本次进程的 launch token，拼成可直接打开的
 *     `http://<lan-ip>:<port>/?token=...` 链接；
 *   - 顺带支持 WebSocket/Upgrade（DSH 的 RPC 与流式输出走这里）。
 *
 * 只依赖 node 内置模块，不引入新依赖。
 */
import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http'
import { connect as netConnect, type Socket } from 'node:net'
import { existsSync, readFileSync, openSync, readSync, closeSync, statSync } from 'node:fs'
import { networkInterfaces } from 'node:os'

export interface LanAccessConfig {
  /** 是否启用局域网反代 */
  enabled: boolean
  /** 反代监听端口 */
  port: number
  /** 监听地址，固定 0.0.0.0（要对外就必须全网卡） */
  host: string
  /**
   * 路径前缀白名单。只有命中这些前缀的请求才会被转发给 DSH，
   * 其余一律 403——避免这个对外端口变成「整台 DSH 的后门」。
   * 默认只放行本插件自己的 `/api/maid/`。
   */
  allowedPaths: string[]
}

export interface LanStatus {
  enabled: boolean
  listening: boolean
  port: number
  /** 上游 DSH 本体 */
  upstream: string
  /** 当前 DSH 监听端口 */
  dshPort: number
  /** 是否已取到本次进程的 launch token */
  tokenAvailable: boolean
  /** 局域网可访问地址（仅 IPv4 私网） */
  addresses: string[]
  /** 插件自身的局域网入口（本反代自己渲染的状态页） */
  urls: string[]
  /** 带 token 的入口；仅当白名单放行了 DSH 主界面时才有意义 */
  authenticatedUrls: string[]
  /** 上游 DSH 是否只绑了回环——是则局域网必须靠本反代 */
  upstreamLoopbackOnly: boolean
  /** 当前生效的路径白名单 */
  allowedPaths: string[]
  /** 白名单是否放行了 DSH 主界面（放行即等于把整台 DSH 暴露出去） */
  exposesDsh: boolean
  error?: string
}

const DEFAULT_PORT = 3084

/** 默认白名单：只放行本插件自己的 API 与静态资源 */
const DEFAULT_ALLOWED_PATHS = ['/api/maid/']

/** 本插件静态资源的后缀，用于判断「插件自己的东西」 */
const PLUGIN_PATH_PREFIX = '/api/maid/'

/**
 * 判断网卡是否是「用户真实局域网」而非虚拟网桥。
 *
 * 只看 IP 段不够——Docker 默认也会给网桥分 192.168.x.0/20 之类，
 * 在 NAS 上这类网桥有十几个，全列出来会把真正的局域网地址淹没。
 * 所以先按网卡名排除容器/虚拟网络，再按 IP 段兜底。
 */
function isLanInterface(name: string): boolean {
  // docker / libvirt / k8s / VPN 虚拟网卡
  if (/^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|wg|zt|tailscale|lo)/i.test(name)) return false
  return true
}

/** 只保留真正的局域网地址：排除回环、虚拟网桥、link-local */
function isPrivateLanIpv4(ip: string): boolean {
  if (ip.startsWith('127.')) return false
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

export class LanAccessManager {
  private config: LanAccessConfig = {
    enabled: false,
    port: DEFAULT_PORT,
    host: '0.0.0.0',
    allowedPaths: [...DEFAULT_ALLOWED_PATHS],
  }
  private server: ReturnType<typeof createServer> | null = null
  private listening = false
  private lastError: string | undefined
  private tokenCache: { token: string | null; at: number } = { token: null, at: 0 }
  private dshPort = 3080
  private dshLogFile = ''

  constructor(opts?: { port?: number; dshPort?: number; dshLogFile?: string }) {
    if (opts?.port && Number.isInteger(opts.port) && opts.port > 0 && opts.port < 65536) {
      this.config.port = opts.port
    }
    if (opts?.dshPort && Number.isInteger(opts.dshPort)) this.dshPort = opts.dshPort
    if (opts?.dshLogFile) this.dshLogFile = opts.dshLogFile
  }

  getConfig(): LanAccessConfig {
    return { ...this.config }
  }

  setPort(port: number): LanAccessConfig {
    const p = Number(port)
    if (!Number.isInteger(p) || p <= 0 || p > 65535) throw new Error('端口必须是 1-65535 的整数')
    this.config.port = p
    return { ...this.config }
  }

  /** 局域网地址列表（排除 docker 网桥等虚拟网卡） */
  lanAddresses(): string[] {
    const out: string[] = []
    try {
      const ifaces = networkInterfaces()
      for (const name of Object.keys(ifaces)) {
        if (!isLanInterface(name)) continue
        for (const iface of ifaces[name] || []) {
          if (iface.family === 'IPv4' && !iface.internal && isPrivateLanIpv4(iface.address)) {
            if (!out.includes(iface.address)) out.push(iface.address)
          }
        }
      }
    } catch { /* ignore */ }
    return out
  }

  getAllowedPaths(): string[] {
    return [...this.config.allowedPaths]
  }

  /**
   * 设置路径白名单。传空数组会回落到默认（只放行本插件），
   * 避免误操作把整台 DSH 暴露出去。
   */
  setAllowedPaths(paths: string[]): string[] {
    const cleaned = (Array.isArray(paths) ? paths : [])
      .map((p) => String(p || '').trim())
      .filter((p) => p.startsWith('/'))
      .map((p) => (p.endsWith('/') ? p : p + '/'))
    this.config.allowedPaths = cleaned.length > 0 ? [...new Set(cleaned)] : [...DEFAULT_ALLOWED_PATHS]
    return this.getAllowedPaths()
  }

  /**
   * 判断请求路径是否在白名单内。
   *
   * 用「前缀 + 边界」比较而非裸 startsWith：白名单 `/api/maid/` 不该放行
   * `/api/maid-evil`。另外插件自己的静态资源端点（如 `/api/maid/state`）天然
   * 落在前缀内，无需额外规则。
   */
  private isAllowedPath(rawUrl: string): boolean {
    let pathname = rawUrl
    try {
      pathname = new URL(rawUrl, 'http://placeholder.invalid').pathname
    } catch { /* 非法 URL 一律不放行 */ return false }
    for (const prefix of this.config.allowedPaths) {
      if (pathname === prefix.slice(0, -1)) return true // 前缀去掉尾斜杠后完全相等
      if (pathname.startsWith(prefix)) return true
    }
    return false
  }

  /** 白名单是否放行了 DSH 主界面（等于把整台 DSH 暴露出去） */
  private exposesDsh(): boolean {
    return this.config.allowedPaths.some((p) => p === '/' || p === '/*/' || !p.startsWith(PLUGIN_PATH_PREFIX))
  }

  /**
   * 取本次 dsh web 进程的 launch token。
   * 该 token 由进程启动时随机生成、只存在于内存，唯一的落地处就是启动日志里
   * 那行 `dsh web: http://127.0.0.1:<port>/?token=...`，所以只能从日志读。
   * 日志里会累积历史启动的多条 token，只有最后一条属于当前进程。
   */
  launchToken(): string | null {
    const now = Date.now()
    if (now - this.tokenCache.at < 5000) return this.tokenCache.token
    let token: string | null = null
    const candidates = this.logCandidates()
    // 候选都没命中时再扫一遍常见目录，找到就把它提到最前面
    if (!this.anyExists(candidates)) {
      const found = this.scanForLog()
      if (found) candidates.unshift(found)
    }
    for (const file of candidates) {
      try {
        const st = statSync(file)
        const size = Math.min(262144, st.size)
        const fd = openSync(file, 'r')
        try {
          const buf = Buffer.alloc(size)
          readSync(fd, buf, 0, size, st.size - size)
          const matches = buf.toString('utf8').match(/dsh web: http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/g)
          if (matches && matches.length > 0) {
            token = matches[matches.length - 1].split('token=')[1]
            break
          }
        } finally { closeSync(fd) }
      } catch { /* 换下一个候选 */ }
    }
    this.tokenCache = { token, at: now }
    return token
  }

  private anyExists(paths: string[]): boolean {
    for (const p of paths) {
      try { if (existsSync(p)) return true } catch { /* ignore */ }
    }
    return false
  }

  /**
   * 候选日志路径。launch token 只出现在 `dsh web` 的 stdout，所以要能读到它，
   * 部署方需把 stdout 重定向到文件（systemd / nohup 的常见做法），或显式设
   * DSH_LOG_FILE / 在本插件的配置里指定 dshLogFile。
   * 按可靠性排序尝试，全失败则返回 null（UI 会提示「尚未取到 token」）。
   */
  private logCandidates(): string[] {
    const out: string[] = []
    if (this.dshLogFile) out.push(this.dshLogFile)
    if (process.env.DSH_LOG_FILE) out.push(process.env.DSH_LOG_FILE)
    const home = process.env.DSH_HOME || ''
    if (home) {
      out.push(`${home}/logs/dsh.log`)
      out.push(`${home}/dsh.log`)
    }
    if (process.env.HOME) {
      out.push(`${process.env.HOME}/.dsh/logs/dsh.log`)
      out.push(`${process.env.HOME}/dsh.log`)
    }
    return [...new Set(out)].filter((p) => p && !p.startsWith('/logs'))
  }

  /**
   * 兜底：在常见部署目录里浅扫一遍，找最近写过 token 的日志文件。
   * 只在候选路径全部落空时调用，避免每次都遍历文件系统。
   */
  private scanForLog(): string | null {
    const roots: string[] = []
    if (process.env.DSH_LAUNCH_DIR) roots.push(process.env.DSH_LAUNCH_DIR)
    // 从 cwd 逐级向上找——systemd 部署的 WorkingDirectory 通常就是项目根
    let dir = process.cwd()
    for (let i = 0; i < 4 && dir && dir !== '/'; i++) {
      roots.push(dir)
      const parent = dir.replace(/\/[^/]+\/?$/, '') || '/'
      if (parent === dir) break
      dir = parent
    }
    if (process.env.DSH_HOME) roots.push(process.env.DSH_HOME)
    if (process.env.HOME) roots.push(`${process.env.HOME}/.dsh`)

    const seen = new Set<string>()
    for (const root of roots) {
      for (const rel of ['logs/dsh.log', 'dsh.log', 'logs/dsh-web.log', 'deepseek-harness/logs/dsh.log']) {
        const p = `${root}/${rel}`
        if (seen.has(p)) continue
        seen.add(p)
        try {
          if (!existsSync(p)) continue
          const st = statSync(p)
          // 只认最近 30 天内写过的日志，避免翻到陈年文件里的旧 token
          if (Date.now() - st.mtimeMs > 30 * 86400000) continue
          const size = Math.min(262144, st.size)
          const fd = openSync(p, 'r')
          try {
            const buf = Buffer.alloc(size)
            readSync(fd, buf, 0, size, st.size - size)
            if (/dsh web: http:\/\/127\.0\.0\.1:\d+\/\?token=/.test(buf.toString('utf8'))) return p
          } finally { closeSync(fd) }
        } catch { /* 换下一个 */ }
      }
    }
    return null
  }

  /** 追加一个日志候选路径（供插件配置/部署方指定） */
  setLogFile(p: string): void {
    this.dshLogFile = String(p || '').trim()
    this.tokenCache = { token: null, at: 0 }
  }

  /** 上游 DSH 是否只绑了回环 */
  private upstreamLoopbackOnly(): boolean {
    try {
      const raw = readFileSync('/proc/net/tcp', 'utf8')
      const portHex = this.dshPort.toString(16).toUpperCase().padStart(4, '0')
      for (const line of raw.split('\n').slice(1)) {
        const cols = line.trim().split(/\s+/)
        if (cols.length < 4) continue
        const local = cols[1] || ''
        const [addr, port] = local.split(':')
        if (port !== portHex) continue
        if (cols[3] !== '0A') continue // 0A = LISTEN
        if (addr === '0100007F') return true // 127.0.0.1
      }
    } catch { /* 非 Linux 或读不到就当作未知 */ }
    return false
  }

  status(): LanStatus {
    const addrs = this.lanAddresses()
    const token = this.launchToken()
    const port = this.config.port
    // listen() 是异步的，回调前 this.listening 还是 false；用 server.listening 实时判断，
    // 否则刚点「开启」立刻回读会显示未监听。
    const listening = !!this.server?.listening
    const exposes = this.exposesDsh()
    return {
      enabled: this.config.enabled,
      listening,
      port,
      upstream: `http://127.0.0.1:${this.dshPort}`,
      dshPort: this.dshPort,
      tokenAvailable: !!token,
      addresses: addrs,
      // 默认入口是本反代自己的状态页，不是 DSH 主界面
      urls: addrs.map((a) => `http://${a}:${port}/`),
      // 只有白名单放行了 DSH 主界面时，这些带 token 的链接才有意义
      authenticatedUrls: exposes && token ? addrs.map((a) => `http://${a}:${port}/?token=${token}`) : [],
      upstreamLoopbackOnly: this.upstreamLoopbackOnly(),
      allowedPaths: this.getAllowedPaths(),
      exposesDsh: exposes,
      error: this.lastError,
    }
  }

  /** 启动反代。已在监听则直接返回。 */
  start(): { ok: boolean; error?: string } {
    if (this.server && this.listening) return { ok: true }
    try {
      this.server = createServer((req, res) => this.handle(req, res))
      this.server.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket as Socket, head))
      this.server.on('error', (err: any) => {
        this.lastError = String(err?.message || err)
        this.listening = false
      })
      this.server.listen(this.config.port, this.config.host, () => {
        this.listening = true
        this.lastError = undefined
      })
      this.config.enabled = true
      return { ok: true }
    } catch (err: any) {
      this.lastError = String(err?.message || err)
      this.config.enabled = false
      return { ok: false, error: this.lastError }
    }
  }

  stop(): { ok: boolean } {
    try {
      if (this.server) {
        this.server.close()
        this.server = null
      }
    } catch { /* ignore */ }
    this.listening = false
    this.config.enabled = false
    return { ok: true }
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    const rawUrl = req.url || '/'
    let pathname = rawUrl
    try { pathname = new URL(rawUrl, 'http://placeholder.invalid').pathname } catch { /* 保底用原串 */ }

    // 自检端点：不代理，直接答
    if (pathname === '/__maid-lan/status') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end(JSON.stringify(this.status(), null, 2))
      return
    }

    // 根路径：渲染本插件自己的落地页，绝不把 DSH 主界面端出去
    if (pathname === '/' || pathname === '/index.html') {
      const body = this.renderLandingPage()
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      res.end(body)
      return
    }

    // 白名单外一律 403——这个端口只服务于插件自身，不是 DSH 的后门
    if (!this.isAllowedPath(rawUrl)) {
      res.writeHead(403, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      res.end(JSON.stringify({
        ok: false,
        error: 'forbidden',
        message: '此端口只允许访问 maid 插件自己的接口（/api/maid/*）。',
        allowedPaths: this.getAllowedPaths(),
      }, null, 2))
      return
    }

    // 原样透传 Host：DSH 的 cookie 与 authority 绑定，改写就失效
    const headers = { ...req.headers }
    const pr = httpRequest({
      host: '127.0.0.1',
      port: this.dshPort,
      method: req.method,
      path: req.url,
      headers,
    }, (pres) => {
      res.writeHead(pres.statusCode || 502, pres.headers)
      pres.pipe(res)
    })
    pr.on('error', (err) => {
      try {
        res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
        res.end(`maid lan proxy: upstream error: ${err.message}\n`)
      } catch { /* ignore */ }
    })
    req.pipe(pr)
  }

  /** 落地页：说明这个端口能干什么、不能干什么 */
  private renderLandingPage(): string {
    const s = this.status()
    const esc = (v: string): string => v.replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
    ))
    const rows = s.allowedPaths.map((p) => `<li><code>${esc(p)}*</code></li>`).join('')
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>maid 局域网接入</title>
<style>
 body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827}
 .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:26px 24px;
       max-width:520px;width:calc(100% - 40px)}
 h1{font-size:16px;margin:0 0 12px}
 p{font-size:13px;color:#6b7280;margin:0 0 10px;line-height:1.7}
 code{background:#f3f4f6;padding:1px 6px;border-radius:4px;font-size:12px}
 ul{margin:6px 0 12px;padding-left:20px}
 li{font-size:12px;color:#6b7280;line-height:1.9}
 .ok{color:#22a06b}
 .warn{color:#d98b0c}
</style></head><body><div class="card">
<h1>🐋 maid 局域网接入</h1>
<p>这个端口<strong>只服务于 maid 插件自身</strong>，不是 DSH 的后门。</p>
<p>允许访问的路径：</p>
<ul>${rows}</ul>
<p>其余请求一律 <code>403</code>，包括 DSH 的主界面与其它插件。</p>
<p class="${s.exposesDsh ? 'warn' : 'ok'}">${
      s.exposesDsh
        ? '⚠️ 当前白名单放行了 DSH 主界面——等于把整台 DSH 暴露给局域网。'
        : '✅ 已限制为仅插件自身路径。'
    }</p>
<p>要打开完整的 DSH，请在本机访问 <code>${esc(s.upstream)}</code>，或用你自己的反向代理。</p>
<p style="color:#9ca3af;font-size:12px">状态：${s.listening ? '监听中' : '未监听'} · 端口 ${s.port} · 上游 ${esc(s.upstream)}</p>
</div></body></html>`
  }

  private handleUpgrade(req: IncomingMessage, socket: Socket, head: Buffer): void {
    // 白名单外的升级请求同样拒绝，避免绕过 HTTP 层的限制
    if (!this.isAllowedPath(req.url || '/')) {
      socket.destroy()
      return
    }
    const up = netConnect(this.dshPort, '127.0.0.1', () => {
      let raw = `${req.method} ${req.url} HTTP/1.1\r\n`
      for (const [k, v] of Object.entries(req.headers)) raw += `${k}: ${v}\r\n`
      raw += '\r\n'
      up.write(raw)
      if (head && head.length) up.write(head)
      up.pipe(socket)
      socket.pipe(up)
    })
    up.on('error', () => socket.destroy())
    socket.on('error', () => up.destroy())
  }
}

export const lanManager = new LanAccessManager()
