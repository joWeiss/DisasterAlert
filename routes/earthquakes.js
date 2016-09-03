'use strict'
var express = require('express');
var router = express.Router();

var request = require('request')

var earthquakeDB = require('../scripts/earthquakeDB.js')

module.exports = router;

// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  //console.log('Delivering tide information.')
  //console.log(`Request URL: ${req.originalUrl}`)
  next()
})

// simple tide
router.use('/', function (req, res, next) {
  // always come here
  console.log('Earthquake nearby? Hopefully not..')
  next()
})

router.get('/all', function (req, res) {
  earthquakeDB.find(req.query.id)
  res.status(200).send({'quantity': 0})
})

router.get('/bydist', function (req, res) {
  let lon = req.query.lon
  let lat = req.query.lat
  // list earthquakes nearby
  console.log('Distance unknown.')
  res.status(200).send({'number_ports': 0})
})

// TODO Error handling
router.use(function (err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }
  res.status(500).send(err)
})

