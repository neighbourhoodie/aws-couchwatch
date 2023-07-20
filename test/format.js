/* global describe, it */

'use strict'

const assert = require('assert')
const { formatDb, formatStats, formatSystem } = require('../lib/format')

const DB = require('./fixtures/db.json')
const STATS = require('./fixtures/stats.json')
const SYSTEM = require('./fixtures/system.json')

function validate ({ key, value, type }) {
  assert.equal(typeof key, 'string')
  assert.equal(typeof value, 'number')
  assert.equal(typeof type, 'string')
}

describe('formatDb', function () {
  it('should format db metadata', function () {
    const metrics = formatDb('test', DB)
    metrics.forEach(({ key, value, type }) => {
      if (key.match(/sizes/)) {
        assert.equal(type, 'bytes')
      }
      if (key.match(/_size/)) {
        assert.equal(type, 'bytes')
      }
    })
    metrics.forEach(validate)
  })
})

describe('formatStats', function () {
  it('should format instance stats', function () {
    const metrics = formatStats('_stats', STATS)
    metrics.forEach(({ key, value, type }) => {
      if (key.indexOf('request_time.n') > 0) {
        assert.equal(type, 'counter')
      }
      if (key.indexOf('request_time.min') > 0) {
        assert.equal(type, 'ms')
      }
    })
    metrics.forEach(validate)
  })
})

describe('formatSystem', function () {
  it('should format system information', function () {
    const metrics = formatSystem('_system', SYSTEM)
    metrics.forEach(({ key, value, type }) => {
      if (key.match(/uptime/)) {
        assert.equal(type, 'ms')
      }
      if (key.match(/memory/)) {
        assert.equal(type, 'bytes')
      }
    })
    metrics.forEach(validate)
  })
})
