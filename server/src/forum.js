import { Router } from 'express'
import { randomUUID } from 'node:crypto'

const categories = new Set(['tone', 'gear', 'recording'])
const validText = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max

export function createForum(db, requireUser) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY, author_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS forum_comments (
      id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS forum_likes (
      post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY(post_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS forum_post_date ON forum_posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS forum_comment_post ON forum_comments(post_id, created_at);
  `)
  const router = Router()
  router.use(requireUser)
  const writes = new Map()
  router.use((req, res, next) => {
    if (req.method === 'GET') return next()
    const now = Date.now()
    for (const [id, item] of writes) if (item.until <= now) writes.delete(id)
    const item = writes.get(req.user.id) || { count: 0, until: now + 60000 }
    item.count++; writes.set(req.user.id, item)
    if (item.count > 40) { res.set('Retry-After', Math.ceil((item.until - now) / 1000)); return res.status(429).json({ message: '操作太快了，稍等一分钟再试' }) }
    next()
  })
  function postData(id, userId) {
    const row = db.prepare(`SELECT p.*, u.nickname AS author FROM forum_posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?`).get(id)
    if (!row) return null
    const comments = db.prepare(`SELECT c.id, c.author_id AS authorId, u.nickname AS author, c.body, c.created_at AS createdAt FROM forum_comments c JOIN users u ON c.author_id = u.id WHERE c.post_id = ? ORDER BY c.created_at, c.rowid`).all(id)
    return {
      id: row.id, authorId: row.author_id, author: row.author, category: row.category, title: row.title, body: row.body,
      createdAt: row.created_at, updatedAt: row.updated_at, comments,
      likes: db.prepare('SELECT COUNT(*) AS n FROM forum_likes WHERE post_id = ?').get(id).n,
      liked: !!db.prepare('SELECT 1 FROM forum_likes WHERE post_id = ? AND user_id = ?').get(id, userId),
    }
  }
  function ownedPost(req, res) {
    const row = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(req.params.id)
    if (!row) { res.status(404).json({ message: '帖子已被删除，请刷新列表' }); return null }
    if (row.author_id !== req.user.id) { res.status(403).json({ message: '只能操作自己发布的帖子' }); return null }
    return row
  }
  function validPost(req, res) {
    if (!categories.has(req.body?.category) || !validText(req.body?.title, 4, 60) || !validText(req.body?.body, 8, 5000)) {
      res.status(400).json({ message: '请选择分类，标题需 4–60 字，正文需 8–5000 字' }); return false
    }
    return true
  }
  router.get('/posts', (req, res) => {
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0)
    const rows = db.prepare('SELECT id FROM forum_posts ORDER BY created_at DESC, rowid DESC LIMIT 30 OFFSET ?').all(offset)
    const total = db.prepare('SELECT COUNT(*) AS n FROM forum_posts').get().n
    res.json({ posts: rows.map(row => postData(row.id, req.user.id)), total, hasMore: offset + rows.length < total })
  })
  router.post('/posts', (req, res) => {
    if (!validPost(req, res)) return
    const id = randomUUID(), now = Date.now()
    db.prepare('INSERT INTO forum_posts VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.user.id, req.body.category, req.body.title.trim(), req.body.body.trim(), now, now)
    res.status(201).json({ post: postData(id, req.user.id) })
  })
  router.patch('/posts/:id', (req, res) => {
    if (!ownedPost(req, res) || !validPost(req, res)) return
    db.prepare('UPDATE forum_posts SET category = ?, title = ?, body = ?, updated_at = ? WHERE id = ?').run(req.body.category, req.body.title.trim(), req.body.body.trim(), Date.now(), req.params.id)
    res.json({ post: postData(req.params.id, req.user.id) })
  })
  router.delete('/posts/:id', (req, res) => {
    if (!ownedPost(req, res)) return
    db.prepare('DELETE FROM forum_posts WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })
  // Set the requested state: repeated clicks cannot create extra likes.
  router.post('/posts/:id/like', (req, res) => {
    if (!db.prepare('SELECT 1 FROM forum_posts WHERE id = ?').get(req.params.id)) return res.status(404).json({ message: '帖子已被删除' })
    if (typeof req.body?.liked !== 'boolean') return res.status(400).json({ message: '点赞状态无效' })
    if (req.body.liked) db.prepare('INSERT OR IGNORE INTO forum_likes VALUES (?, ?)').run(req.params.id, req.user.id)
    else db.prepare('DELETE FROM forum_likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.user.id)
    res.json({ post: postData(req.params.id, req.user.id) })
  })
  router.post('/posts/:id/comments', (req, res) => {
    if (!db.prepare('SELECT 1 FROM forum_posts WHERE id = ?').get(req.params.id)) return res.status(404).json({ message: '帖子已被删除' })
    if (!validText(req.body?.body, 2, 500)) return res.status(400).json({ message: '评论需 2–500 字' })
    db.prepare('INSERT INTO forum_comments VALUES (?, ?, ?, ?, ?)').run(randomUUID(), req.params.id, req.user.id, req.body.body.trim(), Date.now())
    res.status(201).json({ post: postData(req.params.id, req.user.id) })
  })
  router.delete('/posts/:id/comments/:commentId', (req, res) => {
    const comment = db.prepare('SELECT * FROM forum_comments WHERE id = ? AND post_id = ?').get(req.params.commentId, req.params.id)
    if (!comment) return res.status(404).json({ message: '评论已被删除' })
    if (comment.author_id !== req.user.id) return res.status(403).json({ message: '只能删除自己的评论' })
    db.prepare('DELETE FROM forum_comments WHERE id = ?').run(comment.id)
    res.json({ post: postData(req.params.id, req.user.id) })
  })
  return router
}
