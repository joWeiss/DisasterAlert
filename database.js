'use strict'

var mongoose = require('mongoose')

let mongoURL = 'mongodb://localhost:27017/earthquakes'

mongoose.connect(mongoURL)

let db = mongoose.connection

db.once('open', () => console.log('Connected to mongoose'))
