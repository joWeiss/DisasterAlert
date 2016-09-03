'use strict'
var express = require('express');
var router = express.Router();

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

router.get('\*/bydist', function (req, res) {
  // list earthquakes nearby
})

// TODO Error handling
router.use(function (err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }
  res.status(500)
  res.send('error', {error: err})
})

