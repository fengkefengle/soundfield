<script setup>
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import { describePitch, detectPitch } from './pitch'

const state = ref('idle'), error = ref(''), reference = ref(440), mode = ref('guitar')
const devices = ref([]), selectedDeviceId = ref(''), inputLevel = ref(0)
const frequency = ref(0), selectedString = ref(null)
const tunings = {
  guitar: [{ label: '6 · E2', midi: 40 }, { label: '5 · A2', midi: 45 }, { label: '4 · D3', midi: 50 }, { label: '3 · G3', midi: 55 }, { label: '2 · B3', midi: 59 }, { label: '1 · E4', midi: 64 }],
  bass: [{ label: '4 · E1', midi: 28 }, { label: '3 · A1', midi: 33 }, { label: '2 · D2', midi: 38 }, { label: '1 · G2', midi: 43 }],
  chromatic: [],
}
const note = computed(() => frequency.value ? describePitch(frequency.value, reference.value, selectedString.value) : null)
const inTune = computed(() => note.value && Math.abs(note.value.cents) <= 5)
const guidance = computed(() => {
  if (state.value === 'starting') return '等待麦克风连接…'
  if (state.value !== 'running') return '点击开始，拨响一根空弦'
  if (!note.value) return '正在聆听，请拨响一根弦'
  if (inTune.value) return '音已调准，保持这个位置'
  return note.value.cents < 0 ? '音偏低，慢慢调高' : '音偏高，慢慢调低'
})
let stream, context, source, analyser, timer, generation = 0, lastGood = 0, history = []
let candidateFrequency = 0, candidateFrames = 0, acceptedFrequency = 0
async function refreshDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return
  const all = await navigator.mediaDevices.enumerateDevices()
  devices.value = all.filter(device => device.kind === 'audioinput')
}
function stop() {
  generation++
  clearTimeout(timer)
  source?.disconnect(); source = null
  stream?.getTracks().forEach(track => track.stop()); stream = null
  context?.close().catch(() => {}); context = null; analyser = null
  frequency.value = 0; inputLevel.value = 0; history = []; candidateFrequency = 0; candidateFrames = 0; acceptedFrequency = 0; state.value = 'idle'
}
function listen() {
  if (state.value !== 'running' || !analyser) return
  const samples = new Float32Array(analyser.fftSize)
  analyser.getFloatTimeDomainData(samples)
  let energy = 0
  for (const sample of samples) energy += sample * sample
  inputLevel.value = Math.min(100, Math.round(Math.sqrt(energy / samples.length) * 1800))
  const targetFrequency = selectedString.value === null ? null : reference.value * 2 ** ((selectedString.value - 69) / 12)
  // Keep the instrument preset's target strings, but do not discard higher
  // notes coming from an amp or speaker when no string is selected.
  const maxFrequency = mode.value === 'guitar' ? 1600 : mode.value === 'bass' ? 800 : 4000
  const result = detectPitch(samples, context.sampleRate, { maxFrequency, targetFrequency })
  if (result && result.confidence >= 0.68) {
    const distance = candidateFrequency ? Math.abs(1200 * Math.log2(result.frequency / candidateFrequency)) : 0
    if (!candidateFrequency || distance <= 65) {
      candidateFrequency = candidateFrequency ? candidateFrequency * .65 + result.frequency * .35 : result.frequency
      candidateFrames++
    } else {
      candidateFrequency = result.frequency
      candidateFrames = 1
    }
    if (candidateFrames >= 3) {
      const jump = acceptedFrequency ? Math.abs(1200 * Math.log2(candidateFrequency / acceptedFrequency)) : 0
      // A stable new note is allowed to replace the previous note. The old
      // code rejected jumps larger than 100 cents forever, which made the
      // tuner appear stuck on the first detected pitch (often C1 noise).
      acceptedFrequency = !acceptedFrequency || jump > 100
        ? candidateFrequency
        : acceptedFrequency * .75 + candidateFrequency * .25
      frequency.value = acceptedFrequency
      lastGood = performance.now()
      if (jump > 100) candidateFrames = 0
    }
  } else if (performance.now() - lastGood > 650) {
    frequency.value = 0
    candidateFrequency = 0
    candidateFrames = 0
    acceptedFrequency = 0
    history = []
  }
  timer = setTimeout(listen, 80)
}
async function start() {
  stop(); error.value = ''; state.value = 'starting'
  const serial = generation
  try {
    if (!window.isSecureContext) throw Error('麦克风需要安全连接，请用 localhost 或 HTTPS 打开网站。')
    if (!navigator.mediaDevices?.getUserMedia) throw Error('当前浏览器不支持麦克风，请换用 Edge 或 Chrome。')
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) throw Error('当前浏览器不支持音频分析。')
    const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1, sampleRate: 48000 }
    if (selectedDeviceId.value) audio.deviceId = { exact: selectedDeviceId.value }
    const pending = await navigator.mediaDevices.getUserMedia({ audio })
    if (serial !== generation) { pending.getTracks().forEach(track => track.stop()); return }
    stream = pending; await refreshDevices(); context = new Audio(); await context.resume()
    if (serial !== generation) return
    analyser = context.createAnalyser(); analyser.fftSize = 8192
    source = context.createMediaStreamSource(stream); source.connect(analyser)
    stream.getAudioTracks()[0].addEventListener('ended', () => { stop(); error.value = '麦克风已断开，请重新连接。' }, { once: true })
    state.value = 'running'; lastGood = 0; listen()
  } catch (issue) {
    if (serial !== generation) return
    stop()
    error.value = issue.name === 'NotAllowedError' ? '麦克风权限未开启。请在地址栏允许本网站使用麦克风后重试。'
      : issue.name === 'NotFoundError' ? '没有找到麦克风，请连接输入设备后重试。'
      : issue.name === 'NotReadableError' ? '麦克风暂不可用，请检查设备连接或其他软件是否占用。' : issue.message
  }
}
function changeMode() { selectedString.value = null; frequency.value = 0; history = []; candidateFrequency = 0; candidateFrames = 0; acceptedFrequency = 0 }
function changeDevice() { if (state.value === 'running') start() }
onMounted(() => refreshDevices().catch(() => {}))
onBeforeUnmount(stop)
</script>

<template>
  <div class="page-heading"><div><div class="eyebrow">FIND YOUR FREQUENCY</div><h1>好声音，从调准开始。</h1><p>拨响一根弦，让指针靠近中线。声音在浏览器内分析，不录制、不上传。</p></div><span class="date-pill">CHROMATIC TUNER</span></div>
  <section class="tuner-controls panel">
    <label>乐器<select v-model="mode" @change="changeMode"><option value="guitar">吉他 · 标准六弦</option><option value="bass">贝斯 · 标准四弦</option><option value="chromatic">通用 · 十二平均律</option></select></label>
    <label>标准音<select v-model.number="reference"><option :value="432">A4 = 432 Hz</option><option :value="440">A4 = 440 Hz</option><option :value="442">A4 = 442 Hz</option></select></label>
    <label class="tuner-device">音频输入<select v-model="selectedDeviceId" @change="changeDevice"><option value="">系统默认麦克风</option><option v-for="device in devices" :key="device.deviceId" :value="device.deviceId">{{ device.label || `输入设备 ${devices.indexOf(device) + 1}` }}</option></select></label>
    <span class="muted-label">单音识别 · 调准范围 ±5 音分</span>
  </section>
  <section :class="['tuner-panel', 'panel', { 'is-in-tune': inTune }]">
    <div class="tuner-status"><span :class="['tuner-dot', state]"></span>{{ state === 'running' ? '麦克风已连接' : state === 'starting' ? '正在连接麦克风' : '麦克风未开启' }}</div>
    <div class="tuner-note">{{ note?.name || '—' }}<small v-if="note">{{ note.octave }}</small></div>
    <div class="tuner-frequency">{{ frequency ? `${frequency.toFixed(1)} Hz` : '等待声音输入' }}</div>
    <div class="tuner-meter"><span class="tuner-flat">♭</span><div class="tuner-scale"><i class="tuner-center"></i><i v-if="note" class="tuner-pointer" :style="{ left: `${50 + Math.max(-50, Math.min(50, note.cents))}%` }"></i><span>偏低</span><span>准确</span><span>偏高</span></div><span class="tuner-sharp">♯</span></div>
    <div class="tuner-cents">{{ note ? `${note.cents > 0 ? '+' : ''}${Math.round(note.cents)} 音分` : '— 音分' }}</div>
    <p class="tuner-guidance" role="status">{{ guidance }}</p>
    <div class="input-level"><span>输入电平</span><div><i :style="{ width: `${inputLevel}%` }"></i></div><small>{{ inputLevel < 3 ? '没有明显声音' : inputLevel < 12 ? '声音偏小' : '已收到声音' }}</small></div>
    <button class="primary-button tuner-action" @click="state === 'idle' ? start() : stop()">{{ state === 'running' ? '停止调音' : state === 'starting' ? '取消连接' : '开启麦克风调音' }} <span>{{ state === 'running' ? 'Ⅱ' : '◎' }}</span></button>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div v-if="tunings[mode].length" class="tuner-strings"><button :class="{ active: selectedString === null }" @click="selectedString = null">自动识别</button><button v-for="string in tunings[mode]" :key="string.midi" :class="{ active: selectedString === string.midi }" @click="selectedString = string.midi">{{ string.label }}</button></div>
    <p class="tuner-hint">音箱播放时电平会动但没有音名，先切到“通用 · 十二平均律”；需要调具体琴弦时再选择对应弦。普通麦克风只能收到它实际拾到的空气声。</p>
  </section>
  <div class="tuner-tips"><section class="panel"><span class="tip-icon">♩</span><h3>从低音弦开始</h3><p>吉他从六弦 E2 到一弦 E4；贝斯从四弦 E1 到一弦 G2。选中弦钮后会持续对照该弦目标音。</p></section><section class="panel"><span class="tip-icon">♫</span><h3>给声音一点安静</h3><p>靠近麦克风，压住其他琴弦。合奏、失真和环境噪声会影响结果，建议先用干净的单音调弦。</p></section></div>
</template>
