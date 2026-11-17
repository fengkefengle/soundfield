import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createAuth } from './auth.js'
import { createForum } from './forum.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

test('forum checks real authors, persists changes and removes related data', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'soundfield-forum-'))
  const file = path.join(dir, 'test.sqlite')
  let auth = createAuth(file)
  const app = express(); app.use(express.json()); app.use('/api', auth.router); app.use('/api/forum', createForum(auth.db, auth.requireUser))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api`
  t.after(async () => { await new Promise(resolve => server.close(resolve)); auth.db.close(); await rm(dir, { recursive: true, force: true }) })
  async function req(url, cookie, method = 'GET', body) {
    const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', 'X-Soundfield-Request': '1', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
  }
  const alice = await req('/auth/register', null, 'POST', { account: 'forum_alice', nickname: '相同昵称', password: 'Test-Pass-934' })
  const bob = await req('/auth/register', null, 'POST', { account: 'forum_bob', nickname: '相同昵称', password: 'Test-Pass-934' })
  assert.equal(alice.status, 201); assert.equal(bob.status, 201)
  assert.equal((await req('/forum/posts')).status, 401)
  assert.equal((await req('/forum/posts', alice.cookie)).data.total, 0)
  assert.equal((await req('/forum/posts', alice.cookie, 'POST', { category: 'tone', title: '短', body: '短' })).status, 400)
  const created = await req('/forum/posts', alice.cookie, 'POST', { category: 'tone', title: '真实帖子权限测试', body: '清音压缩与混响的实际搭配体验。', authorId: bob.data.user.id })
  assert.equal(created.status, 201)
  const id = created.data.post.id, url = `/forum/posts/${id}`
  assert.equal(created.data.post.authorId, alice.data.user.id)
  assert.equal((await req(url, bob.cookie, 'DELETE', {})).status, 403)
  assert.equal((await req(url, bob.cookie, 'PATCH', { category: 'gear', title: '不能修改别人的', body: '即使昵称相同也不能修改。' })).status, 403)
  assert.equal((await req(url, alice.cookie, 'PATCH', { category: 'gear', title: '修改后的设备分享', body: '这是修改后的设备使用体验。' })).status, 200)
  for (let i = 0; i < 2; i++) assert.equal((await req(url + '/like', bob.cookie, 'POST', { liked: true })).data.post.likes, 1)
  assert.equal((await req(url + '/like', bob.cookie, 'POST', { liked: false })).data.post.likes, 0)
  const reply = await req(url + '/comments', bob.cookie, 'POST', { body: '我也有类似体验。' })
  const cid = reply.data.post.comments[0].id
  assert.equal((await req(url + '/comments/' + cid, alice.cookie, 'DELETE', {})).status, 403)
  assert.equal((await req(url + '/comments/' + cid, bob.cookie, 'DELETE', {})).data.post.comments.length, 0)
  await req(url + '/comments', bob.cookie, 'POST', { body: '再次留下真实评论。' })
  await req(url + '/like', bob.cookie, 'POST', { liked: true })
  const snapshot = (await req('/forum/posts', alice.cookie)).data.posts[0]
  assert.equal(snapshot.title, '修改后的设备分享'); assert.equal(snapshot.comments.length, 1)
  // Open another connection as after a restart, while retaining sessions and posts.
  const { DatabaseSync } = await import('node:sqlite')
  const second = new DatabaseSync(file)
  assert.equal(second.prepare('SELECT COUNT(*) AS n FROM forum_posts').get().n, 1); second.close()
  assert.equal((await req(url, alice.cookie, 'DELETE', {})).status, 200)
  assert.equal((await req('/forum/posts', alice.cookie)).data.total, 0)
  assert.equal(auth.db.prepare('SELECT COUNT(*) AS n FROM forum_comments').get().n, 0)
  assert.equal(auth.db.prepare('SELECT COUNT(*) AS n FROM forum_likes').get().n, 0)
  assert.equal((await req(url, alice.cookie, 'DELETE', {})).status, 404)
  assert.equal(auth.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2)
})

test('legacy cleanup removes only known samples and preserves originals on storage failures', async () => {
  const { readLegacyPosts, removeLegacyPost } = await import('../../client/src/forum-storage.js')
  let value = JSON.stringify([{ id: 'sample-1' }, { id: 'local-123', author: '我', title: '原文', comments: [{ body: '保留' }] }, { id: 'sample-3' }])
  const storage = { getItem: () => value, setItem: (_key, next) => { value = next } }
  const rows = readLegacyPosts(storage)
  assert.equal(rows.length, 1); assert.equal(rows[0].comments[0].body, '保留')
  assert.equal(readLegacyPosts(storage).length, 1)
  const broken = { getItem: () => value, setItem: () => { throw new Error('full') } }
  assert.throws(() => removeLegacyPost(broken, rows, 0), /full/)
  assert.equal(JSON.parse(value).length, 1)
  removeLegacyPost(storage, rows, 0); assert.deepEqual(readLegacyPosts(storage), [])
  value = '{broken'; assert.throws(() => readLegacyPosts(storage)); assert.equal(value, '{broken')
  value = '{}'; assert.throws(() => readLegacyPosts(storage), /格式/)
})
