'use strict'
var MongoClient = require('mongodb').MongoClient
  , assert = require('assert')
var mongoose = require('mongoose')
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId

var async = require('async')
//var moment = require('moment')

// MongoDB URL
let mongoURL = 'mongodb://localhost:27017/earthquakes'
// Schema
let EarthquakeSchema = new Schema({
    _id       : ObjectId,
    eqID      : { type: String, index: true },
    title     : String,
    longitude : {type: String, index: true},
    latitude  : {type: String, index: true},
    time      : Date,
    depth     : Number,
    magnitude : Number,
    update    : Number,
    tsunami   : Boolean,
    alert     : String
})
//{
//"title": "279 km WSW of Hanga Roa, Chile",
//"time": 9348349747,
//"longitude": 12.2,
//"latitude": 30.4,
//"depth": 10.2,
//"magnitude": 3.5
//}

// connect to the MongoDB
let eqModel = mongoose.model('Earthquake', EarthquakeSchema)


function store (body) {
  let earthquakesJSON = JSON.parse(body).features
  let db = mongoose.connection
  db.once('open', function () {
    console.log('Calling')
    earthquakesJSON.forEach((event, index, all) => {
      let earthquakeInstance = new eqModel(event)
      earthquakeInstance.save(function (err) {
        if (err) {
          return new Error(err)
        }
      })
    })
    console.log('Success...')
    //async.each(earthquakesJSON, function (event, callback) {
      //console.log(`New event:`)
      //console.log(event)

      ////let eqInstance = new eqModel(event)
      ////eqInstance.save(function (err) {
        ////if (err) {
          ////return new Error(err)
        ////}
      //db.close()
      ////})
    //}, function (err) {
      //if (err) {
        //console.error()
      //} else {
        //console.log('Everything is fine')
      //}
    //})
    //// fill the model
    //console.log(body)
    //let props = body.properties
    //let coordinates = body.geometry.coordinates
    //eqInstance.title = props.title
    //eqInstance.time = props.time
    //eqInstance.eqID = body.id
    //eqInstance.longitude = coordinates[0]
    //eqInstance.latitude = coordinates[1]
    //eqInstance.depth = coordinates[2]
    //eqInstance.magnitude = props.mag
    //eqInstance.update = props.updated
    //eqInstance.tsunami = props.tsunami == 1
    //eqInstance.alert = props.alert || 'white'
    //// save the model
    //eqInstance.save(function (err) {
      //console.error(`Error. Time: ${Date.now()}`)
      //// error handling for later
    //})
  })
  mongoose.connect(mongoURL)
}

function find (earthquakeID) {
  let db = mongoose.connection
  db.once('open', function () {
    eqModel.find(function (err, earthquakes) {
      if (err) {
        return console.error(err)
      }
      console.log(earthquakes)
    })
  })
  mongoose.connect(mongoURL)
}

module.exports.store = store
module.exports.find = find
