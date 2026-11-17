export const legacyForumKey = 'soundfield-forum-posts'
const sampleIds = new Set(['sample-1', 'sample-2', 'sample-3'])

export function readLegacyPosts(storage) {
  const raw = storage.getItem(legacyForumKey)
  if (!raw) return []
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('旧帖子格式异常，原始内容已保留')
  const posts = parsed.filter(post => post && typeof post === 'object' && !sampleIds.has(post.id))
  if (posts.length !== parsed.length) storage.setItem(legacyForumKey, JSON.stringify(posts))
  return posts
}

export function removeLegacyPost(storage, posts, index) {
  const next = posts.filter((_, i) => i !== index)
  storage.setItem(legacyForumKey, JSON.stringify(next))
  return next
}
