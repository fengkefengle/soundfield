import test from 'node:test'
import assert from 'node:assert/strict'
import { effectProducts, effectTypes, priceLevels } from '../../client/src/effects.js'
import { effectGuides, chainPresets, guideSources } from '../../client/src/effect-guides.js'
import sourceChecks from '../../docs/effects-sources.json' with { type: 'json' }

test('every product and tutorial has a verified official source and complete references', () => {
  const types = new Set(effectTypes.map(type => type.id)), verified = new Set(sourceChecks.filter(source => source.status === 200).map(source => source.url))
  assert.equal(types.size, effectTypes.length)
  assert.equal(new Set(effectProducts.map(product => product.id)).size, effectProducts.length)
  assert.ok(effectProducts.length >= 80)
  for (const product of effectProducts) {
    assert.ok(types.has(product.type), product.model)
    assert.ok(verified.has(product.source), product.source)
    assert.equal(new URL(product.source).protocol, 'https:')
    assert.ok(product.min > 0 && product.max > product.min, product.model)
    for (const field of ['brand', 'model', 'tone', 'use', 'detail', 'instrument']) assert.ok(product[field]?.trim(), `${product.id}: ${field}`)
  }
  for (const type of effectTypes) assert.ok(effectProducts.some(product => product.type === type.id), type.name)
  for (const level of priceLevels) assert.ok(effectProducts.some(product => product.min < level.max && product.max >= level.min), level.name)
  const sources = new Set(guideSources.map(source => source.id))
  for (const source of guideSources) assert.ok(verified.has(source.url), source.name)
  for (const item of [...effectGuides, ...chainPresets]) {
    assert.ok(item.sourceIds.length > 0)
    for (const id of item.sourceIds) assert.ok(sources.has(id), id)
    if (item.sections) for (const section of item.sections) assert.ok(section.title && section.body)
    if (item.chains) for (const chain of item.chains) assert.ok(chain.nodes.length > 2)
  }
})
