#!/bin/env node

var fs      = require('fs');
var express = require('express');

var EngineProvider = require('./engine').EngineProvider;
var engine         = new EngineProvider();

var _ = require('underscore')._;

/////////////////////////////////////////////////////////////////////////////////////////////
// configuration
/////////////////////////////////////////////////////////////////////////////////////////////

var zcache = { 'index.html': '' };
zcache['index.html'] = fs.readFileSync('./public/index.html');

var app = module.exports = express.createServer();

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.dynamicHelpers({
  session: function(req, res){
    return req.session;
  },
  user_id: function(req, res) {
    if(req.session && req.session.user_id) {
      return req.session.user_id;
    }
    return null;
  },
});

/////////////////////////////////////////////////////////////////////////////////////////////
// routes
/////////////////////////////////////////////////////////////////////////////////////////////

app.get('/', function(req, res){
    res.send(zcache['index.html'], {'Content-Type': 'text/html'});
});


/*
app.post("/agent/query", function(req,res) {
  var blob = req.body;
  console.log("server:: agent query for many:");
  console.log(blob);
  engine.find_many_by(blob,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }
    res.send(results);
  });
});
*/

app.post('/data', function(req, res, options){
  var blob = req.body;

  engine.find_many_by(blob,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }
    res.send(results);
  },{}, {'limit': 0});
});

app.get('/search/holders', function(req, res, options){
  console.log(req.query);
  var regex = new RegExp('' + req.query.value, "i");
  var query = { $and: [ {'kind': 'right'}, {'properties.holder_name': regex}]};

/*   var blob = req.body; */


  engine.find_many_by(query,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }
    res.send(results);
  },{}, {'limit': 0});
});


/////////////////////////////////////////////////////////////////////////////////////////////
// get USGS test
/////////////////////////////////////////////////////////////////////////////////////////////

var http = require("http");

var options = {
 host: 'waterservices.usgs.gov',
 port: 80,
 path: '/nwis/iv/?format=json&countyCd=06007,06021,06103,06115&parameterCd=00060'
};

http.get(options, function(res) {
  var body = '';
  res.setEncoding('utf8');
  res.on('data', function(chunk) {
    body += chunk;
  });
  
  res.on('end', function() {
     
    var d = JSON.parse(body);

    d.value.timeSeries.forEach(function (data) {
      console.log('  \033[90m' + data.sourceInfo.siteName + '\033[39m');
      console.log('  \033[90m' + data.values[0].value[0].value + " " + data.variable.unit.unitAbbreviation + '\033[39m');
      console.log('  \033[90m' + data.sourceInfo.geoLocation.geogLocation.latitude + '\033[39m');
      console.log('  \033[90m' + data.sourceInfo.geoLocation.geogLocation.longitude + '\033[39m');
      console.log('--');
    });


  });

}).on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });


/////////////////////////////////////////////////////////////////////////////////////////////
// openshift internal routes
/////////////////////////////////////////////////////////////////////////////////////////////

app.get('/health', function(req, res){
    res.send('1');
});

// Handler for GET /asciimo
app.get('/asciimo', function(req, res){
    var link="https://a248.e.akamai.net/assets.github.com/img/d84f00f173afcf3bc81b4fad855e39838b23d8ff/687474703a2f2f696d6775722e636f6d2f6b6d626a422e706e67";
    res.send("<html><body><img src='" + link + "'></body></html>");
});

/////////////////////////////////////////////////////////////////////////////////////////////
// openshift boot up
/////////////////////////////////////////////////////////////////////////////////////////////

var ipaddr  = process.env.OPENSHIFT_INTERNAL_IP;
var port    = process.env.OPENSHIFT_INTERNAL_PORT || 3000;

if (typeof ipaddr === "undefined") {
   console.warn('No OPENSHIFT_INTERNAL_IP environment variable');
}

function terminator(sig) {
   if (typeof sig === "string") {
      console.log('%s: Received %s - terminating Node server ...',
                  Date(Date.now()), sig);
      process.exit(1);
   }
   console.log('%s: Node server stopped.', Date(Date.now()) );
}

process.on('exit', function() { terminator(); });

['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS',
 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGPIPE', 'SIGTERM'
].forEach(function(element, index, array) {
    process.on(element, function() { terminator(element); });
});

app.listen(port, ipaddr, function() {
   console.log('%s: Node server started on %s:%d ...', Date(Date.now() ),
               ipaddr, port);
});
