'use strict'
var express = require('express');
var router = express.Router();
var request = require('request')
var async = require('async')
var _ = require('lodash')

var CronJob = require('cron').CronJob

var mongoose = require('mongoose')
var ObjectId = require('mongoose').Types.ObjectId
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
    //url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson'
    url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
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
      //url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson'
      url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
  }
    request(options, function (err, response, body) {
      // put it in mongodb
      store(body)
      res.status(200).send(body)
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
      'simpleid': event.id
    }
    earthquakeM.findOneAndUpdate({simpleid: event.id},disasterEvent, {upsert: true}, function (err, doc) {
      if (err) {
        console.error(err)
      }
      //console.log(doc)
      //doc = _.extend(doc, {update: dP.updated, tsunami: (dP.tsunami === 1), alert: dP.alert || 'white'})
      //doc.save()
    })
    //let earthquakeInstance = new earthquakeM(disasterEvent)
    //earthquakeInstance.save(function (err, eqi) {
      //if (err) {
        //console.error(err)
        //// FIXME handle this error
      //}
    //})
  })
}

function find (req, res, next) {
  let getEarthquakes = function (cb) {
    earthquakeM.find(function (e, earths) {
      if (e) console.error(e)
        cb(null, earths)
    })
  }

  let getPort = function (disasterList, cb) {
    async.reduce(disasterList, [], function (memo, disaster, callbackReduce) {
      let porturl = `https://o6pqu2jl1a.execute-api.eu-central-1.amazonaws.com/v1/ports_in_area?lrlat=${disaster.latitude + 2}&lrlon=${disaster.longitude + 2}&ullat=${disaster.latitude - 2}&ullon=${disaster.longitude - 2}&zoomlevel=5`
      let portOption = {
        method: 'get',
        url: porturl
      }
      console.log(portOption)
      request(portOption, function (error, response, body) {
        if (error) {
          console.log(error)
        }
        let bodyJSON = JSON.parse(body)
        if (bodyJSON == null || bodyJSON.size === 0) {
          console.error(new Error("body null"))
          callbackReduce(null, memo)
        } else {
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
          request(vesselOptions, function (error, response, bodyString) {
            if (error) {
              console.error(error)
            }
            // FIXME shadow this fucking string response
            let body = JSON.parse(bodyString)
            if (body.numberOfResults !== 0) {
              if (!(_.isEmpty(body.vessels))) {
                let allVessels = body.vessels
                let affectedVessels = allVessels.map((cur, i, array) => ({
                  'name': cur.aisStatic.name, 'imo': cur.aisStatic.imo, 'port': cur.geoDetails.currentPort
                }))
                  //allAffectedVessels = allAffectedVessels.concat(affectedVessels)
                  // we collected all vessels for a port, return to our outer control flow
                  callbackReduce(null, memo.concat(affectedVessels))
              } else {
                callbackReduce(null, memo)
              }
            } else {
              callbackReduce(null, memo)
            }
          })
      }})
  }, function (errEnd, result) {
    cb(null, result)
  })}

  async.waterfall([
                  getEarthquakes,
                  getPort
  ], (err, results) => {res.status(200).send(results)})















  //let allAffectedVessels = []
  //earthquakeM.find(function (err, earthquakes) {
    //if (err) {
      //return console.error(err)
    //}
    //console.log(earthquakes.length)
    //async.map(earthquakes, function (disaster, callback) {
      //// FIXME Too many requests?
      //// {"message": "Internal server error"}
      //if (disaster == null) {
        //// if there is no port in the area, return out of this disaster
        //return callback()
      //}
      //// get the ports for every disaster
      //let porturl = `https://o6pqu2jl1a.execute-api.eu-central-1.amazonaws.com/v1/ports_in_area?lrlat=${disaster.latitude + 2}&lrlon=${disaster.longitude + 2}&ullat=${disaster.latitude - 2}&ullon=${disaster.longitude - 2}&zoomlevel=5`
      //let portOption = {
        //method: 'get',
        //url: porturl
      //}
      //request(portOption, function (err, response, body) {
        //if (err) {
          //console.error(err)
        //}
        //let bodyJSON = JSON.parse(body)
        //if (bodyJSON == null || bodyJSON.size === 0) {
          //return callback()
        //}
        //if (bodyJSON.size !== 0) {
          //// FIXME just take the nearest port for now
          //// and request all vessels in this port
          //let locode = bodyJSON.ports[0].locode
          //let vesselOptions = {
            //method: 'GET',
            //headers: {
              //Authorization: '944592e3-bbd2-494b-9c41-e257511dba5d',
              //Accept: 'application/json'
            //},
            //url: `https://api.vesseltracker.com/api/v1/ports/expected?locode=${locode}`
          //}
          //request(vesselOptions, function (error, response, bodyString) {
             //// FIXME shadow this fucking string response
            //let body = JSON.parse(bodyString)
            //if (body.numberOfResults !== 0) {
              //if (!(_.isEmpty(body.vessels))) {
                //let allVessels = body.vessels
                //let affectedVessels = allVessels.map((cur, i, array) => ({
                  //'name': cur.aisStatic.name, 'imo': cur.aisStatic.imo, 'port': cur.geoDetails.currentPort
                //}))
                ////allAffectedVessels = allAffectedVessels.concat(affectedVessels)
                //// we collected all vessels for a port, return to our outer control flow
                //callback(null, affectedVessels)
              //}
            //}
          //})
        //}
      //})
    //}, function (err, results) {
      ////allAffectedVessels = results
      //console.log('---------===================----------------')
      //console.log('---------===================----------------')
      //console.log(results)
      //res.status(200).send(results)
    //})
    ////earthquakes.forEach((desaster, i, array) => {
      ////// for every earthquake we want to query the port in the area
      ////// for this, we add 2° to location for our north-east border and
      ////// substract 2° from location for our south-west border
      ////let porturl = `https://o6pqu2jl1a.execute-api.eu-central-1.amazonaws.com/v1/ports_in_area?lrlat=${desaster.latitude + 2}&lrlon=${desaster.longitude + 2}&ullat=${desaster.latitude - 2}&ullon=${desaster.longitude - 2}&zoomlevel=2`
      ////let portOptions = {
        ////method: 'get',
        ////url: porturl
      ////}
      ////console.log(portOptions)
      ////request(portOptions, function (err, response, body) {
        ////if (err) {
          ////console.log(err)
        ////} else {
          ////// now get the name of the port and request all the vessels
          ////console.log(`Nearest port: ${body.ports[0].locode}`)
          ////let vesselOptions = {
            ////method: 'GET',
            ////headers: {
              ////Authorization: '944592e3-bbd2-494b-9c41-e257511dba5d',
              ////Accept: 'application/json'
            ////},
            ////url: `https://api.vesseltracker.com/api/v1/ports/expected?locode=${response.ports[0].locode}`
          ////}
            ////request(vesselOptions, function (error, response, body) {
              ////let affectedVessels = body.vessels.map((cur, i, array) => ({
                ////'name': cur.aisStatic.name, 'imo': cur.aisStatic.imo, 'port': cur.geoDetails.currentPort
              ////}))
              ////res.status(200).json(affectedVessels)
            ////})
        ////}
      ////})
    ////})
    ////res.status(200).json(earthquakes)
  //})
}
