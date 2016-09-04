'use strict'
var mongoose = require('mongoose')
// define our db schema for earthquakes
let EarthquakeSchema = new mongoose.Schema({
    simpleid  : String,
    title     : String,
    longitude : {type: Number, index: true},
    latitude  : {type: Number, index: true},
    time      : Date,
    depth     : Number,
    magnitude : Number,
    update    : Number,
    tsunami   : Boolean,
    alert     : String
})

module.exports = mongoose.model('Earthquake', EarthquakeSchema)
