// Set up water map.
water.map = water.map || {};

// Set up map defaults.
water.map_defaults = {};
water.map_defaults.lat = 38.52;
water.map_defaults.lon = -121.50;
water.map_defaults.boxsize_lat = 0.05; //pretty small box
water.map_defaults.boxsize_lon = 0.1;
water.map_defaults.zoom = 6;
water.map_defaults.satellite_layer = 'chachasikes.map-oguxg9bo';
water.map_defaults.terrain_layer = 'chachasikes.map-tv2igp9l';

water.map_defaults.zoomed_out_marker_layer = 'chachasikes.WaterTransfer-Markers';
water.map_defaults.div_container = 'map-container';
water.map_defaults.close_up_zoom_level = 11;
water.map_defaults.lowest_tilemill_marker_level = 12;

// Establish empty container for loaded marker features data.
water.markerLayer = 0;
water.markers_station_usgs = 0;
water.markers_station_cdec = 0;
water.markers_rights = 0;
water.markers_search = 0;

// Set up map interaction variables.
water.map_interaction = {};
water.map_interaction.map_features = {};
water.map_interaction.counter = 0;
water.map_interaction.date_start = new Date();
water.map_interaction.dragtime = water.map_interaction.date_start.getTime();
water.map_interaction.dragtime_diff = null;
water.map_interaction.dragtime_override = false;
water.map_interaction.wait = null;


water.setupMap = function() {
  // Create map.
  water.map = mapbox.map(water.map_defaults.div_container);
  // Add satellite layer.
  water.map.addLayer(mapbox.layer().id(water.map_defaults.satellite_layer));
  // Load interactive water rights mapbox layer (has transparent background. Rendered in Tilemill with 45K+ datapoints)        
/*
  mapbox.load(water.map_defaults.zoomed_out_marker_layer, function(interactive){
      water.map.addLayer(interactive.layer);
      water.map.interaction.auto(); 
  });
*/

  // Add map interface elements.
  water.map.ui.zoomer.add();
  
  water.map.setZoomRange(6, 17);  // 17 is the lowest level of satellite layer.
/*// @TODO see if we can change the increment of the zoomer.
  // This doesn't seem to work though. Maybe make new zoomer? Maybe override easey?
  // Needs more research.
  $('.zoomin').click(function(){ water.map.zoomBy(4)});
  $('.zoomout').click(function(){ water.map.zoomBy(4)});

  http://mapbox.com/mapbox.js/example/easing/
      document.getElementById('zoom').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            // The second argument, if true, tells the map to
            // animate the transition to zoom level 12. The
            // same can be done with map.center and map.centerzoom
            map.zoom(12, true);
        };
*/

  // Attribute map.
  water.map.ui.attribution.add()
    .content('<a href="http://mapbox.com/about/maps">Terms &amp; Feedback</a>');

  // Load default centered map.
  water.centerMap();
  
  // Load special data layers for more zoomed in levels.
  water.loadMarkers();
  
  $(".alert .content").html("Showing all 45K+ water rights.");
  water.zoomWayInButton();

};

// Utility function to recenter (and maybe also to reset / reload the map)
water.centerMap = function() {
  // default values will not load here.
  water.map.centerzoom({ lat: 38.52, lon: -121.50 }, 6);
};


water.loadMarkers = function() {
  
  var zoom = water.map.zoom();
  
  if(zoom >= water.map_defaults.close_up_zoom_level) {
    water.markersQuery(false);
  }
  
  water.map.addCallback('zoomed', function(m) {
    var zoom = water.map.zoom();
    
    if(zoom >= water.map_defaults.close_up_zoom_level) {
      $('.zoom-level').html("Move map to load more information.");
    
      console.log('zoomed in');
    
      water.map.addCallback('panned', water.markersPanned);
      // @TODO Add alert to pan to load more up to date info
      
      if(zoom == water.map_defaults.close_up_zoom_level) {
        console.log('dispatching');
        //@TODO not working yet...
        water.triggerMarkers();
      }
      
      // Hide the marker tiles layer because they will not display properly.
      if(zoom >= water.map_defaults.lowest_tilemill_marker_level) {
        console.log('marker last level');
        water.map.removeLayer(water.map_defaults.zoomed_out_marker_layer);
      }
      else {
        if(water.map.getLayer(water.map_defaults.zoomed_out_marker_layer) === undefined) {
          mapbox.load(water.map_defaults.zoomed_out_marker_layer, function(interactive){
            water.map.addLayer(interactive.layer);
            water.map.interaction.auto(); 
          });
        }
      }
      
    }
    else {
      console.log('zoomed out - removing pan');
      water.map.removeCallback('panned', water.markersPanned);
      water.zoomWayInButton();
    }
    
/*     $('.zoom-level').html(water.map.zoom()); */
  });
};

water.zoomWayInButton = function () {
  $('.zoom-level').html("<span class=\"zoom-way-in\">Zoom</span> in for more detailed information.");
  $('.zoom-way-in').click(function(){
    water.map.zoom(water.map_defaults.close_up_zoom_level);
  });

  $('.zoom-way-in').bind("touchstart", function(){
    water.map.zoom(water.map_defaults.close_up_zoom_level);
  });
  
  
}

water.triggerMarkers = function () {
  water.map_interaction.dragtime_override = true;
  water.map.dispatchCallback('panned');
};

water.markersPanned = function() {
  console.log('zoomed in and panned');
  
  var zoom = water.map.zoom();
  if(zoom >= water.map_defaults.close_up_zoom_level) {
    console.log('sufficient zoom');
    
    var dragtime_old = water.map_interaction.dragtime;
    var d = new Date();
    water.map_interaction.dragtime = d.getTime();
    var dragtime_diff = water.map_interaction.dragtime - dragtime_old;
    
    if(dragtime_diff < 500 || water.map_interaction.dragtime_override === true) {
      console.log('in if');
      water.map_interaction.counter++;
      // console.log("moving " + water.map_interaction.counter + " " + dragtime_diff);
      if (water.map_interaction.wait === null) {
        water.map_interaction.wait = water.triggerMapMoveTimeout();
      }
      water.map_interaction.dragtime_override = false;
    }
    else {
      console.log('in else');
      clearTimeout(water.map_interaction.wait);
      water.map_interaction.wait = null;
      water.map_interaction.dragtime_override = false;
    }
  }
};

water.clearMarkerLayers = function() {
  water.map.removeLayer(water.markerLayer);
  water.map.removeLayer(water.markers_station_usgs);
  water.map.removeLayer(water.markers_station_cdec);
  water.map.removeLayer(water.markers_rights);
  water.map.removeLayer(water.markers_search);
  water.markerLayer = 0;
  water.markers_station_usgs = 0;
  water.markers_station_cdec = 0;
  water.markers_rights = 0;
  water.markers_search = 0;
};

// Search Mongo Database for data. Build interactive markers.
water.markersQuery = function(reloaded) {
  if(reloaded === true || reloaded === undefined) {
    var center = water.map.center();
    var lat = center.lat;
    var lon = center.lon;    

    $('.iphone-debug').html("lat: " + lat + " lon: " + lon + "<br />");

    // Clear out old layer data.
    water.clearMarkerLayers();
  }
  else {
    var lat = water.map_defaults.lat;
    var lon = water.map_defaults.lon;
  }
  var boxsize_lat = water.map_defaults.boxsize_lat;
  var boxsize_lon = water.map_defaults.boxsize_lon;
  var zoom = water.map_defaults.zoom;

 // This is where real-time water rights data would go.
 Core.query({ 
     $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
  ] 
    }, water.drawRightsMarkers, {'limit': 0}); 
  
  // Load CDEC staons.
  Core.query({ 
     $and: [{'kind': 'station'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
  ] 
    }, water.drawStationCDECMarkers); 
  
  // Load USGS stations
  Core.query({ 
     $and: [{'kind': 'station_usgs'}, {'properties.data_type': 'discharge'},  {$where: "this.properties.dec_lat_va < " + (lat + boxsize_lat)},{$where: "this.properties.dec_lat_va > " + (lat - boxsize_lat)},{$where: "this.properties.dec_long_va < " + (lon + boxsize_lon)},{$where: "this.properties.dec_long_va > " + (lon - boxsize_lon)}
  ] 
    }, water.drawStationUSGSMarkers); 
};

// Draw interactive markers.
water.drawMarkers = function(features, featureDetails) {
  var features = features;
  
  // Allow layer to be reset and also to add a series of sets of features into the layer (for interaction purposes.)
  if(water[featureDetails.layer] === 0) {
    water[featureDetails.layer] = mapbox.markers.layer();
    // @TODO This doesn't work on the div, just the object, but it would be nice to name the layers.
    water[featureDetails.layer].named(featureDetails.layer);
  
    water[featureDetails.layer + "_interaction"] = mapbox.markers.interaction(water[featureDetails.layer]);

    water.map.addLayer(water[featureDetails.layer]);
    
    // Generate marker layers.
    water[featureDetails.layer].features(features).factory(function(f) {
        var marker = water.makeMarker(f, featureDetails);
        return marker;      
    });

    water[featureDetails.layer + "_interaction"].formatter(function(feature) {
      var o = water.formatTooltipStrings(feature);
      return o;
    });
  }
  
  water.map.addCallback('drawn', function() {
    // .markers() gives a list of markers, along with their elements attached.
    var markers = water[featureDetails.layer].markers(),
        // construct an empty list to fill with onscreen markers
        inextent = [],
        // get the map extent - the top-left and bottom-right locations
        extent = water.map.extent()

    // for each marker, consider whether it is currently visible by comparing
    // with the current map extent
    for (var i = 0; i < markers.length; i++) {
      if (extent.containsLocation(markers[i].location)) {
          inextent.push(markers[i].data.properties.holder_name);
      }
    }

    // display a list of markers.
    if(inextent.length > 0) {
      $('#map-panel .list-content').html('<h3>Water Rights</h3>' + inextent.join('<br />'));
    }
    else {
      $('#map-panel .list-content').html();
    }
    $('.map-tooltip').close();
    
  });
  
};

water.drawRightsMarkers = function(features) {
  $('.iphone-debug').html($('.iphone-debug').html() + "<br />drawRightsMarkers<br />");
  // right now we aren't using layer, but maybe we would.
  var featureDetails = {
    name: "rights",
    icon: "/images/icons/water_right_icon.png",
    layer: "markers_rights"
  };
  
  water.drawMarkers(features, featureDetails);
  
  $(".alert .content").html("Showing " + features.length + " of 43,000+ water rights.");  
};

water.drawSearchRightsMarkers = function(features) {
  water.clearMarkerLayers();

  // right now we aren't using layer, but maybe we would.
  var featureDetails = {
    name: "rights",
    icon: "/images/icons/search_icon.png",
    layer: "markers_rights"
  };
  
  water.drawMarkers(features, featureDetails);
  
  $(".alert .content").html("Found " + features.length + " of 43,000+ water rights.");  
};

water.drawStationCDECMarkers = function(features) {
  
  var featureDetails = {
    name: "station",
    icon: "/images/icons/icon_orange.png",
    layer: "markers_station_cdec"
  };
  
  water.drawMarkers(features, featureDetails);
};

water.drawStationUSGSMarkers = function(features) {

  var featureDetails = {
    name: "station_usgs",
    icon: "/images/icons/icon_brown.png",
    layer: "markers_station_usgs"
  };
  
  water.drawMarkers(features, featureDetails);
};

water.makeMarker = function(feature, featureDetails) {

  var img = document.createElement('img');
  img.className = 'marker-image';
  img.setAttribute('src', featureDetails.icon);
  img.feature = feature;
  return img;
};

water.formatTooltipStrings = function(feature) {
    console.log(feature);

    var string = '';
    if (feature.properties.holder_name !== undefined) {
      string +=  
        "<h4>Water Right</h4>" +
        "<p>" + "Name: ";
          if(feature.properties.holder) string += feature.properties.holder;
          else string += feature.properties.primary_owner
        string += "</p>"
      + "<p>" + "Entity Type: " +  feature.properties.entity_type + "</p>"  
      + "<p>" + "Organization Type: " +  feature.properties.organization_type + "</p>"        
      + "<p>" + "Water Right Status: " +  feature.properties.water_right_status + "</p>"    
        
      + "<p>" + "Since: ";
          if(feature.properties.date_received) string += feature.date_received;
          else string += feature.properties.date_accepted    
        string += "</p>"
      + "<p>" + "Effective from: " +  feature.properties.effective_from_date + "</p>"        
      + "<p>" + "Year First Use" +  feature.properties.year_first_use + "</p>"
      
      + "<p>" + "Type of Water Right: " +  feature.properties.water_right_type + "</p>"
      + "<p>" + "Use: " +  feature.properties.use_code + "</p>"
      + "<p>" + "Recent Usage: " +  feature.properties.usage + "</p>"
      + "<p>" + "Usage Detail: " +  feature.properties.usage_quantity + "</p>"
      
      + "<p>" + "Direct Diversion Amount: " +  feature.properties.direct_div_amount + "</p>"
      + "<p>" + "Diversion Storage: " +  feature.properties.diversion_storage_amount + "</p>"
      + "<p>" + "Face Amount: " +  feature.properties.face_value_amount + " " + feature.properties.face_value_units + "</p>"
/*       + "<p>" + "face_value_units: " +   + "</p>" */

      
/*       + "<p>" + "use_status_new: " +  feature.properties.use_status_new + "</p>" */
      + "<p>" + "Use Population: " +  feature.properties.use_population + "</p>"
      + "<p>" + "Use Net Acreage: " +  feature.properties.use_net_acreage + "</p>"
      + "<p>" + "Use Gross Acreage: " +  feature.properties.use_gross_acreage + "</p>"
      + "<p>" + "Use DD Annual: " +  feature.properties.use_dd_annual + "</p>"
      + "<p>" + "Use DD Rate: " +  feature.properties.use_dd_rate + " " + feature.properties.use_dd_rate_units + "</p>"
      + "<p>" + "Use Storage Amount: " +  feature.properties.use_storage_amount + "</p>"

      + "<p>" + "Max Direct Diversion Appl(?)" +  feature.properties.max_dd_appl + " " + feature.properties.max_dd_units + "</p>"

      + "<p>" + "Max Direct Diversion Annual" +  feature.properties.max_dd_ann + "</p>"
      + "<p>" + "Max Storage" +  feature.properties.max_storage + "</p>"
      + "<p>" + "Max Use Appl" +  feature.properties.max_use_app + "</p>"


      + "<h4>Watershed</h4>"
      + "<p>" + "Source: " +  feature.properties.source_name + "</p>"    
      + "<p>" + "Watershed: " +  feature.properties.watershed + "</p>"    
      + "<p>" + "City: " +  feature.properties.city + "</p>"
      + "<p>" + "County: " +  feature.properties.county + "</p>"
      
      + "<h4>Extra Stuff</h4>"
      + "<p>" + "pod_id: " +  feature.properties.pod_id + "</p>"
      + "<p>" + "application_pod: " +  feature.properties.application_pod + "</p>"
      + "<p>" + "water_right_id: " +  feature.properties.water_right_id + "</p>"
      + "<p>" + "Source: " +  feature.properties.source + "</p>"

/*
      + "<p>" + "pod_number" +  feature.properties.source + "</p>";
      + "<p>" + "application_id" +  feature.properties.source + "</p>";

      + "<p>" + "diversion_acre_feet" +  feature.properties.source + "</p>";
      + "<p>" + "pod_status" +  feature.properties.source + "</p>";

      + "<p>" + "diversion_type" +  feature.properties.source + "</p>";
      + "<p>" + "source_alt" +  feature.properties.source + "</p>";




+ "<p>" + "date_accepted" +  feature.properties.source + "</p>";
+ "<p>" + "date_notice" +  feature.properties.source + "</p>";
+ "<p>" + "protest" +  feature.properties.source + "</p>";
+ "<p>" + "number_protests" +  feature.properties.source + "</p>";
+ "<p>" + "agent_name" +  feature.properties.source + "</p>";
+ "<p>" + "agent_entity_type" +  feature.properties.source + "</p>";
+ "<p>" + "primary_owner" +  feature.properties.source + "</p>";
+ "<p>" + "primary_owner_entity_type" +  feature.properties.source + "</p>";

+ "<p>" + "face_value_amount" +  feature.properties.source + "</p>";




+ "<p>" + "effective_from_date" +  feature.properties.source + "</p>";
+ "<p>" + "effective_to_date" +  feature.properties.source + "</p>";

+ "<p>" + "entity_type" +  feature.properties.source + "</p>";
+ "<p>" + "holder_name" +  feature.properties.source + "</p>";

+ "<p>" + "first_name" +  feature.properties.source + "</p>";

+ "<p>" + "city" +  feature.properties.source + "</p>";
+ "<p>" + "state" +  feature.properties.source + "</p>";
+ "<p>" + "zipcode" +  feature.properties.source + "</p>";
+ "<p>" + "phone" +  feature.properties.source + "</p>";
+ "<p>" + "status" +  feature.properties.source + "</p>";


+ "<p>" + "pod_unit": feature['POD Unit'],
+ "<p>" + "pod_status": feature['POD Status'],
+ "<p>" + "pod_id" : feature['POD Number'],    
+ "<p>" + "direct_div_amount": feature['Direct Div Amount'],
+ "<p>" + "diversion_acre_feet": feature['Direct Div Ac Ft'],
+ "<p>" + "diversion_storage_amount": feature['Amount Storage'],
+ "<p>" + "pod_max_dd": feature['POD Max Dd'],
+ "<p>" + "source_max_dd_unit": feature['Source Max Dd Unit'],
+ "<p>" + "pod_max_storage": feature['POD Max Storage'],
+ "<p>" + "source_max_storage_unit": feature['Source Max Storage Unit'],
+ "<p>" + "storage_type": feature['Storage Type'],
+ "<p>" + "pod_gis_maintained_data": feature['POD GIS Maintained Data'],
+ "<p>" + "appl_id": feature['Appl ID'],
+ "<p>" + "water_right_id": feature['Object ID'],
+ "<p>" + "pod_number": feature['POD Number'],
+ "<p>" + "has_opod": feature['Has Opod'],
+ "<p>" + "appl_pod": feature['Appl Pod'],
+ "<p>" + "podid": feature['podId'],
+ "<p>" + "county": feature['County'],





+ "<p>" + "source_name": feature['Source Name'],
+ "<p>" + "trib_desc": feature['TribDesc'],
+ "<p>" + "watershed": feature['Watershed'],

+ "<p>" + "permit_id": feature['Permit ID'],
+ "<p>" + "water_right_description": feature['Water Right Description'],
+ "<p>" + "issue_date": feature['Issue Date'],
+ "<p>" + "construction_completed_by": feature['Construction Completed by'],
+ "<p>" + "planned_project_completion_date": feature['Planned Project Completion Date'],
+ "<p>" + "permit_terms": feature['Permit Terms'],

+ "<p>" + "diversion_code_type" : "Diversion point",
+ "<p>" + "water_right_type" : "Stockpond",
+ "<p>" + "water_right_status" : "Certified",
+ "<p>" + "storage_type" : "Point of Diversion",
+ "<p>" + "pod_unit" : "Gallons per Day",
+ "<p>" + "first_name" : null,
+ "<p>" + "holder_name" : "MONTGOMERY-GILL RANCH COMPANY",
+ "<p>" + "organization_type" : "Corporation",
+ "<p>" + "application_pod" : "C001471_01",

+ "<p>" + "latitude" : 36.08197336,
+ "<p>" + "longitude" : -118.824282,
+ "<p>" + "trib_desc" : null,
+ "<p>" + "location_method" : "DD_NE",
+ "<p>" + "source_name" : "UNST",
+ "<p>" + "moveable" : "N",
+ "<p>" + "has_opod" : "N",
+ "<p>" + "watershed" : "SOUTHERN SIERRA",
+ "<p>" + "county" : "Tulare",
+ "<p>" + "well_number" : "   ",
+ "<p>" + "quad_map_name" : "GLOBE",
+ "<p>" + "quad_map_num" : "LL073 ",
+ "<p>" + "quad_map_min_ser" : "7.5",
+ "<p>" + "parcel_number" : null,
+ "<p>" + "special_area" : null,
+ "<p>" + "last_update_user_id" : 9,
+ "<p>" + "date_last_updated" : 1191046436000,
+ "<p>" + "status" : "Active"
*/




    }
  
       console.log(feature.properties.station_code);

    if (feature.properties.station_code !== undefined) {
      string +=  
        "<p>" + "Station Code: " + feature.properties.station_code + "</p>"
      + "<p>" + "Station Name: " + feature.properties.station_name + "</p>"
      + "<p>" + "Station Data Type: " + feature.properties.station_type + "</p>"
      + "<p>" + "Altitude: " + feature.properties.altitude + "</p>"
      + "<p>" + "County: " + feature.properties.county + "</p>"
      + "<p>" + "River Basin: " + feature.properties.river_basin + "</p>"
      + "<p>" + "Sensors: " + feature.properties.sensors + "</p>"
      + "<p>" + "Flow Data: " + feature.properties.flow_data + "</p>"
      + "<p>" + "Data Source: " + feature.properties.data_source + "</p>"
      + "<p>" + "Real Time Data: <a href=\"http://cdec.water.ca.gov/" + feature.properties.query + "\" target=\"_blank\"> data</a></p>" +
      + "<p>" + "URL Preview: http://cdec.water.ca.gov/" + feature.properties.query + "</p>";
    }

    if (feature.properties.agency_cd !== undefined) {
      string +=  
        "<p>" + "Station Name: " + feature.properties.station_nm + "</p>"
      + "<p>" + "Station ID: " + feature.properties.site_no + "</p>"
      + "<p>" + "Site Type: " + feature.properties.site_tp_cd + "</p>"
      + "<p>" + "Station ID: " + feature.properties.map_nm + "</p>"
      + "<p>" + "Basin Code: " + feature.properties.basin_cd + "</p>"
      + "<p>" + "Instruments Code: " + feature.properties.instruments_cd + "</p>"
      + "<p>" + "RealTime JSON Data: <div url=\"http://waterservices.usgs.gov/nwis/iv/?format=json&sites=" + feature.properties.site_no + "\"  class=\"load-data\">data</div></p>" +
      + "<p>" + "URL Preview: http://waterservices.usgs.gov/nwis/iv/?format=json&sites=" + feature.properties.site_no + "</p>";

  /*     http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060,00065&sites=01646500 */
    }  
    return string;
};

water.triggerMapMoveTimeout = function() {
  return setTimeout(water.markersQuery, 1000);
};
