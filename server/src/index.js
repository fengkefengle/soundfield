import 'dotenv/config'
import express from 'express'
import { createAuth } from './auth.js'
import { createForum } from './forum.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import intervals from '../../client/src/banks/interval.json' with { type: 'json' }
import chords from '../../client/src/banks/chord.json' with { type: 'json' }
import modes from '../../client/src/banks/mode.json' with { type: 'json' }
import rhythms from '../../client/src/banks/rhythm.json' with { type: 'json' }
import notation from '../../client/src/banks/notation.json' with { type: 'json' }
const musicQuestions = [...intervals, ...chords, ...modes, ...rhythms, ...notation]

const app = express()
const port = Number(process.env.PORT || 3000)
const production = process.env.NODE_ENV === 'production'
if (production && (!process.env.APP_ORIGIN?.startsWith('https://') || process.env.COOKIE_SECURE !== 'true')) {
  throw new Error('Production requires HTTPS APP_ORIGIN and COOKIE_SECURE=true')
}
const auth = createAuth()

app.use(express.json({ limit: '64kb' }))
app.use('/api', auth.router)
app.use('/api/forum', createForum(auth.db, auth.requireUser))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.get('/api/questions', (req, res) => {
  const category = req.query.category
  const rows = category ? musicQuestions.filter(q => q.category === category) : musicQuestions
  res.json(rows)
})
// 公测题库由部署包维护；后台管理完成前关闭在线写入。
app.post('/api/questions', auth.requireUser, (_req, res) => res.status(403).json({ message: '题库管理尚未开放' }))

app.post('/api/ai/explain', auth.requireUser, async (req, res, next) => {
  try {
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(503).json({ message: '尚未配置 DEEPSEEK_API_KEY' })
  }
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: `请用简洁中文讲解这道题：${req.body?.content || ''}` }]
    })
  })
  const data = await response.json()
  if (!response.ok) return res.status(response.status).json(data)
  return res.json({ explanation: data.choices?.[0]?.message?.content || '' })
  } catch (error) { next(error) }
})

app.use('/api', (_req, res) => res.status(404).json({ message: '接口不存在' }))
if (production) {
  const dist = fileURLToPath(new URL('../../client/dist/', import.meta.url))
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}
app.use((error, _req, res, _next) => {
  console.error('Request failed:', error.code || error.name)
  res.status(error.type === 'entity.parse.failed' ? 400 : 503).json({ message: '请求未完成，请稍后重试' })
})
const host = process.env.HOST || '127.0.0.1'
app.listen(port, host, () => console.log(`Soundfield listening on http://${host}:${port}`))
