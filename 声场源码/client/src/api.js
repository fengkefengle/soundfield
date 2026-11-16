// AI 接口保留：启用后由后端读取 DEEPSEEK_API_KEY，前端不保存密钥。
export async function accountRequest(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Soundfield-Request': '1' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000)
    })
  } catch { throw new Error('无法连接账号服务，请确认启动窗口仍在运行') }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(data.message || '请求失败，请稍后重试'); error.status = response.status; throw error }
  return data
}
export async function requestExplanation(content) {
  const response = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Soundfield-Request': '1' },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(30000)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || '解析服务暂不可用')
  return data.explanation
}
