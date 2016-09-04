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
    console.log(earthquakes.length)
    let desaster = earthquakes[60]
    let porturl = `https://o6pqu2jl1a.execute-api.eu-central-1.amazonaws.com/v1/ports_in_area?lrlat=${desaster.latitude + 2}&lrlon=${desaster.longitude + 2}&ullat=${desaster.latitude - 2}&ullon=${desaster.longitude - 2}&zoomlevel=5`
    let portOption = {
      method: 'get',
      url: porturl
    }
    request(portOption, function (err, response, body) {
      let bodyJSON = JSON.parse(body)
      if (bodyJSON.size !== 0) {
        // FIXME just take the nearest port for now
        // and request all vessels in this port
        let locode = bodyJSON.ports[0].locode
        let vesselOptions = {
          method: 'GET',
          headers: {
            Authorization: '944592e3-bbd2-494b-9c41-e257511dba5d',
            Accept: 'application/json'
          },
          url: `https://api.vesseltracker.com/api/v1/ports/expected?locode=${locode}`
        }
        request(vesselOptions, function (error, response, body) {
          let allVessels = JSON.parse(body).vessels
          let affectedVessels = allVessels.map((cur, i, array) => ({
            'name': cur.aisStatic.name, 'imo': cur.aisStatic.imo, 'port': cur.geoDetails.currentPort
          }))
          res.status(200).json(affectedVessels)
        })
      }
    })
    //earthquakes.forEach((desaster, i, array) => {
      //// for every earthquake we want to query the port in the area
      //// for this, we add 2° to location for our north-east border and
      //// substract 2° from location for our south-west border
      //let porturl = `https://o6pqu2jl1a.execute-api.eu-central-1.amazonaws.com/v1/ports_in_area?lrlat=${desaster.latitude + 2}&lrlon=${desaster.longitude + 2}&ullat=${desaster.latitude - 2}&ullon=${desaster.longitude - 2}&zoomlevel=2`
      //let portOptions = {
        //method: 'get',
        //url: porturl
      //}
      //console.log(portOptions)
      //request(portOptions, function (err, response, body) {
        //if (err) {
          //console.log(err)
        //} else {
          //// now get the name of the port and request all the vessels
          //console.log(`Nearest port: ${body.ports[0].locode}`)
          //let vesselOptions = {
            //method: 'GET',
            //headers: {
              //Authorization: '944592e3-bbd2-494b-9c41-e257511dba5d',
              //Accept: 'application/json'
            //},
            //url: `https://api.vesseltracker.com/api/v1/ports/expected?locode=${response.ports[0].locode}`
          //}
            //request(vesselOptions, function (error, response, body) {
              //let affectedVessels = body.vessels.map((cur, i, array) => ({
                //'name': cur.aisStatic.name, 'imo': cur.aisStatic.imo, 'port': cur.geoDetails.currentPort
              //}))
              //res.status(200).json(affectedVessels)
            //})
        //}
      //})
    //})
    //res.status(200).json(earthquakes)
  })
}
