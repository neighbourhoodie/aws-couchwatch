/* global describe, it */

'use strict'

const assert = require('assert')
const CouchScan = require('../lib/scan')

describe('CouchScan', function () {
  const url = process.env.COUCH_URL || 'http://localhost:5984'
  const scanner = new CouchScan({ url, scanDb: true })

  it('should setup ok', function () {
    return scanner.setup().then(() => {
      const containsSpecialDb = Object.keys(scanner.endpoints).includes('_replicator')
      assert.equal(containsSpecialDb, false)
    })
  })

  it('should scan ok', function () {
    return scanner.scan().then((report) => {
      assert(report.length > 0)
    })
  })
})
