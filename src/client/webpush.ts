/**
 * @dsh-external/dsh-floating-maid - 客户端 Web Push 设置与权限申请中心
 * 
 * 核心功能：
 * 1. 自动检测浏览器环境能力（Service Worker、PushManager、Secure Context、iOS PWA 状态）；
 * 2. 一键申请浏览器通知权限 + 注册 Service Worker + 订阅 Web Push 离线推送；
 * 3. 发送实时测试推送，直观验证手机/桌面端即时唤醒；
 * 4. 推送偏好与代理设置（完成提醒、失败提醒、耗时统计、网络代理）；
 * 5. 已绑定设备列表与管理（查看设备型号、绑定时间、一键清空）；
 * 6. 详尽的手机端使用指南（iOS PWA 主屏幕添加与 Android 浏览器设置）。
 */
import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'

const h = React.createElement

export interface PushConfig {
  enabled: boolean
  notifyOnDone: boolean
  notifyOnFailed: boolean
  sound: boolean
  proxyUrl: string
  baseUrl?: string
  subject?: string
}

export interface SubscribedDevice {
  id: string
  endpoint: string
  deviceName?: string
  userAgent?: string
  createdAt: number
  lastUsedAt?: number
  origin?: string
}

// ───────── 官方风格线性 SVG 图标体系 ─────────
export const IconBell = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 15, height: props.size || 15, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }),
    h('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })
  )

const IconCheck = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#10b981', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('polyline', { points: '20 6 9 17 4 12' })
  )

const IconCross = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#ef4444', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    h('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
  )

const IconPhone = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 15, height: props.size || 15, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('rect', { x: '5', y: '2', width: '14', height: '20', rx: '2', ry: '2' }),
    h('line', { x1: '12', y1: '18', x2: '12.01', y2: '18' })
  )

const IconRefresh = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('polyline', { points: '23 4 23 10 17 10' }),
    h('path', { d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' })
  )

const IconSend = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('line', { x1: '22', y1: '2', x2: '11', y2: '13' }),
    h('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
  )

const IconShield = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 15, height: props.size || 15, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
  )

const IconApple = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#93c5fd', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('path', { d: 'M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z' }),
    h('path', { d: 'M10 2c1 .5 2 2 2 5' })
  )

const IconAndroid = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || '#86efac', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('path', { d: 'M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z' }),
    h('path', { d: 'M7 6l2 4' }),
    h('path', { d: 'M17 6l-2 4' }),
    h('circle', { cx: '9', cy: '14', r: '1', fill: 'currentColor' }),
    h('circle', { cx: '15', cy: '14', r: '1', fill: 'currentColor' }),
  )

const IconSettings = (props: { size?: number; color?: string }) =>
  h('svg', {
    width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
    fill: 'none', stroke: props.color || 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  },
    h('circle', { cx: '12', cy: '12', r: '3' }),
    h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' })
  )

// ───────── 工具函数：Base64 转 Uint8Array (RFC 8292 标准) ─────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function detectDeviceName(): string {
  if (typeof navigator === 'undefined') return '未知客户端'
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'Apple iPhone'
  if (/iPad/i.test(ua)) return 'Apple iPad'
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android[^;]+; ([^;)]+)/)
    return match && match[1] ? match[1].trim() : 'Android 手机'
  }
  if (/Macintosh/i.test(ua)) return 'Mac 浏览器'
  if (/Windows/i.test(ua)) return 'Windows PC'
  return '桌面浏览器'
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
}

// ───────── 样式系统 ─────────
const S = {
  container: {
    padding: '24px 28px',
    maxWidth: '820px',
    color: 'var(--dsh-fg, #e2e8f0)',
    fontSize: '13px',
    lineHeight: '1.6',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  subTitle: {
    fontSize: '12.5px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '4px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    fontSize: '12px',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#e2e8f0',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  input: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '6px',
    padding: '7px 12px',
    color: '#fff',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  infoBanner: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '12.5px',
    lineHeight: '1.5',
  },
}

// ───────── WebPushSettingsSection 主界面组件 ─────────
export function WebPushSettingsSection(): React.ReactElement {
  const [swSupported, setSwSupported] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [isSubscribedLocally, setIsSubscribedLocally] = useState(false)
  const [localEndpoint, setLocalEndpoint] = useState('')

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null)

  const [config, setConfig] = useState<PushConfig>({
    enabled: true,
    notifyOnDone: true,
    notifyOnFailed: true,
    sound: true,
    proxyUrl: '',
    baseUrl: '',
  })
  const [devices, setDevices] = useState<SubscribedDevice[]>([])

  const isIos = typeof window !== 'undefined' && isIosDevice()
  const isPwa = typeof window !== 'undefined' && isStandaloneMode()

  // 1. 检查浏览器本地支持与订阅状态
  const checkLocalStatus = useCallback(async () => {
    if (typeof window === 'undefined') return
    const hasSw = 'serviceWorker' in navigator
    const hasPush = 'PushManager' in window
    setSwSupported(hasSw)
    setPushSupported(hasPush)

    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }

    if (hasSw && hasPush) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/api/maid/sw.js')
        if (reg) {
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            setIsSubscribedLocally(true)
            setLocalEndpoint(sub.endpoint)
          } else {
            setIsSubscribedLocally(false)
            setLocalEndpoint('')
          }
        }
      } catch (e) {
        console.warn('检查本地 PushSubscription 异常:', e)
      }
    }
  }, [])

  // 2. 从服务器读取全局推送配置与设备列表
  const fetchServerStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/maid/webpush/status')
      const data = await res.json()
      if (data.ok) {
        if (data.config) setConfig(data.config)
        if (Array.isArray(data.subscriptions)) setDevices(data.subscriptions)
      }
    } catch (e) {
      console.warn('获取服务端 WebPush 状态失败:', e)
    }
  }, [])

  useEffect(() => {
    void checkLocalStatus()
    void fetchServerStatus()
  }, [checkLocalStatus, fetchServerStatus])

  // 3. 一键申请权限并订阅
  const handleSubscribe = async () => {
    setLoading(true)
    setMsg(null)
    try {
      if (!swSupported || !pushSupported) {
        if (isIos && !isPwa) {
          throw new Error('iOS 设备接收 Web Push 推送须先在 Safari 点击「分享」→「添加到主屏幕」，并在主屏幕打开应用后再点击申请！')
        }
        throw new Error('当前浏览器不支持 Service Worker 或 Web Push API。')
      }

      // 请求通知权限
      let perm = Notification.permission
      if (perm !== 'granted') {
        perm = await Notification.requestPermission()
        setPermission(perm)
      }

      if (perm === 'denied') {
        throw new Error('通知权限已被浏览器拒绝。请在浏览器地址栏左侧锁定图标或系统应用设置中解除权限封禁。')
      }
      if (perm !== 'granted') {
        throw new Error('未授予通知权限，无法接收离线消息。')
      }

      // 注册 Service Worker
      const reg = await navigator.serviceWorker.register('/api/maid/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      // 获取 VAPID 公钥
      const keyRes = await fetch('/api/maid/webpush/public-key')
      const keyData = await keyRes.json()
      if (!keyData.ok || !keyData.publicKey) {
        throw new Error('获取服务器 VAPID 公钥失败: ' + (keyData.error || '未知原因'))
      }

      // 订阅 Push
      const appKey = urlBase64ToUint8Array(keyData.publicKey)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appKey,
      })

      // 上报至服务端保存
      const subJson = sub.toJSON()
      const deviceName = detectDeviceName()
      const postRes = await fetch('/api/maid/webpush/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJson,
          deviceName,
          origin: window.location.origin,
        }),
      })

      const postData = await postRes.json()
      if (!postData.ok) {
        throw new Error('向服务端同步推送凭证失败: ' + (postData.error || ''))
      }

      setIsSubscribedLocally(true)
      setLocalEndpoint(sub.endpoint)
      setMsg({ text: '本机推送权限申请成功并已完成订阅！当后台任务完成时，即使手机熄屏也能收到通知。', type: 'success' })
      void fetchServerStatus()
    } catch (err: any) {
      setMsg({ text: '申请失败: ' + String(err?.message || err), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 4. 取消本机订阅
  const handleUnsubscribe = async () => {
    setLoading(true)
    setMsg(null)
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration('/api/maid/sw.js')
        if (reg) {
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            await fetch('/api/maid/webpush/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint }),
            })
            await sub.unsubscribe()
          }
        }
      }
      setIsSubscribedLocally(false)
      setLocalEndpoint('')
      setMsg({ text: '已成功取消本机的推送订阅。', type: 'info' })
      void fetchServerStatus()
    } catch (err: any) {
      setMsg({ text: '取消订阅遇到错误: ' + String(err?.message || err), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 5. 发送测试推送
  const handleTestPush = async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/maid/webpush/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '女仆测试推送',
          body: '恭喜！Web Push 离线推送通道畅通！即使锁屏或关闭页面，任务结束时也将实时唤醒手机。',
        }),
      })
      const data = await res.json()
      if (data.ok) {
        if (data.failed > 0) {
          const reasons = (data.results || []).filter((r: any) => !r.ok).map((r: any) => r.error).join('; ')
          setMsg({
            text: `测试推送部分设备未送达 (成功 ${data.sent} 台，失败 ${data.failed} 台)${reasons ? ': ' + reasons : ''}`,
            type: 'error',
          })
        } else {
          setMsg({
            text: `测试推送已成功送达全部 ${data.sent} 台设备！请查看手机锁屏或通知栏。`,
            type: 'success',
          })
        }
      } else {
        throw new Error(data.error || '推送请求被拒绝')
      }
    } catch (err: any) {
      setMsg({ text: '测试推送失败: ' + String(err?.message || err), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // 6. 保存全局推送配置
  const handleSaveConfig = async (patch: Partial<PushConfig>) => {
    const updated = { ...config, ...patch }
    setConfig(updated)
    try {
      const res = await fetch('/api/maid/webpush/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const data = await res.json()
      if (data.ok) {
        if (data.config) setConfig(data.config)
        setMsg({ text: '推送配置已实时保存。', type: 'info' })
      }
    } catch (err: any) {
      setMsg({ text: '保存配置失败: ' + String(err?.message || err), type: 'error' })
    }
  }

  // 7. 清空所有订阅
  const handleClearAll = async () => {
    if (!confirm('确定要清空所有已绑定的移动端/桌面设备订阅吗？')) return
    try {
      await fetch('/api/maid/webpush/clear', { method: 'POST' })
      setIsSubscribedLocally(false)
      setLocalEndpoint('')
      void fetchServerStatus()
      setMsg({ text: '已清空全部设备推送订阅。', type: 'info' })
    } catch (err: any) {
      setMsg({ text: '清空失败: ' + String(err?.message || err), type: 'error' })
    }
  }

  return h('div', { style: S.container },
    // 1. 顶栏标题与介绍
    h('div', { style: S.header },
      h('div', null,
        h('div', { style: S.title },
          h(IconBell, { size: 20, color: '#818cf8' }),
          'Web Push 离线消息推送'
        ),
        h('div', { style: S.subTitle },
          '通过 W3C 标准 Web Push 协议与 APNs/FCM 网关，在长耗时任务完成时第一时间唤醒未打开甚至已锁屏的手机。'
        )
      ),
      h('button', {
        style: S.btnSecondary,
        onClick: () => { void checkLocalStatus(); void fetchServerStatus() },
        title: '刷新状态',
      }, h(IconRefresh), '刷新')
    ),

    // 状态提示条
    msg ? h('div', {
      style: {
        ...S.infoBanner,
        background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : msg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
        color: msg.type === 'success' ? '#34d399' : msg.type === 'error' ? '#f87171' : '#a5b4fc',
        border: `1px solid ${msg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : msg.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
      }
    }, msg.text) : null,

    // 2. 本机环境检查与状态仪表盘
    h('div', { style: S.card },
      h('div', { style: S.cardTitle }, h(IconShield), '当前设备运行环境诊断'),
      h('div', { style: S.grid3 },
        h('div', { style: S.statusBadge },
          h('span', null, 'Service Worker 支持'),
          swSupported
            ? h('span', { style: { color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' } }, h(IconCheck), '已支持')
            : h('span', { style: { color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' } }, h(IconCross), '不支持')
        ),
        h('div', { style: S.statusBadge },
          h('span', null, 'PushManager 推送支持'),
          pushSupported
            ? h('span', { style: { color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' } }, h(IconCheck), '已支持')
            : h('span', { style: { color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' } }, h(IconCross), '不支持')
        ),
        h('div', { style: S.statusBadge },
          h('span', null, '系统通知权限'),
          permission === 'granted'
            ? h('span', { style: { color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' } }, h(IconCheck), '已授权')
            : permission === 'denied'
              ? h('span', { style: { color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' } }, h(IconCross), '已禁止')
              : h('span', { style: { color: '#f59e0b' } }, '未申请')
        ),
      ),

      // 操作按键区
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' } },
        !isSubscribedLocally ? h('button', {
          style: { ...S.btnPrimary, padding: '10px 20px', fontSize: '13.5px' },
          onClick: () => { void handleSubscribe() },
          disabled: loading,
        },
          h(IconBell, { size: 16 }),
          loading ? '正在申请权限与订阅…' : '申请通知权限并订阅离线推送'
        ) : h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
          h('div', {
            style: {
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px',
              color: '#34d399', fontSize: '12px'
            }
          }, h(IconCheck), '本机已成功订阅'),
          h('button', {
            style: S.btnPrimary,
            onClick: () => { void handleTestPush() },
            disabled: loading,
          }, h(IconSend), '发送测试推送'),
          h('button', {
            style: S.btnSecondary,
            onClick: () => { void handleUnsubscribe() },
            disabled: loading,
          }, '取消本机订阅')
        )
      )
    ),

    // 3. 手机端使用说明指南 (特别强调 iOS 与 Android)
    h('div', { style: S.card },
      h('div', { style: S.cardTitle }, h(IconPhone), '手机端快速配置指南'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } },
        // iOS 模块
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px', padding: '14px',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }
        },
          h('div', { style: { fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' } },
            h(IconApple),
            '苹果 iOS 设备 (iPhone / iPad)'
          ),
          h('div', { style: { fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)' } },
            '1. 系统需在 iOS 16.4 及以上；', h('br'),
            '2. 用 Safari 访问本站，点击底部「分享」图标；', h('br'),
            '3. 点击「添加到主屏幕」创建 Web 桌面图标；', h('br'),
            '4. 从手机桌面打开该图标，进入此设置页点击「申请权限」即可！'
          ),
          isIos && !isPwa ? h('div', {
            style: {
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px', padding: '6px 10px',
              fontSize: '11px', color: '#fbbf24'
            }
          }, '当前正处于普通 Safari 标签页中，iOS 要求先添加到主屏幕再打开才能激活推送。') : null
        ),

        // Android 模块
        h('div', {
          style: {
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px', padding: '14px',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }
        },
          h('div', { style: { fontWeight: 600, color: '#86efac', display: 'flex', alignItems: 'center', gap: '6px' } },
            h(IconAndroid),
            '安卓 Android 设备'
          ),
          h('div', { style: { fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)' } },
            '1. 支持 Chrome、Edge、Firefox、Kiwi 等各类主流浏览器；', h('br'),
            '2. 保持 HTTPS 或本地网络访问；', h('br'),
            '3. 直接在此页面点击「申请通知权限并订阅」，弹窗选择「允许」；', h('br'),
            '4. 后台熄屏自动通过 FCM / 系统推送通道推送，点击即跳回会话。'
          )
        )
      )
    ),

    // 4. 全局推送行为偏好设置
    h('div', { style: S.card },
      h('div', { style: S.cardTitle }, h(IconSettings), '推送触发偏好'),
      h('div', { style: S.toggleRow },
        h('div', null,
          h('div', { style: { fontWeight: 500 } }, '启用 Web Push 离线推送总开关'),
          h('div', { style: { fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)' } }, '关闭后，宿主端将不再向任何移动设备下发通知')
        ),
        h('input', {
          type: 'checkbox',
          checked: config.enabled,
          onChange: (e: any) => void handleSaveConfig({ enabled: e.target.checked }),
          style: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' },
        })
      ),
      h('div', { style: S.toggleRow },
        h('div', null,
          h('div', { style: { fontWeight: 500 } }, '任务顺利完成时推送 (Done)'),
          h('div', { style: { fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)' } }, '长耗时任务或日常操作完成时，推送耗时与步数摘要')
        ),
        h('input', {
          type: 'checkbox',
          checked: config.notifyOnDone,
          onChange: (e: any) => void handleSaveConfig({ notifyOnDone: e.target.checked }),
          style: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' },
        })
      ),
      h('div', { style: S.toggleRow },
        h('div', null,
          h('div', { style: { fontWeight: 500 } }, '任务异常中断时推送 (Failed)'),
          h('div', { style: { fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)' } }, '当执行过程中断或遇到报错时，推送警报')
        ),
        h('input', {
          type: 'checkbox',
          checked: config.notifyOnFailed,
          onChange: (e: any) => void handleSaveConfig({ notifyOnFailed: e.target.checked }),
          style: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' },
        })
      ),

      // 代理配置
      h('div', { style: { marginTop: '8px' } },
        h('div', { style: { fontWeight: 500, marginBottom: '4px' } }, '推送出站代理设置 (可选)'),
        h('div', { style: { fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' } },
          '用于在中国大陆网络环境下直连 Apple APNs (web.push.apple.com) 或 Google FCM 推送服务器。例如：http://127.0.0.1:1081 或留空直连。'
        ),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('input', {
            style: S.input,
            placeholder: '留空表示直连，或输入代理地址如 http://127.0.0.1:1081',
            value: config.proxyUrl || '',
            onChange: (e: any) => setConfig(prev => ({ ...prev, proxyUrl: e.target.value })),
          }),
          h('button', {
            style: S.btnSecondary,
            onClick: () => void handleSaveConfig({ proxyUrl: config.proxyUrl }),
          }, '保存代理')
        )
      ),

      // 通知点击跳转基地址
      h('div', { style: { marginTop: '8px' } },
        h('div', { style: { fontWeight: 500, marginBottom: '4px' } }, '通知点击跳转地址 (可选)'),
        h('div', { style: { fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' } },
          '留空则使用各设备订阅时的访问地址；若经反代对外访问，请填公网地址，保存后对所有已绑定设备立即生效。'
        ),
        h('div', { style: { display: 'flex', gap: '8px' } },
          h('input', {
            style: S.input,
            placeholder: '留空跟随各设备订阅地址，或输入公网地址',
            value: config.baseUrl || '',
            onChange: (e: any) => setConfig(prev => ({ ...prev, baseUrl: e.target.value })),
          }),
          h('button', {
            style: S.btnSecondary,
            onClick: () => void handleSaveConfig({ baseUrl: config.baseUrl }),
          }, '保存地址')
        )
      )
    ),

    // 5. 已绑定设备列表
    h('div', { style: S.card },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        h('div', { style: S.cardTitle }, `已绑定设备清单 (${devices.length})`),
        devices.length > 0 ? h('button', {
          style: { ...S.btnDanger, padding: '4px 10px', fontSize: '12px' },
          onClick: () => { void handleClearAll() },
        }, '清空所有设备') : null
      ),
      devices.length === 0
        ? h('div', { style: { color: 'rgba(255, 255, 255, 0.45)', padding: '12px 0' } }, '暂无已订阅的设备。在手机浏览器中打开本页面并点击「申请权限」即可绑定。')
        : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
          devices.map(dev => {
            const isThisDevice = localEndpoint && dev.endpoint === localEndpoint
            return h('div', {
              key: dev.id,
              style: {
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)',
                border: isThisDevice ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
              }
            },
              h('div', null,
                h('div', { style: { fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' } },
                  h(IconPhone, { size: 14 }),
                  dev.deviceName || '移动设备',
                  isThisDevice ? h('span', {
                    style: {
                      background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8',
                      fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px'
                    }
                  }, '当前设备') : null
                ),
                h('div', { style: { fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px' } },
                  `绑定时间: ${new Date(dev.createdAt).toLocaleString()} · 最近活跃: ${dev.lastUsedAt ? new Date(dev.lastUsedAt).toLocaleTimeString() : '从未'} · 跳转: ${dev.origin || '跟随订阅时地址'}`
                )
              ),
              h('button', {
                style: { ...S.btnDanger, padding: '4px 8px', fontSize: '11.5px' },
                onClick: async () => {
                  await fetch('/api/maid/webpush/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: dev.id }),
                  })
                  if (isThisDevice) {
                    setIsSubscribedLocally(false)
                    setLocalEndpoint('')
                  }
                  void fetchServerStatus()
                }
              }, '移除')
            )
          })
        )
    )
  )
}
