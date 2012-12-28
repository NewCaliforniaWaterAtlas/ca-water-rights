var mm = com.modestmaps;
var map = map || {};

var map_features = {};

var counter = 0;
var date_start = new Date();
var dragtime = date_start.getTime();
var dragtime_diff = null;
var wait = null;

water.markers = 0;
water.markers_station = 0;
water.markers_rights = 0;

water.default_lat = 38.52;
water.default_lon = -121.50;
water.default_boxsize_lat = 0.15;
water.default_boxsize_lon = 0.3;
water.default_zoom = 11;

water.setCenterZoom = function(lat,lon,zoom) {
  if(!map) return;
  if(map.setCenterZoom === undefined) {} else map.setCenterZoom(new MM.Location(lat,lon),zoom);
};

water.setMapCenterZoom = function(lat,lon,zoom, map) {

  var map = map;
  var zoom = zoom;
  var lat = lat;
  var lon = lon;
  if(!map) return;
  if(map.setCenterZoom === undefined) {} else map.setCenterZoom(new MM.Location(lat,lon),zoom);
};

water.setupMap = function() {
  var url = 'http://a.tiles.mapbox.com/v3/chachasikes.map-tv2igp9l.jsonp';

  wax.tilejson(url, function(tilejson) {
  water.map = map = new MM.Map("map-container",
    new wax.mm.connector(tilejson));
  
    var zoom = water.default_zoom;
  
    var lat = water.default_lat;
    var lon = water.default_lon;
    var boxsize_lat = water.default_boxsize_lat;
    var boxsize_lon = water.default_boxsize_lon;
    // Nearby
  /*
    if (navigator.geolocation){
      // listen to updates if any
      navigator.geolocation.watchPosition( function(position) {
          water.gps = position;
          lat = water.gps_lat = water.gps.coords.latitude;
          lon = water.gps_lon = water.gps.coords.longitude;
          water.setMapCenterZoom(water.gps.coords.latitude, water.gps.coords.longitude, zoom, map);
      });
  */
      // try get away with only setting map once
      // @TODO set to state capital, sacramento
      
      map.setCenterZoom(new MM.Location(water.default_lat,water.default_lon), zoom);
  
  
    //http://www.mongodb.org/display/DOCS/Geospatial+Indexing
    // Load data via mongo bounding box search. Run paintMarkers callback.
    Core.query({ 
     $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
  ] 
    }, water.paintRightsMarkers, {'limit': 300}); 
  
    Core.query({ 
     $and: [{'kind': 'station'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
  ] 
    }, water.paintStationMarkers); 
  
    Core.query({ 
     $and: [{'kind': 'station_usgs'}, {$where: "this.properties.dec_lat_va < " + (lat + boxsize_lat)},{$where: "this.properties.dec_lat_va > " + (lat - boxsize_lat)},{$where: "this.properties.dec_long_va < " + (lon + boxsize_lon)},{$where: "this.properties.dec_long_va > " + (lon - boxsize_lon)}
  ] 
    }, water.paintStationUSGSMarkers); 
  
    var zoomer = wax.mm.zoomer(map)
    zoomer.appendTo('map-container');
  
  /*
    // Put all markers on the same layer.
    if($('div#markers').length === 0) {
      markers = new MM.MarkerLayer();
      map.addLayer(markers);
      markers.parent.setAttribute("id", "markers");
    }
  */
    
    var boxsize_lat = water.default_boxsize_lat;
    var boxsize_lon = water.default_boxsize_lon;
    
    // Load data via static json file.
    //Core.query2("/data/water_rights_merged_butte_geojson.json",water.paintRightsMarkers);
  
  
    // On map move events we want to requery the database to fetch features that the map is now over
    map.addCallback('panned', function(m) {
/*       var zoomLevel = map.getZoom(); */
/*       if(zoomLevel > 10) { */
        var dragtime_old = dragtime;
        var d = new Date();
        dragtime = d.getTime();
        var dragtime_diff = dragtime - dragtime_old;
        
        if(dragtime_diff < 500) {
          counter++;
          console.log("moving " + counter + " " + dragtime_diff);
          if (wait === null) {
            wait = water.triggerMapMoveTimeout();
          }
        }
        else {
          clearTimeout(wait);
          wait = null;
        }
/*      }

      else {
        // Hide markers -- load canvas layers
        $('.marker').remove();
        
      }
*/
    }
);
  
  });
};

water.triggerMapMoveTimeout = function() {
  return setTimeout(water.loadPannedMarkers, 1000);
}

water.loadPannedMarkers = function() {
  var center = map.getCenter();
  var lat = center.lat;
  var lon = center.lon;
 
  var boxsize_lat = water.default_boxsize_lat;
  var boxsize_lon = water.default_boxsize_lon;
    
  water.markers = 0;

  // Redraw this type of marker in layer if there are features.
  $('.marker').remove();


  // Search for database objects and add markers to map.
  
  

  
  Core.query({ $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}] 
}, water.paintRightsMarkers); 

  Core.query({ 
   $and: [{'kind': 'station'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
] 
  }, water.paintStationMarkers); 

  Core.query({ 
   $and: [{'kind': 'station_usgs'}, {$where: "this.properties.dec_lat_va < " + (lat + boxsize_lat)},{$where: "this.properties.dec_lat_va > " + (lat - boxsize_lat)},{$where: "this.properties.dec_long_va < " + (lon + boxsize_lon)},{$where: "this.properties.dec_long_va > " + (lon - boxsize_lon)}
] 
  }, water.paintStationUSGSMarkers); 

};


water.paintRightsMarkers = function(features) {

  var featureDetails = {
    name: "rights",
    icon: "/images/icons/water_right_icon.png",
    layer: "markers_rights"
  };
  
  water.paintMarkers(features, featureDetails);
  
  $(".alert .content").html("Showing " + features.length + " of 43,000+ water rights.");  
};


water.paintStationMarkers = function(features) {

  var featureDetails = {
    name: "station",
    icon: "/images/icons/station_icon.png",
    layer: "markers_station"
  };
  
  water.paintMarkers(features, featureDetails);
};

water.paintStationUSGSMarkers = function(features) {

  var featureDetails = {
    name: "station_usgs",
    icon: "/images/icons/usgs_icon.png",
    layer: "markers_station_usgs"
  };
  
  water.paintMarkers(features, featureDetails);
};

water.paintMarkers = function(features, featureDetails) {

  // Put all markers on the same layer.
  if(water.markers === 0) {
  water.markers /* = water[featureDetails.layer] */ = new MM.MarkerLayer();
  map.addLayer(water.markers);
  water.markers.parent.setAttribute("id", "markers");
/*   water.markers.parent.setAttribute("class", featureDetails.layer); */
  }
  
  features = features;
  var len = features.length; 
  console.log("water::paintMarkers " + featureDetails.name + " showing markers " + len + " layer:" + featureDetails.layer);
  
  
  for (var i = 0; i < len; i++) {
    var feature = features[i];
    water.makeMarker(feature, featureDetails);
  }
  
  var locations = map.getExtent(); // returns an array of Locations
  var loc = map.getCenter() // returns a single Location
  var zoomLevel = map.getZoom();
  
  /*   $(".alert").alert('close'); */
};


water.makeMarker = function(feature, featureDetails) {

  var id = feature.properties.id;
  var marker = document.createElement("div");
  var featureDetails = featureDetails;

  marker.feature = feature;
  water.markers.addMarker(marker, feature);

  // Unique hash marker id for link
  marker.setAttribute("id", "marker-" + id);
  marker.setAttribute("dataName", feature.properties.name);
  marker.setAttribute("class", "marker " + featureDetails.name);

  // Specially set value for loading data.
  marker.setAttribute("marker_id", id);

  // create an image icon
  var img = marker.appendChild(document.createElement("img"));

  if(feature.art) {
    img.setAttribute("src", feature.art );
  } else {
    img.setAttribute("src", featureDetails.icon);
  }
  
  var string = '';
  if (feature.properties.holder_name !== undefined) {
    string +=  
      "<p>" + "Owner: " + feature.properties.holder_name + "</p>"
    + "<p>" + "Type: " + feature.properties.organization_type + "</p>"
    + "<p>" + "Source: " + feature.properties.source_name + "</p>"
    + "<p>" + "Watershed: " + feature.properties.watershed + "</p>"
    + "<p>" + "County: " + feature.properties.county + "</p>"
    + "<p>" + "Right Type: " + feature.properties.water_right_type + "</p>"
    + "<p>" + "Right Status: " + feature.properties.status + "</p>"
    + "<p>" + "Diversion: " + feature.properties.diversion + feature.properties.diversion_units + "</p>"
    + "<p>" + "Storage: " + feature.properties.diversion_storage_amount + "</p>";
  }

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
    + "<p>" + "Real Time Data: <a href=\"http://cdec.water.ca.gov/" + feature.properties.query + "\" target=\"_blank\"> data</a></p>"
  }

  if (feature.properties.agency_cd !== undefined) {
    string +=  
      "<p>" + "Station Name: " + feature.properties.station_nm + "</p>"
    + "<p>" + "Station ID: " + feature.properties.site_no + "</p>"
    + "<p>" + "Site Type: " + feature.properties.site_tp_cd + "</p>"
    + "<p>" + "Station ID: " + feature.properties.map_nm + "</p>"
    + "<p>" + "Basin Code: " + feature.properties.basin_cd + "</p>"
    + "<p>" + "Instruments Code: " + feature.properties.instruments_cd + "</p>"
    + "<p>" + "RealTime JSON Data: <div url=\"http://waterservices.usgs.gov/nwis/iv/?format=json&sites=" + feature.properties.site_no + "\"  class=\"load-data\">data</div></p>"
/*     http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060,00065&sites=01646500 */
  }  
  
  // Tooltips
  $("#marker-" + id + " img").qtip({
  	content: {
      text: string,
  	},
  	show: {
  		solo: true,
  		when: { event: 'unfocus' }
  	},
  	hide: {
  		delay: 5000,
  		when: { event: 'unfocus' }
  	},
  	position: {
  		my: 'middle left', 
  		at: 'bottom middle',
  		adjust: {
  			x: 20,
  			y: -10
  		}
  	},
  	style: { 
  		tip: true,
  		classes: 'ui-tooltip-dark'
  	},
  	tip: {}
  });

  $('a[title]').qtip();
  
  // Listen for mouseover & mouseout events.
  MM.addEvent(marker, "mouseover", water.onMarkerOver);
  MM.addEvent(marker, "mouseout", water.onMarkerOut);
  MM.addEvent(marker, "click", water.onMarkerClick);
};

water.getMarker = function(marker) {
  while (marker && marker.className != "marker") {
    marker = marker.parentNode;
  }
  return marker;
};

water.onMarkerOver = function(e) {
  var marker = water.getMarker(e.target);
  if (marker) {
    var marker_id = $(this).attr('marker_id');
    var layer = $(marker).attr("parent");
    // $('div.marker').css({ 'opacity' : 0.4 }); 
    // make something pretty now!


    // Load data via ajax button
    $(this).find('.load-data').bind('click', function(){
  /*     var url = $(this).attr('url'); */
  /*     console.log(url); */
      console.log($(this));
      console.log("test");
    });
  }
};

water.onMarkerOut = function(e) {
  var marker = water.getMarker(e.target);
  var layer = $(marker).attr("parent");
  if (marker) {
    // var type = marker.type; 
    // $('div.marker').css({ 'opacity' : 1 }); 
  }
  return false;
};

water.onMarkerClick = function(e) {
  var marker = e.target.offsetParent;
  // water.popupMarker(marker);
  var marker = water.getMarker(e.target);
  if (marker) {
    $('div#panel-container div#panel .content').show();
    console.log(marker);
    // make something pretty
  }
  return false;
};
