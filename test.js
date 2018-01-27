/* global describe, it, before, after */
'use strict'

const assert = require('assert')
const AWSCouchWatcher = require('.')

const url = 'http://admin:password@localhost:5984'
const interval = 60000

describe('aws-couchwatch', function () {
  before(function () {
    this.logger = new AWSCouchWatcher({
      url,
      interval,
      // region is not properly set by aws-sdk
      // so we have to be explicit
      // https://stackoverflow.com/questions/31039948/configuring-region-in-node-js-aws-sdk
      aws: {
        region: process.env.AWS_REGION || 'us-east-2'
      }
    })
  })

  after(function () {
    this.logger.stop()
    process.exit(0)
  })

  it('should determine correct endpoints', async function () {
    const preEndpoints = Object.assign({}, this.logger.endpoints)
    assert(preEndpoints instanceof Object)
    assert(Object.keys(preEndpoints).length > 0)
    return this.logger.setup().then(() => {
      assert(this.logger.endpoints instanceof Object)
      assert(Object.keys(this.logger.endpoints).length > Object.keys(preEndpoints).length)
    }).catch((e) => {
      console.log(e)
    })
  })

  it('should get metrics', function () {
    return this.logger.getMetricData().then((result) => {
      assert(result instanceof Object)
      assert(Object.keys(result).includes('_all_dbs'))
    })
  })

  it('should run', function () {
    this.timeout(20000)
    return new Promise((resolve, reject) => {
      this.logger.start().catch((err) => {
        console.log(err)
        reject(err)
      })
      this.logger.once('metrics', (metrics) => {
        console.log(metrics)
        resolve()
      })
    })
  })
})
