<script setup>
import { ref } from 'vue'
import { accountRequest } from './api'
const emit = defineEmits(['authenticated'])
const mode = ref('login'), account = ref(''), password = ref(''), confirm = ref(''), nickname = ref('')
const busy = ref(false), error = ref(''), visible = ref(false)
function switchMode() { mode.value = mode.value === 'login' ? 'register' : 'login'; error.value = ''; password.value = ''; confirm.value = '' }
async function submit() {
  if (busy.value) return
  error.value = ''
  if (mode.value === 'register' && password.value !== confirm.value) { error.value = '两次输入的密码不一致'; return }
  busy.value = true
  try {
    const data = await accountRequest(`/auth/${mode.value}`, { method: 'POST', body: { account: account.value.trim(), password: password.value, nickname: nickname.value.trim() } })
    password.value = ''; confirm.value = ''; emit('authenticated', data.user)
  } catch (e) { error.value = e.message }
  finally { busy.value = false }
}
</script>
<template>
  <main class="auth-layout">
    <section class="auth-story"><a href="#" class="brand auth-brand"><span class="brand-symbol"><i></i><i></i><i></i><i></i></span><span>声场<small>SOUNDFIELD</small></span></a><div class="auth-story-content"><span class="eyebrow">YOUR NEXT NOTE STARTS HERE</span><h1>每一种热爱，<br>都值得被听见。</h1><p>乐理刷题 · 听音训练 · 音乐人社区<br>从第一道题开始，让音乐成为你的直觉。</p><div class="auth-record" aria-hidden="true"><div class="vinyl"><div class="record-label"><span>SF</span><small>SIDE A · 33 RPM</small><i></i></div></div><span class="auth-floating-note">♫</span></div><span class="auth-community">DALIAN MUSIC COMMUNITY / 小范围公测</span></div></section>
    <section class="auth-form-side"><form class="auth-card" @submit.prevent="submit"><span class="eyebrow">{{ mode === 'login' ? 'WELCOME BACK' : 'JOIN THE PRACTICE ROOM' }}</span><h2>{{ mode === 'login' ? '欢迎回到练习室' : '认识下一个更好的你' }}</h2><p>{{ mode === 'login' ? '用账号和密码登录，继续你的音乐练习。' : '创建账号，开启你的音乐练习之旅。' }}</p><div class="auth-switch"><button type="button" :class="{ active: mode === 'login' }" @click="mode !== 'login' && switchMode()">登录</button><button type="button" :class="{ active: mode === 'register' }" @click="mode !== 'register' && switchMode()">注册</button></div><label for="account">账号</label><input id="account" v-model="account" autocomplete="username" placeholder="4–32 位字母、数字或下划线" required minlength="4" maxlength="32" pattern="[A-Za-z0-9_]{4,32}" :disabled="busy"><template v-if="mode === 'register'"><label for="register-nickname">昵称</label><input id="register-nickname" v-model="nickname" placeholder="给自己起个音乐人昵称" required minlength="2" maxlength="20" :disabled="busy"></template><label for="password">密码</label><div class="password-field"><input id="password" v-model="password" :type="visible ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" placeholder="8–64 个字符" required minlength="8" maxlength="64" :disabled="busy"><button type="button" @click="visible = !visible" :aria-label="visible ? '隐藏密码' : '显示密码'">{{ visible ? '隐藏' : '显示' }}</button></div><template v-if="mode === 'register'"><label for="confirm-password">确认密码</label><input id="confirm-password" v-model="confirm" :type="visible ? 'text' : 'password'" autocomplete="new-password" placeholder="再输入一次密码" required minlength="8" maxlength="64" :disabled="busy"></template><div v-if="error" class="form-error" role="alert">{{ error }}</div><button class="primary-button auth-submit" :disabled="busy">{{ busy ? '正在连接…' : mode === 'login' ? '进入练习室' : '创建账号，开始练习' }} <span>→</span></button><p class="auth-caption">账号用于本次公测，密码通过加密验证。<br>无需手机号或邮箱。</p></form><span class="auth-bottom">声场 · 为音乐而练习，为热爱而相聚。</span></section>
  </main>
</template>
