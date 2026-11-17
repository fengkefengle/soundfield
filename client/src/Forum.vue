<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { accountRequest } from './api'
import { readLegacyPosts, removeLegacyPost } from './forum-storage'

const props = defineProps({ user: { type: Object, required: true } })
const tabs = [{ id: 'all', name: '全部帖子' }, { id: 'tone', name: '音色分享' }, { id: 'gear', name: '设备交流' }, { id: 'recording', name: '录音与演出' }]
const posts = ref([]), total = ref(0), hasMore = ref(false), loading = ref(false), busy = ref(false)
const error = ref(''), message = ref(''), activeTab = ref('all'), mine = ref(false), search = ref('')
const composerOpen = ref(false), editingId = ref(null), title = ref(''), body = ref(''), category = ref('tone')
const deleting = ref(null), legacyPosts = ref([]), legacyError = ref(''), legacyDeleting = ref(null)
const drafts = ref({})
let alive = true
onBeforeUnmount(() => { alive = false })
const visiblePosts = computed(() => posts.value.filter(post =>
  (activeTab.value === 'all' || post.category === activeTab.value) &&
  (!mine.value || post.authorId === props.user.id) &&
  (!search.value.trim() || `${post.title} ${post.body} ${post.author}`.toLowerCase().includes(search.value.trim().toLowerCase()))
))
function time(value) { return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function categoryName(id) { return tabs.find(tab => tab.id === id)?.name || '交流' }
async function load(more = false) {
  if (loading.value || busy.value) return
  loading.value = true; error.value = ''
  try {
    const data = await accountRequest(`/forum/posts?offset=${more ? posts.value.length : 0}`)
    if (!alive) return
    const next = more ? [...posts.value, ...data.posts] : data.posts
    posts.value = [...new Map(next.map(post => [post.id, post])).values()]
    total.value = data.total; hasMore.value = data.hasMore
  } catch (e) { if (alive) error.value = e.message }
  finally { if (alive) loading.value = false }
}
function newPost() { editingId.value = null; title.value = ''; body.value = ''; category.value = 'tone'; composerOpen.value = true; message.value = ''; error.value = '' }
function edit(post) {
  editingId.value = post.id; title.value = post.title; body.value = post.body; category.value = post.category
  composerOpen.value = true; error.value = ''; window.scrollTo({ top: 0, behavior: 'smooth' })
}
async function publish() {
  if (busy.value || loading.value) return
  const nextTitle = title.value.trim(), nextBody = body.value.trim()
  if (nextTitle.length < 4 || nextTitle.length > 60 || nextBody.length < 8 || nextBody.length > 5000) { error.value = '标题需 4–60 字，正文需 8–5000 字'; return }
  busy.value = true; error.value = ''; message.value = ''
  try {
    const id = editingId.value
    const data = await accountRequest(id ? `/forum/posts/${id}` : '/forum/posts', { method: id ? 'PATCH' : 'POST', body: { title: nextTitle, body: nextBody, category: category.value } })
    if (!alive) return
    if (id) posts.value = posts.value.map(post => post.id === id ? data.post : post)
    else { posts.value.unshift(data.post); total.value++ }
    composerOpen.value = false; editingId.value = null; title.value = ''; body.value = ''; activeTab.value = 'all'; mine.value = false; search.value = ''
    message.value = id ? '修改已保存' : '帖子发布成功'
  } catch (e) { if (alive) error.value = e.message }
  finally { if (alive) busy.value = false }
}
async function mutate(path, method, payload, done) {
  if (busy.value || loading.value) return
  busy.value = true; error.value = ''; message.value = ''
  try {
    const data = await accountRequest(path, { method, body: payload || {} })
    if (!alive) return
    if (data.post) posts.value = posts.value.map(post => post.id === data.post.id ? data.post : post)
    done?.()
  } catch (e) { if (alive) error.value = e.message }
  finally { if (alive) busy.value = false }
}
function deletePost(post) {
  return mutate(`/forum/posts/${post.id}`, 'DELETE', {}, () => {
    posts.value = posts.value.filter(item => item.id !== post.id); total.value--; deleting.value = null
    if (editingId.value === post.id) { composerOpen.value = false; editingId.value = null }
    message.value = '帖子及其评论已删除'
  })
}
function comment(post) {
  const text = (drafts.value[post.id] || '').trim()
  if (text.length < 2 || text.length > 500) { error.value = '评论需 2–500 字'; return }
  return mutate(`/forum/posts/${post.id}/comments`, 'POST', { body: text }, () => { drafts.value[post.id] = '' })
}
function removeLocal(index) {
  try { legacyPosts.value = removeLegacyPost(localStorage, legacyPosts.value, index); legacyDeleting.value = null; legacyError.value = '' }
  catch { legacyError.value = '浏览器未能保存删除操作，本机原文仍在，请检查存储权限后重试' }
}
function copyLegacy(post) {
  newPost(); title.value = String(post.title || '').slice(0, 60); body.value = String(post.body || '').slice(0, 5000)
  category.value = tabs.some(tab => tab.id === post.category && tab.id !== 'all') ? post.category : 'tone'
  message.value = '已复制到编辑器。确认内容属于你后再发布；本机原文仍保留。'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
onMounted(() => {
  try { legacyPosts.value = readLegacyPosts(localStorage) }
  catch (e) { legacyError.value = `旧帖子暂时无法整理，原始内容未删除。${e.message}` }
  load()
})
</script>

<template>
  <div class="page-heading"><div><div class="eyebrow">TONE COMMUNITY</div><h1>把你的声音，分享给同频的人。</h1><p>分享音色设置、设备搭配和录音经验。帖子跟随账号保存，可以随时编辑或删除。</p></div><button class="primary-button" :disabled="busy || loading" @click="newPost">发布帖子 <span>↗</span></button></div>
  <div v-if="error" role="alert" class="form-error forum-feedback">{{ error }}</div>
  <div v-if="message" role="status" class="forum-success">{{ message }}</div>
  <section v-if="composerOpen" class="panel forum-composer">
    <div class="section-heading"><div><h3>{{ editingId ? '编辑你的帖子' : '发布一篇新帖子' }}</h3><p>写清乐器、效果器顺序和关键参数，让大家更容易复现。</p></div><button class="text-button" :disabled="busy" @click="composerOpen = false">收起</button></div>
    <form @submit.prevent="publish"><div class="forum-form-grid"><label>分类<select v-model="category" :disabled="busy"><option v-for="tab in tabs.slice(1)" :key="tab.id" :value="tab.id">{{ tab.name }}</option></select></label><label>标题<input v-model="title" minlength="4" maxlength="60" required :disabled="busy" placeholder="例如：我的清音压缩与混响设置"></label></div><label>正文<textarea v-model="body" minlength="8" maxlength="5000" rows="6" required :disabled="busy" placeholder="分享你的实际体验；设备型号、使用场景和试听感受都很有帮助"></textarea></label><div class="composer-footer"><span>{{ body.length }}/5000</span><button class="primary-button" :disabled="busy || loading">{{ busy ? '正在保存…' : editingId ? '保存修改 →' : '发布帖子 →' }}</button></div></form>
  </section>
  <section class="forum-toolbar panel"><div class="category-tabs forum-tabs"><button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.name }}</button></div><div class="forum-tools"><button class="secondary-button" :class="{ 'selected-filter': mine }" :aria-pressed="mine" @click="mine = !mine">我的帖子</button><label class="forum-search"><span class="sr-only">搜索已加载帖子</span><input v-model="search" type="search" placeholder="搜索已加载的帖子"></label><button class="text-button" :disabled="loading || busy" @click="load()">{{ loading ? '加载中…' : '刷新' }}</button><span class="muted-label">共 {{ total }} 篇 · 已加载 {{ posts.length }} 篇</span></div></section>
  <section class="forum-list" :aria-busy="loading || busy">
    <article v-for="post in visiblePosts" :key="post.id" class="panel forum-card">
      <div class="forum-card-head"><span class="forum-avatar">{{ post.author.slice(0, 1) }}</span><div><b>{{ post.author }} <span v-if="post.authorId === user.id" class="own-post-tag">你</span></b><small>{{ time(post.createdAt) }} · {{ categoryName(post.category) }} <span v-if="post.updatedAt > post.createdAt">· 已编辑</span></small></div><button class="like-button" :class="{ liked: post.liked }" :disabled="busy || loading" :aria-pressed="post.liked" :aria-label="post.liked ? '取消点赞' : '点赞'" @click="mutate(`/forum/posts/${post.id}/like`, 'POST', { liked: !post.liked })">{{ post.liked ? '♥' : '♡' }} {{ post.likes }}</button></div>
      <h2>{{ post.title }}</h2><p class="forum-body">{{ post.body }}</p>
      <div v-if="post.authorId === user.id" class="post-owner-actions"><button class="text-button" :disabled="busy || loading" @click="edit(post)">编辑帖子</button><button class="text-button danger-text" :disabled="busy || loading" @click="deleting = post.id">删除帖子</button></div>
      <div v-if="deleting === post.id" class="delete-confirm" role="alert"><p>确认删除「{{ post.title }}」及其全部评论？删除后无法恢复。</p><button class="secondary-button" :disabled="busy || loading" @click="deleting = null">取消</button><button class="danger-button" :disabled="busy || loading" @click="deletePost(post)">确认删除</button></div>
      <details v-if="post.comments.length" class="forum-comments" open><summary>{{ post.comments.length }} 条评论</summary><div class="comment-list"><div v-for="item in post.comments" :key="item.id" class="comment"><span class="comment-avatar">{{ item.author.slice(0, 1) }}</span><div class="comment-content"><p><b>{{ item.author }}</b>{{ item.body }}</p><small>{{ time(item.createdAt) }}</small><template v-if="item.authorId === user.id"><button v-if="deleting !== item.id" class="text-button danger-text" :disabled="busy || loading" @click="deleting = item.id">删除</button><span v-else class="comment-delete"><span>删除这条评论？</span><button class="text-button danger-text" :disabled="busy || loading" @click="mutate(`/forum/posts/${post.id}/comments/${item.id}`, 'DELETE', {}, () => deleting = null)">确认</button><button class="text-button" :disabled="busy" @click="deleting = null">取消</button></span></template></div></div></div></details>
      <form class="comment-form" @submit.prevent="comment(post)"><input v-model="drafts[post.id]" :aria-label="`评论：${post.title}`" minlength="2" maxlength="500" required :disabled="busy" placeholder="写下你的体验或建议…"><button class="text-button" :disabled="busy || loading">评论 →</button></form>
    </article>
    <div v-if="!visiblePosts.length" class="panel empty-state"><span>◌</span><h2>{{ loading ? '正在加载帖子…' : error && !posts.length ? '暂时没有连接到论坛' : total ? '没有符合条件的帖子' : '第一篇真实分享，等你来写。' }}</h2><p>{{ total ? '可以换个分类、清空搜索，或继续加载更多帖子。' : '聊聊你最常用的音色，或分享一套喜欢的效果器链。' }}</p><button v-if="error" class="secondary-button" :disabled="loading || busy" @click="load()">重新连接</button><button v-else class="primary-button" :disabled="loading || busy" @click="newPost">发布帖子 →</button></div>
  </section>
  <div v-if="hasMore" class="forum-load-more"><button class="secondary-button" :disabled="loading || busy" @click="load(true)">{{ loading ? '正在加载…' : '加载更多帖子' }}</button></div>
  <section v-if="legacyPosts.length || legacyError" class="panel legacy-posts"><div class="section-heading"><div><h3>旧版本的本机帖子</h3><p>旧版本未记录作者账号，原文已保留。确认是你写的内容后，可以复制重新发布；也可以删除本机副本。</p></div><span class="badge">仅此浏览器</span></div><p v-if="legacyError" class="form-error" role="alert">{{ legacyError }}</p><article v-for="(post, index) in legacyPosts" :key="index" class="legacy-post"><small>原署名：{{ post.author || '未记录' }}</small><h4>{{ post.title }}</h4><p class="forum-body">{{ post.body }}</p><div class="post-owner-actions"><button class="text-button" :disabled="busy" @click="copyLegacy(post)">复制到编辑器</button><button class="text-button danger-text" @click="legacyDeleting = index">删除本机副本</button></div><div v-if="legacyDeleting === index" class="delete-confirm"><p>删除这篇旧帖的本机副本？此操作无法恢复。</p><button class="secondary-button" @click="legacyDeleting = null">取消</button><button class="danger-button" @click="removeLocal(index)">确认删除</button></div></article></section>
</template>
