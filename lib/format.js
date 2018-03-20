// maps informational couchdb endpoints
// into arrays of metrics

'use strict'

const log = require('./log')

module.exports = {
  formatDb,
  formatStats,
  formatSystem
}

function formatStats (key, data) {
  var metrics = []
  if (data instanceof Object) {
    if (data.type) {
      if (['counter', 'gauge'].includes(data.type)) {
        metrics.push({ key, value: data.value })
      } else if (data.type === 'histogram') {
        const histogram = Object.keys(data.value).map(function (field) {
          const innerKey = [key, field].join('.')
          const value = data.value[field]
          if (['percentile', 'histogram'].includes(field)) {
            return value.map(function ([segment, value]) {
              return {
                key: [innerKey, segment].join('.'),
                value
              }
            })
          } else {
            return { key: innerKey, value }
          }
        }).reduce(function (a, b) {
          return a.concat(b)
        }, [])
        metrics = metrics.concat(histogram)
      } else {
        log('Unknown type: %s @ %s', data.type, key)
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

function formatSystem (key, data) {
  var metrics = []
  if (data instanceof Object) {
    const innerMetrics = Object.keys(data).map(function (field) {
      const innerKey = [key, field].join('.')
      const value = data[field]
      if (value instanceof Object) {
        return formatSystem(innerKey, value)
      } else if (typeof value === 'number') {
        return [{ key: innerKey, value }]
      }
    }).reduce(function (a, b) {
      return a.concat(b)
    }, [])
    metrics = metrics.concat(innerMetrics)
  }
  return metrics
}

function formatDb (dbName, data) {
  var metrics = []
  Object.keys(data).forEach((field) => {
    const key = [dbName, field].join('.')
    const value = data[field]
    if (typeof value === 'number') {
      metrics.push({ key, value })
    } else if (value instanceof Object) {
      Object.keys(value).forEach((subField) => {
        const innerKey = [key, subField].join('.')
        const innerValue = value[subField]
        if (typeof innerValue === 'number') {
          metrics.push({
            key: innerKey,
            value: innerValue
          })
        }
      })
    }
  })
  return metrics
}
