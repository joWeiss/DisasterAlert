'use strict'
var express = require('express');
var router = express.Router();
var request = require('request')
var async = require('async');
var _ = require('lodash');

var CronJob = require('cron').CronJob;

var mongoose = require('mongoose');
var earthquakeModel = mongoose.model('Earthquake');

// Node CronJob running every 5 minutes and collecting all earthquakes over 2.5 for the last day and store them in mongodb
let dailyEarthquakesJob = new CronJob({
  cronTime: '00 05 * * * * *',
  onTick: collectDailyEqs,
  start: true,
  timeZone: 'Europe/Berlin'
});

function collectDailyEqs () {
  let options = {
    method: 'get',
    //url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson'
    url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
  };
  request(options, function (err, response, body) {
    // put it in mongodb
    store(body);
    console.log('Successful cron update of Earthquake DB');
  });
};

// TODO get a better place for this
dailyEarthquakesJob.start();

router.get('/all', find);

router.get('/update', function (req, res) {
  let options = {
      method: 'get',
      //url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson'
      url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
  };
  request(options, function (err, response, body) {
    store(body);
    res.status(200).send(body);
  });
})

function store (body) {
  let earthquakesJSON = JSON.parse(body).features
  earthquakesJSON.forEach((event, index, all) => {
    let dP = event.properties;
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
    };
    earthquakeModel.findOneAndUpdate(
      {simpleid: event.id},
      disasterEvent,
      {upsert: true},
      function (err, doc) {
        if (err) {
          console.error(err);
        }
      }
    );
  });
}

let getPort = function (disasterList, cb) {
  async.reduce(disasterList, [], function (memo, disaster, callbackReduce) {
    let porturl = `https://o6pqu2jl1a.execute-api.eu-central-1.amazonaws.com/v1/ports_in_area?lrlat=${disaster.latitude + 2}&lrlon=${disaster.longitude + 2}&ullat=${disaster.latitude - 2}&ullon=${disaster.longitude - 2}&zoomlevel=5`;
    let portOption = {
      method: 'get',
      url: porturl
    };
    request(portOption, function (error, response, body) {
      if (error) {
        console.log(error);
      }
      let bodyJSON = JSON.parse(body);
      if (bodyJSON == null || bodyJSON.size === 0) {
        console.error(new Error("body null"));
        callbackReduce(null, memo);
      } else {
        // FIXME just take the nearest port for now
        // and request all vessels in this port
        let locode = bodyJSON.ports[0].locode;
        let vesselOptions = {
          method: 'GET',
          headers: {
            Authorization: '944592e3-bbd2-494b-9c41-e257511dba5d',
            Accept: 'application/json'
          },
          url: `https://api.vesseltracker.com/api/v1/ports/expected?locode=${locode}`
        };
        request(vesselOptions, function (error, response, bodyString) {
          if (error) {
            console.error(error);
          }
          // FIXME shadow this fucking string response
          let body = JSON.parse(bodyString);
          if (body.numberOfResults !== 0 && !_.isEmpty(body.vessels)) {
            let allVessels = body.vessels;
            let affectedVessels = allVessels.map((cur, i, array) => ({
              'name': cur.aisStatic.name, 'imo': cur.aisStatic.imo, 'port': cur.geoDetails.currentPort
            }));
            // we collected all vessels for a port, return to our outer control flow
            memo = memo.concat(affectedVessels);
          }
          callbackReduce(null, memo);
        });
      }
    })
  }, function (errEnd, result) {
    cb(null, result)
  });
}

let getEarthquakes = function (cb) {
  earthquakeModel.find(function (err, earths) {
    if (err) {
      console.error(err);
    }
    cb(null, earths);
  });
};

function find (req, res, next) {
  async.waterfall([
    getEarthquakes,
    getPort
  ], (err, results) => {
    res.status(200).send(results);
  });
};

module.exports = router;
