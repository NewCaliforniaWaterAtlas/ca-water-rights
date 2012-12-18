var mm = com.modestmaps;
var map = map || {};
var markers = 0;
var map_features = {};

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
  // var layer = new MM.StamenTileLayer("watercolor");
  
  // If we cannot load the map for some reason then just use a default image

  if (layer === undefined) {
      var layer = new MM.Layer(new MM.MapProvider(function(coord) {
      var img = parseInt(coord.zoom) +'-r'+ parseInt(coord.row) +'-c'+ parseInt(coord.column) + '.jpg';
      return 'http://osm-bayarea.s3.amazonaws.com/' + img;
    }));
  }

  water.map = map = new MM.Map("map-container", layer);

/*
  if (navigator.geolocation){
    // listen to updates if any
    navigator.geolocation.watchPosition( function(position) {

      water.gps = position;

        water.gps_lat = water.gps.coords.latitude;
        water.gps_lon = water.gps.coords.longitude;
        water.setMapCenterZoom(water.gps.coords.latitude, water.gps.coords.longitude, 14, map);

    });
  } else {
    // try get away with only setting map once
    map.setMapCenterZoom(new MM.Location(37.7900,-122.1697), 12);
  }
*/
  

  // On map move events we want to requery the database to fetch features that the map is now over

/*

  map.addCallback('drawn', function(m) {
    console.log("map moved");
    var center = m.getCenter();
    Kernel.query({},center.latitude,center.longitude,water.repaint);
  });
*/

  var zoomer = wax.mm.zoomer(map)
  zoomer.appendTo('map-container');

  markers = new MM.MarkerLayer();
  map.addLayer(markers);
  markers.parent.setAttribute("id", "markers");

  //http://www.mongodb.org/display/DOCS/Geospatial+Indexing
  var lat = 37.8053;
  var lon = -122.2725;
  //Core.query({"coordinates" : { "$near" : [lon,lat]}}, water.paintTreeMarkers);


//  Core.query({ "properties": {"$or" : [ { "zipcode": "94607" } , { "zipcode": "94606" }, { "zipcode": "94609" }, { "zipcode": "94612" }, { "zipcode": "94610" } ] }}, water.paintTreeMarkers);  

  Core.query({}, water.paintTreeMarkers);  

  map.setCenterZoom(new MM.Location(lat,lon), 15);

  //Core.query2("/public/data/farmers_markets_nocal.json",water.paintMarketMarkers);
  //Core.query2("/public/data/berk_oak_sfo_population-csv.json",water.paintZipcodeMarkers);
};


water.makeTreeMarker = function(feature) {

  var id = feature.properties.id;
  var marker = document.createElement("div");
 
  var watertring = '';
  watertring += "<h2>" + feature.properties.title + "</h2>";
/*
  if(feature.properties.address_street !== undefined) {
    watertring += "<h3><strong>" + feature.properties.address_street + "</strong></h3>";
  }
  
*/
  watertring += "<hr>";


  if(feature.properties.species_root !== undefined) {
    watertring += "<p><em>" + feature.properties.species_root + "</em></p>";
  }  

  if(feature.properties.edible_fruit_tree !== null && feature.properties.edible_fruit_tree !== undefined) {
    watertring += "<p>Edible? <strong>" + feature.properties.edible_fruit_tree + "</strong></p>";
  }  
  if(feature.properties.graftable !== null && feature.properties.graftable !== "undefined") {
    watertring += "<p>Graftable? <strong>" + feature.properties.graftable + "</strong></p>";
  }
  if(feature.properties.address !== undefined) {
    watertring += "<p>Address <strong>" + feature.properties.address + " Oakland, CA</strong></p>";
  }
  
  if(feature.properties.Seasonality !== undefined && feature.properties.Seasonality !== null) {
    var seasons = water.readSeason(feature);
    watertring += "<p>In season <strong>" + seasons.list.toString() + "</strong></p>";
  }

 /*
 if(feature.stewardship !== undefined) {
    watertring += "<p>Stewardship <strong>" + feature.stewardship + "</strong></p>";
  }  

  if(feature.variety !== undefined) {
    watertring += "<p>Variety <strong>" + feature.variety + "</strong></p>";
  }   

  if(feature.quantity !== undefined) {
    watertring += "<p>Quantity <strong>" + feature.quantity + "</strong></p>";
  } 

  if(feature.description !== undefined) {
    watertring += "<p>Description <strong>" + feature.description + "</strong></p>";
  } 

  if(feature.properties.steward_name !== undefined || feature.contact_name !== undefined) {
    watertring += "<p>Steward Name <strong>" + feature.contact_name + "</strong></p>";
  }
*/

  if(feature.properties.tree_owner !== undefined) {
    watertring += "<p>Tree Owner <strong>" + feature.properties.tree_owner + "</strong></p>";
  }
  
  if(feature.properties.datasource !== undefined) {
    watertring += "<p>Data Source <strong>" + feature.properties.datasource + "</strong></p>";
  }

  if(feature.properties.last_updated !== undefined) {
    watertring += "<p>Last Updated <strong>" + feature.properties.last_updated + "</strong></p>";
  }
  
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
    img.setAttribute("src", "/images/icons/lemon_tree_icon.png");
  }

  
  // Tooltips
  $("#marker-" + id + " img").qtip({
  	content: {
      text: watertring,
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
}

water.readSeason = function(feature) {
  var feature = feature;
  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var seasonality = feature.properties.Seasonality.split(",");
  var inSeason = {};
  inSeason.list = [];
  for(var i = 0; i < months.length; i++ ) {
    if(seasonality[i] == 2) {
      inSeason.list += months[i] + " ";

    }
  }
  return inSeason;
}

water.makeMarketMarker = function(feature) {

  var id = feature.properties.id;
  var marker = document.createElement("div");
 
  var markupString = '';
  markupString += "<h2>" + feature.properties.name + "</h2>";

  if(feature.properties.url !== undefined && feature.properties.url !== null ) {
    markupString += '<p><a href="' +  feature.properties.url + '">Website</a></p>';
  }
  
  marker.feature = feature;
  markers.addMarker(marker, feature);

  // Unique hash marker id for link
  marker.setAttribute("id", "marker-" + id);
  marker.setAttribute("type", "market");
  marker.setAttribute("dataName", feature.properties.title);
  marker.setAttribute("class", "marker");

  // Specially set value for loading data.
  marker.setAttribute("marker_id", id);

  // create an image icon
  var img = marker.appendChild(document.createElement("img"));

  if(feature.art) {
    img.setAttribute("src", feature.art );
  } else {
    img.setAttribute("src", "/images/icons/farmers_market.png");
  }

  $('a.add-tree').click(function(){
    var mapCenter = map.center();
    $('input#lat').val(mapCenter.lat);
    $('input#lon').val(mapCenter.lon);
  });
  
  // Tooltips
  $("#marker-" + id + " img").qtip({
	content: {
    text: markupString,
	},
	hide: {
		delay: 1500
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
}


water.makeZipcodeMarker = function(feature) {

  var id = feature.properties.id;
  var marker = document.createElement("div");
 
  var markupString = '';
  markupString += "<h2>Zipcode: " + feature.properties.name + "</h2>";

  markupString += "<p>Population in zipcode: " + feature.properties.zipcode_population + "</p>";
  markupString += "<p>Land area, square miles: " + feature.properties.land_area_square_miles + "</p>";
  markupString += "<p>Water area, square miles: " + feature.properties.water_area_square_miles + "</p>";
  markupString += "<p>Population Density, people per square mile: " + feature.properties.population_density_sq_mi + "</p>";

  markupString += "<p>Media House Value, 2010: " + feature.properties.median_house_price + "</p>";
  markupString += "<p>" + feature.properties.city + "</p>";

  markupString += "<p>Datasource http://city-data.com</p>";


  marker.feature = feature;
  markers.addMarker(marker, feature);

  // Unique hash marker id for link
  marker.setAttribute("id", "marker-" + id);
  marker.setAttribute("type", "market");
  marker.setAttribute("dataName", feature.properties.title);
  marker.setAttribute("class", "marker");

  // Specially set value for loading data.
  marker.setAttribute("marker_id", id);

  // create an image icon
  var img = marker.appendChild(document.createElement("img"));

  if(feature.art) {
    img.setAttribute("src", feature.art );
  } else {
    img.setAttribute("src", "/images/icons/information-icon.png");
  }

  // Tooltips
  $("#marker-" + id + " img").qtip({
	content: {
    text: markupString,
	},
	hide: {
		delay: 1500
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
}


water.paintTreeMarkers = function(features) {

/* {"name": "water","type":"FeatureCollection","features":[ */

  features = features;
  var len = features.length; 
  console.log("water::paintTreeMarkers showing markers " + len );
  for (var i = 0; i < len; i++) {
    var feature = features[i];
    water.makeTreeMarker(feature);
  }
  
    var locations = map.getExtent(); // returns an array of Locations
var loc = map.getCenter() // returns a single Location
var zoomLevel = map.getZoom();
  
};

water.paintMarketMarkers = function(features) {
  features = features.features;
  var len = features.length; 
  console.log("water::paintMarketMarkers showing markers " + len );
  for (var i = 0; i < len; i++) {
    var feature = features[i];
    water.makeMarketMarker(feature);
  }
};

water.paintZipcodeMarkers = function(features) {
  features = features.features;
  var len = features.length; 
  console.log("water::paintZipcodeMarkers showing markers " + len );
  for (var i = 0; i < len; i++) {
    var feature = features[i];
    water.makeZipcodeMarker(feature);
  }
};

water.repaint_agent = function(agent) {

  // ignore elements that do not have an id
  var id = agent._id;
  if(!id) continue;

  // ignore agents that are on map already
  // later we want to carefully prune them off if off screen @TODO
  if(map_features[id]) continue;

  // ignore features with no location
  // @TODO later carefully remove features without location if had location before 
  var lat = agent.lat;
  var lon = agent.lon;
  if(!lat || !lon) continue;
 
  var title = agent.title;
  if(!title) title = "Lemon Tree";

  var art = agent.art;
  if(!art) art = "/images/icons/lemon_tree_icon.png";

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
  water.makeTreeMarker(feature);
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

