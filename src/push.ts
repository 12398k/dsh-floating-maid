/**
 * @dsh-external/dsh-floating-maid - Web Push 消息推送服务
 * 
 * 核心功能：
 * 1. 管理 VAPID 秘钥（自动生成与持久化存储）；
 * 2. 管理客户端 Web Push 订阅（移动端 PWA / 浏览器）；
 * 3. 任务完成 / 异常中断时的消息自动化下发；
 * 4. 自动剔除失效或已过期的订阅端点（410/404 Gone 清理）；
 * 5. 优雅的多端唤醒与离线通知支持。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let webpush: any = null
try {
  webpush = require('web-push')
} catch {
  try {
    webpush = require('/home/qiyu/.nvm/versions/node/v22.22.2/lib/node_modules/9remote/node_modules/web-push')
  } catch (err) {
    console.error('[dsh-floating-maid:webpush] web-push 依赖未找到', err)
  }
}

export interface VapidKeys {
  publicKey: string
  privateKey: string
}

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionData {
  endpoint: string
  keys: PushSubscriptionKeys
  expirationTime?: number | null
}

export interface StoredSubscription {
  id: string
  endpoint: string
  keys: PushSubscriptionKeys
  deviceName?: string
  userAgent?: string
  origin?: string
  createdAt: number
  lastUsedAt?: number
}

export interface WebPushConfig {
  enabled: boolean
  notifyOnDone: boolean
  notifyOnFailed: boolean
  sound: boolean
  proxyUrl: string
  subject: string
  baseUrl: string
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: {
    url?: string
    sessionId?: string
    timestamp?: number
    [key: string]: any
  }
  tag?: string
  renotify?: boolean
  requireInteraction?: boolean
}

interface StorageSchema {
  vapid: VapidKeys
  config: WebPushConfig
  subscriptions: StoredSubscription[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '../data')
const DATA_FILE = join(DATA_DIR, 'webpush.json')

export class WebPushManager {
  private vapidKeys: VapidKeys = { publicKey: '', privateKey: '' }
  private config: WebPushConfig = {
    enabled: true,
    notifyOnDone: true,
    notifyOnFailed: true,
    sound: true,
    proxyUrl: '',
    subject: 'mailto:admin@nas.wucloud.indevs.in',
    baseUrl: '',
  }
  private subscriptions: StoredSubscription[] = []
  private isInitialized = false

  constructor() {
    this.init()
  }

  private init(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true })
      }

      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, 'utf-8')
        const data: StorageSchema = JSON.parse(raw)
        if (data.vapid?.publicKey && data.vapid?.privateKey) {
          this.vapidKeys = data.vapid
        }
        if (data.config) {
          this.config = { ...this.config, ...data.config }
        }
        if (Array.isArray(data.subscriptions)) {
          this.subscriptions = data.subscriptions
        }
      }

      // 如果未生成过 VAPID Key，则在此自动生成
      if ((!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) && webpush) {
        this.vapidKeys = webpush.generateVAPIDKeys()
        this.save()
      }

      this.applyVapidDetails()

      this.isInitialized = true
    } catch (err) {
      console.error('[dsh-floating-maid:webpush] 初始化存储失败:', err)
    }
  }

  private applyVapidDetails(): void {
    if (this.vapidKeys.publicKey && this.vapidKeys.privateKey && webpush) {
      const subject = this.config.subject?.trim() || 'mailto:admin@nas.wucloud.indevs.in'
      webpush.setVapidDetails(
        subject,
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      )
    }
  }

  private save(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true })
      }
      const data: StorageSchema = {
        vapid: this.vapidKeys,
        config: this.config,
        subscriptions: this.subscriptions,
      }
      writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[dsh-floating-maid:webpush] 保存配置失败:', err)
    }
  }

  /**
   * 归一化跳转基地址：仅接受 http(s)，去尾斜杠；非法则置空
   */
  private normalizeBaseUrl(raw?: string): string {
    const v = String(raw || '').trim().replace(/\/+$/, '')
    return /^https?:\/\/\S+$/i.test(v) ? v : ''
  }

  private subscriptionBase(sub: StoredSubscription): string {
    return this.normalizeBaseUrl(sub.origin) || this.normalizeBaseUrl(this.config.baseUrl)
  }

  /**
   * 相对路径按订阅设备来源拼成绝对 URL；已是绝对地址则原样返回
   */
  public resolveTargetUrl(path: string, sub: StoredSubscription): string {
    const p = String(path || '/')
    if (/^https?:\/\//i.test(p)) return p
    const base = this.subscriptionBase(sub)
    if (!base) return p
    return base + (p.startsWith('/') ? p : '/' + p)
  }

  private resolveAssetUrl(url: string, sub: StoredSubscription): string {
    const u = String(url || '')
    if (!u.startsWith('/') || u.startsWith('//')) return u
    const base = this.subscriptionBase(sub)
    return base ? base + u : u
  }

  public getPublicKey(): string {
    return this.vapidKeys.publicKey
  }

  public getConfig(): WebPushConfig {
    return { ...this.config }
  }

  public updateConfig(patch: Partial<WebPushConfig>): WebPushConfig {
    this.config = { ...this.config, ...patch }
    this.config.baseUrl = this.normalizeBaseUrl(this.config.baseUrl)
    this.applyVapidDetails()
    this.save()
    return this.getConfig()
  }

  public getSubscriptions(): Omit<StoredSubscription, 'keys'>[] {
    return this.subscriptions.map(s => ({
      id: s.id,
      endpoint: s.endpoint,
      deviceName: s.deviceName,
      userAgent: s.userAgent,
      origin: s.origin || '',
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
    }))
  }

  public addSubscription(
    subData: PushSubscriptionData,
    meta?: { deviceName?: string; userAgent?: string; origin?: string }
  ): { ok: boolean; id: string; count: number } {
    if (!subData?.endpoint || !subData?.keys?.p256dh || !subData?.keys?.auth) {
      throw new Error('无效的推送订阅数据对象 (缺少 endpoint 或 keys)')
    }

    // 查重：同一 endpoint 更新信息，不同 endpoint 追加
    const existingIdx = this.subscriptions.findIndex(s => s.endpoint === subData.endpoint)
    const id = existingIdx >= 0
      ? this.subscriptions[existingIdx].id
      : 'sub_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36)

    const prev = existingIdx >= 0 ? this.subscriptions[existingIdx] : undefined

    const item: StoredSubscription = {
      id,
      endpoint: subData.endpoint,
      keys: {
        p256dh: subData.keys.p256dh,
        auth: subData.keys.auth,
      },
      deviceName: meta?.deviceName || this.parseDeviceName(meta?.userAgent),
      userAgent: meta?.userAgent || '',
      origin: this.normalizeBaseUrl(meta?.origin) || prev?.origin || '',
      createdAt: existingIdx >= 0 ? this.subscriptions[existingIdx].createdAt : Date.now(),
      lastUsedAt: Date.now(),
    }

    if (existingIdx >= 0) {
      this.subscriptions[existingIdx] = item
    } else {
      this.subscriptions.push(item)
    }

    this.save()
    return { ok: true, id, count: this.subscriptions.length }
  }

  public removeSubscription(filter: { id?: string; endpoint?: string }): { ok: boolean; count: number } {
    const origLen = this.subscriptions.length
    this.subscriptions = this.subscriptions.filter(s => {
      if (filter.id && s.id === filter.id) return false
      if (filter.endpoint && s.endpoint === filter.endpoint) return false
      return true
    })
    if (this.subscriptions.length !== origLen) {
      this.save()
    }
    return { ok: true, count: this.subscriptions.length }
  }

  public clearAllSubscriptions(): { ok: boolean; count: number } {
    this.subscriptions = []
    this.save()
    return { ok: true, count: 0 }
  }

  /**
   * 向所有注册的设备广播 Web Push 通知
   */
  public async sendNotification(payload: PushNotificationPayload): Promise<{
    sent: number
    failed: number
    pruned: number
    results: Array<{ id: string; ok: boolean; error?: string }>
  }> {
    if (!this.config.enabled) {
      return { sent: 0, failed: 0, pruned: 0, results: [] }
    }
    if (!webpush) {
      console.warn('[dsh-floating-maid:webpush] 未加载 web-push 模块，无法发送推送')
      return { sent: 0, failed: 0, pruned: 0, results: [] }
    }

    const basePayload = {
      title: payload.title || 'DSH 任务完成',
      body: payload.body || '您的后台任务已顺利完成。',
      icon: payload.icon || '/api/maid/maid.png',
      badge: payload.badge || '/api/maid/maid.png',
      data: payload.data || { url: '/' },
      tag: payload.tag || 'maid-task-complete',
      renotify: payload.renotify ?? true,
      requireInteraction: payload.requireInteraction ?? false,
      timestamp: Date.now(),
    }

    this.applyVapidDetails()

    const results: Array<{ id: string; ok: boolean; error?: string }> = []
    const toPrune: string[] = []
    let sent = 0
    let failed = 0

    const pushOptions: any = {
      TTL: 60 * 60 * 24, // 24小时存活
      urgency: 'high',
    }

    // 若配置了代理，则注入代理选项
    const proxy = this.config.proxyUrl?.trim() || process.env.HTTPS_PROXY || process.env.https_proxy || ''
    if (proxy) {
      pushOptions.proxy = proxy
    }

    for (const sub of this.subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        }

        // 逐设备拼装：相对跳转路径按该设备来源站展开为绝对 URL
        const perSub = {
          ...basePayload,
          icon: this.resolveAssetUrl(basePayload.icon, sub),
          badge: this.resolveAssetUrl(basePayload.badge, sub),
          data: { ...basePayload.data, url: this.resolveTargetUrl(basePayload.data?.url || '/', sub) },
        }
        await webpush.sendNotification(pushSubscription, JSON.stringify(perSub), pushOptions)
        sub.lastUsedAt = Date.now()
        sent++
        results.push({ id: sub.id, ok: true })
      } catch (err: any) {
        const status = err?.statusCode || err?.code
        const msg = String(err?.message || err)
        console.warn(`[dsh-floating-maid:webpush] 推送至设备 [${sub.deviceName || sub.id}] 失败:`, status, msg)

        // 404 或 410 表示该订阅已失效、被注销或过期，自动标记清理
        if (status === 404 || status === 410) {
          toPrune.push(sub.id)
        }

        failed++
        results.push({ id: sub.id, ok: false, error: `${status ? status + ': ' : ''}${msg}` })
      }
    }

    // 自动清理已失效订阅
    let pruned = 0
    if (toPrune.length > 0) {
      this.subscriptions = this.subscriptions.filter(s => !toPrune.includes(s.id))
      this.save()
      pruned = toPrune.length
    } else if (sent > 0) {
      this.save() // 保存 lastUsedAt
    }

    return { sent, failed, pruned, results }
  }

  /**
   * 智能识别 UserAgent 设备友好名称
   */
  private parseDeviceName(ua?: string): string {
    if (!ua) return '未知设备'
    if (/iPhone/i.test(ua)) {
      return 'Apple iPhone'
    }
    if (/iPad/i.test(ua)) {
      return 'Apple iPad'
    }
    if (/Macintosh/i.test(ua)) {
      return 'Mac 设备'
    }
    if (/Android/i.test(ua)) {
      const match = ua.match(/Android[^;]+; ([^;)]+)/)
      if (match && match[1]) {
        return match[1].trim()
      }
      return 'Android 设备'
    }
    if (/Windows/i.test(ua)) {
      return 'Windows PC'
    }
    if (/Linux/i.test(ua)) {
      return 'Linux 工作站'
    }
    return '网页浏览器'
  }

  /**
   * 生成 Service Worker 脚本内容
   */
  public static getServiceWorkerScript(): string {
    return `// Aether Maid Web Push Service Worker
// Version: 1.0.3 (点击先预选 maid 会话再开首页；只聚焦完全一致的标签)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'DeepSeek Harness', body: event.data.text() };
    }
  }

  const title = data.title || '任务已完成';
  const options = {
    body: data.body || '您的后台任务已顺利执行完毕！',
    icon: data.icon || '/api/maid/maid.png',
    badge: data.badge || '/api/maid/maid.png',
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'dsh-maid-notification',
    renotify: data.renotify !== false,
    requireInteraction: !!data.requireInteraction,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
  const sid = event.notification.data && event.notification.data.sessionId;
  let targetUrl = rawUrl;
  try { targetUrl = new URL(rawUrl, self.location.origin).href; } catch (e) { targetUrl = rawUrl; }
  const isHome = targetUrl === self.location.origin + '/';

  event.waitUntil(
    (async () => {
      // DSH 前端无会话路径路由：先把 maid 悬浮窗切到推送的会话，再开首页
      if (sid && sid !== 'global') {
        try {
          await fetch('/api/maid/select-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sid }),
            credentials: 'include',
          });
        } catch (e) {}
      }
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // 只聚焦 URL 完全一致的标签；其它一律新开目标站，绝不跨源截胡。
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url === targetUrl || isHome) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});
`
  }
}

export const pushManager = new WebPushManager()
