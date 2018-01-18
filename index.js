'use strict'

const assert = require('assert')
const CloudWatch = require('aws-sdk/clients/cloudwatch')
const request = require('request')
const { EventEmitter } = require('events')

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
  constructor ({ url, interval }) {
    super()
    this.cloud = new CloudWatch()
    this.url = url
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
        if (err) {
          if (err.status === 404) {
            // catch 1.x behavior
            handle1x()
          } else {
            return reject(err)
          }
        } else {
          // handle 2.x
          const result = JSON.parse(body)
          handle2x(result.all_nodes)
          resolve()
        }
      })
    })
  }

  start () {
    return new Promise((resolve, reject) => {
      this.runner = setInterval(() => {
        // get metrics
        this.getMetricData().then((result) => {
          const tasks = Object.keys(result).map((key) => {
            // format metrics
            const metric = this.formatMetricData(key, result[key])
            // put metrics
            return this.putMetricData(metric)
          })
          return Promise.all(tasks)
        }).catch((e) => {
          this.stop()
          reject(e)
        })
      }, this.interval)
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
    function formatDimensions (key, data) {
      if (data instanceof Object) {
        return Object.keys(data).map((_key) => {
          const innerKey = [key, _key].join('.')
          const innerData = data[_key]
          return formatDimensions(innerKey, innerData)
        }).reduce((a, b) => {
          return a.concat(b)
        }, [])
      } else {
        let dataString = (typeof data === 'string')
          ? data
          : String(data)
        return [{
          Name: key,
          Value: dataString
        }]
      }
    }
    var MetricData
    if (data instanceof Array) {
      MetricData = [{
        MetricName: key,
        StorageResolution: Math.floor(this.interval / 1000),
        Timestamp: new Date(),
        Dimensions: data.map((_key) => {
          return {
            Name: _key,
            Value: 'ok'
          }
        })
      }]
    } else {
      MetricData = Object.keys(data).map((_key) => {
        let _data = data[_key]
        let metric = {
          MetricName: _key,
          StorageResolution: Math.floor(this.interval / 1000),
          Timestamp: new Date()
        }
        if (_data instanceof Object) {
          metric.Dimensions = formatDimensions(_key, _data)
        } else {
          metric.Value = _data
        }
        return metric
      })
    }
    return {
      Namespace: key,
      MetricData
    }
  }

  putMetricData ({ MetricData, Namespace }) {
    return new Promise((resolve, reject) => {
      // quit early if invalid
      try {
        this.validateData({ MetricData, Namespace })
      } catch (e) {
        return reject(e)
      }
      // put the metric data
      const callback = function (err, res) {
        return err ? reject(err) : resolve(res)
      }
      const data = { MetricData, Namespace }
      this.cloud.putMetricData(data, callback)
    })
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
      assert(StorageResolution <= 60)
      assert(StorageResolution >= 1)
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
