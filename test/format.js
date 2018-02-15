/* global describe, it */

'use strict'

const assert = require('assert')
const { formatDb, formatStats, formatSystem } = require('../lib/format')

const DB = require('./fixtures/db.json')
const STATS = require('./fixtures/stats.json')
const SYSTEM = require('./fixtures/system.json')

function validate ({ key, value }) {
  assert.equal(typeof key, 'string')
  assert.equal(typeof value, 'number')
}

describe('formatDb', function () {
  it('should format db metadata', function () {
    const metrics = formatDb('test', DB)
    metrics.forEach(validate)
  })
})

describe('formatStats', function () {
  it('should format instance stats', function () {
    const metrics = formatStats('_stats', STATS)
    metrics.forEach(validate)
  })
})

describe('formatSystem', function () {
  it('should format system information', function () {
    const metrics = formatSystem('_system', SYSTEM)
    metrics.forEach(validate)
  })
})
