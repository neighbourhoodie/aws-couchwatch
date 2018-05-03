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
    return key.indexOf(field) >= 0
  }
  return Object.keys(types).filter((type) => {
    const fields = types[type]
    return fields.filter(_checkField).length > 0
  })[0] || defaultType
}

function _assignTypes (metrics, specialFields, skipFields = [], defaultType = 'counter') {
  return metrics.filter(({ key, value }) => {
    return skipFields.filter((field) => {
      return key.match(field)
    }).length === 0
  }).map(({ key, value }) => {
    const type = specialFields.filter(([field, type]) => {
      return key.match(field)
    }).map(([field, type]) => {
      return type
    })[0] || defaultType
    return { key, value, type }
  })
}

function formatStats (key, data) {
  const specialFields = [
    [/\.n$/, 'counter'],
    [/\.percentile\./, 'counter'],
    [/bulk_docs/, 'ms'],
    [/collect_results_time/, 'ms'],
    [/db_info/, 'ms'],
    [/db_open_time/, 'ms'],
    [/request_time/, 'ms'],
    [/vdu_process_time/, 'ms']
  ]
  const skipFields = [
    /histogram\.0/
  ]
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
  return _assignTypes(metrics, specialFields, skipFields)
}

function formatSystem (key, data) {
  const specialFields = [
    [/io_input/, 'bytes'],
    [/io_output/, 'bytes'],
    [/memory/, 'bytes'],
    [/uptime/, 'ms']
  ]
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
  return _assignTypes(metrics, specialFields)
}

function formatDb (dbName, data) {
  const specialFields = [
    [/sizes/, 'bytes'],
    [/_size/, 'bytes']
  ]
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
  return _assignTypes(metrics, specialFields)
}
