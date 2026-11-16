import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { once } from 'node:events'
import { createAuth } from './auth.js'

test('account lifecycle, isolation, persistence and request protections', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soundfield-auth-'))
  const file = path.join(dir, 'test.sqlite')
  let auth, server, base
  async function start() {
    auth = createAuth(file)
    const app = express(); app.use(express.json()); app.use('/api', auth.router)
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
    base = `http://127.0.0.1:${server.address().port}`
  }
  async function stop() { await new Promise(resolve => server.close(resolve)); auth.db.close() }
  async function request(route, { method = 'GET', body, cookie, headers = {} } = {}) {
    const response = await fetch(`${base}/api${route}`, {
      method, headers: { 'Content-Type': 'application/json', 'X-Soundfield-Request': '1', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined
    })
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], rawCookie: response.headers.get('set-cookie') }
  }
  await start()
  try {
    assert.equal((await request('/me')).status, 401)
    const credentials = { account: 'Test_Player', nickname: '测试乐手', password: 'Original123!' }
    assert.equal((await request('/auth/register', { method: 'POST', body: { ...credentials, password: 'short' } })).status, 400)
    const reg = await request('/auth/register', { method: 'POST', body: { ...credentials, role: 'admin' } })
    assert.equal(reg.status, 201); assert.equal(reg.data.user.role, 'user')
    assert.match(reg.rawCookie, /HttpOnly/); assert.match(reg.rawCookie, /SameSite=Strict/)
    assert.equal(JSON.stringify(reg.data).includes('password'), false)
    const originalCookie = reg.cookie
    assert.equal((await request('/me', { cookie: originalCookie })).data.user.account, 'test_player')
    assert.equal((await request('/auth/register', { method: 'POST', body: { ...credentials, account: 'test_player' } })).status, 409)
    assert.equal((await request('/auth/login', { method: 'POST', body: { ...credentials, password: 'WrongPass123!' } })).status, 401)
    assert.equal((await request('/auth/login', { method: 'POST', body: { account: 'unknown_user', password: 'WrongPass123!' } })).status, 401)
    assert.equal((await request('/me', { method: 'PATCH', cookie: originalCookie, body: { nickname: '非法修改' }, headers: { Origin: 'https://foreign.example' } })).status, 403)
    assert.equal((await request('/me', { method: 'PATCH', cookie: originalCookie, body: { nickname: '非法修改' }, headers: { 'X-Soundfield-Request': '' } })).status, 403)
    const updated = await request('/me', { method: 'PATCH', cookie: originalCookie, body: { nickname: '更新昵称' } }); assert.equal(updated.data.user.nickname, '更新昵称')
    const second = await request('/auth/register', { method: 'POST', body: { account: 'second_user', nickname: '第二乐手', password: 'SecondPass123!' } })
    assert.notEqual(second.data.user.id, reg.data.user.id)
    assert.equal((await request('/me', { cookie: second.cookie })).data.user.nickname, '第二乐手')
    // Reopen the database and HTTP server, then reuse the persisted session.
    await stop(); await start()
    assert.equal((await request('/me', { cookie: originalCookie })).data.user.nickname, '更新昵称')
    const login = await request('/auth/login', { method: 'POST', body: credentials }); assert.equal(login.status, 200)
    assert.equal((await request('/me/password', { method: 'POST', cookie: login.cookie, body: { oldPassword: 'WrongPass123!', newPassword: 'Replacement123!' } })).status, 400)
    assert.equal((await request('/me/password', { method: 'POST', cookie: login.cookie, body: { oldPassword: credentials.password, newPassword: 'Replacement123!' } })).status, 200)
    assert.equal((await request('/me', { cookie: login.cookie })).status, 401)
    assert.equal((await request('/me', { cookie: originalCookie })).status, 401)
    assert.equal((await request('/auth/login', { method: 'POST', body: credentials })).status, 401)
    const newLogin = await request('/auth/login', { method: 'POST', body: { ...credentials, password: 'Replacement123!' } }); assert.equal(newLogin.status, 200)
    await request('/auth/logout', { method: 'POST', cookie: newLogin.cookie, body: {} })
    assert.equal((await request('/me', { cookie: newLogin.cookie })).status, 401)
    assert.equal((await request('/me', { cookie: second.cookie })).status, 200)
    const row = auth.db.prepare('SELECT * FROM users WHERE id = ?').get(reg.data.user.id)
    assert.notEqual(row.password_hash, 'Replacement123!'); assert.equal(row.password_hash.length, 128)
    auth.db.prepare('UPDATE sessions SET expires_at = 0').run()
    assert.equal((await request('/me', { cookie: second.cookie })).status, 401)
  } finally { await stop(); fs.rmSync(dir, { recursive: true, force: true }) }
})
