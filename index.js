'use strict'

const AWS = require('aws-sdk')
const CouchScan = require('./lib/scan')

const Namespace = 'CouchWatch'
const MAX_SIZE = 20

class AWSCouchWatch extends CouchScan {
  constructor ({ url, aws, scanDb }) {
    super({ url, scanDb })
    if (aws) AWS.config.update(aws)
    this.cloud = new AWS.CloudWatch()
  }

  upload (metrics) {
    if (metrics.length > MAX_SIZE) {
      let chunks = []
      for (let i = 0; i < metrics.length; i += MAX_SIZE) {
        const chunk = metrics.slice(i, i + MAX_SIZE)
        chunks.push(chunk)
      }
      const tasks = chunks.map((chunk) => {
        return this._upload(chunk)
      })
      return Promise.all(tasks)
    } else {
      return this._upload(metrics)
    }
  }

  _upload (metrics) {
    const params = {
      Namespace,
      MetricData: metrics.map(({ key, value, type }) => {
        const MetricName = key
        const Value = value
        var Unit
        if (type === 'bytes') {
          Unit = 'Bytes'
        } else if (type === 'percent') {
          Unit = 'Percent'
        } else if (type === 'ms') {
          Unit = 'Milliseconds'
        } else {
          Unit = 'Count'
        }
        const Timestamp = new Date()
        return { MetricName, Timestamp, Unit, Value }
      })
    }

    return new Promise((resolve, reject) => {
      this.cloud.putMetricData(params, (err, data) => {
        if (err) return reject(err)
        else return resolve(data)
      })
    })
  }
}

module.exports = AWSCouchWatch
