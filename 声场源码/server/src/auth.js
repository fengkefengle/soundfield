import { Router } from 'express'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkInterfaces } from 'node:os'

const scrypt = promisify(scryptCallback)
const sessionLifetime = 7 * 24 * 60 * 60 * 1000
const digest = value => createHash('sha256').update(value).digest('hex')
const publicUser = row => ({ id: row.id, account: row.account, nickname: row.nickname, role: row.role })
const defaultFile = fileURLToPath(new URL('../data/accounts.sqlite', import.meta.url))

export function createAuth(file = process.env.AUTH_DB_PATH || defaultFile) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, account TEXT NOT NULL UNIQUE, nickname TEXT NOT NULL,
      password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
  `)
  const router = Router()
  const secure = process.env.COOKIE_SECURE === 'true'
  const cookieName = secure ? '__Host-soundfield_session' : 'soundfield_session'
  const cookieOptions = { httpOnly: true, sameSite: 'strict', secure, path: '/' }
  const attempts = new Map()
  const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next)
  function tokenFrom(req) {
    const value = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    return value && /^[a-f0-9]{64}$/.test(value) ? value : null
  }
  function invalidate(req) { const token = tokenFrom(req); if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token)) }
  function setSession(req, res, userId) {
    invalidate(req)
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    const token = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), userId, Date.now() + sessionLifetime)
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionLifetime })
  }
  function requireUser(req, res, next) {
    const token = tokenFrom(req)
    const row = token ? db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?').get(digest(token), Date.now()) : null
    if (!row) return res.status(401).json({ message: '请先登录' })
    req.user = row; next()
  }
  function rateLimit(req, res, next) {
    const now = Date.now()
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
    const key = req.ip
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 }
    entry.count++; attempts.set(key, entry)
    if (entry.count > 40) { res.setHeader('Retry-After', Math.ceil((entry.until - now) / 1000)); return res.status(429).json({ message: '操作太频繁，请稍后再试' }) }
    next()
  }
  function validPassword(password) { return typeof password === 'string' && password.length >= 8 && password.length <= 64 }
  async function hashPassword(password, salt) { return (await scrypt(password, salt, 64)).toString('hex') }
  async function passwordMatches(password, row) {
    const actual = await scrypt(password, row.salt, 64)
    return timingSafeEqual(actual, Buffer.from(row.password_hash, 'hex'))
  }
  // Custom header + same-origin browser checks prevent cross-site mutations.
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.get('X-Soundfield-Request') !== '1' || !req.is('application/json')) return res.status(403).json({ message: '请求来源校验失败，请刷新页面重试' })
      const origin = req.get('Origin')
      const trusted = process.env.APP_ORIGIN || `${req.protocol}://${req.get('host')}`
      const allowed = [trusted]
      if (!process.env.APP_ORIGIN && process.env.NODE_ENV !== 'production') {
        allowed.push('http://127.0.0.1:5173', 'http://localhost:5173')
        for (const addresses of Object.values(networkInterfaces())) {
          for (const address of addresses || []) {
            if (address.family === 'IPv4' && !address.internal) allowed.push(`http://${address.address}:5173`)
          }
        }
      }
      if (req.get('Sec-Fetch-Site') === 'cross-site' || (origin && !allowed.includes(origin))) return res.status(403).json({ message: '不允许跨站请求' })
    }
    next()
  })
  router.post('/auth/register', rateLimit, asyncRoute(async (req, res) => {
    const { account, password, nickname } = req.body || {}
    if (typeof account !== 'string' || !/^[A-Za-z0-9_]{4,32}$/.test(account)) return res.status(400).json({ message: '账号需为 4–32 位字母、数字或下划线' })
    if (!validPassword(password)) return res.status(400).json({ message: '密码需为 8–64 个字符' })
    if (typeof nickname !== 'string' || nickname.trim().length < 2 || nickname.trim().length > 20) return res.status(400).json({ message: '昵称需为 2–20 个字符' })
    const normalized = account.toLowerCase()
    if (db.prepare('SELECT id FROM users WHERE account = ?').get(normalized)) return res.status(409).json({ message: '这个账号已被注册，请换一个或直接登录' })
    const salt = randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(password, salt)
    let result
    try { result = db.prepare('INSERT INTO users (account, nickname, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').run(normalized, nickname.trim(), passwordHash, salt, Date.now()) }
    catch (error) { if (String(error.message).includes('UNIQUE')) return res.status(409).json({ message: '这个账号已被注册' }); throw error }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    setSession(req, res, user.id)
    res.status(201).json({ user: publicUser(user) })
  }))
  router.post('/auth/login', rateLimit, asyncRoute(async (req, res) => {
    const { account, password } = req.body || {}
    if (typeof account !== 'string' || account.length > 32 || !validPassword(password)) return res.status(401).json({ message: '账号或密码错误' })
    const row = db.prepare('SELECT * FROM users WHERE account = ?').get(account.toLowerCase())
    // Always hash to avoid a fast response that reveals an unknown account.
    const fallback = { salt: 'soundfield-placeholder', password_hash: '0'.repeat(128) }
    const matched = await passwordMatches(password, row || fallback)
    if (!row || !matched) return res.status(401).json({ message: '账号或密码错误' })
    setSession(req, res, row.id); res.json({ user: publicUser(row) })
  }))
  router.post('/auth/logout', (req, res) => { invalidate(req); res.clearCookie(cookieName, cookieOptions); res.json({ ok: true }) })
  router.get('/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }))
  router.patch('/me', requireUser, (req, res) => {
    const name = req.body?.nickname
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 20) return res.status(400).json({ message: '昵称需为 2–20 个字符' })
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(name.trim(), req.user.id)
    res.json({ user: publicUser({ ...req.user, nickname: name.trim() }) })
  })
  router.post('/me/password', requireUser, rateLimit, asyncRoute(async (req, res) => {
    const { oldPassword, newPassword } = req.body || {}
    if (!validPassword(newPassword)) return res.status(400).json({ message: '新密码需为 8–64 个字符' })
    if (!validPassword(oldPassword) || !await passwordMatches(oldPassword, req.user)) return res.status(400).json({ message: '旧密码不正确' })
    if (oldPassword === newPassword) return res.status(400).json({ message: '新密码不能与旧密码相同' })
    const salt = randomBytes(16).toString('hex')
    const passwordHash = await hashPassword(newPassword, salt)
    db.exec('BEGIN')
    try {
      db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(passwordHash, salt, req.user.id)
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id)
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    res.clearCookie(cookieName, cookieOptions); res.json({ ok: true })
  }))
  router.use((error, _req, res, _next) => { console.error('Auth operation failed:', error.code || 'internal_error'); res.status(500).json({ message: '账号服务暂不可用，请稍后重试' }) })
  return { router, db, requireUser }
}
