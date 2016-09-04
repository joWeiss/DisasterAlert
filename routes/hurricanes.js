var express = require('express');
var request = require('request');

var router = express.Router();

var proxy = function(req, res, next) {
  var options = {
    uri:    'http://37.120.170.199/uploads/hurricane_warn.geojson',
    method: 'GET'
  };

  request(options, function (error, response, body) {
    if (!error && response) {
      res.status(response.statusCode).send(body.substring('var hurr_warn = '.length));
    } else {
      res.status(500).send(error);
    }
  });
}

router.get('/', proxy);

module.exports = router;
