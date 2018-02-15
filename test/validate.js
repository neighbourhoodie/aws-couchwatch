// validate metrics

'use strict'

const assert = require('assert')

const VALID_UNITS = [
  'Seconds',
  'Microseconds',
  'Milliseconds',
  'Bytes',
  'Kilobytes',
  'Megabytes',
  'Gigabytes',
  'Terabytes',
  'Bits',
  'Kilobits',
  'Megabits',
  'Gigabits',
  'Terabits',
  'Percent',
  'Count',
  'Bytes/Second',
  'Kilobytes/Second',
  'Megabytes/Second',
  'Gigabytes/Second',
  'Terabytes/Second',
  'Bits/Second',
  'Kilobits/Second',
  'Megabits/Second',
  'Gigabits/Second',
  'Terabits/Second',
  'Count/Second',
  'None'
]

module.exports =
function validate ({ MetricData, Namespace }) {
  assert(Namespace)
  assert.equal(typeof Namespace, 'string')
  assert(MetricData)
  assert(MetricData instanceof Array)
  MetricData.forEach(function (params) {
    const {
      Dimensions,
      MetricName,
      StatisticValues,
      StorageResolution,
      Timestamp,
      Unit,
      Value
    } = params
    // metric name
    assert.equal(typeof MetricName, 'string')
    // dimensions
    if (Dimensions) {
      assert(Dimensions instanceof Array)
      Dimensions.forEach(function ({ Name, Value }) {
        assert.equal(typeof Name, 'string')
        assert.equal(typeof Value, 'string')
      })
    }
    // stat values
    if (StatisticValues) {
      assert(StatisticValues instanceof Array)
      StatisticValues.forEach(function (params) {
        const { SampleCount, Sum, Minimum, Maximum } = params
        assert.equal(typeof SampleCount, 'number')
        assert.equal(typeof Sum, 'number')
        assert.equal(typeof Minimum, 'number')
        assert.equal(typeof Maximum, 'number')
      })
    }
    // storage resolution
    assert(typeof StorageResolution, 'number')
    assert((StorageResolution === 60) || (StorageResolution === 1))
    // Timestamp
    if (Timestamp) {
      let date = Date.parse(Timestamp)
      assert.equal(isNaN(date), false)
    }
    // units
    if (Unit) assert(VALID_UNITS.includes(Unit))
    // values
    if (Value) {
      assert.equal(typeof Value, 'number')
    }
    // other
    assert(!((Value === undefined) && (Dimensions === undefined)), 'Requires either a value or dimensions.')
  })
}
