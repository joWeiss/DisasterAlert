'use strict'
// Node CronJob running every 5 minutes and collecting all earthquakes over 2.5 for the last day and store them in mongodb
var request = require('request')
var CronJob = require('cron').CronJob
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert')

var earthquakeDB = require('./earthquakeDB.js')

// Mongo
let mongoURL = 'mongodb://localhost:27017/disaster-alert'
MongoClient.connect(mongoURL, function (err, db) {
  assert.equal(null, err)
  console.log('Connected to our MongoDB')

  db.close()
  console.log('Disconnected. You may now close the application')
})

// Cron jobs
let dailyEarthquakesJob = new CronJob({
  cronTime: '00 05 * * * *',
  onTick: collectDailyEqs,
  start: false,
  timeZone: 'Europe/Berlin'
})

let testThis = new CronJob({
  cronTime: '10 * * * * *',
  onTick: function () {console.log('Working!')},
  start: false,
  timeZone: 'Europe/Berlin'
})

dailyEarthquakesJob.start()


function collectDailyEqs () {
  let options = {
      method: 'get',
      url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
  }
    request(options, function (err, response, body) {
      // put it in mongodb
      //earthquakeDB.store(body)
    })
}
