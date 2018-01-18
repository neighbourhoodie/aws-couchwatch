/* global describe, it, before */
'use strict'

const assert = require('assert')
const AWSCouchWatcher = require('.')

const URL = 'http://admin:password@localhost:5984'

describe('aws-couch-watcher', function () {
  before(function () {
    this.logger = new AWSCouchWatcher({ url: URL, interval: 1000 })
  })

  it('should determine correct endpoints', async function () {
    const preEndpoints = Object.assign({}, this.logger.endpoints)
    assert(preEndpoints instanceof Object)
    assert(Object.keys(preEndpoints).length > 0)
    await this.logger.setup()
    assert(this.logger.endpoints instanceof Object)
    assert(Object.keys(this.logger.endpoints).length > Object.keys(preEndpoints).length)
  })

  it('should get metrics', async function () {
    const result = await this.logger.getMetricData()
    assert(result instanceof Object)
    assert(Object.keys(result).includes('_all_dbs'))
  })

  it('should run', function () {
    return new Promise((resolve, reject) => {
      this.logger.start().catch(reject)
      setTimeout(() => {
        this.logger.stop()
        resolve()
      }, this.logger.interval * 1.5)
    })
  })
})
