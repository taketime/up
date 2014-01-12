var conf = JSON.parse(require('fs').readFileSync('conf.json'));
var _ = require('underscore');
var url = require('url');
var nano = require('nano')(url.format({
    protocol: conf.couchPort === 443 ? 'https' : 'http',
    hostname: conf.couchHost,
    port: conf.couchPort,
    auth: conf.couchUser + ":" + conf.couchPass
}));
var couch = nano.db.use(conf.couchDbName);
var express = require('express');

var app = express();
app.use(express.bodyParser());

app.get('/', function(req, res) {
    res.send('heyo');
});

// Send a checkin with device id, lat long, time
app.post('/device', function(req, res) {
    var data = _(req.body).pick([
        'id',
        'lat',
        'lon',
        'timestamp'
    ]);
    couch.insert(data, '/device/' + data.id, function(err, device) {
        if (err) {
            return err.status_code < 500 ?
                res.json(err.status_code, err.message) :
                res.json(500);
        }
        res.json(device);
    });
});

app.put('/device/:id', function(req, res) {
    var data = _(req.body).pick([
        '_rev',
        'lat',
        'lon',
        'timestamp'
    ]);
    if (!data._rev) return res.json("_rev is required");
    data.id = req.params.id;

    couch.insert(data, '/device/' + data.id, function(err, device) {
        if (err) {
            return err.status_code < 500 ?
                res.json(err.status_code, err.message) :
                res.json(500);
        }
        res.json(device);
    });
});

// Get the current position of all devices
app.get('/devices', function(req, res) {
    couch.view('location', 'devices', function(err, body) {
        if (err) {
            return err.status_code < 500 ?
                res.json(err.status_code, err.message) :
                res.json(500);
        }
        res.json(body.rows);
    });
});

app.listen(process.env.PORT || 3000, function(){
    console.log("listening on", process.env.PORT || 3000);
});
