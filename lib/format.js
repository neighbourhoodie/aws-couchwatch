// maps informational couchdb endpoints
// into arrays of metrics

'use strict'

const log = require('./log')

module.exports = {
  formatDb,
  formatStats,
  formatSystem
}

// determine the type of the metric
function _checkType (types, key, defaultType = 'counter') {
  // check the key for the presence of a field
  function _checkField (field) {
    return key.slice(-field.length) === field
  }
  return Object.keys(types).filter((type) => {
    const fields = types[type]
    return fields.filter(_checkField).length > 0
  })[0] || defaultType
}

const STATS_MS_FIELDS = [
  'arithmetic_mean',
  'geometric_mean',
  'harmonic_mean',
  'max',
  'median',
  'min',
  'standard_deviation',
  'variance'
]

const STATS_TYPES = {
  ms: STATS_MS_FIELDS
}

function formatStats (key, data) {
  var metrics = []
  if (data instanceof Object) {
    const type = _checkType(STATS_TYPES, key)
    if (data.type) {
      if (['counter', 'gauge'].includes(data.type)) {
        metrics.push({ key, value: data.value, type })
      } else if (data.type === 'histogram') {
        const histogram = Object.keys(data.value).map(function (field) {
          const innerKey = [key, field].join('.')
          const value = data.value[field]
          if (['percentile', 'histogram'].includes(field)) {
            return value.map(function ([segment, value]) {
              return {
                key: [innerKey, segment].join('.'),
                value,
                type: _checkType(STATS_TYPES, field)
              }
            })
          } else {
            return { key: innerKey, value, type }
          }
        }).reduce(function (a, b) {
          return a.concat(b)
        }, [])
        metrics = metrics.concat(histogram)
      } else {
        log('Unknown type: %s @ %s', type, key)
      }
    } else {
      const innerMetrics = Object.keys(data).map(function (field) {
        const innerKey = [key, field].join('.')
        const value = data[field]
        return formatStats(innerKey, value)
      }).reduce(function (a, b) {
        return a.concat(b)
      })
      metrics = metrics.concat(innerMetrics)
    }
  }
  return metrics
}

const SYSTEM_BYTE_FIELDS = [
  'memory',
  'io_input',
  'io_output'
]

const SYSTEM_MS_FIELDS = [
  'uptime'
]

const SYSTEM_TYPES = {
  bytes: SYSTEM_BYTE_FIELDS,
  ms: SYSTEM_MS_FIELDS
}

function formatSystem (key, data) {
  var metrics = []
  if (data instanceof Object) {
    const innerMetrics = Object.keys(data).map(function (field) {
      const innerKey = [key, field].join('.')
      const value = data[field]
      const type = _checkType(SYSTEM_TYPES, innerKey)
      if (value instanceof Object) {
        return formatSystem(innerKey, value)
      } else if (typeof value === 'number') {
        return [{ key: innerKey, value, type }]
      }
    }).reduce(function (a, b) {
      return a.concat(b)
    }, [])
    metrics = metrics.concat(innerMetrics)
  }
  return metrics
}

const DB_COUNTER_FIELDS = [
  'cluster',
  'doc_count',
  'doc_del_count',
  'disk_format_version',
  'purge_seq'
]

const DB_TYPES = {
  'counter': DB_COUNTER_FIELDS
}

function formatDb (dbName, data) {
  var metrics = []
  Object.keys(data).forEach((field) => {
    const key = [dbName, field].join('.')
    const value = data[field]
    const type = _checkType(DB_TYPES, field, 'bytes')
    if (typeof value === 'number') {
      metrics.push({ key, value, type })
    } else if (value instanceof Object) {
      Object.keys(value).forEach((subField) => {
        const innerKey = [key, subField].join('.')
        const innerValue = value[subField]
        if (typeof innerValue === 'number') {
          metrics.push({
            key: innerKey,
            value: innerValue,
            type
          })
        }
      })
    }
  })
  return metrics
}
