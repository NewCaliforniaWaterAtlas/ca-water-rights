$('#amount a').click(function(){
 fdTableSort.jsWrapper('tally', [1]);
});

$('#holder a').click(function(){
 fdTableSort.jsWrapper('tally', [0]);
});

$('#data-panel').css('visibility','visible');
  
$('.water-right').bind('click',function() {

  var id = $(this).attr('data');
  //console.log(id);
  loadDataPanel(id);
});




// @TODO this is really messy -- we will want to reuse the functions from the main file, but it needs to be reorganized and getting this prototype out the door for basic feedback.


loadDataPanel = function(id){
  //console.log(id);
   Core.query({query: 
     {'id': trim(id) }, options: {'limit': 0}}
    , loadDataPanelData);
};

loadDataPanelData = function(results){
  if(results !== undefined){
    if(results[0] !== undefined){
      if(results[0]['kind'] === "right"){    
        var content = formatWaterRightTooltip(results[0]);
/*         water.navigationHidePanels(); */
/*         water.displayPanelContainer($('#data-panel')); */
/*         water.displayPanel($('#rights-panel')); */
        $('#rights-panel').html(content);
      }
    }
  }
};

trim = function(str){
    str = str.replace(/^\s+/, '');
    for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return str;
};


formatWaterRightTooltip = function(feature) {
  var output = '';
  if(feature.properties.name) { var name = feature.properties.name } else{ name = '';}
  var diversion = getDiversion(feature);
  var id = feature.properties.application_pod;
  var status = feature.properties.status;
  var primary_owner = '';
  if (feature.properties.first_name) {primary_owner += feature.properties.first_name + " ";}
  if(feature.properties.holder_name) {primary_owner += feature.properties.holder_name;}

  if(feature.properties['percentile'] !== undefined){
    var color = water.setSensorColor(parseFloat(feature.properties['% normal(mean)'].replace('%','')));
    var color_name = water.setSensorColor(parseFloat(feature.properties['% normal(mean)'].replace('%','')), true);
  }
    
  output = '<div class="data-boxes">' +           
                      '<div class="data-box">' +
                      '<div class="data-title">' +
                      '<h4 class="title">' + name + '</h4>' +
                        '<div class="diversion"><span class="diversion-amount">' 
                        + diversion.amount + '</span><span class="diversion-unit">' + diversion.units 
                        + '</span></div></div>' +
                      
                        '<ul class="data-list">' +

/*                           '<li>Pod Status: ' + status + '</li>' + */
                          '<li>Primary Owner: ' + primary_owner + '</li>' +
                          '<li>Primary Entity Type: ' + feature.properties.organization_type + '</li>' +

                          '<li>Water Right Status: ' + status + '</li>' +
                          '<li>Application ID: ' + id + '</li>' +
                          '<li>POD ID: ' + feature.properties.pod_id + '</li>' +
                          '<li>Registration Status: ' + feature.properties.status + '</li>' +
                          '<li>Date Water Right Application Received: ' + feature.properties.date_received + '</li>' +
                          '<li>Date Water Right Issued: ' + feature.properties.issue_date + '</li>' +
                        '</ul>' +
                      '</div>' +

                      '<div class="data-box">' +
                        '<h4>Location</h4>' +
                        '<ul class="data-list">' +
                          '<li>Source Name: ' + feature.properties.source_name + '</li>' +
                          '<li>Watershed: ' + feature.properties.watershed + '</li>' +
                          '<li>County: ' + feature.properties.county + '</li>' +
                          '<li>Quadrant: ' + feature.properties.quad_map_name + '</li>' +
                        '</ul>' +
                      '</div>' +


                      '<div class="data-box">' +
                        '<h4>Water Diversion</h4>' +
                        '<ul class="data-list">' +
                          '<li>Diversion Type: ' + feature.properties.diversion_type + '</li>' +
                          '<li>Direct Diversion: ' + diversion.amount + ' ' + diversion.units + '</li>' +
                          '<li>Storage: </li>' +
                          '<li>Used Under: </li>' +
                          '<li>Has Other: </li>' +
                        '</ul>' +
                      '</div>' +

                      '<div class="data-box">' +
                        '<h4>Usage</h4>' +
                        '<ul class="data-list">' +
                          '<li>Use Code: ' + feature.properties.use_code + '</li>' +
                          '<li>Water Right Type: ' + feature.properties.water_right_type + '</li>' +
                        '</ul>' +
                      '</div>';

                     


      var string = '';
        string += '<div class="data-box">' +
                        '<h4>Reports</h4>';

      if(feature.properties.reports !== undefined) {
        //console.log(feature.properties.reports);
                        
        var properties = feature.properties;
        for(var year in feature.properties.reports){
          var report = feature.properties.reports[year];
          if(report !== undefined){                
            if(report.usage !== undefined){
             if (report.usage instanceof Array) {
                for(var i in report['usage']) {                
                  string += "<p>Year: " + year + '<br />' + " Usage:" + report['usage'][i] + '<br />' + '  Details: ' + report['usage_quantity'][i] + '<br />';
                  string += "</p>";
                }
             }
             else{
                string +=  "<p>Year: " + year + '<br />' + "Usage:" + report['usage'] + '<br />' + '  Details: ' + report['usage_quantity'] + '<br />';
                string += "</p>";
             }
            } 
          }
        }

      }
      else {
      string += "<p>No reports available. The reports were either not submitted, have not been digitized.</p>";
      }
      string += "</div>";



                      output += string;

                      output += '<div class="data-box">' +
                          '<h4>About this Data</h4>' +
                          '<p>Data re-published from the Department of Water Resources eWRIMS and ARCGIS servers. If this information is erroneous, please check the eWRIMS database and if the error persists, please contact their department.</p>' +
                        '<ul class="data-list">' +
                          '<li>Data Source: ' + feature.properties.source + ' <a href="' + feature.properties.source + '" target="_blank">Link</a></li>' +
                        
                      '</div>' +

                  '</div>';
  
  return output;


}

getDiversion = function(feature){
  var diversion = {};
  diversion.amount = '';
  diversion.units = '';

  if((feature.properties.diversion_acre_feet !== undefined) && (feature.properties.diversion_acre_feet > 0)) {
    diversion.amount = feature.properties.diversion_acre_feet;
    diversion.units = " acre-ft year";
  }
  else if((feature.properties.face_value_amount !== undefined) && (feature.properties.face_value_amount > 0)) {
    diversion.amount = feature.properties.face_value_amount;
    diversion.units = feature.properties.face_value_units;
  }
  if((feature.properties.direct_div_amount !== undefined) && (feature.properties.direct_div_amount > 0)) {
    diversion.amount = feature.properties.direct_div_amount;
    diversion.units = feature.properties.pod_unit;
  }
  if((feature.properties.diversion_storage_amount !== undefined) && (feature.properties.diversion_storage_amount > 0)) {
    diversion.amount = feature.properties.diversion_storage_amount;
    diversion.units = " acre-ft year stored";
  }

  //diversion.amount = diversion.amount.toFixed(2);

  return diversion;
};




