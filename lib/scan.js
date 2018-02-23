'use strict'

const assert = require('assert')
const log = require('./log')
const request = require('request')
const {
  formatDb,
  formatStats,
  formatSystem
} = require('./format')

const ENDPOINTS = ['_stats', '_system']

/**
 * Convenient promisification of request.
 * @param  {Object} options Request options
 * @return {Promise} Promise that resolves to: `[response, body]`
 */
function _request (options) {
  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if (err || body.error) return reject(err || body)
      else return resolve([res, body])
    })
  })
}

/**
 * @class Tool to scan a CouchDB instance using AWS-CloudWatch
 */
class CouchScan {
  constructor ({ url }) {
    assert(url, 'Scanning a CouchDB instance requires the URL for accessing it.')
    this.url = url
  }

  /**
   * Populates local properties by scanning a CouchDB
   * instance.
   * @return {Promise} Resolves once the scanner is ready to scan.
   */
  setup () {
    log('Setting up...')
    this.endpoints = {}
    // check membership
    const url = [this.url, '_membership'].join('/')
    return _request({ url, json: true }).then(([res, body]) => {
      // handle 2.x
      this._handle2x(body.all_nodes)
      log('Set up to handle 2.x instance.')
    }).catch((err) => {
      if (err.error && err.error === 'illegal_database_name') {
        // handle 1.x
        this._handle1x()
        log('Set up to handle 1.x instance.')
      } else {
        throw err
      }
    }).then(() => {
      // prepare to scan any existing databases
      const url = [this.url, '_all_dbs'].join('/')
      return _request({ url, json: true }).then(([res, allDbs]) => {
        allDbs.forEach(this._handleDb.bind(this))
      })
    })
  }

  _handle2x (nodes) {
    nodes.forEach((node) => {
      ENDPOINTS.forEach((endpoint) => {
        const url = [this.url, '_node', node, endpoint].join('/')
        const key = [node, endpoint].join('/')
        this.endpoints[key] = url
      })
    })
  }

  _handle1x () {
    ENDPOINTS.forEach((endpoint) => {
      this.endpoints[endpoint] = [this.url, endpoint].join('/')
    })
  }

  _handleDb (dbName) {
    if (dbName[0] === '_') return null // ignore special dbs
    const url = [this.url, dbName].join('/')
    this.endpoints[dbName] = url
  }

  scan () {
    if (!this.endpoints) throw new Error('Scanner not ready. Call .setup() first.')
    let results = {}
    const tasks = Object.keys(this.endpoints).map((key) => {
      const url = this.endpoints[key]
      return new Promise(function (resolve, reject) {
        request.get({ url, json: true }, function (err, res, body) {
          if (err) return reject(err)
          results[key] = body
          return resolve()
        })
      })
    })
    return Promise.all(tasks).then(() => {
      return this._report(results)
    })
  }

  _report (results) {
    return Object.keys(results).map((urlPath) => {
      const result = results[urlPath]
      if (/_stats$/.test(urlPath)) {
        return formatStats(urlPath, result)
      } else if (/_system$/.test(urlPath)) {
        return formatSystem(urlPath, result)
      } else {
        return formatDb(urlPath, result)
      }
    }).reduce((a, b) => {
      return a.concat(b)
    }, [])
  }
}

module.exports = CouchScan
