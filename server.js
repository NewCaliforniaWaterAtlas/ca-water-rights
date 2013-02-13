#!/bin/env node

var watermapApp = {};
  
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

/**
 * Provide webpage.
 */
app.get('/', function(req, res){
    res.send(zcache['index.html'], {'Content-Type': 'text/html'});
});

/**
 * Search database by passing it a mongo search object.
 */
app.post('/data', function(req, res, options){
  var blob = req.body;

  if(!blob.options.limit){
    var limit = {'limit': 0};
  }
  else {
    var limit = blob.options.limit;
  }
  console.log(limit);
  engine.find_many_by(blob.query,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }
    res.send(results);
  },{}, limit);
});

/** 
 * Search function for typeahead
 */
app.get('/search/holders', function(req, res, options){
  console.log(req.query);
  //var regex = new RegExp('' + req.query.value, "i");
/*   db.database.find({ 'properties.reports.2011.usage_quantity' : {$regex: 'grape', $options: 'i'}}); */

  var regex = {$regex: req.query.value, $options: 'i'};

  var query = { $and: [ {'kind': 'right'}, {'coordinates': {$exists: true}}, {$or: [{'properties.holder_name': regex},{'properties.name': regex},{'properties.primary_owner': regex},{'properties.application_pod': regex},{'properties.use_code': regex}, {'properties.reports.2011.usage': regex},{'properties.reports.2011.usage_quantity': regex},{'properties.reports.2010.usage': regex}, {'properties.reports.2010.usage_quantity': regex},{'properties.reports.2009.usage': regex}, {'properties.reports.2009.usage_quantity': regex},{'properties.reports.2008.usage': regex}, {'properties.reports.2008.usage_quantity': regex} /*   {'properties.reports': { $in:  {$or: [{'this.usage': regex},{'this.usage_quantity': regex}] }} } */     ]}]};



  console.log(query);
  engine.find_many_by(query,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }
    res.send(results);
    console.log(results.id);
  },{}, {'limit': 0});
});

app.get('/list/usage', function(req, res, options){

  var lookup =  { $and: [{'properties.reports': { $exists: true}}, {'properties.reports': { $gt: {}}}, {'coordinates': {$exists: true} } ]} ;


  engine.find_many_by(lookup,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
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
  
});

watermapApp.tally = {};
watermapApp.tally.storage = 0;
watermapApp.tally.diversion = 0;

watermapApp.addCommas = function(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

watermapApp.tallyDiversions = function(feature){
  var string = feature.properties.application_pod + " ";
  var currentDiversionAmount = 0;
  
  // There are a few fields that might contain the diversion amount, but from how it appears, the values are either equal to each other, or else they are null or zero. We believe that the diversion amount, face value amount and diversion amount in acre feet are all supposed to be the same thing.
  
  // Set the current diversion amount
  if((feature.properties.diversion_acre_feet !== undefined) && (feature.properties.diversion_acre_feet > 0)) {
    currentDiversionAmount = feature.properties.diversion_acre_feet;
    string += "diversion_acre_feet: " + feature.properties.diversion_acre_feet + " AFY<br />";
  }
  else if((feature.properties.face_value_amount !== undefined) && (feature.properties.face_value_amount > 0)) {
    currentDiversionAmount = feature.properties.face_value_amount;
    string += "face_value_amount: " + feature.properties.face_value_amount + " AFY<br />";
  }
/*
  else if((feature.properties.direct_div_amount !== undefined) && (feature.properties.direct_div_amount > 0)) {
    currentDiversionAmount = parseFloat(feature.properties.direct_div_amount);
    string += "direct_div_amount: " + feature.properties.direct_div_amount + " " + feature.properties.pod_unit + "<br />";   

    if(feature.properties.pod_unit === 'Cubic Feet per Second'){
      currentDiversionAmount = parseFloat(feature.properties.direct_div_amount) * 723.97; // Convert to CFS to AFY
      string += "converted direct_div_amount cfs to afy: " + currentDiversionAmount + " AFY<br />";
    }
    if(feature.properties.pod_unit === 'Gallons per Day'){
      currentDiversionAmount = parseFloat(feature.properties.direct_div_amount) * 0.00112088568; // 1 US gallons per day = 0.00112088568 (acre feet) per year
      string += "converted direct_div_amount gpd to afy: " + currentDiversionAmount + " AFY<br />";
    }

  }
*/

  
  
  // Increment the diversion tally.
  if(currentDiversionAmount > 0){
    watermapApp.tally.diversion += parseFloat(currentDiversionAmount);
    string += "tally total diverted: " + watermapApp.addCommas(watermapApp.tally.diversion) + " AFY<br />";  
  }
  if((feature.properties.diversion_storage_amount !== undefined) && (feature.properties.diversion_storage_amount > 0)) {
    // @TODO check storage units.
    watermapApp.tally.storage += parseFloat(feature.properties.diversion_storage_amount);
    //string += "storage: " + parseFloat(feature.properties.diversion_storage_amount) + " AFY<br />";
    // string += "tally total stored: " + watermapApp.addCommas(watermapApp.tally.storage) + " AFY<br />";
  }

  return string + "<br />";
};


app.get('/tally', function(req, res, options){

  var lookup =  { $and: [{'kind': 'right'}]} ;


  engine.find_many_by(lookup,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }

    var obj = [];
    var string = '';
    
    for (i in results){

      string += watermapApp.tallyDiversions(results[i]);    

    }
     res.send(string);
  } ,{}, {'limit': 55000});
  
});

/////////////////////////////////////////////////////////////////////////////////////////////
// Update Water Rights Data
// Load data from eWRIMS database and GIS server.
/////////////////////////////////////////////////////////////////////////////////////////////

// Global helpers & counters.
watermapApp.xlsCounter = 604;
watermapApp.loadFileCounter = 0;
watermapApp.dbIDs = [];
watermapApp.current = 0;
watermapApp.counterXLSParser = 0;
watermapApp.getBatchCounter = 0;
watermapApp.GISGroup = 'S014'; // Used for downloading GIS data from server. 
watermapApp.XLSGroup = 'no_dups';
watermapApp.GISCounter = 0;
watermapApp.GISLoadJSONCounter = 0;
watermapApp.EWRIMSReportCurrent = 0;
watermapApp.EWRIMSReportsCounter = 0;

/////////////////////////////////////////////////////////////////////////////////////////////
// Data handling callbacks.
/////////////////////////////////////////////////////////////////////////////////////////////

//http://ciwqs.waterboards.ca.gov/ciwqs/ewrims/EWServlet?Page_From=EWWaterRightPublicSearch.jsp&Redirect_Page=EWWaterRightPublicSearchResults.jsp&Object_Expected=EwrimsSearchResult&Object_Created=EwrimsSearch&Object_Criteria=&Purpose=&appNumber=&permitNumber=&licenseNumber=&watershed=&waterHolderName=&source=

//http://www.waterboards.ca.gov/water_issues/programs/ewrims/statements/docs/


/**
 * Get database ID for all records in eWRIMS database.
 * Scrape all pages to get the ID to get the download link to get the xls files 
 * These are stored as flat files, which need to be cleaned up and cat'ed into one file.
 * Takes about 1 day to run (947 pages)
 * Is not error proof, also had to get the missing values and reload them - then cat into one master file.
 */
// @TODO Refactored, test it.
app.get('/data/water_rights/scrape/pages', function(req, res, options){
  watermapApp.getXLSAllPages();
});

// Scrape all pages to get the ID to get the download link to get the xls files
app.get('/data/water_rights/scrape/app_id_array', function(req, res, options){
  watermapApp.getXLSByAppIDArray();
});

/** Once we have all of the DB ids in a CSV file on the server (manually created),
 *  download all xls files for water rights. 
 */
app.get('/data/water_rights/download/xls', function(req, res, options){
  watermapApp.downloadWaterRightDBDataXLS();
});

/** 
 * Load view reports pages, and store the results.
 * Then parse results for form ids and store them
 */ 
app.get('/data/water_rights/reports', function(req, res, options){
  watermapApp.loadWaterRightsReportsXLS();
});

app.get('/data/water_rights/reports/parse', function(req, res, options){
  watermapApp.parseWaterRightsReportsXLS();
});

app.get('/data/water_rights/reports/download', function(req, res, options){
  watermapApp.loadWaterRightsReportsDownload();
});

app.get('/data/water_rights/reports/parse_full', function(req, res, options){
  watermapApp.parseReportFile();
});

app.get('/data/update/ewrims_db_id', function(req, res, options){
  watermapApp.updateEWRIMSID();
});

// Once downloaded, parse all XLS files. Convert to object for mongo. Store in database.
app.get('/data/water_rights/update/db', function(req, res, options){
  watermapApp.parseXLSWaterRights();
});

app.get('/consolidate/reports', function(req, res, options){
  watermapApp.consolidateReports();
});


// Lookup GIS data for sets of records to get Lat/Lon and other extra values. Update in Mongo.
app.get('/data/water_rights/update/gis', function(req, res, options){
/*   var GISinterval = setInterval(function(){ */
    watermapApp.GISCounter = 0;
    //watermapApp.GISGroup = watermapApp.gisFacets[watermapApp.GISCounter]; 
    console.log(watermapApp.GISGroup);
    console.log("getting GIS: " + watermapApp.GISGroup + " " + watermapApp.GISCounter);

    watermapApp.getGISRights();
    watermapApp.GISCounter++;


    if(watermapApp.GISGroup === undefined) {
      clearInterval(GISinterval);
    }

/*   },1000); */

});



/**
 * Read and parse each stored XLS file from the eWRIMS database.
 */
watermapApp.parseReportFile = function(db_id){
  var obj = {};

/*   console.log(db_id); */
  fs.readFileSync('./server_data/allreports2011.csv').toString().split('\n').forEach(function (line) { 
      var split_line = line.split(',');
/*       console.log(split_line); */
      watermapApp.dbIDs.push(new Array(split_line[0],split_line[4]));
  });
  
  console.log(watermapApp.dbIDs);
    // Do a query every 4 seconds -- should be about 8 concurrent queries.
  // Should do 100 in 6 minutes.
  watermapApp.getReportFile = setInterval(function() {
    watermapApp.parseReportFromHTML(watermapApp.dbIDs[watermapApp.loadFileCounter][0],watermapApp.dbIDs[watermapApp.loadFileCounter][1]); 
    watermapApp.loadFileCounter++;
    watermapApp.getBatchCounter++;  
    console.log(watermapApp.dbIDs[watermapApp.loadFileCounter]);

    if(watermapApp.dbIDs[watermapApp.loadFileCounter] === undefined) {
      clearInterval(watermapApp.getFile);
    }
  }, 2000);
  
};

watermapApp.updateEWRIMSID = function(){

  var obj = {};

/*   console.log(db_id); */
  fs.readFileSync('./server_data/all_ewrims_ids.csv').toString().split('\n').forEach(function (line) { 
      var split_line = line.split(',');
/*       console.log(split_line); */
      watermapApp.dbIDs.push(new Array(split_line[1],split_line[0]));
  });
  
    // Do a query every 4 seconds -- should be about 8 concurrent queries.
  // Should do 100 in 6 minutes.
  watermapApp.setEWRIMSID = setInterval(function() {
    watermapApp.setEWRIMS(watermapApp.dbIDs[watermapApp.loadFileCounter][0],watermapApp.dbIDs[watermapApp.loadFileCounter][1]); 
    watermapApp.loadFileCounter++;
    watermapApp.getBatchCounter++;  
    //console.log(watermapApp.dbIDs[watermapApp.loadFileCounter]);

    if(watermapApp.dbIDs[watermapApp.loadFileCounter] === undefined) {
      clearInterval(watermapApp.setEWRIMSID);
    }
  }, 200);

};

watermapApp.consolidateReports = function(){
  // look up each record with reports
  // load report details
  // resave with year as the key
  // save
  
  var lookup =  { $and: [{'properties.reports': { $exists: true}} ,{'coordinates': {$exists: true} } ]} ;

  
  engine.find_many_by(lookup,function(error, results) {
    if(!results || error) {
      console.log("agent query error");
      res.send("[]");
      return;
    }

    for (i in results){

      var feature = results[i];
      var newReports = {};
      
      for(r in feature.properties.reports){
        var report = feature.properties.reports[r];

        if(report !== null){
          if(report.amount_diverted !== undefined){

            if(report.amount_diverted["Total"] === undefined) {
                var total_diverted = 0;
                var total_used = 0;
                var i = 0;
                for(i in report.amount_diverted){

                  if(i < 12){
                    for(month in report.amount_diverted[i]){
                      total_diverted += parseInt(report.amount_diverted[i][month]);
                    }
  
                    for(month in report.amount_used[i]){
                      total_used += parseInt(report.amount_used[i][month]);
                    }
                  }

                
                }

                report.amount_diverted["Total"] = total_diverted;
                report.amount_used["Total"] = total_used;
                report.total_used = total_used;
                report.total_diverted = total_diverted;

            }          
          }

        if(report.total_diverted === '') {
        
        }



/*
          if(report.year === undefined) {
            newReports['unknown-' + r] = report;
          }
          else {
            newReports[report.year] = report;   
          }
*/
        }
      }
      
      //console.log( r ) ;
      //console.log(newReports);
/*       feature.properties.reports = newReports; */
      //console.log( feature.properties.reports);
      watermapApp.storeWaterRightFromEWRIMSDatabase(feature);
    } 
    
 

    
   
  },{},{limit: 10});
};

watermapApp.setEWRIMS = function(app_pod, ewrims_db_id){
  console.log(app_pod + " " + ewrims_db_id);
    var query = [];
    query.push({'properties.application_pod' : app_pod});

  // @TODO - storing in separate collection for testing purposes.
  var lookup =  { 
    $and: [{'kind': 'right'}, {$and: query}]
  };

//    $and: [{'kind': 'right'}, {$or: [{'properties.application_pod': feature['properties']['application_pod']},{'properties.ewrims_db_id': feature['properties']['ewrims_db_id']}]}] 
  
  engine.find_many_by(lookup,function(error, results) {
/*     console.log(results); */
    if(!results || error) {
      console.log("agent query error");
/*       results.send("[]"); */
      return;
    }

    // Create if record does not exist.
    if(results.length != 0) {

      
      // merge _id from existing record with new stuff.
      var original = results[0];
      
      original.properties.ewrims_db_id = ewrims_db_id;

      // Save the original version, to which has been added the new items from the feature.
      engine.save(original,function(error,agent) {
        if(error) { res.send("Server agent storage error #5",404); return; }
        if(!agent) { res.send("Server agent storage error #6",404); return; }
      });    
    }
    
  });

};

watermapApp.parseReportFromHTML = function(db_id, form_id){
  console.log("parse: " + db_id + " " + form_id);
  var filename = 'water_rights_full_reports_all/water_right-' + db_id + '_' + form_id +'.txt';

  var body = fs.readFileSync(filename,'utf8');

  if(body !== ''){

    jsdom.env({
      html: body,
      scripts: [
        'http://code.jquery.com/jquery-1.8.3.min.js'
      ],
    
      done: function (err, window) {
        var $ = window.jQuery;      
        var output = '';

        var obj = {};
        obj.properties = {};
        obj.properties.reports = [];
        var thisReport = {};
        
        thisReport.usage = new Array();
        thisReport.usage_quantity = new Array();
                
        var testEmpty =  $('body').html();


        var quantityCount = 0;
        quantity = $('table tr th:contains("Purpose of Use")').parent().parent().find('tr').each(function(){ 
 
          if(quantityCount !== 0) {

            var usage = $(this).find('td:first-child').html();
            var quantity = $(this).find('td:last-child').html();
            

        
            if(usage !== undefined){
              usage = usage.replace(/(\r\n|\n|\r)/gm,"");
              usage = usage.replace(/\s+/g," ");            
              thisReport.usage.push(usage);
            }
            else{
              thisReport.usage.push('');
            }
            if(quantity !== undefined){
              quantity = quantity.replace(/(\r\n|\n|\r)/gm,"");
              quantity = quantity.replace(/\s+/g," ");
              thisReport.usage_quantity.push(quantity);
            }
            else{
              thisReport.usage_quantity.push('');            
            }

          }
          quantityCount++;
        });
        

        
        var diversionItemArray = new Array();
        var diversionUsedArray = new Array();
        
      $('table tr th:contains("Amount directly diverted")').parent().parent().find('tr').each(function(){


        var month = '';
        if($(this).find('td:nth-child(1)').html() === 'September&nbsp;&nbsp;&nbsp;'){
          month = 'September';
        }
        else {
          month = $(this).find('td:nth-child(1)').html();
        }
        

        var diversion_item = {};
        diversion_item[month] = $(this).find('td:nth-child(2)').html();

        var diversion_used = {}        
        diversion_used[month] = $(this).find('td:nth-child(3)').html();


        if($(this).find('td:nth-child(1)').html() !== undefined){
          diversionItemArray.push(diversion_item);
          diversionUsedArray.push(diversion_used);
        }


        if($(this).find('td:nth-child(1)').html() === 'Total'){
          thisReport.diversion_total = $(this).find('td:nth-child(2)').html();
          thisReport.used_total = $(this).find('td:nth-child(2)').html();
        }


        var unit = $(this).find('th:contains("Amount directly diverted or")').html();
          
          if(unit !== undefined){
            unit = unit.split('<br />\r\n')[2];
            unit = watermapApp.trim(unit);
            unit = unit.replace("\r\n","");
            unit = unit.replace("(","");
            unit = unit.replace(")","");
            thisReport.diversion_unit = unit;
          }


        
        
          thisReport.total_diverted = $(this).find('td:nth-child(2)').html();
          thisReport.total_used = $(this).find('td:nth-child(2)').html();
          
          console.log("TOTAL USED" + thisReport.total_used);
          console.log("TOTAL DIVERTED" + thisReport.total_diverted);
          
        });        


        thisReport.amount_diverted = diversionItemArray;
        thisReport.amount_used = diversionUsedArray;

        //thisReport.diversion = watermapApp.trim(diversion);



      var year = $('h3:contains("[FINAL SUBMITTED VERSION]")').html();
      console.log(year);
      if(year !== undefined){
        thisReport.year = year.split('FOR')[1];
        thisReport.year.replace('\r\n','');
        thisReport.year = watermapApp.trim(thisReport.year);
      }

/*

        thisReport.conservation = $('table tr th:contains("Conservation of Water")').parent().parent().find('tr::nth-child(2) td:last-child');
        thisReport.conservation = watermapApp.trim(thisReport.conservation);
        
          
*/    


        thisReport.ewrims_db_id = db_id;
        thisReport.ewrims_form_id= form_id; //push to array
  
        obj.properties.reports.push(thisReport);
        console.log(obj);
  
        // The XLS file has an odd output from eWRIMS, so to extract the data we read each line and map fields to the fields we are storing in Mongo.
        // @NOTE Does not have geocoded data, that has to come from the GIS server.

        watermapApp.storeWaterRightFromEWRIMSDatabase(obj);
    
      }
    });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////
// Process data.
/////////////////////////////////////////////////////////////////////////////////////////////

/** 
 * Load view reports pages, and store the results.
 * Then parse results for form ids and store them
 */ 
watermapApp.loadWaterRightsReportsXLS = function(){
  
  fs.readFileSync('./server_data/db_ids_' + watermapApp.XLSGroup + '.csv').toString().split('\n').forEach(function (line) { 
      var split_line = line.split(',');
      watermapApp.dbIDs.push(split_line[3]);
  });


  // Do a query every 4 seconds -- should be about 8 concurrent queries.
  // Should do 100 in 6 minutes.
  watermapApp.getFile = setInterval(function() {
    watermapApp.downloadReportForm(watermapApp.dbIDs[watermapApp.loadFileCounter]); 
    watermapApp.loadFileCounter++;
    watermapApp.getBatchCounter++;  
    console.log(watermapApp.dbIDs[watermapApp.loadFileCounter]);

    if(watermapApp.dbIDs[watermapApp.loadFileCounter] === undefined) {
      clearInterval(watermapApp.getFile);
    }
  }, 1000);


};

watermapApp.trim = function(str){
  if(str !== undefined){
    str = str.replace(/^\s+/, '');
    for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return str;
    }
    else {
      return '';
  }
}

watermapApp.parseWaterRightsReportsXLS = function(){
  
  fs.readFileSync('./server_data/db_ids_' + watermapApp.XLSGroup + '.csv').toString().split('\n').forEach(function (line) { 
      var split_line = line.split(',');
      watermapApp.dbIDs.push(split_line[3]);
  });
  
  watermapApp.getFile = setInterval(function() {
    watermapApp.parseWaterRightReport(watermapApp.dbIDs[watermapApp.loadFileCounter]); 
    watermapApp.loadFileCounter++;
    watermapApp.getBatchCounter++;  
    console.log(watermapApp.dbIDs[watermapApp.loadFileCounter]);

    if(watermapApp.dbIDs[watermapApp.loadFileCounter] === undefined) {
      clearInterval(watermapApp.getFile);
    }
  }, 100);  

};


//15035 stopped at
watermapApp.parseWaterRightReport = function(db_id) {

    var filename = 'water_rights_reports_all/water_right-' + db_id +'.txt';
    var body = fs.readFileSync(filename,'utf8');


    jsdom.env({
      html: body,
      scripts: [
        'http://code.jquery.com/jquery-1.8.3.min.js'
      ],
    
      done: function (err, window) {
        var $ = window.jQuery;      
        var output = '';
        var testEmpty =  $('body #content form table tr td').html();
        if(testEmpty !== undefined){
        if(testEmpty.indexOf('No reports submitted') === -1){



     
          $('body #content form table tr').each(function(){
            outputTestEmpty = $(this).html();
  
            if(outputTestEmpty === "  <span id=\"none-submitted-message\">\n                  No reports submitted.\n                </span>\n"){
              output = '';
              return;
            }
            else {
              output += db_id + ",";
              output += $(this).find('td:first-child').html() + ",";
              output += $(this).find('td:nth-child(2)').html() + ",";
              output += $(this).find('td:last-child a').attr('href') + '\n';         
            }
  
          });
  
/*
          console.log('done ' + db_id);
          console.log(output);
*/

    
      
            fs.writeFile('reports_all/water_right_reports' + db_id + '.txt', output, function (err) {
              if (err) return console.log(err);
  
/*                 console.log("saved " + db_id); */
            });
        }
      }       
    }});
};
 
/* Scrape all pages to get the ID to get the download link to get the xls files*/
watermapApp.getXLSAllPages = function(){
  
  setInterval(function(){
    var i = watermapApp.current;
    var query = 'http://ciwqs.waterboards.ca.gov/ciwqs/ewrims/EWServlet?Page_From=EWWaterRightPublicSearch.jsp&Redirect_Page=EWWaterRightPublicSearchResults.jsp&Object_Expected=EwrimsSearchResult&Object_Created=EwrimsSearch&Object_Criteria=&Purpose=&appNumber=&watershed=&waterHolderName=&curPage=' + i + '&sortBy=APPLICATION_NUMBER&sortDir=ASC&pagination=true';
    
/*     console.log(query); */
    
    var j = request.jar();
    var cookie = request.cookie('JSESSIONID=c6e01ad5ec1922a1cc53d07a5d15e0b109d7383f430830012cd584e52f0e7622');
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
          var app_id = $(this).find('td:first-child a').html();
          if (app_id === undefined) {
            var app_id = $(this).find('td:first-child').html();
          }

          var link = $(this).find('td:last-child a').attr('href') + '\n';
/*           if(app_id !== undefined) { */
            output = output + app_id + " , " + link; 
/*           } */
        });
  
        console.log('done ' + i);
        fs.writeFile('files/water_right_' + i + '.txt', output, function (err) {
          if (err) return console.log(err);
            console.log("saved " + i);
  
            if(output === '') {
              watermapApp.current--;            
              console.log('empty, restarting ' + i);
            }
        });
       
    }});  
    
  });
    watermapApp.current++;
  }, 20000);

};

// Scrape all pages to get the ID to get the download link to get the xls files
watermapApp.getXLSByAppIDArray = function(){
/*   var max = 976; */ 
  setInterval(function(){
    var i = watermapApp.current;
    
    var query = 'http://ciwqs.waterboards.ca.gov/ciwqs/ewrims/EWServlet?Page_From=EWWaterRightPublicSearch.jsp&Redirect_Page=EWWaterRightPublicSearchResults.jsp&Object_Expected=EwrimsSearchResult&Object_Created=EwrimsSearch&Object_Criteria=&Purpose=&appNumber=' + app_id_array[i] + '&permitNumber=&licenseNumber=&watershed=&waterHolderName=&source=';
    
    console.log(query);
    
    var j = request.jar();
    var cookie = request.cookie('JSESSIONID=c795728324aa8f2db0d775555a94ed03ea53eea3bd96cfd78c6add9fd178ba78');
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
/*         console.log(body); */
        $('body table.dataentry tr').each(function(){
          var app_id = $(this).find('td:first-child a').html();
          if (app_id === undefined) {
            var app_id = $(this).find('td:first-child').html();
          }

          var link = $(this).find('td:last-child a').attr('href') + '\n';
/*           if(app_id !== undefined) { */
            output = output + app_id + " , " + link; 
/*           } */
        });
  
        console.log('done ' + i);
        fs.writeFile('files_extra/water_right_' + i + '.txt', output, function (err) {
          if (err) return console.log(err);
            console.log("saved " + i);
  
            if(output === '') {
              watermapApp.current--;            
              console.log('empty, restarting ' + i);
            }
        });
       
    }});  
    
    });
    watermapApp.current++;
  }, 10000);
};



watermapApp.loadWaterRightsReportsDownload = function() {
  // open csv file
  // read first line
  // split
  // take third value

  // @TODO may have limits on how many to do at once.
  // @TODO Also, it would take 11 days to download them all individually--- which is probably necessary because the 
  // XLS file is generated dynamically.
  // It's 30-seconds to download the data, and 1 minute to download the data from the DB server and the GIS server.
  // Would be nice if we could do it all in one swoop, and then get a list of updated and new records - especially because the records only change once a year it seems.
  // The GIS server might be able to tell us which records are new - if the Water Control Board is not able to help.

  fs.readFileSync('./server_data/allreports-txt-pre2008.csv').toString().split('\n').forEach(function (line) { 
      var split_line = line.split(',');
/*       console.log(split_line); */
      watermapApp.dbIDs.push(new Array(split_line[0],split_line[4],split_line[3]));
  });
/*   console.log(watermapApp.dbIDs); */


  // Do a query every 4 seconds -- should be about 8 concurrent queries.
  // Should do 100 in 6 minutes.
  watermapApp.getFile = setInterval(function() {
    watermapApp.downloadReport(watermapApp.dbIDs[watermapApp.loadFileCounter][0],watermapApp.dbIDs[watermapApp.loadFileCounter][1], watermapApp.dbIDs[watermapApp.loadFileCounter][2]); 
    


    
    watermapApp.loadFileCounter++;
    watermapApp.getBatchCounter++;  
    console.log(watermapApp.dbIDs[watermapApp.loadFileCounter][0] + " " + watermapApp.dbIDs[watermapApp.loadFileCounter][1]);

    if(watermapApp.dbIDs[watermapApp.loadFileCounter] === undefined) {
      clearInterval(watermapApp.getFile);
    }
  }, 2000);

};


/**
 * Download the XLS files for each EWRIMS database record.
 */
watermapApp.downloadWaterRightDBDataXLS = function() {
  // open csv file
  // read first line
  // split
  // take third value

  // @TODO may have limits on how many to do at once.
  // @TODO Also, it would take 11 days to download them all individually--- which is probably necessary because the 
  // XLS file is generated dynamically.
  // It's 30-seconds to download the data, and 1 minute to download the data from the DB server and the GIS server.
  // Would be nice if we could do it all in one swoop, and then get a list of updated and new records - especially because the records only change once a year it seems.
  // The GIS server might be able to tell us which records are new - if the Water Control Board is not able to help.

  fs.readFileSync('./server_data/last_batch_download_csv.csv').toString().split('\n').forEach(function (line) { 
      var split_line = line.split(',');
      watermapApp.dbIDs.push(split_line[2]);
  });


  // Do a query every 4 seconds -- should be about 8 concurrent queries.
  // Should do 100 in 6 minutes.
  watermapApp.getFile = setInterval(function() {
    watermapApp.downloadXLSFile(watermapApp.dbIDs[watermapApp.loadFileCounter]); 
    watermapApp.loadFileCounter++;
    watermapApp.getBatchCounter++;  
    console.log(watermapApp.dbIDs[watermapApp.loadFileCounter]);

    if(watermapApp.dbIDs[watermapApp.loadFileCounter] === undefined) {
      clearInterval(watermapApp.getFile);
    }
  }, 8000);

};

watermapApp.downloadReportForm = function(db_id) {
  console.log(db_id);

  // save xls file locally
  var filename = 'water_rights_reports_all/water_right-' + db_id +'.txt';  
  
  http.get({ 
    host: "ciwqs.waterboards.ca.gov", 
    path: "/ciwqs/ewrims/listReportsForWaterRight.do?waterRightId=" + db_id },
    function(res) {
      var stream = fs.createWriteStream(filename);
      res.pipe(stream);
  });
};

watermapApp.downloadReport = function(db_id,form_id,path) {

/*
  var baseURL = 'http://ciwqs.waterboards.ca.gov/ciwqs/ewrims_online_reporting/licensePrint.do?form_id=' + form_id;
  console.log(baseURL);
*/


  // save xls file locally
  var filename = 'water_rights_full_reports_all/water_right-' + db_id +'_' + form_id + '.txt';
  
  
if (fs.existsSync(filename)) {

}
else{
  console.log(form_id);
  console.log(path);
  http.get({ 
    host: "ciwqs.waterboards.ca.gov", 
    path: '/ciwqs/' + path },
    function(res) {
      var stream = fs.createWriteStream(filename);
      res.pipe(stream);
  });

}

   

};


watermapApp.downloadXLSFile = function(db_id) {
  console.log(db_id);
  var baseURL = 'http://ciwqs.waterboards.ca.gov/ciwqs/ewrims/EWServlet?Purpose=getFullReportExport&applicationID=' + db_id;
  console.log(baseURL);

  // save xls file locally
  var filename = 'water_rights_data/water_right-' + db_id +'.xls';  
  
  http.get({ 
    host: "ciwqs.waterboards.ca.gov", 
    path: "/ciwqs/ewrims/EWServlet?Purpose=getFullReportExport&applicationID=" + db_id },
    function(res) {
      var stream = fs.createWriteStream(filename);
      res.pipe(stream);
  });
};

watermapApp.getGISRightsObjectIDs = function() {
  var output = ''; 
  var value = watermapApp.GISGroup;

  var query = 'http://gispublic.waterboards.ca.gov/ArcGIS/rest/services/Water_Rights/Points_of_Diversion/MapServer/0/query?text=' + value + '&geometry=&geometryType=esriGeometryPoint&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&objectIds=&where=&time=&returnCountOnly=false&returnIdsOnly=true&returnGeometry=false&maxAllowableOffset=&outSR=&outFields=&f=pjson';
  
   // Load from stored JSON data.
    var filename = 'water_rights_object_ids_gis/water_rights_object_ids-' + value +'.json';
    var stream = fs.createWriteStream(filename);
    var body = fs.readFileSync(filename).pipe(stream);
};

/**
 * Load data from GIS server.
 */
watermapApp.getGISRights = function() {

  var output = ''; 
  var value = watermapApp.GISGroup;

/*


  // Load from Server
  var query = 'http://gispublic.waterboards.ca.gov/ArcGIS/rest/services/Water_Rights/Points_of_Diversion/MapServer/0/query?text=' + value + '&geometry=&geometryType=esriGeometryPoint&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&objectIds=&where=&time=&returnCountOnly=false&returnIdsOnly=false&returnGeometry=true&maxAllowableOffset=&outSR=&outFields=EWRIMS.Points_of_Diversion.POD_ID%2CEWRIMS.Points_of_Diversion.APPL_ID%2CEWRIMS.Points_of_Diversion.POD_NUM%2CEWRIMS.Points_of_Diversion.APPL_POD%2CEWRIMS.Points_of_Diversion.TOWNSHIP_NUMBER%2CEWRIMS.Points_of_Diversion.TOWNSHIP_DIRECTION%2CEWRIMS.Points_of_Diversion.RANGE_NUMBER%2CEWRIMS.Points_of_Diversion.RANGE_DIRECTION%2CEWRIMS.Points_of_Diversion.SECTION_NUMBER%2CEWRIMS.Points_of_Diversion.SECTION_CLASSIFIER%2C+EWRIMS.Points_of_Diversion.QUARTER%2CEWRIMS.Points_of_Diversion.QUARTER_QUARTER%2CEWRIMS.Points_of_Diversion.MERIDIAN%2CEWRIMS.Points_of_Diversion.NORTH_COORD%2CEWRIMS.Points_of_Diversion.EAST_COORD%2CEWRIMS.Points_of_Diversion.SP_ZONE%2CEWRIMS.Points_of_Diversion.LATITUDE%2CEWRIMS.Points_of_Diversion.LONGITUDE%2CEWRIMS.Points_of_Diversion.TRIB_DESC%2CEWRIMS.Points_of_Diversion.LOCATION_METHOD%2CEWRIMS.Points_of_Diversion.SOURCE_NAME%2CEWRIMS.Points_of_Diversion.MOVEABLE%2CEWRIMS.Points_of_Diversion.HAS_OPOD%2CEWRIMS.Points_of_Diversion.WATERSHED%2CEWRIMS.Points_of_Diversion.COUNTY%2CEWRIMS.Points_of_Diversion.WELL_NUMBER%2CEWRIMS.Points_of_Diversion.QUAD_MAP_NAME%2CEWRIMS.Points_of_Diversion.QUAD_MAP_NUM%2CEWRIMS.Points_of_Diversion.QUAD_MAP_MIN_SER%2CEWRIMS.Points_of_Diversion.PARCEL_NUMBER%2CEWRIMS.Points_of_Diversion.DIVERSION_SITE_NAME%2C+EWRIMS.Points_of_Diversion.LAST_UPDATE_DATE%2CEWRIMS.Points_of_Diversion.LAST_UPDATE_USER_ID%2CEWRIMS.Points_of_Diversion.SPECIAL_AREA%2C+GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.CORE_POD_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_WATER_RIGHT_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_NUMBER%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.APPL_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIRECT_DIV_AMOUNT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_STORAGE_AMOUNT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_AC_FT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.P_PLACE_ID%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_STATUS%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.FACE_VALUE_AMOUNT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_CODE_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_STATUS%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.STORAGE_TYPE%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_UNIT%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.FIRST_NAME%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.LAST_NAME%2CGIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.ENTITY_TYPE&f=pjson';
  
/*   console.log(query); */
/*  console.log(value);
  var stream = fs.createWriteStream(filename);
*/

    // Load from stored JSON data.
    var filename = 'water_rights_gis_data/water_right-' + value +'.json';
    var body = fs.readFileSync(filename);
    console.log(filename);
    // Read the response (JSON format)
    var obj = JSON.parse(body);
    console.log("Found JSON File with " + obj.features.length + " items.");
    // Queries can return multiple results.
/*     console.log(obj.features); */
    var interval = setInterval(function(){
    
      if(obj.features[watermapApp.GISLoadJSONCounter] !== undefined){
        var feature = obj.features[watermapApp.GISLoadJSONCounter].attributes;
  
        // See if result is in mongo database.
/*         console.log("test"); */
        console.log(feature['EWRIMS.Points_of_Diversion.APPL_POD']);
        
        console.log("app id" + feature['EWRIMS.Points_of_Diversion.APPL_POD']);
        
        var lookup =  { 
          $and: [{'kind': 'right'}, {'properties.application_pod': feature['EWRIMS.Points_of_Diversion.APPL_POD']}] 
        };
  
        var lookupAndSave = engine.find_many_by(lookup,function(error, results) {
          if(!results || error) {
            console.log("agent query error");
            res.send("[]");
            return;
          }
          // If the item does not exist in the database already save it.
          if(results.length == 0) {
            // Format the JSON data form server into GEOJson record.
  /*         console.log(feature);           */
  console.log("not found");
            var newFeature = watermapApp.formatEWRIMSforSaving(feature); 
/*             console.log(newFeature); */
            watermapApp.storeWaterRightFromEWRIMSDatabase(newFeature);
          }
          else {
  console.log("found");          
            var newFeature = watermapApp.formatEWRIMSforSaving(feature, results[0]);
            watermapApp.storeWaterRightFromEWRIMSDatabase(newFeature);
          }
          
        },{}, {'limit': 1});
/*         console.log(watermapApp.GISLoadJSONCounter); */
        watermapApp.GISLoadJSONCounter++;
      }

      if(watermapApp.GISLoadJSONCounter === obj.features.length) {
        clearInterval(interval);
      }
      }, 100);

// ).pipe(stream);
};


// cat all files, google refine
//skip #79

// @TODO STATUS 1/10/2012 -- stopped at 4422 db_id - downloading XLS
watermapApp.parseXLSWaterRights = function() {
/*   console.log(watermapApp.XLSGroup); */
  fs.readFileSync('./server_data/db_ids_' + watermapApp.XLSGroup + '.csv').toString().split('\n').forEach(function (line) { 
      var split_line = line.split(',');
      var db_id = split_line[2];
      watermapApp.dbIDs.push(db_id);

  });
  
  




  // Do a query every 4 seconds -- should be about 8 concurrent queries.
  // Should do 100 in 6 minutes.
  watermapApp.XLStoDB = setInterval(function() {
    watermapApp.loadXLSfile(watermapApp.dbIDs[watermapApp.loadFileCounter]);

    watermapApp.loadFileCounter++;
    watermapApp.getBatchCounter++;  
    console.log(watermapApp.dbIDs[watermapApp.loadFileCounter]);

    if(watermapApp.dbIDs[watermapApp.loadFileCounter] === undefined) {
      clearInterval(watermapApp.XLStoDB);
    }
  }, 1000);
  
};

/**
 * Read and parse each stored XLS file from the eWRIMS database.
 */
watermapApp.loadXLSfile = function(db_id){
  var obj = {};
/* console.log(db_id); */
  console.log(db_id);
  if(fs.existsSync('./water_rights_data/water_right-' + db_id + '.xls')){
    var currentFile = fs.readFileSync('./water_rights_data/water_right-' + db_id + '.xls').toString().split('\r').forEach(function (line) { 
      var split_line = line.split('\t');
      split_line.shift(); // pop off first empty value
      
      //var permits = {};
      
      if(split_line[0] == 'Use Code'){
        obj[split_line[0]] = watermapApp.trim(split_line[1]);      
      }
      else if(split_line[0] == 'Last Name'){
        if(split_line[2] !== undefined){
          obj[split_line[0]] = watermapApp.trim(split_line[1]) + " " + watermapApp.trim(split_line[2]);
        }
        else {
          obj[split_line[0]] = watermapApp.trim(split_line[1]);
        }
      }
      else {
        obj[split_line[0]] = watermapApp.trim(split_line[1]);
      }   
    });
  
    // The XLS file has an odd output from eWRIMS, so to extract the data we read each line and map fields to the fields we are storing in Mongo.
    // @NOTE Does not have geocoded data, that has to come from the GIS server.
    obj.ewrims_db_id = db_id;

/*   console.log(obj); */

    var formattedObj =  watermapApp.formatXLSforSaving(obj);
    console.log(formattedObj.id);
    watermapApp.storeWaterRightFromEWRIMSDatabase(formattedObj);
  }
};

/**
 * Find the water rights record in Mongo and update it. If it does not exist, create it.
 */ 
watermapApp.storeWaterRightFromEWRIMSDatabase = function(formattedObject){
 
  var feature = formattedObject;
  //  console.log("app" + feature['properties']['application_pod']);
  //  console.log("db" + feature['properties']['ewrims_db_id']);
    

    
    var query = [];
    /*

    if(feature['properties']['application_pod'] !== undefined){
      query.push({'properties.application_pod' : feature['properties']['application_pod']});
    }
*/
    if(feature['properties']['application_id'] !== undefined){
      query.push({'properties.application_id' : feature['properties']['application_id']});
    }

/*
    if(feature['properties']['reports'] !== undefined) {
      for(var r in feature['properties']['reports']) {
        if(r === 0) {
          if(feature['properties']['reports'][r]['ewrims_db_id'] !== undefined){
            query.push({'properties.ewrims_db_id' : feature['properties']['reports'][r]['ewrims_db_id']});  
          }
        }
      }
    }
*/
    
  console.log(query);

  // @TODO - storing in separate collection for testing purposes.
  var lookup =  { 
    $and: [{$or: query}]
  };

  console.log(lookup);
  engine.find_many_by(lookup,function(error, results) {
/*     console.log(results); */
    if(!results || error) {
      console.log("agent query error");
/*       results.send("[]"); */
      return;
    }

    // Create if record does not exist.
    if(results.length == 0) {
/*       console.log("empty"); */

      var newFeature = formattedObject;
  
      engine.save(newFeature,function(error,agent) {
        if(error) { res.send("Server agent storage error #5",404); return; }
        if(!agent) { res.send("Server agent storage error #6",404); return; }
      });
    }
    else {
     // console.log('exists, updating fields');
      // There may be multiple results for an application, store results to all PODs.

      for(i in results){
        // merge _id from existing record with new stuff.
        var original = results[i];
        var newFeature = feature;
  
        for (var value in newFeature) { 
  /*         console.log(value); */
  
          if(value === 'kind'){
  /*           console.log("found kind"); */
              original[value] = newFeature[value];
          } 
          if(value === 'type'){
  /*           console.log("found type"); */
              original[value] = newFeature[value];
          }   
          if(value === 'properties'){
  /*           console.log("found properties"); */
            for(var attribute in newFeature[value]) {
  /*             console.log(attribute); */
              
              
  /*
              if(attribute === "reports") {
                // reports has multiple elements.
  
                console.log('reports');
                console.log(attribute);
               
                if(original[value][attribute] !== undefined){
                  console.log(original[value][attribute]);
         
                  var originalArray = original[value][attribute];
                       
                  var arraysMerged = originalArray.concat(newFeature[value][attribute][0]);
                  original[value][attribute] = arraysMerged;
                }
                else {
                 //original[value][attribute] = new Array(newFeature[value][attribute][0]);
                }
          //      original[value][attribute] = newFeature[value][attribute];
  
              }
              else {
                original[value][attribute] = newFeature[value][attribute];
              }
  */
              
              original[value][attribute] = newFeature[value][attribute];
                
  /*
                  if(attribute === "reports") {
                  console.log( original[value][attribute]);
                  }
  */
            }
          }
          if(value === 'geometry'){
  /*           console.log("found geometry"); */
            if( original["geometry"] === undefined) {
              original["geometry"] = {};
              original["geometry"]["type"] = "Point";
              original["geometry"]["coordinates"] = [];
            }
            for(var attribute in newFeature[value]) {
  /*             console.log(attribute); */
              original[value][attribute] = newFeature[value][attribute];
            }
          }
  
          if(value === 'coordinates'){
  /*           console.log("found coordinates"); */
  /*           for(var attribute in newFeature[value]) { */
  /*             console.log(attribute); */
              original[value] = newFeature[value];
  /*           } */
          }
  
        }
        
       // console.log(feature);
  
        // Save the original version, to which has been added the new items from the feature.
        engine.save(original,function(error,agent) {
          if(error) { res.send("Server agent storage error #5",404); return; }
          if(!agent) { res.send("Server agent storage error #6",404); return; }
        }); 
      }   
    }
    
  },{}, {'limit': 1});
};

watermapApp.formatXLSforSaving = function(feature) {
/*   console.log(feature); */
  var feature = feature; // feature data
/*   console.log("saving"); */
  
/*   console.log(feature); */
  var obj = {}; // build new object
  
  obj.id = feature['Appl Pod'];
    
  obj.kind = "right";  
  obj.type = "Feature";   

  obj.properties = {
    "ewrims_db_id": feature.ewrims_db_id,
    "id" : feature['Appl Pod'],
    "kind" : "right",
    "source_alt": "http://ciwqs.waterboards.ca.gov/",
    "name" : feature['Primary Owner'],

    "application_id" : feature['Application ID'],
    "date_received": feature["Appliation Rec'd Date"],
    "date_accepted": feature['Application Acceptance Date'],
    "date_notice": feature['Notice Date'],
    "protest": feature['Protest'],
    "number_protests": feature['Number of Protests'],
    "agent_name": feature['Agent Name'],
    "agent_entity_type": feature['Agent Entity Type'],
    "primary_owner": feature['Primary Owner'],
    "primary_owner_entity_type": feature['Primary Owner Entity Type'],
    "water_right_type" : feature['Water Right Type'],
    "face_value_amount" : feature['Face Value Amount'],
    "face_value_units": feature['Face Value Units'],
/*     'Appl Fee Amount', */
/*     'Appl Fee Amt Recd', */
    "max_dd_appl": feature['Max DD Appl'],
    "max_dd_units": feature['Max DD Units'],
    "max_dd_ann": feature['Max DD Ann'],
    "max_storage": feature['Max Storage'],
    "max_use_appl": feature['Max Use Ann'],
    "year_first_use": feature['Year First Use'],
/*     'Billing Determination', */
/*     'Power Discount %', */
/*     'FERC #', */
/*     'FERC Facility', */
/*     'Initial 401 Certification Start', */
/*     'Initial 401 Certification End', */
/*     'Renewed 401 Certification Start', */
/*     'Renewed 401 Certification End', */
/*     'Kilowatts Face Plate', */
/*     'Name Type', */
    "effective_from_date": feature['Effective From Date'],
    "effective_to_date": feature['Effective To Date'],
/*     'Salutation', */
    "entity_type": feature['Entity Type'],
    "name_type": feature['Name Type'],
    "holder_name": feature['Last Name'],
/*     'Middle Name', */
    "first_name": feature['First Name'],
    "mailing_street_number": feature['Mailing Street Number'],
    "mailing_street_name": feature['Mailing Street Name'],
    "mailing_address_line2": feature['Mailing Address Line2'],
    "mailing_city": feature['Mailing City'],
    "mailing_state": feature['Mailing State'],
    "mailing_country": feature['Mailing Country'],
    "mailing_zipcode": feature['Mailing Zip'],
    "billing_street_number": feature['Billing Street Number'],
    "billing_street_name": feature['Billing Street Name'],
    "billing_city": feature['Billing City'],
    "billing_state": feature['Billing State'],
    "billing_country": feature['Billing Country'],
    "billing_zipcode": feature['Billing Zip'],
    "phone": feature['Phone'],
    "status": feature['Current Status'],
    "use_code": feature['Use Code'],
    "use_status_new": feature['Use Status (New) '],
    "use_population": feature['Use Population '],
    "use_net_acreage": feature['Use Net Acreage '],
    "use_gross_acreage": feature['Use Gross Acreage '],
    "use_dd_annual": feature['Use Direct Diversion Annual Amount (AFA)'],
    "use_dd_rate": feature['Use Direct Diversion Rate (New)'],
    "use_dd_rate_units": feature['Use Direct Diversion Rate Units'],
    "use_storage_amount": feature['Use Storage Amount (New) (AFA)'],
    "use_seasons": feature['Use Seasons'],
    "direct_div_season_begin_date": feature['Direct Div Season Begin Date'],
    "direct_div_season_end_date": feature['Direct Div Season End Date'],
    "direct_div_season_div_rate": feature['Season Direct Div Rate (New)'],
    "direct_div_season_div_rate_units": feature['Season Direct Div Rate Units'],
    "direct_div_season_annual_amount": feature['Season Direct Div Annual Amount (New) (AFA)'],
    "storage_season_begin_date": feature['Storage Season Begin Date'],
    "storage_season_end_date": feature['Storage Season End Date'],
    "storage_season_amount": feature['Season Storage Amount (AFA)'],

    
    "pod_unit": feature['POD Unit'],
    "pod_status": feature['POD Status'],
    "pod_id" : feature['POD Number'],    
    "direct_div_amount": feature['Direct Div Amount'],
    "diversion_acre_feet": feature['Direct Div Ac Ft'],
    "diversion_storage_amount": feature['Amount Storage'],
    "pod_max_dd": feature['POD Max Dd'],
    "source_max_dd_unit": feature['Source Max Dd Unit'],
    "pod_max_storage": feature['POD Max Storage'],
    "source_max_storage_unit": feature['Source Max Storage Unit'],
    "storage_type": feature['Storage Type'],
    "pod_gis_maintained_data": feature['POD GIS Maintained Data'],
    "appl_id": feature['Appl ID'],
    "water_right_id": feature['Object ID'],
    "pod_number": feature['POD Number'],
    "has_opod": feature['Has Opod'],
    "application_pod": feature['Appl Pod'],
    "podid": feature['podId'],
    "county": feature['County'],
    "parcel_number": feature['Parcel Number'],
    "sp_zone": feature['Sp Zone'],
    "northing": feature['North Coord'],
    "easting": feature['East Coord'],
    "quarter_quarter": feature['Quarter Quarter'],
    "quarter": feature['Quarter'],
    "section_classifier": feature['Section Classifier'],
    "section_number": feature['Section Number'],
    "township_number": feature['Township Number'],
    "township_direction": feature['Township Direction'],
    "range_number": feature['Range Number'],
    "range_direction": feature['Range Direction'],
    "meridian": feature['Meridian'],
    "location_method": feature['Location Method'],
    "source_name": feature['Source Name'],
    "trib_desc": feature['TribDesc'],
    "watershed": feature['Watershed'],
    "quad_map_name": feature['Quad Map Name'],
    "permit_id": feature['Permit ID'],
    "water_right_description": feature['Water Right Description'],
    "issue_date": feature['Issue Date'],
    "construction_completed_by": feature['Construction Completed by'],
    "planned_project_completion_date": feature['Planned Project Completion Date'],
    "permit_terms": feature['Permit Terms'],
    "term_id": feature['Term ID'],
    "version_number": feature['Version Number']


   // "diversion_type" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_TYPE'], 
   // "diversion_code_type": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.DIVERSION_CODE_TYPE'], 
   // "water_right_status" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.WR_STATUS'],
   // "storage_type": feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.STORAGE_TYPE'],
   // "organization_type" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.ENTITY_TYPE'],
   // "application_pod" : feature['EWRIMS.Points_of_Diversion.APPL_POD'],
   // "township_number" : feature['EWRIMS.Points_of_Diversion.TOWNSHIP_NUMBER'],
   // "range_direction" : feature['EWRIMS.Points_of_Diversion.RANGE_DIRECTION'],
   // "township_direction" : feature['EWRIMS.Points_of_Diversion.TOWNSHIP_DIRECTION'],
   // "range_number" : feature['EWRIMS.Points_of_Diversion.RANGE_NUMBER'],
  //  "section_number" : feature['EWRIMS.Points_of_Diversion.SECTION_NUMBER'],
  //  "latitude" : feature['EWRIMS.Points_of_Diversion.LATITUDE'],
  //  "longitude" : feature['EWRIMS.Points_of_Diversion.LONGITUDE'],
  //  "location_method" : feature['EWRIMS.Points_of_Diversion.LOCATION_METHOD'],
  //  "moveable" : feature['EWRIMS.Points_of_Diversion.MOVEABLE'],
  //  "well_number" : feature['EWRIMS.Points_of_Diversion.WELL_NUMBER'],
  //  "quad_map_name" : feature['EWRIMS.Points_of_Diversion.QUAD_MAP_NAME'],
  //  "quad_map_num" : feature['EWRIMS.Points_of_Diversion.QUAD_MAP_NUM'],
  //  "quad_map_min_ser" : feature['EWRIMS.Points_of_Diversion.QUAD_MAP_MIN_SER'],
  //  "special_area" : feature['EWRIMS.Points_of_Diversion.SPECIAL_AREA'],          
  //  "last_update_user_id" : feature['EWRIMS.Points_of_Diversion.LAST_UPDATE_USER_ID'],
  //  "date_last_updated" : feature['EWRIMS.Points_of_Diversion.LAST_UPDATE_DATE'],
  //  "status" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.POD_STATUS']
  };
  
/*
  
  if(results.kind === 'right') {
  
    var resaveObj = results;
    resaveObj.kind = "right";
    resaveObj.coordinates = obj.coordinates;
    resaveObj.geometry = obj.geometry;
    resaveObj.properties = obj.properties;
    obj = resaveObj;
    console.log("resaving");

  }
*/
/*     console.log(obj);   */
  return obj;
};

watermapApp.formatEWRIMSforSaving = function(feature, results) {

  var obj = {};
  
  obj.id = feature['EWRIMS.Points_of_Diversion.APPL_POD'];
  obj.kind = "right";  
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
    "id" : feature['EWRIMS.Points_of_Diversion.APPL_POD'],
    "kind" : "right",
    "source": "http://gispublic.waterboards.ca.gov/",
    "name" : feature['GIS2EWRIMS.MV_GIS_POD_ATTRIBUTES.LAST_NAME'],
    "pod_id" : feature['EWRIMS.Points_of_Diversion.POD_ID'],
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
  
  // If exists in the database, merge old fields with new.
  // @TODO This won't work, use the new treatment from the other function.
  if(results !== undefined){
    if(results.kind === 'right') {
    
      var resaveObj = results;
      resaveObj.kind = "right";
      resaveObj.coordinates = obj.coordinates;
      resaveObj.geometry = obj.geometry;
      resaveObj.properties = obj.properties;
      obj = resaveObj;
/*       console.log("resaving"); */
/*       console.log(obj.coordinates); */
    }
  }
  console.log(obj.id);
  return obj;
};


app.get('/usgs/load/today', function(req, res) {

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
            console.log(obj);
            engine.save(obj,function(error,agent) {
              if(error) { res.send("Server agent storage error #5",404); return; }
              if(!agent) { res.send("Server agent storage error #6",404); return; }
            });
         }
        });
    });



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

// Missing values -- in progress.
var app_id_array = [
/*'Z002641',
'Z002315',
'A004566',
'Z002641',
'A004343',
'Z001493',
'X000630',
'A006843',
'X000630',
'A004302',
'A006629',
'X000627',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'A006720',
'X000630',
'X000630',
'X000630',
'X000626',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'X000630',
'A006825',
'A005911',
'A005911',
'A005758',
'A005758',
'G332418',
'A031174',
'A004752',
'A031174',
'A031174',
'X002713',
'X002713',
'A006400',
'A031174',
'A031174',
'A031174',
'A031174',
'A031174',
'Z000886',
'A005762',
'A005762',
'A005762',
'A006209',
'X000873',
'A005731',
'G361811',
'A004223',
'A004223',
'A004727',
'A004729',
'A004739',
'A004745',
'A005722',
'A006706',
'A006294',
'X000697',
'A004252',
'A004641',
'A004277',
'A005966',
'A004330',
'A004949',
'X003582',
'A005732',
'A004950',
'A004204',
'A004323',
'A004254',
'G363791',
'A004335',
'A005966',
'A004965',
'A005728',
'A005554',
'A006778',
'A005965',
'A005965',
'A005135',
'A004654',
'A004253',
'Z000718',
'X002860',
'X002842',
'A004162',
'A004320',
'A005130',
'A004678',
'G560133L003',
'A005049',
'A006221',
'A005775',
'A006259',
'A006259',
'G560583',
'G560105',
'A006406',
'A004997',
'A006840',
'X003502',
'X003470',
'A006325',
'A004977',
'A005868',
'G560372',
'G560629',
'G560406',
'G560659',
'G560845',
'G560514',
'A005544',
'G560979',
'G560743',
'G560450',
'X003504',
'A006399',
'X003203',
'X003122',
'Z000941',
'Z000030',
'X003505',
'G560104',
'G560376',
'G560517',
'G561662',
'A004289',
'A005713',
'A005464',
'A004995',
'A005466',
'G561038',
'G561037',
'X003598',
'X003123',
'A004694',
'A004172',
'A004232',
'A004998',
'X003506',
'X003220',
'A005759',
'A005759',
'G561436',
'X002957',
'X002999',
'X002946',
'X002903',
'A005832',
'A005642',
'XC001721',
'X002957',
'X002957',
'X002946',
'X002946',
'A005918',
'A004556',
'Z000718',
'XC001140',
'X000139',
'A004285',
'X003121',
'XC001073',
'XC001689',
'X002957',
'XC001155',
'A004341',
'X002920',
'X002946',
'X002946',
'X002957',
'X002946',
'X002903',
'X003503',
'XC001690',
'XC001072',
'X002957',
'XC001688',
'A005641',
'X002915',
'X002957',
'X002946',
'X002903',
'X003316',
'X002996',
'X003356',
'A005838',
'XC001174',
'X002946',
'X002903',
'A004266',
'X003351',
'XC001728',
'XC001729',
'A005906B',
'A005966',
'XC002209',
'X000139',
'XC002208',
'A004246',
'X002981',
'A004194',
'X002903',
'XC002210',
'XC001253',
'XC001254',
'A006199',
'X003358',
'X003357',
'X003359',
'A004682',
'XC002539',
'X003354',
'X003353',
'X003352',
'A006725',
'A005066',
'X003350',
'A005641',
'XC002517',
'XC002516',
'XC002518',
'XC002511',
'XC002514',
'XC002520',
'XC002510',
'X003355',
'XC002524',
'XC002527',
'XC002529',
'A005642',
'XC002522',
'XC002523',
'XC002515',
'XC002526',
'XC002551',
'XC002521',
'XC002525',
'XC002512',
'X002946',
'X002903',
'XC002513',
'A004682',
'A005640',
'XC001743',
'A005640',
'A005640',
'A005640',
'A005640',
'A005640',
'A005640',
'X003053',
'A005640',
'A005640',
'A005640',
'A005541',
'A005640',
'A005640',
'XC001740',
'A005073',
'A005640',
'A005640',
'A005640',
'XC001247',
'A005640',
'A005874',
'A005848',
'A005070',
'A006632',
'A005640',
'A005640',
'A005640',
'XC001742',
'XC001744',
'A005640',
'X003305',
'A005640',
'XC001754',
'A005640',
'A005640',
'A006318',
'A006420',
'XC000513',
'X002868',
'A005031',
'A005640',
'A005640',
'A005639',
'X002750',
'X003275',
'X003275',
'X003275',
'A005640',
'A005640',
'X002862',
'A005126',
'A005903',
'A005640',
'A005640',
'X000121',
'X003556',
'A005640',
'A005640',
'A005640',
'A005640',
'X002862',
'X002862',
'A005640',
'A004703',
'X003438',
'A005640',
'A005640',
'A005640',
'A005640',
'X003175',
'X000121',
'A005640',
'XC000649',
'XC002519',
'XC002534',
'A005640',
'A005640',
'A005640',
'A004667',
'XC000651',
'A006296',
'A005907',
'A005907',
'X003251',
'A005720',
'A004667',
'A006813',
'A004233',
'A006250',
'A004698',
'A004548',
'A005724',
'A004549',
'A005724',
'A004233',
'A006250',
'A006250',
'A005386',
'A005044',
'A004607',
'A006729',
'A006276',
'A006711',
'A006242',
'A006393',
'X003147',
'XC000521',
'A006762',
'A004607',
'A005776',
'A005811',
'A004991',
'A004991',
'A005425',
'A004709',
'A006296',
'A004275',
'A004276',
'A006242',
'A005928',
'A006707',
'A004991',
'A004991',
'A005941',
'A006386',
'A006753',
'A004991',
'A006712',
'A006386',
'A006826',
'A005121',
'A004209',
'A005153A',
'A005153B',
'A005425',
'A005927',
'A005064',
'A005063',
'A004991',
'A004569',
'A004262',
'A006744',
'A006712',
'A004979',
'A005153A',
'A005120',
'A004568',
'A004568',
'A005068',
'A006397',
'A006397',
'A006264',
'A004341',
'A005047',
'A004274',
'X000254',
'A004635',
'A005047',
'A006748',
'XC001540',
'A004274',
'A004161',
'A006807',
'A004341',
'A005626',
'A005628',
'A005386',
'A004562',
'A004635',
'A004274',
'A004662',
'A005047',
'A004275',
'A005102',
'A004637',
'A005628',
'A005626',
'A005628',
'A004568',
'A031540',
'A031536',
'A031537',
'A031541',
'A031539',
'A005630',
'X003242',
'A004637',
'A004637',
'A005626',
'A004215',
'A005455',
'A005957',
'A005092',
'A006430A',
'A006315',
'A004218A',
'A004215',
'A005092',
'A006430A',
'A006782',
'A004218B',
'A005807',
'X003280',
'XC000942',
'A006738',
'A004228',
'A005128',
'A006738',
'A004237',
'A005092',
'S010479',
'A005648X07',
'S010503',
'A005050',
'S010495',
'S010494',
'A004743',
'X003606',
'X003171',
'A005645',
'S010496',
'S010494',
'A006262',
'X000269',
'X000269',
'A006377',
'S010478',
'S010497',
'S010478',
'X003567',
'A004612',
'A005463',
'A006410',
'A004351',
'A004351',
'S010505',
'S010508',
'S010507',
'S010507',
'A005645X07',
'S010506',
'S010499',
'A005645B',
'S010504',
'S010498',
'A006383',
'A005645B',
'A005645B',
'A005618',
'S010503',
'A005645',
'A005596',
'X003078',
'S010475',
'S010500',
'A006678',
'X003540',
'A005645',
'A005645',
'A004226',
'X002890',
'A005645X09',
'A005645B',
'S010502',
'A004351',
'S010501',
'A005645A',
'A005618',
'X002747',
'S010502',
'A004257',
'A005373',
'A005601',
'A004740',
'A005863',
'S010466',
'A004344',
'A005830',
'S010500',
'A006842',
'A005645B',
'A006801',
'A005644A',
'S010487',
'S010461',
'S010469',
'S010464',
'A005828',
'S010476',
'A006737',
'S010472',
'S010471',
'A004597B',
'A004597A',
'A004597C',
'A005618',
'A006730',
'S010474',
'A006263',
'A005413',
'A006414',
'S010460',
'A005645X07',
'X002820',
'A005535',
'S010481',
'S010470',
'A004351',
'S010475',
'S010477',
'S010467',
'S010488',
'S010470',
'A005645A',
'A004351',
'A005114',
'S010480',
'A006817',
'A004351',
'S010463',
'A005645',
'A004351',
'A005152',
'S010469',
'S010468',
'S010493',
'S010492',
'S010490',
'A006727',
'S010491',
'S010489',
'A004219',
'A004613',
'A004699',
'S010482',
'S010484',
'S010469',
'XC000732',
'A006418B',
'A006418A',
'S010474',
'A005806',*/
'A004308',
'S010459',
'A005618',
'S010486',
'S010483',
'A006679',
'A006627',
'A006388',
'XC002289',
'A004722',
'S010485',
'X003152',
'S010477',
'A006797',
'X003065',
'A005024',
'A005950',
'A006685',
'S010465',
'A005557',
'A005633',
'A005634',
'A005916',
'A005754',
'A004597',
'A006672',
'A006672',
'A006348',
'X003577',
'A004244',
'A005645',
'A006348',
'A005644',
'A005634',
'A005644',
'A005754',
'A006670',
'A005644A',
'A005644',
'A005114',
'A004355A',
'A004355',
'A006304',
'A005632A',
'A006726',
'A006726',
'Z005859',
'XC001845',
'A005632A',
'A005632',
'A006642',
'X003559',
'A005719',
'X002762',
'X003230',
'X003152',
'A005631',
'A006229',
'A006332',
'A005100',
'A006286',
'A006743',
'A004951',
'A004951',
'A005631',
'Z001986',
'Z003178',
'A005632',
'A005734',
'A004572',
'A005110',
'A005109',
'XC002472',
'A006743',
'A006743',
'X003131',
'A004310',
'X003574',
'X003538',
'A004309',
'A006412',
'A005004',
'A005632',
'A006200',
'A005630',
'A005629',
'A005630',
'A005629',
'XC001821',
'A004665',
'XC001768',
'A006834',
'X003283',
'A005590',
'Z002406',
'A005880',
'X003554',
'A006702',
'A004663',
'A005591',
'A005880',
'A006701',
'A005137',
'A005629',
'A006701',
'A006702',
'Z002406',
'A005631',
'A005631',
'A006702',
'A005629',
'A005629',
'A005630',
'A004959',
'A004664',
'A005880',
'X003283',
'A004731',
'A004281',
'A004234',
'A006241',
'A004261',
'X003400',
'X003498',
'A006241',
'A006241',
'A005015',
'A006241',
'A004989',
'A006241',
'A006723',
'A004717',
'A006241',
'X003448',
'A006728',
'A006241',
'XC002536',
'A006241',
'A006241',
'A005626',
'A006241',
'XC001755',
'A006788',
'A004616',
'A005504',
'A004234',
'A006241',
'A004598',
'XC000847',
'A006241',
'A006426',
'A006241',
'A004592',
'A005626',
'X003238',
'A006716',
'A005626',
'Z000916',
'A005890',
'X002873',
'A005154',
'A006287',
'A004251',
'A004959',
'A005909',
'Z000951',
'A005097',
'A005625',
'A005626',
'XC001470',
'XC001486',
'A006398',
'A005089',
'X003608',
'XC001515',
'A005643',
'A005018',
'A006832',
'XC001298',
'X002991',
'A005643',
'A005812',
'A006273',
'X003257',
'A006372',
'XC001327',
'XC001506',
'A005766',
'A004700',
'A005151',
'A005628',
'A005627',
'A005505',
'X002672',
'XC002091',
'XC002090',
'A005643',
'A004623',
'A004623',
'XC001657',
'XC001463',
'X003451',
'A005812',
'A004561',
'X002967',
'A004554',
'A005385',
'XC002206',
'XC002363',
'XC002362',
'A006766',
'A005643',
'A004213',
'A005804',
'XC002389',
'A005877',
'XC000863',
'XC002212',
'X003127',
'A006427',
'A005040',
'A005136',
'A005627',
'A005628',
'A005385',
'A006291',
'A006290',
'XC002211',
'A005643',
'A004307',
'A004566',
'X002996',
'X003275',
'A005705',
'A006334',
'S010508',
'S010462',
'A031693',
'A031693',
'NJ00001',
'NJ00001',
'XC001739',
'A006696',
'A005549',
'XC001484',
'A004743',
'XC002528',
'A005640',
'G560997',
'X003280',
'X002765',
'X003055',
'A006805A',
'G561061',
'A004959',
'S010495',
'X000630',
'A006250',
'G560241',
'A005840',
'A004637',
'A004991',
'S010473',
'NJ00006',
'S17275',
'A004951',
'A006701',
'NJ00009',
'A006284',
'A005364',
'X002946',
'A004634',
'XC001770',
'WW0055',
'NJ00005',
'X003220',
'G561836L003',
'A005398',
'A005047',
'A031538',
'X002982',
'UN00111',
'UN00111',
'31741',
'NJ00005',
'A005906A',
'A031686',
'NJ00010',
'A031693',
'NJ00008',
'NJ00008',
'26512B',
'A005644X02',
'A005644X02',
'D031830',
'A017238',
'A005644X02',
'A005644X02',
'A005644X02',
'D031876R',
'NJ00007',
'NJ00004',
'UN00103',
'UN00104',
'A005626',
'A005628',
'UN00102',
'UN00105',
'UN00106',
'UN00107',
'UN00106',
'UN00101',
'UN00108',
'UN00110',
'UN00114',
'UN00128',
'UN00129',
'UN00130',
'UN00131',
'UN00132',
'UN00134',
'UN00136',
'UN00137',
'UN00165',
'UN00169',
'UN00115',
'UN00116',
'NJ00014',
'UN00189',
'A006299',
'S0147900',
'UN00191',
'UN00112',
'NJ00012',
'NJ00013',
'L31823',
'UN00120',
'UN00121',
'UN00122',
'UN00122',
'UN00119',
'UN00124',
'UN00125',
'UN00126',
'UN00123',
'UN00127',
'UN00138',
'NJ00015',
'UN00169',
'L031893',
'UN00193',
'UN00194',
'A005630',
'L31823',
'UN00169',
'UN00158',
'UN00153',
'UN00143',
'UN00171',
'UN00172',
'UN001174',
'UN00175',
'UN00176',
'UN00177',
'A004991',
'APR',
'A004636',
'UN000192',
'UN000192',
'NJ00029',
'NJ00015',
'A005638',
'NJ00035',
'NJ00015',
'NJ00015',
'NJ00015',
'NJ00015',
'NJ00015',
'NJ00015',
'NJ00015',
'NJ00015',
'NJ00015',
'NJ00015',
'UN00139',
'UN00140',
'UN00141',
'UN00142',
'UN00144',
'NJ00017',
'UN00164',
'UN00163',
'UN00162',
'UN00179',
'UN00180',
'XC002213',
'NJ00016',
'A004275',
'A004568',
'A006684',
'1',
'UN00145',
'UN00146',
'UN00122',
'UN00122',
'UN00122',
'UN00122',
'UN00122',
'UN00118',
'UN00157',
'UN00150',
'UN00151',
'UN00149',
'UN00160',
'UN00161',
'UN00155',
'UN00156',
'UN00159',
'UN00148',
'UN00147',
'UN00152',
'NJ00020',
'UN00181',
'UN00182',
'UN00183',
'A004991',
'XC001681',
'A005726',
'G3638111',
'UN00227',
'A005092',
'A006316',
'UN00192',
'UN00195',
'UN00196',
'UN00196',
'UN00197',
'UN00198',
'NJ00024',
'NJ00025',
'NJ00026',
'UN00173',
'UN0225',
'UN00133',
'NJ18',
'NJ18',
'NJ19',
'UN00168',
'UN00185',
'UN00186',
'UN00187',
'UN00188',
'UN00240',
'UN00240',
'UN00238',
'D031926R',
'D031927R',
'NJ00047',
'UN00241',
'NJ00056',
'UN00242',
'NJ00057',
'NJ00058',
'NJ00059',
'NJ00062',
'NJ00065',
'NJ00064',
'NJ00052',
'NJ00069',
'NJ00069',
'NJ00069',
'NJ00069',
'UN000221',
'UN000221',
'UN000221',
'UN00171',
'NJ00043',
'NJ00048',
'NJ00051',
'UN00252',
'UN00251',
'UN00253',
'UN000237',
'UN000255',
'UN00239',
'UN00233',
'UN00234',
'G1933590',
'UN00217',
'NJ00054',
'A005142',
'A004351',
'NJ00045',
'UN000231',
'UN000231',
'UN000210',
'UN000254',
'UN000315',
'NJ00066',
'UN00243',
'UN00244',
'UN00245',
'UN00235',
'UN00232',
'NJ00068',
'UN000302',
'UN00246'
];
