'use strict'
var express = require('express');
var router = express.Router();
var request = require('request')

var CronJob = require('cron').CronJob

var mongoose = require('mongoose')
var earthquakeM = mongoose.model('Earthquake')

module.exports = router;

// Node CronJob running every 5 minutes and collecting all earthquakes over 2.5 for the last day and store them in mongodb
let dailyEarthquakesJob = new CronJob({
  cronTime: '00 05 * * * * *',
  onTick: collectDailyEqs,
  start: true,
  timeZone: 'Europe/Berlin'
})

function collectDailyEqs () {
  let options = {
    method: 'get',
    url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
  }
  request(options, function (err, response, body) {
    // put it in mongodb
    store(body)
    console.log('Successful cron update of Earthquake DB')
  })
}

// TODO get a better place for this
dailyEarthquakesJob.start()

router.get('/all', find)

router.get('/update', function (req, res) {
  let options = {
      method: 'get',
      url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
  }
    request(options, function (err, response, body) {
      // put it in mongodb
      store(body)
      res.status(200).send()
    })
})

function store (body) {
  let earthquakesJSON = JSON.parse(body).features
  earthquakesJSON.forEach((event, index, all) => {
    //EqModel.findByIdAndUpdate({eqID: event.id}, { $set: {update: event.updated, tsunami: (event.tsunami === 1), alert: event.alert || 'white'} }, {upsert: true}, function (err, eq) {
    //if (err) {
    //// TODO: error handling here
    //} else {
    //}
    //})
    let dP = event.properties
    let disasterEvent = {
      'magnitude': dP.mag,
      'time': dP.time,
      'last_update': dP.updated,
      'alert': dP.alert,
      'title': dP.title,
      'longitude': event.geometry.coordinates[0],
      'latitude': event.geometry.coordinates[1],
      'depth': event.geometry.coordinates[2],
      'eventId': event.id
    }
    let earthquakeInstance = new earthquakeM(disasterEvent)
    earthquakeInstance.save(function (err, eqi) {
      if (err) {
        console.error(err)
        // FIXME handle this error
      }
    })
  })
}

function find (req, res, next) {
  earthquakeM.find(function (err, earthquakes) {
    if (err) {
      return console.error(err)
    }
    console.log(earthquakes)
    res.status(200).json(earthquakes)
  })
}
