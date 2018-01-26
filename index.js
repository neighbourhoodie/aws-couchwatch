'use strict'

const assert = require('assert')
const AWS = require('aws-sdk')
const request = require('request')
const { EventEmitter } = require('events')

function log () {
  let msg = arguments[0]
  arguments[0] = '[couch-aws-logs] ' + msg
  if (process.env.DEBUG || process.env.LOG) {
    console.log.apply(console, arguments)
  }
}

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

const ENDPOINTS = [
  '_stats',
  '_system'
]

module.exports = class AWSCouchWatcher extends EventEmitter {
  constructor ({ url, interval, aws }) {
    super()
    if (aws) AWS.config.update(aws)
    this.cloud = new AWS.CloudWatch()
    this.url = url
    if (interval) assert(interval >= 1000)
    this.interval = interval || (30 * 1000)
    this.endpoints = {
      _all_dbs: [this.url, '_all_dbs'].join('/')
    }
  }

  /**
   * Populates local properties by interrogating a CouchDB
   * instance.
   * @return {Promise} Resolves once this.endpoints has been fully populated.
   */
  setup () {
    log('Setting up...')
    const handle2x = (nodes) => {
      nodes.forEach((node) => {
        ENDPOINTS.forEach((endpoint) => {
          const url = [this.url, '_node', node, endpoint].join('/')
          const key = [node, endpoint].join('/')
          this.endpoints[key] = url
        })
      })
    }

    const handle1x = () => {
      ENDPOINTS.map((endpoint) => {
        this.endpoints[endpoint] = [this.url, endpoint].join('/')
      })
    }

    return new Promise((resolve, reject) => {
      // check membership
      const membership = [this.url, '_membership'].join('/')
      request.get(membership, (err, res, body) => {
        if (typeof body === 'string') body = JSON.parse(body)
        if (err || body.error) {
          if (body.error) err = body
          console.log((err.error && (err.error === 'illegal_database_name')))
          if (err.status === 404 || (err.error && (err.error === 'illegal_database_name'))) {
            // catch 1.x behavior
            handle1x()
            log('Set up to handle 1.x instance.')
            return resolve()
          } else {
            return reject(err)
          }
        } else {
          // handle 2.x
          const result = JSON.parse(body)
          handle2x(result.all_nodes)
          log('Set up to handle 2.x instance.')
          return resolve()
        }
      })
    })
  }

  start () {
    const _main = () => {
      log('Polling for metrics...')
      // get metrics
      return this.getMetricData().then((result) => {
        const tasks = Object.keys(result).map((key) => {
          // format metrics
          const metric = this.formatMetrics(key, result[key])
          // put metrics
          if (metric.MetricData.length) {
            return this.putMetricData(metric)
          } else {
            return Promise.resolve()
          }
        })
        return Promise.all(tasks)
      }).then((result) => {
        const responses = result.reduce((a, b) => {
          return a.concat(b)
        }, [])
        log('Posted metrics.')
        this.emit('metrics', responses)
      }).catch((e) => {
        console.log(e)
        this.stop()
      })
    }
    log('Starting...')
    return _main().then(() => {
      this.runner = setInterval(_main, this.interval)
    })
  }

  stop () {
    clearInterval(this.runner)
  }

  getMetricData () {
    if (!this.endpoints) throw new Error('Logger not ready. Call .setup() first.')
    let results = {}
    const tasks = Object.keys(this.endpoints).map((key) => {
      const url = this.endpoints[key]
      return new Promise(function (resolve, reject) {
        request.get(url, function (err, res, body) {
          if (err) return reject(err)
          // TODO emit?
          results[key] = JSON.parse(body)
          return resolve()
        })
      })
    })
    return Promise.all(tasks).then(function () {
      return results
    })
  }

  formatMetricData (key, data) {
    const StorageResolution = 60 // regardless of collection rate
    const Timestamp = new Date()
    var MetricData = []
    if (data instanceof Object) {
      MetricData = Object.keys(data).map((innerKey) => {
        const innerData = data[innerKey]
        const MetricName = [key, innerKey].join('-')
        return this.formatMetricData(MetricName, innerData)
      })
    } else if (data instanceof Number) {
      MetricData.push({
        MetricName: key,
        StorageResolution,
        Timestamp,
        Value: data
      })
    } else if (data instanceof Array) {
      MetricData = data.map((data) => {
        const MetricName = [key, data].join('-')
        return this.formatMetricData(MetricName, data)
      })
    } else {
      const Value = (typeof data === 'number') ? data : 1
      MetricData.push({
        MetricName: key,
        StorageResolution,
        Timestamp,
        Value
      })
    }
    return MetricData.reduce((a, b) => { return a.concat(b) }, [])
  }

  formatMetrics (key, data) {
    const MetricData = this.formatMetricData(key, data)
    return {
      Namespace: key,
      MetricData
    }
  }

  async putMetricData ({ MetricData, Namespace }) {
    const MAX_SIZE = 20
    if (MetricData.length > MAX_SIZE) {
      let results = []
      for (let i = 0; i < MetricData.length; i += MAX_SIZE) {
        let subset = MetricData.slice(i, i + MAX_SIZE)
        const result = await this.putMetricData({ Namespace, MetricData: subset })
        results.push(result)
      }
      return Promise.resolve(results)
    } else {
      return new Promise((resolve, reject) => {
        const data = { MetricData, Namespace }
        // quit early if invalid
        try {
          this.validateData(data)
        } catch (e) {
          return reject(e)
        }
        // put the metric data
        const callback = function (err, res) {
          return err ? reject(err) : resolve(res)
        }
        this.cloud.putMetricData(data, callback)
      })
    }
  }

  validateData ({ MetricData, Namespace }) {
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
}
