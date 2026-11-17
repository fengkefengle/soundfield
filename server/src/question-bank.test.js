import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const categories = ['interval', 'chord', 'mode', 'rhythm', 'notation']
const banks = Object.fromEntries(categories.map(c => [c, JSON.parse(fs.readFileSync(new URL(`../../client/src/banks/${c}.json`, import.meta.url)))]))
const legacy = JSON.parse(fs.readFileSync(new URL('../../client/src/imported-bank.json', import.meta.url)))
const answer = (c, number) => { const q = banks[c].find(q => q.source.number === number); return q.options[q.answer] }

test('expanded bank is complete, has four choices and preserves historical IDs', () => {
  const all = Object.values(banks).flat()
  assert.equal(all.length, 15000)
  assert.equal(new Set(all.map(q => q.id)).size, 15000)
  const oldIds = new Set(legacy.map(q => q.id))
  for (const c of categories) {
    assert.equal(banks[c].length, 3000)
    for (const [index, q] of banks[c].entries()) {
      assert.equal(q.category, c)
      assert.equal(q.source.number, index + 1)
      assert.equal(q.options.length, 4)
      assert.equal(new Set(q.options).size, 4)
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4)
      assert.ok(q.stem && q.explanation && q.tip)
      assert.ok(!oldIds.has(q.id))
      assert.ok(q.options.every(x => typeof x === 'string' && x.length && !/undefined|NaN/.test(x)))
    }
  }
  assert.equal(legacy.length, 1000)
})

test('musical regression cases use correct degrees, spelling, octave and exact durations', () => {
  assert.equal(answer('interval', 1), '五度')
  assert.equal(answer('interval', 2), 'B♭')
  assert.equal(answer('interval', 12), '增三度')
  assert.equal(answer('chord', 1), 'F♯、A♯、C♯、E')
  assert.equal(answer('chord', 3), '第一转位')
  assert.equal(answer('chord', 8), 'C♯')
  assert.equal(answer('chord', 11), 'G♯♯')
  assert.equal(answer('mode', 173), 'd♯ 小调')
  assert.equal(answer('mode', 471), 'A♭ 大调')
  assert.equal(answer('mode', 276), 'G、F♯、E、D、C、B、A、G')
  assert.equal(answer('rhythm', 2), '216 秒')
  assert.equal(answer('rhythm', 6), '210 秒')
  assert.equal(answer('rhythm', 641), '0.21875 拍')
  assert.equal(answer('notation', 17), '四度')
  assert.equal(answer('notation', 23), '第二间')
  assert.equal(answer('notation', 7), 'C5')
})
