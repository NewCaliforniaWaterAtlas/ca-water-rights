#!/bin/env node

var watermap_app = {};
  
var http = require('http');
 
var fs      = require('fs');
var express = require('express');
var jsdom  = require('jsdom');


var jquery = fs.readFileSync("./jquery-1.8.3.min.js").toString();

var EngineProvider = require('./engine').EngineProvider;
var engine         = new EngineProvider();

var _ = require('underscore')._;
var request = require('request');

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
// Update Water Rights Data
/////////////////////////////////////////////////////////////////////////////////////////////

app.get('/data/update/water_rights', function(req, res, options){
  watermap_app.format_rights();
});

watermap_app.format_rights = function() {
  var output = '';    
    
/*

A0
S0

C0
G3
F0
D0

G1
G5
L0
UN
X0
T0
XC
NJ
E0
Z0
J0
CM
L3
11
26
31
AP
S1
WW
*/
    
    var value = 'WW';
    var query = 'http://gispublic.waterboards.ca.gov/ArcGIS/rest/services/Water_Rights/Points_of_Diversion/MapServer/0/query?text=' + value + '&geometry=&geometryType=esriGeometryPoint&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&objectIds=&where=&time=&returnCountOnly=false&returnIdsOnly=false&returnGeometry=true&maxAllowableOffset=&outSR=&outFields=EWRIMS.Points_of_Diversion.POD_ID%2CEWRIMS.Points_of_Diversion.APPL_ID%2CEWRIMS.Points_of_Diversion.POD_NUM%2CEWRIMS.Points_of_Diversion.APPL_POD%2CEWRIMS.Points_of_Diversion.TOWNSHIP_NUMBER%2CEWRIMS.Points_of_Diversion.TOWNSHIP_DIRECTION%2CEWRIMS.Points_of_Diversion.RANGE_NUMBER%2CEWRIMS.Points_of_Diversion.RANGE_DIRECTION%2CEWRIMS.Points_of_Diversion.SECTION_NUMBER%2CEWRIMS.Points_of_Diversion.SECTION_CLASSIFIER%2C+EWRIMS.Points_of_Diversion.QUARTER%2CEWRIMS.Points_of_Diversion.QUARTER_QUARTER%2CEWRIMS.Points_of_Diversion.MERIDIAN%2CEWRIMS.Points_of_Diversion.NORTH_COORD%2CEWRIMS.Points_of_Diversion.EAST_COORD%2CEWRIMS.Points_of_Diversion.SP_ZONE%2CEWRIMS.Points_of_Diversion.LATITUDE%2CEWRIMS.Points_of_Diversion.LONGITUDE%2CEWRIMS.Points_of_Diversion.TRIB_DESC%2CEWRIMS.Points_of_Diversion.LOCATION_METHOD%2CEWRIMS.Points_of_Diversion.SOURCE_NAME%2CEWRIMS.Points_of_Diversion.MOVEABLE%2CEWRIMS.Points_of_Diversion.HAS_OPOD%2CEWRIMS.Points_of_Diversion.WATERSHED%2CEWRIMS.Points_of_Diversion.COUNTY%2CEWRIMS.Points_of_Diversion.WELL_NUMBER%2CEWRIMS.Points_of_Diversion.QUAD_MAP_NAME%2CEWRIMS.Points_of_Diversion.QUAD_MAP_NUM%2CEWRIMS.Points_of_Diversion.QUAD_MAP_MIN_SER%2CEWRIMS.Points_of_Diversion.PARCEL_NUMBER%2CEWRIMS.Points_of_Diversion.DIVERSION_SITE_NAME%2C+EWRIMS.Points_of_Diversion.LAST_UPDATE_DATE%2CEWRIMS.Points_of_Diversion.LAST_UPDATE_USER_ID%2CEWRIMS.Points_of_Diversion.SPECIAL_AREA%2C+GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.CORE_POD_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_WATER_RIGHT_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_NUMBER%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.APPL_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIRECT_DIV_AMOUNT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_STORAGE_AMOUNT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_AC_FT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.P_PLACE_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_STATUS%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.FACE_VALUE_AMOUNT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_CODE_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_STATUS%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.STORAGE_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_UNIT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.FIRST_NAME%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.LAST_NAME%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.ENTITY_TYPE&f=pjson';
      
  request.get(query, function(err,res,body){   
    var obj = JSON.parse(body);
    for(var i=0; i < obj.features.length; i++) {
      var feature = obj.features[i].attributes;

      var lookup =  { 
        $and: [{'kind': 'right_test'}, {'properties.application_id': feature['EWRIMS.Points_of_Diversion.APPL_ID']}] 
      };

      engine.find_many_by(lookup,function(error, results) {
        if(!results || error) {
          console.log("agent query error");
          res.send("[]");
          return;
        }
        
        console.log(results);
        if(results.length == 0) {
          console.log("empty");

          var newFeature = watermap_app.formatEWRIMSforSaving(feature); 

          engine.save(newFeature,function(error,agent) {
            if(error) { res.send("Server agent storage error #5",404); return; }
            if(!agent) { res.send("Server agent storage error #6",404); return; }
          });
        }
        else {
          console.log('exists');
/*           console.log(results[0]); */
          // use id

          watermap_app.formatEWRIMSforSaving(feature, results[0]);
        
        }
        
      },{}, {'limit': 1});
    }
  });
};

/* Scrape all pages to get the ID to get the download link to get the xls files*/
watermap_app.getXLS = function(){
  var max = 976;

  
  for(var i=1;i <= 5; i++) {

    var query = 'http://ciwqs.waterboards.ca.gov/ciwqs/ewrims/EWServlet?Page_From=EWWaterRightPublicSearch.jsp&Redirect_Page=EWWaterRightPublicSearchResults.jsp&Object_Expected=EwrimsSearchResult&Object_Created=EwrimsSearch&Object_Criteria=&Purpose=&appNumber=&watershed=&waterHolderName=&curPage=' + i + '&sortBy=APPLICATION_NUMBER&sortDir=ASC&pagination=true';

    var j = request.jar();
    var cookie = request.cookie('JSESSIONID=e91892e4f02f543950f7a804f3642ff2c1872a827ae3b900e9bf29596cea8da5');
    j.add(cookie);

    request.get({ uri:query, jar: j }, function (error, response, body) {

    if (error && response.statusCode !== 200) {
      console.log('Error when contacting server')
    }
    
    var output = ''; 
    
    jsdom.env({
      html: body,
      scripts: [
        'http://code.jquery.com/jquery-1.8.3.min.js'
      ],
    
      done: function (err, window) {
      var $ = window.jQuery;      
      

      $('body table.dataentry tr').each(function(){
        var app_id = $(this).find('td:first-child').html();        
        var link = $(this).find('td:last-child a').attr('href');
        output = output + '\n' + app_id + " , " + link; 
        

  
      });

      console.log('done ' + i);
      fs.writeFile('files/water_right_' + i + '.txt', output, function (err) {
        if (err) return console.log(err);
          console.log('Hello World > helloworld.txt');
      });
       
    }});  
    
  });
  

  }  
};



app.get('/data/water_rights/excel', function(req, res, options){
  watermap_app.getXLS();
});

watermap_app.formatEWRIMSforSaving = function(feature, results) {

  var obj = {};
  
  obj.id = feature['EWRIMS.Points_of_Diversion.APPL_ID'];
  obj.kind = "right_test";  
  obj.type = "Feature";   
  obj.coordinates = [
                feature['EWRIMS.Points_of_Diversion.LONGITUDE'],
                feature['EWRIMS.Points_of_Diversion.LATITUDE']
              ];    
  obj.geometry = {
             "type" : "Point",
              "coordinates" : [
                  feature['EWRIMS.Points_of_Diversion.LONGITUDE'],
                  feature['EWRIMS.Points_of_Diversion.LATITUDE']
                ]
  };

  obj.properties = {
    "id" : feature['EWRIMS.Points_of_Diversion.APPL_ID'],
    "kind" : "right_test",
    "source": "http://gispublic.waterboards.ca.gov/",
    "name" : feature['EWRIMS.Points_of_Diversion.APPL_ID'],
  /*                 "description" : "Migrated data from old WRIMS system.", */ // missing
  /*                 "date" : "04/12/1967", */ // this comes from the EWRIMS database, the GIS databse doesn't have it.
  /*                 "license_id" : null, */
  /*                 "permit_id" : null, */
  /*                 "db_id" : 28012, */
    "pod_id" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.CORE_POD_ID'],
    "water_right_id" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_WATER_RIGHT_ID'],                
    "pod_number" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_NUMBER'],
    "application_id" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.APPL_ID'],
    "direct_div_amount": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIRECT_DIV_AMOUNT'],
    "diversion_storage_amount" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_STORAGE_AMOUNT'],
    "diversion_acre_feet": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_AC_FT'],                
    "place_id": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.P_PLACE_ID'],                
    "pod_status" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_STATUS'],
    "face_value_amount" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.FACE_VALUE_AMOUNT'],
    "diversion_type" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_TYPE'],
    "diversion_code_type": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_CODE_TYPE'],
    "water_right_type" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_TYPE'],
    "water_right_status" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_STATUS'],
    "storage_type": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.STORAGE_TYPE'],
    "pod_unit": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_UNIT'],
    "first_name": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.FIRST_NAME'],
    "holder_name" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.LAST_NAME'],               
    "organization_type" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.ENTITY_TYPE'],
    "application_pod" : feature['EWRIMS.Points_of_Diversion.APPL_POD'],
    "township_number" : feature['EWRIMS.Points_of_Diversion.TOWNSHIP_NUMBER'],
    "range_direction" : feature['EWRIMS.Points_of_Diversion.RANGE_DIRECTION'],
    "township_direction" : feature['EWRIMS.Points_of_Diversion.TOWNSHIP_DIRECTION'],
    "range_number" : feature['EWRIMS.Points_of_Diversion.RANGE_NUMBER'],
    "section_number" : feature['EWRIMS.Points_of_Diversion.SECTION_NUMBER'],
    "section_classifier" : feature['EWRIMS.Points_of_Diversion.SECTION_CLASSIFIER'],
    "quarter" : feature['EWRIMS.Points_of_Diversion.QUARTER'],
    "quarter_quarter" : feature['EWRIMS.Points_of_Diversion.QUARTER_QUARTER'],
    "meridian" : feature['EWRIMS.Points_of_Diversion.MERIDIAN'],
    "northing" : feature['EWRIMS.Points_of_Diversion.NORTH_COORD'],
    "easting" : feature['EWRIMS.Points_of_Diversion.EAST_COORD'],
    "sp_zone" : feature['EWRIMS.Points_of_Diversion.SP_ZONE'],
    "latitude" : feature['EWRIMS.Points_of_Diversion.LATITUDE'],
    "longitude" : feature['EWRIMS.Points_of_Diversion.LONGITUDE'],
    "trib_desc" : feature['EWRIMS.Points_of_Diversion.TRIB_DESC'],
    "location_method" : feature['EWRIMS.Points_of_Diversion.LOCATION_METHOD'],
    "source_name" : feature['EWRIMS.Points_of_Diversion.SOURCE_NAME'],
    "moveable" : feature['EWRIMS.Points_of_Diversion.MOVEABLE'],
    "has_opod" : feature['EWRIMS.Points_of_Diversion.HAS_OPOD'],
    "watershed" : feature['EWRIMS.Points_of_Diversion.WATERSHED'],
    "county" : feature['EWRIMS.Points_of_Diversion.COUNTY'],
    "well_number" : feature['EWRIMS.Points_of_Diversion.WELL_NUMBER'],
    "quad_map_name" : feature['EWRIMS.Points_of_Diversion.QUAD_MAP_NAME'],
    "quad_map_num" : feature['EWRIMS.Points_of_Diversion.QUAD_MAP_NUM'],
    "quad_map_min_ser" : feature['EWRIMS.Points_of_Diversion.QUAD_MAP_MIN_SER'],
    "parcel_number" : feature['EWRIMS.Points_of_Diversion.PARCEL_NUMBER'],
    "special_area" : feature['EWRIMS.Points_of_Diversion.SPECIAL_AREA'],          
    "last_update_user_id" : feature['EWRIMS.Points_of_Diversion.LAST_UPDATE_USER_ID'],
    "watershed" : feature['EWRIMS.Points_of_Diversion.WATERSHED'],
    "county" : feature['EWRIMS.Points_of_Diversion.COUNTY'],
    "date_last_updated" : feature['EWRIMS.Points_of_Diversion.LAST_UPDATE_DATE'],
    "status" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_STATUS']
  };
  
  
  if(results.kind === 'right_test') {
  
    var resaveObj = results;
    resaveObj.kind = "right_test";
    resaveObj.coordinates = obj.coordinates;
    resaveObj.geometry = obj.geometry;
    resaveObj.properties = obj.properties;
    obj = resaveObj;
    console.log("resaving");
    console.log(obj);
  }
  
  
  return obj;
};


/////////////////////////////////////////////////////////////////////////////////////////////
// get USGS test
/////////////////////////////////////////////////////////////////////////////////////////////

app.get('/usgs/:station', function(req, res) {
  var station = req.params.station;
  
  request.get({ 
    url: 'http://waterservices.usgs.gov/nwis/dv/?format=json', 
    qs: {site: station}
    }, function(err,res,body){

      var obj = JSON.parse(body);
      // obj.value.timeSeries.forEach(function (d) {
      //   console.log(d.sourceInfo.siteName);
      // });

  }).pipe(res);

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


  /*
  "_id" : ObjectId("50d15c61e730dbcccc3546e5"),
        "id" : "S000550",
        "kind" : "right",
        "type" : "Feature",
        "coordinates" : [
                -121.8921916,
                39.33543549
        ],
        "geometry" : {
                "type" : "Point",
                "coordinates" : [
                        -121.8921916,
                        39.33543549
                ]
        },
        "properties" : {
                "id" : "S000550",
                "kind" : "right",
                "name" : "BUTTE SINK WATERFOWL ASSOCIATION",
                "application_id" : "S000550",
                "source" : "BUTTE CREEK",
                "watershed" : "COLUSA BASIN",
                "county" : "Butte",
                "face_amt" : 0,
                "description" : "Migrated data from old WRIMS system.",
                "date" : "04/12/1967",
                "organization_type" : "Corporation",
                "status" : "Claimed",
                "water_right_type" : "Statement of Div and Use",
                "license_id" : null,
                "permit_id" : null,
                "db_id" : 28012,
                "holder_name" : "BUTTE SINK WATERFOWL ASSOCIATION",
                "pod_id" : 7670,
                "pod_number" : 1,
                "application_pod" : "S000550_01",
                "township_number" : 17,
                "township_direction" : "N",
                "range_number" : 1,
                "range_direction" : "E",
                "section_number" : 7,
                "section_classifier" : null,
                "quarter" : "SE",
                "quarter_quarter" : "SE",
                "meridian" : 21,
                "northing" : 2248187.979,
                "easting" : 6592159.039,
                "sp_zone" : 2,
                "latitude" : 39.33543549,
                "longitude" : -121.8921916,
                "trib_desc" : null,
                "location_method" : "DD_NE",
                "source_name" : "BUTTE CREEK",
                "moveable" : "N",
                "has_opod" : "N",
                "watershed" : "COLUSA BASIN",
                "county" : "Butte",
                "well_number" : null,
                "quad_map_name" : "SANBORN SLOUGH",
                "quad_map_1,C,50" : "F 049",
                "quad_map_M,C,3" : 7.5,
                "parcel_number" : null,
                "diversion" : null,
                "last_updated" : "Sun Sep 28 00:00:00 PDT 2003",
                "last_upd_1,N,10,0" : 9,
                "special_ar,C,50" : null,
                "water_right_type2" : "Statement of Div and Use",
                "water_right_status" : "Claimed",
                "face_value_(afa)" : 0,
                "pod_value" : "Active",
                "annual_direct_diversion" : 0,
                "diversion_units" : "Cubic Feet per Second",
                "diversion_storage_amount" : 0
        }
*/