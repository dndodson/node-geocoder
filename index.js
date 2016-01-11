"use strict";

if (!process.env.CONSUMER_KEY || !process.env.CONSUMER_SECRET) {
  console.error("Please provide CONSUMER_KEY and CONSUMER_SECRET");
  process.exit(1);
}

var BossGeoClient = require("bossgeo").BossGeoClient,
    cors = require("cors"),
    geo = new BossGeoClient(process.env.CONSUMER_KEY,
                            process.env.CONSUMER_SECRET),
    express = require("express"),
    app = express();

// radius of the earth in meters
var RADIUS = 40075016.69;
var π = Math.PI;

app.configure(function() {
  app.use(express.logger());
  app.use(express.compress());
  app.use(cors());
});

app.get("/", function(req, res) {
  var smallEdge = Math.min(req.query.w || 1000, req.query.h || 768);

  if (!req.query.q) {
    return res.send(404);
  }

  // Current (v4.13.3) express js code instantiates the req object without
  // the Object prototype, while the npm "bossgeo" library calls query.hasOwnProperty.
  // Construct a normal query Object from req.query for use with the bossgeo placefinder method.
  var query = {}
  for (var propName in req.query) {
    if (Object.prototype.hasOwnProperty.call(req.query, propName)) {
      query[propName] = req.query[propName];
    }
  }

  geo.placefinder(query, function(err, rsp) {
    if (err) {
      console.log('-----Error-----: ', rsp);
      console.warn(err);
      return res.send(500);
    }

    console.log(rsp);

    var results = (rsp.results || []).map(function(x) {
      var radius = +x.radius;
      var zoom = -Math.round(Math.log((radius) / (RADIUS / Math.cos(+x.latitude * π / 180)) / Math.log(smallEdge)));

      x.name = [x.city, x.state, x.country].filter(function(x) { return !!x; }).join(", "),
      x.latitude = +x.latitude,
      x.longitude = +x.longitude,
      x.state = x.statecode,
      x.zoom = zoom

      return x;
    });

    res.jsonp(results);
  });
});

app.get("/crossdomain.xml", onCrossDomainHandler)

function onCrossDomainHandler(req, res) {
  var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM' +
            ' "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">\n<cross-domain-policy>\n';
      xml += '<allow-access-from domain="*" to-ports="*"/>\n';
      xml += '</cross-domain-policy>\n';

  req.setEncoding('utf8');
  res.writeHead( 200, {'Content-Type': 'text/xml'} );
  res.end( xml );
}

app.listen(process.env.PORT || 8080, function() {
  console.log("Listening at http://%s:%d/", this.address().address, this.address().port);
});
