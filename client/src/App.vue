<script setup>
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import { categories, questions, legacyQuestions } from './data'
import EffectsLibrary from './EffectsLibrary.vue'
import { requestExplanation, accountRequest } from './api'
import AuthGate from './AuthGate.vue'
import Tuner from './Tuner.vue'
import Forum from './Forum.vue'

const navItems = [ { id: 'home', name: '练习室', icon: '◫' }, { id: 'practice', name: '乐理刷题', icon: '♮' }, { id: 'ear', name: '听音训练', icon: '♫' }, { id: 'tuner', name: '调音器', icon: '⌁' }, { id: 'effects', name: '效果器库', icon: '✦' }, { id: 'forum', name: '音色论坛', icon: '◌' }, { id: 'mistakes', name: '错题本', icon: '▤' }, { id: 'ranking', name: '排行榜', icon: '↗' } ]
const page = ref('home')
const activeCategory = ref('interval')
const questionIndex = ref(0)
const legacyReview = ref(null)
const jumpNumber = ref(1)
const selected = ref(null)
const explanation = ref(false)
const notice = ref('')
let toastTimer
function toast(message) { notice.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => notice.value = '', 3500) }
function readSaved(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
const user = ref(null), authReady = ref(false), authBootError = ref('')
const records = ref([])
const wrongIds = ref([])
const nickname = ref('新来的乐手')
function onAuthenticated(value) {
  user.value = value; nickname.value = value.nickname
  records.value = readSaved(`soundfield-records-user-${value.id}`, [])
  wrongIds.value = readSaved(`soundfield-wrong-user-${value.id}`, [])
  page.value = 'home'; resetAnswer(); earScore.value = { total: 0, correct: 0 }; aiEnabled.value = false
}
async function checkSession() {
  authReady.value = false; authBootError.value = ''
  try { const data = await accountRequest('/me'); onAuthenticated(data.user) }
  catch (e) { if (e.status !== 401) authBootError.value = e.message }
  finally { authReady.value = true }
}
function clearUser() { stopAudio(); user.value = null; records.value = []; wrongIds.value = []; profileOpen.value = false; resetAnswer(); profileError.value = ''; oldPassword.value = ''; newPassword.value = ''; confirmPassword.value = '' }
async function logout() {
  profileBusy.value = true
  try { await accountRequest('/auth/logout', { method: 'POST', body: {} }); clearUser(); toast('已退出登录') }
  catch (e) { profileError.value = e.message }
  finally { profileBusy.value = false }
}
onMounted(checkSession)
const profileOpen = ref(false)
const editedName = ref(nickname.value)
const filtered = computed(() => questions.filter(q => q.category === activeCategory.value))
const currentQuestion = computed(() => legacyReview.value || filtered.value[questionIndex.value % filtered.value.length])
const categoryInfo = computed(() => categories.find(c => c.id === activeCategory.value))
const correctCount = computed(() => records.value.filter(r => r.correct).length)
const accuracy = computed(() => records.value.length ? Math.round(correctCount.value / records.value.length * 100) : 0)
const wrongQuestions = computed(() => [...questions, ...legacyQuestions].filter(q => wrongIds.value.includes(q.id)))
const aiEnabled = ref(false)
const aiLoading = ref(false)
const aiText = ref('')
let aiSerial = 0
function save() { if (!user.value) return; try { localStorage.setItem(`soundfield-records-user-${user.value.id}`, JSON.stringify(records.value)); localStorage.setItem(`soundfield-wrong-user-${user.value.id}`, JSON.stringify(wrongIds.value)) } catch { toast('浏览器无法保存记录，当前会话仍可继续') } }
function resetAnswer() { selected.value = null; explanation.value = false; aiText.value = ''; aiLoading.value = false; aiSerial++ }
function navigate(id) { stopAudio(); page.value = id; profileOpen.value = false }
function startPractice(category = 'interval') { legacyReview.value = null; activeCategory.value = category; questionIndex.value = 0; jumpNumber.value = 1; resetAnswer(); navigate('practice') }
function choose(index) {
  if (selected.value !== null) return
  selected.value = index
  const q = currentQuestion.value
  records.value.push({ questionId: q.id, category: q.category, correct: index === q.answer, at: new Date().toISOString() })
  if (index !== q.answer && !wrongIds.value.includes(q.id)) wrongIds.value.push(q.id)
  save()
}
function nextQuestion() { legacyReview.value = null; questionIndex.value++; jumpNumber.value = questionIndex.value % filtered.value.length + 1; resetAnswer() }
function jumpQuestion() {
  const number = Number(jumpNumber.value)
  if (!Number.isInteger(number) || number < 1 || number > filtered.value.length) return toast(`请输入 1–${filtered.value.length} 的题号`)
  legacyReview.value = null; questionIndex.value = number - 1; resetAnswer()
}
function review(q) { startPractice(q.category); const index = filtered.value.findIndex(item => item.id === q.id); if (index >= 0) { questionIndex.value = index; jumpNumber.value = index + 1 } else legacyReview.value = q }
function removeWrong(q) { wrongIds.value = wrongIds.value.filter(id => id !== q.id); save(); toast('已从本机错题本移除') }
async function explain() {
  explanation.value = !explanation.value
  if (!explanation.value || !aiEnabled.value || aiText.value) return
  const serial = ++aiSerial
  const q = currentQuestion.value
  aiLoading.value = true
  try {
    const text = await requestExplanation(`${q.stem}；选项：${q.options.join('、')}；标准答案：${q.options[q.answer]}；用户答案：${q.options[selected.value]}`)
    if (serial === aiSerial) aiText.value = text
  } catch { if (serial === aiSerial) toast('AI 接口暂未连接，已展示基础解析') }
  finally { if (serial === aiSerial) aiLoading.value = false }
}
const profileBusy = ref(false), profileError = ref('')
const oldPassword = ref(''), newPassword = ref(''), confirmPassword = ref('')
async function saveProfile() {
  const name = editedName.value.trim()
  if (name.length < 2 || name.length > 20) return toast('昵称需要 2–20 个字符')
  profileBusy.value = true; profileError.value = ''
  try { const data = await accountRequest('/me', { method: 'PATCH', body: { nickname: name } }); user.value = data.user; nickname.value = data.user.nickname; profileOpen.value = false; toast('昵称已保存') }
  catch (e) { if (e.status === 401) { clearUser(); toast('登录已过期，请重新登录') } else profileError.value = e.message }
  finally { profileBusy.value = false }
}
async function changePassword() {
  profileError.value = ''
  if (newPassword.value !== confirmPassword.value) { profileError.value = '两次输入的新密码不一致'; return }
  profileBusy.value = true
  try { await accountRequest('/me/password', { method: 'POST', body: { oldPassword: oldPassword.value, newPassword: newPassword.value } }); clearUser(); toast('密码已修改，请使用新密码登录') }
  catch (e) { if (e.status === 401) { clearUser(); toast('登录已过期，请重新登录') } else profileError.value = e.message }
  finally { profileBusy.value = false }
}

const earMode = ref('interval')
const earAnswer = ref(null)
const earPlayed = ref(false)
const earRound = ref(0)
const earScore = ref({ total: 0, correct: 0 })
const playing = ref(false)
const earChoices = computed(() => earMode.value === 'single' ? ['C', 'D', 'E', 'G'] : earMode.value === 'interval' ? ['小三度', '大三度', '纯四度', '纯五度'] : ['大三和弦', '小三和弦', '减三和弦', '增三和弦'])
const targetIndex = computed(() => earRound.value % 4)
let audioContext, oscillators = [], playbackTimer, audioSerial = 0
function stopAudio() { audioSerial++; clearTimeout(playbackTimer); for (const osc of oscillators) { try { osc.stop() } catch {} } oscillators = []; playing.value = false }
function setEarMode(mode) { stopAudio(); earMode.value = mode; earRound.value = Math.floor(Math.random() * 4); earAnswer.value = null; earPlayed.value = false }
function tone(midi, start, duration = .75) {
  const osc = audioContext.createOscillator(), gain = audioContext.createGain()
  osc.type = 'triangle'; osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
  gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.12, start + .025); gain.gain.exponentialRampToValueAtTime(.001, start + duration)
  osc.connect(gain); gain.connect(audioContext.destination); osc.start(start); osc.stop(start + duration + .05); oscillators.push(osc)
}
async function playSound(reference = false) {
  stopAudio()
  const serial = audioSerial
  try {
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) throw new Error('不支持音频')
    audioContext ||= new Audio(); await audioContext.resume()
    if (serial !== audioSerial) return
    const start = audioContext.currentTime + .03
    playing.value = true
    if (reference) tone(69, start)
    else {
      earPlayed.value = true
      const root = 60 + (earRound.value % 3) * 2
      if (earMode.value === 'single') tone([60, 62, 64, 67][targetIndex.value], start)
      else if (earMode.value === 'interval') { tone(root, start); tone(root + [3, 4, 5, 7][targetIndex.value], start + .9) }
      else { const thirds = [[4, 7], [3, 7], [3, 6], [4, 8]][targetIndex.value]; [0, ...thirds].forEach(n => tone(root + n, start, 1.4)) }
    }
    playbackTimer = setTimeout(() => { playing.value = false; oscillators = [] }, 1850)
  } catch { toast('音频无法播放，请检查浏览器声音设置'); playing.value = false }
}
function chooseEar(index) { if (!earPlayed.value || earAnswer.value !== null) return; earAnswer.value = index; earScore.value.total++; if (index === targetIndex.value) earScore.value.correct++ }
function nextEar() { stopAudio(); earRound.value++; earAnswer.value = null; earPlayed.value = false }
onBeforeUnmount(() => { stopAudio(); audioContext?.close(); clearTimeout(toastTimer) })
</script>

<template>
  <main v-if="!authReady || authBootError" class="auth-loading"><span class="brand-symbol"><i></i><i></i><i></i><i></i></span><h2>{{ authBootError ? '暂时无法打开练习室' : '正在打开你的练习室…' }}</h2><p v-if="authBootError">{{ authBootError }}</p><button v-if="authBootError" class="primary-button" @click="checkSession">重新连接 →</button></main>
  <AuthGate v-else-if="!user" @authenticated="onAuthenticated" />
  <div v-else class="app-shell">
    <aside class="sidebar">
      <a href="#" class="brand" @click.prevent="navigate('home')"><span class="brand-symbol"><i></i><i></i><i></i><i></i></span><span>声场<small>SOUNDFIELD</small></span></a>
      <div class="sidebar-label">你的音乐练习空间</div>
      <nav aria-label="主导航"><button v-for="item in navItems" :key="item.id" :class="['nav-item', { active: page === item.id }]" @click="navigate(item.id)"><span class="nav-icon">{{ item.icon }}</span>{{ item.name }}<span v-if="item.id === 'ear'" class="tiny-label">NEW</span><span v-if="item.id === 'mistakes'" class="nav-count">{{ wrongIds.length }}</span></button></nav>
      <div class="sidebar-bottom"><div class="community-box"><span class="online-dot"></span><b>大连音乐人 · 练习社区</b><p>从排练室，到更大的舞台。</p><span class="community-tag">小范围公测 / 预览版</span></div><button class="profile-button" @click="editedName = nickname; profileOpen = true"><span class="avatar">{{ nickname.slice(0, 1) }}</span><span><b>{{ nickname }}</b><small>账号已登录</small></span><span class="profile-arrow">⌘</span></button></div>
    </aside>
    <main class="main-area">
      <header class="topbar"><div class="breadcrumb">我的空间 <span>/</span> <b>{{ navItems.find(n => n.id === page)?.name }}</b></div><div class="topbar-right"><span class="demo-indicator"><i></i>账号已连接</span><button class="small-profile" @click="editedName = nickname; profileOpen = true">{{ nickname.slice(0, 1) }}</button></div></header>
      <div class="content-wrap">
        <template v-if="page === 'home'">
          <div class="page-heading"><div><div class="eyebrow">LET’S MAKE SOME PROGRESS</div><h1>每一次练习，都更接近音乐。</h1><p>你好，{{ nickname }}。今天想从哪一个音开始？</p></div><span class="date-pill">DALIAN · MUSIC COMMUNITY</span></div>
          <section class="hero-card"><div class="hero-copy"><span class="hero-kicker"><i></i> 今日练习推荐</span><h2>不只会弹奏，<br>也听懂每一个音。</h2><p>从音程到和弦，把乐理变成你的音乐直觉。<br>每天一点，让下一次排练更有底气。</p><div class="hero-actions"><button class="primary-button" @click="startPractice()">开始乐理练习 <span>↗</span></button><button class="hero-secondary" @click="navigate('ear')">试试听音训练 <span>→</span></button></div><div class="hero-footnote"><span>♩</span> 五大知识点 · 即时反馈 · 错题复习</div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="vinyl"><div class="record-label"><span>SF</span><small>SIDE A · 33 RPM</small><i></i></div></div><div class="floating-note">♫</div><div class="record-caption">PRACTICE. LISTEN. REPEAT.</div></div></section>
          <section class="stats-grid"><div class="stat-card"><span class="stat-top">累计练习 <span>↗</span></span><strong>{{ records.length }}<small>题</small></strong><span class="stat-bottom">从第一道题开始积累</span></div><div class="stat-card"><span class="stat-top">乐理正确率 <span>◎</span></span><strong>{{ accuracy }}<small>%</small></strong><span class="stat-bottom">{{ records.length ? `已答对 ${correctCount} 道题` : '完成练习后点亮你的数据' }}</span></div><div class="stat-card"><span class="stat-top">待复习错题 <span>▤</span></span><strong>{{ wrongIds.length }}<small>题</small></strong><button class="text-button" @click="navigate('mistakes')">去巩固一下 <span>→</span></button></div><div class="stat-card"><span class="stat-top">社区排名 <span>♜</span></span><strong class="unranked">待上榜</strong><span class="stat-bottom">真实社区排行尚未开放</span></div></section>
          <section class="section-block"><div class="section-heading"><div><h3>按知识点练习</h3><p>拆开难点，逐个击破。</p></div><span class="muted-label">{{ questions.length }} 道乐理题</span></div><div class="category-grid"><button v-for="c in categories" :key="c.id" class="category-card" :style="{ '--category-color': c.color }" @click="startPractice(c.id)"><span class="category-icon">{{ c.icon }}</span><small>{{ c.en }}</small><h4>{{ c.name }}</h4><p>{{ c.description }}</p><div><span>{{ questions.filter(q => q.category === c.id).length }} 道题</span><span class="circle-arrow">↗</span></div></button></div></section>
          <div class="home-bottom-grid"><section class="ear-promo panel"><div class="section-heading"><h3>用耳朵，找到答案。</h3><span class="badge">听音训练</span></div><div class="mini-wave" aria-hidden="true"><i v-for="n in 36" :key="n" :style="{ height: `${12 + Math.abs(Math.sin(n * .7)) * 45}px` }"></i></div><p>单音、音程、和弦。让你的耳朵也有肌肉记忆。</p><button class="text-button" @click="navigate('ear')">进入听音练习 <span>→</span></button></section><section class="panel leaderboard-mini"><div class="section-heading"><h3>排练室里的高手</h3><button class="text-button muted" @click="navigate('ranking')">完整榜单 ↗</button></div><div class="rank-empty"><span>↗</span><h4>期待真实的练习伙伴</h4><p>社区排行将在成绩同步功能开放后显示。</p></div><p class="sample-caption">当前仅保存个人本机练习记录</p></section></div>
        </template>

        <template v-else-if="page === 'practice'">
          <div class="page-heading"><div><div class="eyebrow">THEORY PRACTICE</div><h1>把知识，练成直觉。</h1><p>选择答案即可提交，每一次练习都会保存在本机。</p></div><button class="secondary-button" @click="navigate('mistakes')">▤ 我的错题本</button></div>
          <div class="category-tabs"><button v-for="c in categories" :key="c.id" :class="{ active: activeCategory === c.id }" @click="startPractice(c.id)">{{ c.name }}</button></div>
          <form class="question-jump" @submit.prevent="jumpQuestion"><span>当前分类 {{ filtered.length }} 题 · 与新题库原文题号对应</span><label for="jump-number">跳到第</label><input id="jump-number" type="number" v-model="jumpNumber" min="1" :max="filtered.length" required><span>题</span><button class="secondary-button">跳转 →</button></form><div class="practice-layout"><section class="question-panel panel"><div class="question-meta"><span class="badge">{{ categoryInfo.name }} · 单选题</span><span>{{ questionIndex % filtered.length + 1 }} / {{ filtered.length }}</span></div><div class="progress-track"><i :style="{ width: `${(questionIndex % filtered.length + 1) / filtered.length * 100}%` }"></i></div><div class="question-label">QUESTION {{ String(questionIndex % filtered.length + 1).padStart(2, '0') }}</div><h2 class="question-stem">{{ currentQuestion.stem }}</h2><div class="note-display" aria-label="题目音符提示"><span v-for="(note, i) in currentQuestion.notes" :key="i">{{ note }}<small v-if="i < currentQuestion.notes.length - 1">→</small></span></div><div class="answer-options"><button v-for="(option, i) in currentQuestion.options" :key="i" :class="{ correct: selected !== null && i === currentQuestion.answer, incorrect: selected === i && i !== currentQuestion.answer }" :disabled="selected !== null" @click="choose(i)"><span class="option-letter">{{ 'ABCD'[i] }}</span>{{ option }}<span class="option-result">{{ selected !== null && i === currentQuestion.answer ? '✓' : selected === i ? '×' : '' }}</span></button></div><div v-if="selected !== null" :class="['answer-feedback', { error: selected !== currentQuestion.answer }]"><b>{{ selected === currentQuestion.answer ? '✓ 回答正确，继续保持！' : `正确答案是 ${'ABCD'[currentQuestion.answer]} · ${currentQuestion.options[currentQuestion.answer]}` }}</b><span>{{ selected === currentQuestion.answer ? '又多掌握了一个知识点。' : '这道题已加入错题本，回头再巩固一下。' }}</span></div><div class="question-actions"><span v-if="selected === null" class="muted-label">选择一个答案，立即查看结果</span><button v-else class="secondary-button" @click="explain">✧ {{ explanation ? '收起解析' : '求解析' }}</button><button class="primary-button" :disabled="selected === null" @click="nextQuestion">下一题 <span>→</span></button></div><div v-if="explanation" class="explanation-box"><span class="eyebrow">{{ aiText ? 'AI 讲解' : '知识点解析' }}</span><p>{{ aiText || currentQuestion.explanation }}</p><small v-if="aiLoading">正在请求 AI 讲解…</small></div></section><aside class="practice-aside"><section class="panel tip-panel"><div class="tip-icon">✧</div><h3>练习小贴士</h3><p>{{ currentQuestion.tip }}</p><div class="tip-divider"></div><span class="muted-label">先理解，再记忆。<br>好的乐理会在音乐里找到回响。</span></section><section class="panel session-panel"><h3>你的练习记录</h3><div><span>累计完成</span><b>{{ records.length }} 题</b></div><div><span>回答正确</span><b>{{ correctCount }} 题</b></div><div><span>正确率</span><b class="lime-text">{{ accuracy }}%</b></div></section><div class="api-note"><span>✧ AI 解析接口已预留</span><p>当前使用基础解析。配置后端密钥后，可在个人设置中启用。</p></div></aside></div>
        </template>

        <template v-else-if="page === 'ear'">
          <div class="page-heading"><div><div class="eyebrow">EAR TRAINING</div><h1>闭上眼，也能听懂音乐。</h1><p>戴上耳机，从一个音开始。点击播放后选择你的答案。</p></div><span class="date-pill">A4 = 440 Hz · 十二平均律</span></div><div class="category-tabs"><button :class="{ active: earMode === 'single' }" @click="setEarMode('single')">单音听辨</button><button :class="{ active: earMode === 'interval' }" @click="setEarMode('interval')">音程听辨</button><button :class="{ active: earMode === 'chord' }" @click="setEarMode('chord')">和弦听辨</button></div><section class="ear-panel panel"><div class="question-meta"><span class="badge">{{ earMode === 'single' ? '音名识别' : earMode === 'interval' ? '上行旋律音程' : '原位三和弦' }}</span><span>合成音色 / TRIANGLE</span></div><div class="listen-stage"><div class="listen-rings"></div><button :class="['play-button', { playing }]" @click="playSound()" :aria-label="playing ? '重新播放' : '播放题目'">{{ playing ? 'Ⅱ' : '▶' }}</button><div :class="['waveform', { playing }]" aria-hidden="true"><i v-for="n in 41" :key="n" :style="{ '--bar-height': `${10 + Math.abs(Math.sin(n * 1.15)) * 48}px`, animationDelay: `${n * .035}s` }"></i></div><h2>{{ playing ? '仔细听，答案藏在声音里。' : earPlayed ? '听到了吗？选出你的答案。' : '准备好，听听这个声音。' }}</h2><p>可以重复播放。先感受，再判断。</p><button v-if="earMode === 'single'" class="text-button" @click="playSound(true)">♫ 播放 A4 参考音</button></div><div class="ear-options"><button v-for="(choice, i) in earChoices" :key="choice" :disabled="!earPlayed || earAnswer !== null" :class="{ correct: earAnswer !== null && i === targetIndex, incorrect: earAnswer === i && i !== targetIndex }" @click="chooseEar(i)"><small>{{ 'ABCD'[i] }}</small>{{ choice }}</button></div><div class="ear-bottom"><span>{{ earAnswer === null ? '点击播放后即可作答' : earAnswer === targetIndex ? '✓ 回答正确，耳朵越来越敏锐了。' : `正确答案：${earChoices[targetIndex]}` }}</span><button class="primary-button" :disabled="earAnswer === null" @click="nextEar">下一个声音 →</button></div></section><div class="ear-footer"><span>♪ 建议佩戴耳机，保持舒适音量</span><span>本次训练 {{ earScore.total }} 题 · 正确 {{ earScore.correct }} 题 · 独立统计</span></div>
        </template>

        <Tuner v-else-if="page === 'tuner'" />

        <EffectsLibrary v-else-if="page === 'effects'" />

        <Forum v-else-if="page === 'forum'" :user="user" />

        <template v-else-if="page === 'mistakes'">
          <div class="page-heading"><div><div class="eyebrow">LEARN FROM EVERY NOTE</div><h1>错过的音，再听一次。</h1><p>每一道错题，都是下一次进步的起点。</p></div><span class="date-pill">{{ wrongQuestions.length }} 道待复习</span></div><div class="mistake-list"><article v-for="q in wrongQuestions" :key="q.id" class="panel mistake-card"><span class="mistake-symbol" :style="{ color: categories.find(c => c.id === q.category).color }">{{ categories.find(c => c.id === q.category).icon }}</span><div class="mistake-copy"><span class="eyebrow">{{ categories.find(c => c.id === q.category).name }} · 单选题</span><h3>{{ q.stem }}</h3><p>重新练习，巩固这个知识点。</p></div><div class="mistake-actions"><button class="secondary-button" @click="review(q)">重新练习 ↗</button><button class="text-button muted" @click="removeWrong(q)">移除</button></div></article><div v-if="!wrongQuestions.length" class="panel empty-state"><span>✓</span><h2>没有待复习的错题</h2><p>去练习室，探索下一个知识点。</p><button class="primary-button" @click="startPractice()">开始练习 →</button></div></div><p class="sample-caption">体验版支持直接移除。正式版将按连续答对次数开放移除。</p>
        </template>

        <template v-else-if="page === 'ranking'">
          <div class="page-heading"><div><div class="eyebrow">THE LOCAL LINEUP</div><h1>让每一份成绩，都来自真实练习。</h1><p>这里会记录社区里认真练习的音乐人。</p></div><span class="date-pill">等待真实成绩</span></div>
          <section class="panel empty-state"><span>↗</span><h2>社区排行暂未开放</h2><p>成绩同步完成后，按正确率排序，至少完成 50 题；正确率相同时按答题总数排序。</p><button class="primary-button" @click="startPractice()">先练起来 →</button></section>
          <section class="panel ranking-personal"><div><span class="badge">你的本机练习记录</span><h3>{{ nickname }}</h3><p>当前浏览器保存的个人统计，尚未参与社区排名。</p></div><div><strong>{{ accuracy }}<small>% 正确率</small></strong><strong>{{ records.length }}<small>题已完成</small></strong></div></section>
        </template>
        <footer class="app-footer"><span>声场 SOUNDFIELD</span><span>为音乐而练习，为热爱而相聚。</span><span>PREVIEW · 02</span></footer>
      </div>
    </main>
    <div v-if="notice" role="status" class="toast">{{ notice }}</div>
    <div v-if="profileOpen" class="modal-overlay" @click.self="!profileBusy && (profileOpen = false)"><section class="profile-modal panel" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div class="section-heading"><h2 id="profile-title">账号与练习档案</h2><button class="close-button" aria-label="关闭" :disabled="profileBusy" @click="profileOpen = false">×</button></div><p>账号：{{ user.account }} · 练习记录仍保存在当前浏览器，按账号区分。</p><form @submit.prevent="saveProfile"><label for="nickname">昵称</label><input id="nickname" v-model="editedName" minlength="2" maxlength="20" required :disabled="profileBusy"><label class="checkbox-label"><input type="checkbox" v-model="aiEnabled">启用后端 AI 解析接口</label><button class="primary-button" :disabled="profileBusy">保存昵称 →</button></form><details class="password-details"><summary>修改密码</summary><form @submit.prevent="changePassword"><label for="old-password">旧密码</label><input id="old-password" type="password" v-model="oldPassword" autocomplete="current-password" required minlength="8" maxlength="64" :disabled="profileBusy"><label for="new-password">新密码</label><input id="new-password" type="password" v-model="newPassword" autocomplete="new-password" required minlength="8" maxlength="64" :disabled="profileBusy"><label for="repeat-password">确认新密码</label><input id="repeat-password" type="password" v-model="confirmPassword" autocomplete="new-password" required minlength="8" maxlength="64" :disabled="profileBusy"><p>修改成功后，需要使用新密码重新登录。</p><button class="secondary-button" :disabled="profileBusy">确认修改密码</button></form></details><div v-if="profileError" class="form-error" role="alert">{{ profileError }}</div><button class="logout-button" :disabled="profileBusy" @click="logout">退出登录</button></section></div>
  </div>
  <div v-if="!user && notice" role="status" class="toast">{{ notice }}</div>
</template>
