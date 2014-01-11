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

// Send a check with device id, lat long, time
app.post('/device/:id', function(req, res) {
    var data = _(req.body).pick([
        '_rev',
        'lat',
        'lon',
        'timestamp'
    ]);
    data.id = req.params.id;

    // Update location
    if (data._rev) {
        couch.insert(data, '/device/' + data.id, function(err, device) {
            if (err) {
                return err.status_code < 500 ?
                    res.json(err.status_code, err.message) :
                    res.json(500);
            }
            res.json(device);
        });
    } else {
        couch.get('/device/' + data.id, function(err, device) {
            if (err) {
                return err.status_code < 500 ?
                    res.json(err.status_code, err.message) :
                    res.json(500);
            }
            couch.insert(
                _(data).defaults(device),
                '/device/' + data.id,
            function(err, device) {
                if (err) {
                    return err.status_code < 500 ?
                        res.json(err.status_code, err.message) :
                        res.json(500);
                }
                if (err) return res.json(400, err.message);
                res.json(device);
            })
        });
    }
});

app.listen(process.env.port || 3000, function(){
    console.log("listening on", process.env.port || 3000);
});
