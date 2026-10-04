/**
 * @dsh-external/dsh-floating-maid — 局域网接入设置页（client 端）
 *
 * 显示「别的机器怎么连上这台 DSH」：
 *   - 局域网直连地址（含一键复制）
 *   - 带 token 的免登录入口（点开即进）
 *   - 反代开关与端口
 *
 * 背景：dsh web 默认只绑 127.0.0.1，且会话 cookie 与 authority 绑定，
 * 别的机器直接访问 <局域网IP>:3080 会停在 401。本页驱动 host 端起一个
 * 局域网反代来解决（见 src/lan.ts）。
 */
import * as React from 'react'

const h = React.createElement

interface LanStatus {
  ok?: boolean
  enabled: boolean
  listening: boolean
  port: number
  upstream: string
  dshPort: number
  tokenAvailable: boolean
  addresses: string[]
  urls: string[]
  authenticatedUrls: string[]
  upstreamLoopbackOnly: boolean
  error?: string
}

const card: React.CSSProperties = {
  border: '1px solid var(--dsh-border, rgba(128,128,128,.25))',
  borderRadius: 10,
  padding: '14px 16px',
  marginBottom: 14,
}

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 8,
}

const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  background: 'rgba(128,128,128,.12)',
  padding: '3px 7px',
  borderRadius: 5,
  wordBreak: 'break-all',
}

const btn: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 6,
  border: '1px solid var(--dsh-border, rgba(128,128,128,.35))',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
}

const label: React.CSSProperties = { fontSize: 13, opacity: 0.85 }
const hint: React.CSSProperties = { fontSize: 12, opacity: 0.6, lineHeight: 1.7 }

export function LanAccessSettingsSection(): React.ReactElement {
  const [status, setStatus] = React.useState<LanStatus | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string; type: 'info' | 'ok' | 'err' } | null>(null)
  const [portInput, setPortInput] = React.useState('3084')

  const refresh = React.useCallback(async () => {
    try {
      const r = await fetch('/api/maid/lan/status', { cache: 'no-store' })
      const j = (await r.json()) as LanStatus
      setStatus(j)
      if (j?.port) setPortInput(String(j.port))
    } catch (err: any) {
      setMsg({ text: '读取状态失败: ' + String(err?.message || err), type: 'err' })
    }
  }, [])

  React.useEffect(() => { void refresh() }, [refresh])

  const apply = React.useCallback(async (enabled: boolean, port?: number) => {
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch('/api/maid/lan/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(port === undefined ? { enabled } : { enabled, port }),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || '操作失败')
      setStatus(j as LanStatus)
      setMsg({ text: enabled ? '局域网访问已开启' : '局域网访问已关闭', type: 'ok' })
    } catch (err: any) {
      setMsg({ text: String(err?.message || err), type: 'err' })
    } finally {
      setLoading(false)
    }
  }, [])

  const copy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg({ text: '已复制到剪贴板', type: 'ok' })
    } catch {
      setMsg({ text: '复制失败，请手动选中复制', type: 'err' })
    }
  }, [])

  const on = !!status?.listening
  const addrs = status?.addresses || []
  const tokenUrls = status?.authenticatedUrls || []

  return h('div', null,
    h('div', { style: { marginBottom: 12 } },
      h('div', { style: { fontSize: 15, fontWeight: 600, marginBottom: 6 } }, '局域网访问'),
      h('div', { style: hint },
        '让同一局域网内的其他设备（手机 / 平板 / 另一台电脑）打开这台机器上的 DSH。',
        h('br'),
        'DSH 默认只监听 127.0.0.1 且带会话鉴权，所以别的设备直接访问会失败——开启后由本插件起一个反向代理解决。',
      ),
    ),

    // 状态卡
    h('div', { style: card },
      h('div', { style: row },
        h('span', { style: label }, '状态：'),
        h('span', {
          style: {
            fontSize: 12, padding: '2px 8px', borderRadius: 10,
            background: on ? 'rgba(34,160,107,.16)' : 'rgba(128,128,128,.16)',
            color: on ? '#22a06b' : 'inherit',
          },
        }, on ? `监听中 · 0.0.0.0:${status?.port}` : '未开启'),
        h('button', { style: btn, onClick: () => void refresh(), disabled: loading }, '刷新'),
      ),
      h('div', { style: row },
        h('span', { style: label }, '上游：'),
        h('code', { style: mono }, status?.upstream || '—'),
        status?.upstreamLoopbackOnly
          ? h('span', { style: { ...hint, marginLeft: 6 } }, '（DSH 只绑回环，必须经本代理）')
          : null,
      ),
      h('div', { style: row },
        h('span', { style: label }, '端口：'),
        h('input', {
          type: 'text',
          value: portInput,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPortInput(e.target.value),
          style: { ...mono, width: 80, padding: '4px 8px' },
          disabled: on,
        }),
        on ? null : h('button', {
          style: btn,
          disabled: loading,
          onClick: () => {
            const p = Number(portInput)
            if (!Number.isInteger(p) || p <= 0 || p > 65535) {
              setMsg({ text: '端口必须是 1-65535 的整数', type: 'err' }); return
            }
            void apply(true, p)
          },
        }, '以此端口开启'),
        on
          ? h('button', { style: btn, disabled: loading, onClick: () => void apply(false) }, '关闭局域网访问')
          : h('button', { style: btn, disabled: loading, onClick: () => void apply(true) }, '开启局域网访问'),
      ),
      status?.error ? h('div', { style: { ...hint, color: '#e0524f', marginTop: 6 } }, '错误：' + status.error) : null,
    ),

    // 访问地址
    addrs.length > 0
      ? h('div', { style: card },
          h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 8 } }, '访问地址'),
          h('div', { style: hint }, '把下面任一地址发给同局域网的设备打开即可。'),
          ...addrs.map((a, i) => h('div', { key: a, style: { ...row, marginTop: 10 } },
            h('code', { style: mono }, status?.urls[i] || `http://${a}:${status?.port}/`),
            h('button', { style: btn, onClick: () => void copy(status?.urls[i] || '') }, '复制'),
          )),
        )
      : h('div', { style: card },
          h('div', { style: hint },
            '没有检测到局域网地址。请确认本机已连上局域网（当前只找到回环地址）。',
          ),
        ),

    // 带 token 的免登录入口
    h('div', { style: card },
      h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 8 } }, '免登录入口（含 token）'),
      status?.tokenAvailable
        ? h(React.Fragment, null,
            h('div', { style: hint },
              '这些链接里带了本次 DSH 进程的启动 token，点开即可直接进入，不用再手动授权。',
              h('br'),
              '⚠️ token 等同于访问凭证，且每次重启 DSH 都会变——只发给你信任的设备。',
            ),
            ...tokenUrls.map((u, i) => h('div', { key: u, style: { ...row, marginTop: 10 } },
              h('code', { style: mono }, u.length > 96 ? u.slice(0, 96) + '…' : u),
              h('button', { style: btn, onClick: () => void copy(u) }, '复制'),
              h('button', {
                style: btn,
                onClick: () => window.open(u, '_blank', 'noopener'),
              }, '打开'),
            )),
          )
        : h('div', { style: hint },
            '尚未取到本次进程的启动 token。',
            h('br'),
            'token 由 DSH 启动时随机生成并打印在启动日志里，本插件从日志读取；若刚重启过，点上面的「刷新」重试。',
          ),
    ),

    msg
      ? h('div', {
          style: {
            fontSize: 12, padding: '8px 12px', borderRadius: 6, marginTop: 4,
            background: msg.type === 'err' ? 'rgba(224,82,79,.12)' : 'rgba(34,160,107,.12)',
            color: msg.type === 'err' ? '#e0524f' : '#22a06b',
          },
        }, msg.text)
      : null,
  )
}
