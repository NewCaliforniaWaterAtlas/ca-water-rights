var mm = com.modestmaps;
var map = map || {};
var markers = 0;
var map_features = {};

var counter = 0;
var date_start = new Date();
var dragtime = date_start.getTime();
var dragtime_diff = null;
var wait = null;

water.default_lat = 39.65850816;
water.default_lon = -121.3551829;
water.default_boxsize = 0.1;
water.default_zoom = 9;

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
  //var layer = new MM.StamenTileLayer("terrain");

  // @TODO need new maps.
  
  // If we cannot load the map for some reason then just use a default image

/*
  if (layer === undefined) {
      var layer = new MM.Layer(new MM.MapProvider(function(coord) {
      var img = parseInt(coord.zoom) +'-r'+ parseInt(coord.row) +'-c'+ parseInt(coord.column) + '.jpg';
      return 'http://osm-bayarea.s3.amazonaws.com/' + img;
    }));
  }
*/

  var template = 'http://tile.openstreetmap.org/{Z}/{X}/{Y}.png';
  var layer = new MM.TemplatedLayer(template);

  water.map = map = new MM.Map("map-container", layer);

/*
  // nearby water rights
  if (navigator.geolocation){
    // listen to updates if any
    navigator.geolocation.watchPosition( function(position) {
        water.gps = position;
        water.gps_lat = water.gps.coords.latitude;
        water.gps_lon = water.gps.coords.longitude;
        water.setMapCenterZoom(water.gps.coords.latitude, water.gps.coords.longitude, 8, map);

    });
  } else {
    // try get away with only setting map once
    // @TODO set to state capital, sacramento
    map.setMapCenterZoom(new MM.Location(39.65850816,-121.3551829), 8);
  }
*/
  

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
  

  var zoomer = wax.mm.zoomer(map)
  zoomer.appendTo('map-container');

  markers = new MM.MarkerLayer();
  map.addLayer(markers);
  markers.parent.setAttribute("id", "markers");

  //http://www.mongodb.org/display/DOCS/Geospatial+Indexing
  var lat = water.default_lat;
  var lon = water.default_lon;
  var boxsize = water.default_boxsize;
  var zoom = water.default_zoom;
  map.setCenterZoom(new MM.Location(water.default_lat,water.default_lon), zoom);

  // Load data via mongo bounding box search. Run paintMarkers callback.
  Core.query({ 
   $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize)},{$where: "this.properties.latitude > " + (lat - boxsize)},{$where: "this.properties.longitude < " + (lon + boxsize)},{$where: "this.properties.longitude > " + (lon - boxsize)}
] 
  }, water.paintRightsMarkers); 
  
  // Load data via static json file.
  //Core.query2("/data/water_rights_merged_butte_geojson.json",water.paintRightsMarkers);
};


water.triggerMapMoveTimeout = function() {
  return setTimeout(water.loadPannedMarkers, 1000);
}

water.loadPannedMarkers = function() {
  var center = map.getCenter();
  console.log(center.lat);


  var lat = center.lat;
  var lon = center.lon;
 
  var boxsize = water.default_boxsize;

  Core.query({ $and: [{'kind': 'right'}, {$where: "this.properties.latitude < " + (lat + boxsize)},{$where: "this.properties.latitude > " + (lat - boxsize)},{$where: "this.properties.longitude < " + (lon + boxsize)},{$where: "this.properties.longitude > " + (lon - boxsize)}] 
}, water.paintRightsMarkers); 

};

water.makeRightsMarker = function(feature) {

  var id = feature.properties.id;
  var marker = document.createElement("div");
 console.log(feature);
  var water_string = '';
  water_string += "<h4>" 
    + "Owner: " + feature.properties.holder_name + "<br />"
    + "Type: " + feature.properties.organization_type + "<br />"
    + "Source: " + feature.properties.source_name + "<br />"
    + "Watershed: " + feature.properties.watershed + "<br />"
    + "Right Type: " + feature.properties.water_right_type + "<br />"
    + "Right Status: " + feature.properties.status + "<br />"
    + "Diversion: " + feature.properties.diversion + feature.properties.diversion_units + "<br />"
    + "Storage: " + feature.properties.diversion_storage_amount + "<br />"
    + "</h4>";
  
  marker.feature = feature;
  markers.addMarker(marker, feature);

  // Unique hash marker id for link
  marker.setAttribute("id", "marker-" + id);
  marker.setAttribute("dataName", feature.properties.name);
  marker.setAttribute("class", "marker");
      
  //@TODO this is probably wrong
  // marker.setAttribute("href", vars.callbackPath + id);

  // Specially set value for loading data.
  marker.setAttribute("marker_id", id);

  // create an image icon
  var img = marker.appendChild(document.createElement("img"));

  if(feature.art) {
    img.setAttribute("src", feature.art );
  } else {
    img.setAttribute("src", "/images/icons/water_right_icon.png");
  }

  
  // Tooltips
  $("#marker-" + id + " img").qtip({
  	content: {
      text: water_string,
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


water.paintRightsMarkers = function(features) {
  // Redraw marker layer if there are features.
  if(features.length > 0) {
    $('.marker').remove();
    markers = new MM.MarkerLayer();
    map.addLayer(markers);
    markers.parent.setAttribute("id", "markers");
  }
  
  console.log(features);
  
  features = features;
  var len = features.length; 
  console.log("water::paintTreeMarkers showing markers " + len );
  
  
  for (var i = 0; i < len; i++) {
    var feature = features[i];
    water.makeRightsMarker(feature);
  }
  
  var locations = map.getExtent(); // returns an array of Locations
  var loc = map.getCenter() // returns a single Location
  var zoomLevel = map.getZoom();
};

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

water.repaint = function(agents) {
  if(!map) return;
  console.log("water:: repainting anything on map and pruning non visible items from map");
  for(var key in agents) {
    water.repaint_agent(agents[key]);
  }
}

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

