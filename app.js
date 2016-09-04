var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fallback = require('express-history-api-fallback');
require('./database.js')
require('./schemas/earthquakeSchema.js')

var hurricanes = require('./routes/hurricanes');
var earthquakes = require('./routes/earthquakes')
//var ships = require('./routes/ships')
var earthquakedShips = require('./routes/ships');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
var root;
if (process.env.NODE_ENV === 'development') {
  root = path.join(__dirname, '/app');
} else {
  root = path.join(__dirname, '/dist');
}
app.use(express.static(root));

app.use('/api/hurricanes', hurricanes);
app.use('/api/ships', earthquakedShips);
app.use('/api/earthquakes', earthquakes)
//app.use('/api/ships', ships)

app.use(fallback('index.html', { root: root }))

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
