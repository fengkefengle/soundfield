import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(here, '../data')
const dataFile = path.join(dataDir, 'questions.json')
fs.mkdirSync(dataDir, { recursive: true })

const seed = [
  { id: 1, type: 'single', subject: 'JavaScript', content: '哪个关键字用于声明一个不可重新赋值的变量？', options: ['var', 'let', 'const', 'static'], answer: 'const', explanation: 'const 声明的变量绑定不能被重新赋值。', difficulty: 'easy' },
  { id: 2, type: 'single', subject: 'Vue 3', content: 'Vue 3 中用于声明响应式对象的 API 是？', options: ['watch', 'reactive', 'computed', 'provide'], answer: 'reactive', explanation: 'reactive 会返回一个响应式代理对象。', difficulty: 'easy' }
]

function read() {
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2))
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
}
function write(rows) { fs.writeFileSync(dataFile, JSON.stringify(rows, null, 2)) }
export function listQuestions() { return read().sort((a, b) => b.id - a.id) }
export function createQuestion(input) {
  const rows = read()
  const question = { id: rows.reduce((max, row) => Math.max(max, row.id), 0) + 1, type: input.type || 'single', subject: input.subject, content: input.content, options: input.options || [], answer: input.answer, explanation: input.explanation || '', difficulty: input.difficulty || 'medium' }
  rows.push(question); write(rows); return question
}
