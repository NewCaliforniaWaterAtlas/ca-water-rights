var mm = com.modestmaps;
var map = map || {};
var markers = 0;
var map_features = {};

var counter = 0;
var date_start = new Date();
var dragtime = date_start.getTime();
var dragtime_diff = null;
var wait = null;

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

  //http://www.mongodb.org/display/DOCS/Geospatial+Indexing
  // Load data via mongo bounding box search. Run paintMarkers callback.
  Core.query({ 
   $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
] 
  }, water.paintRightsMarkers); 

    });
  } else {
*/
    // try get away with only setting map once
    // @TODO set to state capital, sacramento
    map.setCenterZoom(new MM.Location(water.default_lat,water.default_lon), zoom);


  //http://www.mongodb.org/display/DOCS/Geospatial+Indexing
  // Load data via mongo bounding box search. Run paintMarkers callback.
  Core.query({ 
   $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
] 
  }, water.paintRightsMarkers); 
/*   } */

  Core.query({ 
   $and: [{'kind': 'station'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}
] 
  }, water.paintStationMarkers); 

  var zoomer = wax.mm.zoomer(map)
  zoomer.appendTo('map-container');

  markers = new MM.MarkerLayer();
  map.addLayer(markers);
  markers.parent.setAttribute("id", "markers");
  
  var boxsize_lat = water.default_boxsize_lat;
  var boxsize_lon = water.default_boxsize_lon;
  
  // Load data via static json file.
  //Core.query2("/data/water_rights_merged_butte_geojson.json",water.paintRightsMarkers);


  // On map move events we want to requery the database to fetch features that the map is now over
  map.addCallback('panned', function(m) {
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
  });

  wax.mm.interaction()
    .map(map)
    .tilejson(tilejson)
    .on(wax.tooltip().animate(true).parent(map.parent).events());
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
  
    
  Core.query({ $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}] 
}, water.paintRightsMarkers); 

  Core.query({ $and: [{'kind': 's'}, {$where: "this.properties.latitude < " + (lat + boxsize_lat)},{$where: "this.properties.latitude > " + (lat - boxsize_lat)},{$where: "this.properties.longitude < " + (lon + boxsize_lon)},{$where: "this.properties.longitude > " + (lon - boxsize_lon)}] 
}, water.paintStationMarkers); 

};





water.paintRightsMarkers = function(features) {

  var featureDetails = {
    name: "rights",
    icon: "/images/icons/water_right_icon.png",
  };
  
  water.paintMarkers(features, featureDetails);
  
  $(".alert .content").html("Showing " + features.length + " of 43,000+ water rights.");  
};


water.paintStationMarkers = function(features) {

  var featureDetails = {
    name: "station",
    icon: "/images/icons/station_icon.png",
  };
  
  water.paintMarkers(features, featureDetails);
};

water.paintMarkers = function(features, featureDetails) {


  // Redraw this type of marker in layer if there are features.
  if(features.length > 0) {
    $('.marker.' + featureDetails.name).remove();
    
    // Put all markers on the same layer.
    if($('div#markers').length === 0) {
      markers = new MM.MarkerLayer();
      map.addLayer(markers);
      markers.parent.setAttribute("id", "markers");
    }
  }
  
  features = features;
  var len = features.length; 
  console.log("water::paintMarkers " + featureDetails.name + " showing markers " + len );
  
  
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
/*   var string = featureDetails.string; */

  marker.feature = feature;
  markers.addMarker(marker, feature);

  // Unique hash marker id for link
  marker.setAttribute("id", "marker-" + id);
  marker.setAttribute("dataName", feature.properties.name);
  marker.setAttribute("class", "marker " + featureDetails.name);

        
  //@TODO this is probably wrong
  // marker.setAttribute("href", vars.callbackPath + id);

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
  		delay: 100,
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



/*
water.repaint_agent = function(agent) {

  // ignore elements that do not have an id
  var id = agent._id;
  // if(!id) continue;

  // ignore agents that are on map already
  // later we want to carefully prune them off if off screen @TODO
  // if(map_features[id]) continue;

  // ignore features with no location
  // @TODO later carefully remove features without location if had location before 
  var lat = agent.lat;
  var lon = agent.lon;
  // if(!lat || !lon) continue;
 
  var title = agent.title;
  if(!title) title = "Water Right";

  var art = agent.art;
  if(!art) art = "/images/icons/water_rights_icon.png";

  // console.log("repainting agent " + id + " " + lat + " " + lon + " " + title );

  var feature = {
    "id":id,
    "type":"Feature",
    "art":art,
    "geometry": { "type":"Point", "coordinates": [lon,lat] },
    "properties": {
      "longitude" : lat,
      "latitude" : lon,
      "title" : title,
      "id" :  "102"
    }
  };

  map_features[id] = feature;
  water.makeRightsMarker(feature);
}
*/

/*
water.repaint = function(agents) {
  if(!map) return;
  console.log("water:: repainting anything on map and pruning non visible items from map");
  for(var key in agents) {
    water.repaint_agent(agents[key]);
  }
}
*/

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

