#!/bin/env node

var watermapApp = {};
watermapApp.tally = {};
watermapApp.tally.storage = 0;
watermapApp.tally.diversion = 0;
  
var http = require('http');
var fs      = require('fs');
var express = require('express');
var jsdom  = require('jsdom');
var jquery = fs.readFileSync("./jquery-1.8.3.min.js").toString();

var EngineProvider = require('./engine').EngineProvider;
var engine         = new EngineProvider();

var _ = require('underscore')._;
var request = require('request');

var async = require('async');

/////////////////////////////////////////////////////////////////////////////////////////////
// utility functions
/////////////////////////////////////////////////////////////////////////////////////////////

watermapApp.addCommas = function(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	tail = x[1];
	if(tail !== undefined){
	 tail = tail.substring(0, 2);
	}
	x2 = x.length > 1 ? '.' + tail : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
};




/**
 *  Define the sample application.
 */
var App = function() {

    //  Scope.
    var self = this;

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };

    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' , 'home.html':''};
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./public/index.html');
        self.zcache['home.html'] = fs.readFileSync('./public/home.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        // Routes for /health, /asciimo and /
        self.routes['/health'] = function(req, res) {
            res.send('1');
        };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };




        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('home.html') );
        };

        self.routes['/water-rights'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };
        
        


//////////////  get


/**
 * Search database by passing it a mongo search object.
 */
        self.routes['/data'] = function(req, res) {
/* self.app.post('/data', function(req, res, options){ */
  var blob = req.body;

  if(!blob.options.limit){
    var limit = {'limit': 0};
  }
  else {
    var limit = blob.options.limit;
  }

  engine.find_many_by(blob,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }
    res.send(results);
  },{}, limit);
};

/** 
 * Search functions
 */
        self.routes['/search/all'] = function(req, res, options) { 
/* self.app.get('/search/all', function(req, res, options){ */

  var regex = {$regex: req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'}, {'coordinates': {$exists: true}}, {$or: [{'properties.holder_name': regex},{'properties.name': regex},{'properties.primary_owner': regex},{'properties.application_pod': regex},{'properties.use_code': regex}, {'properties.reports.2011.usage': regex},{'properties.reports.2011.usage_quantity': regex}, {'properties.watershed': regex}, {'properties.source_name': regex}, {'properties.county': regex}   ,{'properties.reports.2010.usage': regex}, {'properties.reports.2010.usage_quantity': regex},{'properties.reports.2009.usage': regex},/*  {'properties.reports.2009.usage_quantity': regex},{'properties.reports.2008.usage': regex}, {'properties.reports.2008.usage_quantity': regex}   {'properties.reports': { $in:  {$or: [{'this.usage': regex},{'this.usage_quantity': regex}] }} } */     ]}]};

// index

/*  {'kind':1, 'properties.holder_name':1, 'properties.name':1, 'properties.primary_owner':1, 'properties.application_pod':1, 'properties.use_code':1,  'properties.reports.2011.usage':1, 'properties.reports.2011.usage_quantity':1, 'properties.reports.2010.usage':1, 'properties.reports.2010.usage_quantity':1} */


  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};
        self.routes['/search/id'] = function(req, res, options) { 
/* self.app.get('/search/id', function(req, res, options){ */

  var regex = {$regex: '^' + req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'},{'coordinates': {$exists: true}}, {'properties.id': regex}]};

  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};

        self.routes['/search/county'] = function(req, res, options) { 
/* self.app.get('/search/county', function(req, res, options){ */

  var regex = {$regex: '^' + req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'},{'coordinates': {$exists: true}}, {'properties.county': regex}]};

  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};

        self.routes['/search/watershed'] = function(req, res, options) { 
/* self.app.get('/search/watershed', function(req, res, options){ */

  var regex = {$regex: '^' + req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'},{'coordinates': {$exists: true}}, {'properties.watershed': regex}]};

  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};

        self.routes['/search/source_name'] = function(req, res, options) { 
/* self.app.get('/search/source_name', function(req, res, options){ */

  var regex = {$regex: '^' + req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'},{'coordinates': {$exists: true}}, {'properties.source_name': regex}]};

  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};

        self.routes['/search/status'] = function(req, res, options) { 
/* self.app.get('/search/status', function(req, res, options){ */

  var regex = {$regex: '^' + req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'},{'coordinates': {$exists: true}}, {'properties.water_right_status': regex}]};

  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};

        self.routes['/search/use'] = function(req, res, options) { 
/* self.app.get('/search/use', function(req, res, options){ */

  var regex = {$regex: '^' + req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'},{'coordinates': {$exists: true}}, {'properties.use_code': regex}]};

  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};

        self.routes['/search/name'] = function(req, res, options) { 
/* self.app.get('/search/name', function(req, res, options){ */

  var regex = {$regex: req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'},{'coordinates': {$exists: true}}, {$or: [{'properties.name': regex},{'properties.holder_name': regex}]} ]};

  engine.find_many_by({query: query, options: {'limit': 0}},function(error, results) {
    if(!results || error) {

      res.send("[]");
      return;
    }
    res.send(results);

  },{});
};

        self.routes['/list/usage'] = function(req, res, options) { 
/* self.app.get('/list/usage', function(req, res, options){ */

  var lookup =  { $and: [{'properties.reports': { $exists: true}}, {'properties.reports': { $gt: {}}}, {'coordinates': {$exists: true} } ]} ;

  engine.find_many_by({query: lookup, options: options},function(error, results) {
    if(!results || error) {
/*       console.log("agent query error"); */
      res.send("[]");
      return;
    }

    var obj = [];
    var string = '';
    
    for (i in results){

      if(results[i].properties.reports !== undefined) {
        var properties = results[i].properties;
        for(var year in results[i].properties.reports){
          var report = results[i].properties.reports[year];
          
          if(report !== undefined){
                
            if(report.usage !== undefined){
             if (report.usage instanceof Array) {
                for(var i in report['usage']) {
                
            string +=  properties.name + "  | " 
                + properties.application_pod + " | "
                
                  string += "Usage " + report['usage'][i] + ', ' + report['usage_quantity'][i];
                                              string += " | Year: " + year + "<br />";
                }
             }
             else{
                
                string +=  properties.name + "  | " 
                + properties.application_pod + " | "
                string +=  "Usage " + report['usage'] + ', ' + report['usage_quantity'];
                            string += " | Year: " + year + "<br />";
             }
            }
 
          }
        }
      
        string += "<br />";
    }

  }
     res.send(string);
  } ,{}, {'limit': 55000});
  
};

        self.routes['/water-rights/summary'] = function(req, res, options) { 
/* self.app.get('/water-rights/summary', function(req, res, options){ */
  res.render("tally_cached.ejs",{layout:false});  
};


/** 
 * Daily values from USGS's Water Watch, specifically percentile classes
 */
         self.routes['/usgs/load/today'] = function(req, res) { 
/* self.app.get('/usgs/load/today', function(req, res) { */
  request.get({ 
    url: 'http://waterwatch.usgs.gov/download/?gt=map&mt=real&st=18&dt=site&ht=&fmt=rdb'
    }, function(err,res,body){

        var filename = './usgs_realtime/stream_gages.tsv'; // @TODO add timestamp.
        var stream = fs.createWriteStream(filename);
        stream.write(body);
        
        body.toString().split('\n').forEach(function (line) { 

          var split_line = line.split('\t');
          //name	lat	lng	class	flowinfo	url
   
          if(split_line[4] !== undefined){
            var obj = {}; 
            obj.kind = "usgs_gage_data";
            obj.properties = {};

            var id_split = split_line[0].split("NR");

            obj.properties.city = id_split[1];
            
            var id_split_ids = id_split[0].split(" ");
            obj.properties.service_cd = id_split_ids[0];
            obj.properties.station_id = id_split_ids[1];
            
            id_split_ids.shift();
            id_split_ids.shift();
            
            obj.properties.station_name = id_split_ids.join(" ");

              
            obj.id = obj.properties.station_id;
    
            obj.type = "Feature";   
            obj.coordinates = [
                  parseFloat(split_line[2]),
                  parseFloat(split_line[1])
                ];    
            obj.geometry = {
              "type" : "Point",
              "coordinates" : [
                    parseFloat(split_line[2]),
                    parseFloat(split_line[1])
                  ]
            };
  
            obj.properties.id = obj.id;
            obj.properties.name = obj.properties.station_name;
            obj.properties.lat = parseFloat(split_line[1]);
            obj.properties.lon = parseFloat(split_line[2]);
            obj.properties.class = split_line[3];
            obj.properties.flowinfo = split_line[4];
            obj.date_created = new Date();
            
            if(obj.properties.flowinfo !== undefined){
              obj.properties.flowinfo = obj.properties.flowinfo.replace(/"/g, '');
              var flowinfo = obj.properties.flowinfo.split(';');
              for (i in flowinfo){
                var flowinfoLine = flowinfo[i].split(':');
                if(watermapApp.trim(flowinfoLine[0]) !== ''){

                  if(watermapApp.trim(flowinfoLine[0]) === "Discharge") {
                    var discharge = watermapApp.trim(flowinfoLine[1]).split(" ");
                    obj.properties.discharge_value = discharge[0];               
                    obj.properties.discharge_unit = discharge[1];              
                  }
                  if(watermapApp.trim(flowinfoLine[0]) === "Stage") {
                    obj.properties.stage = watermapApp.trim(flowinfoLine[1]);
                  }
                  if(watermapApp.trim(flowinfoLine[0]) === "Date (stage)") {
                    console.log("date stage");
                    obj.properties.date = watermapApp.trim(flowinfoLine[1]);
                  }                    
                  if(watermapApp.trim(flowinfoLine[0]) === "Date") {
                    obj.properties.date = watermapApp.trim(flowinfoLine[1]);
                  }
                  if(watermapApp.trim(flowinfoLine[0]) === "Percentile") {
                    obj.properties.percentile = watermapApp.trim(flowinfoLine[1]);
                  } 
                  if(watermapApp.trim(flowinfoLine[0]) === "Class") {
                     obj.properties.class = watermapApp.trim(flowinfoLine[1]);
                  }
                  if(watermapApp.trim(flowinfoLine[0]) === "% normal(median)") {
                    obj.properties.normal_median = watermapApp.trim(flowinfoLine[1]);
                  }
                  if(watermapApp.trim(flowinfoLine[0]) === "% normal(mean)") {
                    obj.properties.normal_mean = watermapApp.trim(flowinfoLine[1]);
                  }
                }
              }
            }
            obj.properties.url = split_line[5];
           // console.log(obj);
            engine.save(obj,function(error,agent) {
              if(error) { res.send("Server agent storage error #5",404); return; }
              if(!agent) { res.send("Server agent storage error #6",404); return; }
            });
         }
        });
    });
};

/** 
 * Daily values from USGS RESTful API
 */
         self.routes['/usgs/:station/:pcode'] = function(req, res) { 
/* self.app.get('/usgs/:station/:pcode', function(req, res) { */
  var station = req.params.station;
  var pcode = req.params.pcode;
  
  request.get({ 
    url: 'http://waterservices.usgs.gov/nwis/dv/?format=json', 
    qs: {site: station, parameterCd: pcode}

    }, function(err,res,body){

      var obj = JSON.parse(body);
  }).pipe(res);

};


//////////////   end get
        



    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express.createServer();


          self.app.configure(function(){
            self.app.use(express.bodyParser());
            self.app.use(express.cookieParser());
            self.app.use(express.methodOverride());
/*             self.app.use(self.router); */
            self.app.use(express.static(__dirname + '/public'));
          });


        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }




    };






    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };




};/*  Application.  */

/*
us:
app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

*/

/*
old openshift
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
*/

/////////////////////////////////////////////////////////////////////////////////////////////
// routes
/////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Provide webpages.
 */
/*
app.get('/', function(req, res){
    res.send(zcache['home.html'], {'Content-Type': 'text/html'});
});

app.get('/water-rights', function(req, res){
    res.send(zcache['index.html'], {'Content-Type': 'text/html'});
});
*/






/////////////////////////////////////////////////////////////////////////////////////////////
// openshift internal routes
/////////////////////////////////////////////////////////////////////////////////////////////

/*
app.get('/health', function(req, res){
    res.send('1');
});

// Handler for GET /asciimo
app.get('/asciimo', function(req, res){
    var link="https://a248.e.akamai.net/assets.github.com/img/d84f00f173afcf3bc81b4fad855e39838b23d8ff/687474703a2f2f696d6775722e636f6d2f6b6d626a422e706e67";
    res.send("<html><body><img src='" + link + "'></body></html>");
});
*/

/////////////////////////////////////////////////////////////////////////////////////////////
// openshift boot up
/////////////////////////////////////////////////////////////////////////////////////////////
/*

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
*/




/**
 *  main():  Main code.
 */
var zapp = new App();
zapp.initialize();
zapp.start();
