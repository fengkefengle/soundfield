<script setup>
import { computed, ref, nextTick } from 'vue'
import { checkedAt, effectTypes, effectProducts, priceLevels } from './effects'
import { guideSources, chainPresets, effectGuides } from './effect-guides'

const view = ref('products'), type = ref('all'), budget = ref('all'), brand = ref('all'), instrument = ref('all'), search = ref('')
const limit = ref(18), selected = ref(null), dialog = ref(null), chainId = ref('clean'), guideId = ref('first-board'), bpm = ref(120)
const brands = [...new Set(effectProducts.map(product => product.brand))].sort((a, b) => a.localeCompare(b))
const typeInfo = computed(() => effectTypes.find(item => item.id === type.value))
const results = computed(() => effectProducts.filter(product => {
  const text = search.value.trim().toLowerCase()
  const category = effectTypes.find(item => item.id === product.type)
  const level = priceLevels.find(item => item.id === budget.value)
  return (type.value === 'all' || product.type === type.value) &&
    (brand.value === 'all' || product.brand === brand.value) &&
    (instrument.value === 'all' || product.instrument === instrument.value) &&
    (!level || (product.min < level.max && product.max >= level.min)) &&
    (!text || `${product.brand} ${product.model} ${product.tone} ${product.use} ${category.name} ${product.instrument}`.toLowerCase().includes(text))
}))
const chain = computed(() => chainPresets.find(item => item.id === chainId.value))
const guide = computed(() => effectGuides.find(item => item.id === guideId.value))
const selectedType = computed(() => effectTypes.find(item => item.id === selected.value?.type))
const delayTimes = computed(() => {
  const value = Number(bpm.value)
  if (!Number.isFinite(value) || value < 30 || value > 300) return null
  return [1, 0.5, 0.75].map(ratio => Math.round(60000 / value * ratio))
})
function sources(ids) { return ids.map(id => guideSources.find(item => item.id === id)).filter(Boolean) }
function reset() { type.value = 'all'; budget.value = 'all'; brand.value = 'all'; instrument.value = 'all'; search.value = ''; limit.value = 18 }
function filterChanged() { limit.value = 18 }
async function openProduct(product) { selected.value = product; await nextTick(); dialog.value.showModal() }
function closeProduct() { dialog.value?.close(); selected.value = null }
</script>

<template>
  <div class="page-heading"><div><div class="eyebrow">THE SOUND TOOLKIT</div><h1>认识设备，也认识声音。</h1><p>从第一块过载，到完整的效果器链。按用途找设备，按声音目标学搭配。</p></div><span class="date-pill">资料整理 · {{ checkedAt }}</span></div>
  <section class="library-hero panel"><div><span class="hero-kicker">✦ 让设备服务于音乐</span><h2>先听懂它做什么，<br>再决定放在哪里。</h2><p>{{ effectProducts.length }} 款常见型号 · {{ effectTypes.length }} 类用途 · {{ effectGuides.length }} 篇接线与音色教程</p></div><div class="pedal-sketch" aria-hidden="true"><div class="sketch-cable"></div><div class="sketch-pedal blue"><small>DRIVE</small><div><i></i><i></i><i></i></div><b>◉</b></div><div class="sketch-pedal pink"><small>SPACE</small><div><i></i><i></i><i></i></div><b>◉</b></div></div></section>
  <div class="library-nav" role="group" aria-label="资料库内容"><button :class="{ active: view === 'products' }" :aria-pressed="view === 'products'" @click="view = 'products'">✦ 产品资料 <small>{{ effectProducts.length }}</small></button><button :class="{ active: view === 'chains' }" :aria-pressed="view === 'chains'" @click="view = 'chains'">⌁ 效果器链</button><button :class="{ active: view === 'guides' }" :aria-pressed="view === 'guides'" @click="view = 'guides'">▤ 教程与排错 <small>{{ effectGuides.length }}</small></button></div>

  <template v-if="view === 'products'">
    <section class="effects-toolbar panel">
      <label class="effect-search"><span aria-hidden="true">⌕</span><span class="sr-only">搜索效果器资料</span><input v-model="search" type="search" placeholder="搜品牌、型号、音色或用途，例如：贝斯 / 延迟 / BOSS" @input="filterChanged"></label>
      <div class="effects-filter-group"><span class="filter-label">效果类型</span><div class="filter-pills"><button :class="{ active: type === 'all' }" @click="type = 'all'; filterChanged()">全部</button><button v-for="item in effectTypes" :key="item.id" :class="{ active: type === item.id }" @click="type = item.id; filterChanged()">{{ item.name }}</button></div></div>
      <div class="library-selects"><label>品牌<select v-model="brand" @change="filterChanged"><option value="all">全部品牌</option><option v-for="item in brands" :key="item">{{ item }}</option></select></label><label>主要适用<select v-model="instrument" @change="filterChanged"><option value="all">全部乐器</option><option>吉他</option><option>贝斯</option><option>木吉他</option></select></label><label>预算筛选<select v-model="budget" @change="filterChanged"><option value="all">全部预算</option><option v-for="item in priceLevels" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><button class="text-button muted" @click="reset">重置筛选 ↺</button></div>
    </section>
    <section v-if="typeInfo" class="panel category-explainer"><div class="category-explainer-icon">{{ typeInfo.icon }}</div><div><h3>{{ typeInfo.name }}，改变什么？</h3><p>{{ typeInfo.description }}</p><small>{{ typeInfo.controls }}</small></div></section>
    <div class="effects-summary"><span role="status">找到 {{ results.length }} 款资料</span><span>预算区间为编辑估计，未经国内实时售价核验；筛选包含区间有交集的产品。</span></div>
    <section class="effects-grid"><article v-for="product in results.slice(0, limit)" :key="product.id" class="effect-card panel">
      <div class="effect-card-top"><span class="effect-type-icon" :style="{ background: product.color }">{{ effectTypes.find(item => item.id === product.type).icon }}</span><span class="effect-category-label">{{ effectTypes.find(item => item.id === product.type).name }}</span></div>
      <span class="eyebrow">{{ product.brand }}</span><h3>{{ product.model }}</h3><p class="effect-tone">{{ product.tone }}</p><p class="product-use">{{ product.use }}</p><div class="effect-tags"><span>{{ product.instrument }}</span><span>预算估计 ¥{{ product.min.toLocaleString() }}–{{ product.max.toLocaleString() }}</span></div>
      <div class="effect-card-footer"><a :href="product.source" target="_blank" rel="noopener noreferrer" class="source-link">品牌官网 ↗</a><button class="text-button" @click="openProduct(product)">用途与详情 →</button></div>
    </article></section>
    <div v-if="!results.length" class="panel empty-state"><span>⌕</span><h2>没有匹配的效果器</h2><p>换个关键词，或放宽品牌、乐器和预算条件。</p><button class="primary-button" @click="reset">清除筛选 →</button></div>
    <div v-if="results.length > limit" class="library-more"><button class="secondary-button" @click="limit += 18">再看 {{ Math.min(18, results.length - limit) }} 款 ↓</button><span class="muted-label">已显示 {{ Math.min(limit, results.length) }} / {{ results.length }}</span></div>
    <section class="effects-note panel"><span>ⓘ</span><p>这是常见型号资料与选购起点，覆盖持续补充，不是全市场清单或品牌排名。产品用途按官方资料归纳，音色建议与预算是编辑判断；预算不是报价，不区分促销或二手行情。先用自己的乐器和音箱试听，库存、供电和具体版本以官网与商家为准。本站未设置返佣购买链接。</p></section>
  </template>

  <template v-else-if="view === 'chains'">
    <div class="section-heading"><div><h3>选一个场景，从一条简单链路开始。</h3><p>顺序是起点。每次只挪一块踏板，听清楚它改变了什么。</p></div></div>
    <div class="chain-tabs"><button v-for="item in chainPresets" :key="item.id" :class="{ active: chainId === item.id }" :aria-pressed="chainId === item.id" @click="chainId = item.id">{{ item.name }}</button></div>
    <section class="panel chain-panel"><span class="badge">{{ chain.tag }}</span><h2>{{ chain.name }} · 信号怎么走</h2><p>{{ chain.description }}</p><div v-for="(line, index) in chain.chains" :key="index" class="signal-line"><h4>{{ line.label }}</h4><ol class="signal-chain"><li v-for="(node, nodeIndex) in line.nodes" :key="nodeIndex"><span>{{ node }}</span><b v-if="nodeIndex < line.nodes.length - 1" aria-hidden="true">→</b></li></ol></div><div class="chain-tips"><p v-for="tip in chain.tips" :key="tip"><span>✧</span>{{ tip }}</p></div><div class="source-row"><span>依据与延伸阅读</span><a v-for="source in sources(chain.sourceIds)" :key="source.id" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.name }} ↗</a></div></section>
    <section class="chain-callout panel"><div><h3>用的是音箱自带失真？</h3><p>把延迟与混响放进音箱 FX Loop，通常能获得更清楚的尾音。综合效果器也可以了解四线法。</p></div><button class="secondary-button" @click="view = 'guides'; guideId = 'fx-loop'">查看接线教程 →</button></section>
    <p class="sample-caption">链路为中文编辑示例，综合官方建议整理；不要求每个节点都购买一块设备。</p>
  </template>

  <template v-else>
    <div class="section-heading"><div><h3>把接线讲明白，把声音调出来。</h3><p>依据品牌官方指南整理的中文笔记，保留原文链接。公式、示例和实践步骤含编辑补充。</p></div></div>
    <div class="guide-layout"><nav class="guide-index panel" aria-label="教程目录"><button v-for="item in effectGuides" :key="item.id" :class="{ active: guideId === item.id }" :aria-pressed="guideId === item.id" @click="guideId = item.id"><small>{{ item.category }} · 约 {{ item.minutes }} 分钟</small><b>{{ item.title }}</b><span>→</span></button></nav>
      <article class="panel guide-article"><span class="badge">{{ guide.category }}</span><h2>{{ guide.title }}</h2><p class="guide-summary">{{ guide.summary }}</p><section v-for="(item, index) in guide.sections" :key="item.title"><span class="guide-number">0{{ index + 1 }}</span><h3>{{ item.title }}</h3><p>{{ item.body }}</p></section><div v-for="(line, index) in guide.chains || []" :key="index" class="signal-line"><h4>{{ line.label }}</h4><ol class="signal-chain"><li v-for="(node, nodeIndex) in line.nodes" :key="nodeIndex"><span>{{ node }}</span><b v-if="nodeIndex < line.nodes.length - 1" aria-hidden="true">→</b></li></ol></div>
        <div v-if="guide.id === 'delay-reverb'" class="tempo-tool"><label for="delay-bpm">歌曲速度 BPM<input id="delay-bpm" v-model="bpm" type="number" min="30" max="300" inputmode="numeric"></label><div v-if="delayTimes" class="tempo-values"><div v-for="(label, index) in ['四分音符', '八分音符', '附点八分']" :key="label"><small>{{ label }}</small><b>{{ delayTimes[index] }} <em>ms</em></b></div></div><p v-else role="status">请输入 30–300 的速度。</p></div>
        <div class="source-row"><span>原始资料 · 整理于 {{ checkedAt }}</span><a v-for="source in sources(guide.sourceIds)" :key="source.id" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.name }} ↗</a></div><p class="guide-attribution">本文为中文归纳与实践建议，未转载原文全文或图片。具体接口、供电和路由请同时参考你所用设备的说明书。</p>
      </article>
    </div>
  </template>

  <dialog ref="dialog" class="product-dialog" aria-labelledby="product-title" @close="selected = null" @click="event => { if (event.target === dialog) closeProduct() }"><section v-if="selected" class="product-detail"><div class="section-heading"><span class="badge">{{ selectedType.name }} · {{ selected.instrument }}</span><button class="close-button" aria-label="关闭产品详情" @click="closeProduct">×</button></div><span class="eyebrow">{{ selected.brand }}</span><h2 id="product-title">{{ selected.model }}</h2><p class="detail-tone">{{ selected.tone }}</p><div class="detail-budget"><span>预算估计</span><strong>¥{{ selected.min.toLocaleString() }}–{{ selected.max.toLocaleString() }}</strong><small>编辑估计区间，未经国内实时售价核验，不是商家报价。</small></div><h3>适合什么用途</h3><p>{{ selected.use }}</p><h3>型号要点</h3><p>{{ selected.detail }}</p><h3>这类效果怎样调</h3><p>{{ selectedType.controls }}</p><div class="detail-chain"><small>可尝试的位置</small><p>{{ selectedType.signal }}</p></div><h3>试听时留意</h3><p>{{ selectedType.tip }}</p><a class="primary-button source-button" :href="selected.source" target="_blank" rel="noopener noreferrer">查看品牌官方产品资料 ↗</a><p class="guide-attribution">官方产品页已于 {{ checkedAt }} 查阅。用途与链路为编辑整理，不代表官方排名或合作推荐。</p></section></dialog>
</template>
