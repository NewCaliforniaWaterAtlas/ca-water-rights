// Set up water map.
water.map = water.map || {};

// Set up map defaults.
water.map_defaults = {};
water.map_defaults.lat = 38.52;
water.map_defaults.lon = -121.50;
water.map_defaults.boxsize_lat = 0.08; //pretty small box
water.map_defaults.boxsize_lon = 0.16;
water.map_defaults.zoom = 8;
water.map_defaults.satellite_layer = 'chachasikes.map-oguxg9bo';
water.map_defaults.terrain_layer = 'chachasikes.map-tv2igp9l';

water.map_defaults.zoomed_out_marker_layer = 'chachasikes.water_rights_markers';
water.map_defaults.div_container = 'map-container';
water.map_defaults.close_up_zoom_level = 13;
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



// Override mapbox wax interaction to add movetip function.
if (typeof mapbox === 'undefined') mapbox = {};

mapbox.interaction = function() {

    var interaction = wax.mm.interaction(),
        auto = false;

    interaction.refresh = function() {
        var map = interaction.map();
        if (!auto || !map) return interaction;
        for (var i = map.layers.length - 1; i >= 0; i --) {
            if (map.layers[i].enabled) {
                var tj = map.layers[i].tilejson && map.layers[i].tilejson();
                if (tj && tj.template) return interaction.tilejson(tj);
            }
        }
        return interaction.tilejson({});
    };

    interaction.auto = function() {
        auto = true;
        interaction.on(wax.tooltip()
            .animate(true)
            .parent(interaction.map().parent)
            .events()).on(wax.location().events());
        return interaction.refresh();
    };

    interaction.movetip = function() {
        auto = true;
        interaction.on(wax.movetip()
            .parent(interaction.map().parent)
            .events()).on(wax.location().events());
            
        // Add lower image (via css)    
            
        return interaction.refresh();
    };

    return interaction;
};

// override move tip
wax.movetip = function() {
    var popped = false,
        t = {},
        _tooltipOffset,
        _contextOffset,
        tooltip,
        parent;

    function moveTooltip(e) {
       var eo = wax.u.eventoffset(e);
       // faux-positioning
       if ((_tooltipOffset.height + eo.y) >
           (_contextOffset.top + _contextOffset.height) &&
           (_contextOffset.height > _tooltipOffset.height)) {
           eo.y -= _tooltipOffset.height;
           tooltip.className += ' flip-y';
       }

       // faux-positioning
       if ((_tooltipOffset.width + eo.x) >
           (_contextOffset.left + _contextOffset.width)) {
           eo.x -= _tooltipOffset.width;
           tooltip.className += ' flip-x';
       }

       tooltip.style.left = eo.x + 'px';
       tooltip.style.top = eo.y + 'px';
    }

    // Get the active tooltip for a layer or create a new one if no tooltip exists.
    // Hide any tooltips on layers underneath this one.
    function getTooltip(feature) {
        var tooltip = document.createElement('div');
        tooltip.className = 'map-tooltip map-tooltip-0';

        tooltip.innerHTML = feature;
        return tooltip;
    }

    // Hide a given tooltip.
    function hide() {
        if (tooltip) {
          tooltip.parentNode.removeChild(tooltip);
          tooltip = null;
        }
    }

    function on(o) {
        var content;
        if (popped) return;
        if ((o.e.type === 'mousemove' || !o.e.type)) {
            content = o.formatter({ format: 'teaser' }, o.data);
            
            if (!content) return;
            hide();
            parent.style.cursor = 'pointer';
            tooltip = document.body.appendChild(getTooltip(content));
            tooltip.application_pod = $(content).find('.application_pod').html();
/*             console.log(tooltip); */

            $(tooltip).bind("click", function() {   	
              water.loadDataPanel(tooltip.application_pod);
            });                  
        } else {
            content = o.formatter({ format: 'teaser' }, o.data);
            if (!content) return;
            hide();
            var tt = document.body.appendChild(getTooltip(content));

            tt.className += ' map-popup';

            var close = tt.appendChild(document.createElement('a'));
            close.href = '#close';
            close.className = 'close';
            close.innerHTML = 'Close';

            popped = true;

            tooltip = tt;

            _tooltipOffset = wax.u.offset(tooltip);
            _contextOffset = wax.u.offset(parent);
            moveTooltip(o.e);

            bean.add(close, 'click touchend', function closeClick(e) {
                e.stop();
                hide();
                popped = false;
            });
        }
        if (tooltip) {
          _tooltipOffset = wax.u.offset(tooltip);
          _contextOffset = wax.u.offset(parent);
          moveTooltip(o.e);
        }

    }

    function off() {
        parent.style.cursor = 'default';
        if (!popped) hide();
    }

    t.parent = function(x) {
        if (!arguments.length) return parent;
        parent = x;
        return t;
    };

    t.events = function() {
        return {
            on: on,
            off: off
        };
    };

    return t;
};

// Override markers interaction
mmg = mapbox.markers.layer; // Backwards compatibility
mapbox.markers.interaction = function(mmg) {
    // Make markersLayer.interaction a singleton and this an accessor.
    if (mmg && mmg.interaction) return mmg.interaction;

    var mi = {},
        tooltips = [],
        exclusive = true,
        hideOnMove = true,
        showOnHover = true,
        close_timer = null,
        on = true,
        formatter;

    mi.formatter = function(x) {
        if (!arguments.length) return formatter;
        formatter = x;
        return mi;
    };
    mi.formatter(function(feature) {
        var o = '',
            props = feature.properties;

        // Tolerate markers without properties at all.
        if (!props) return null;

        if (props.title) {
            o += '<div class="marker-title">' + props.title + '</div>';
        }
        if (props.description) {
            o += '<div class="marker-description">' + props.description + '</div>';
        }

        if (typeof html_sanitize !== undefined) {
            o = html_sanitize(o,
                function(url) {
                    if (/^(https?:\/\/|data:image)/.test(url)) return url;
                },
                function(x) { return x; });
        }

        return o;
    });

    mi.hideOnMove = function(x) {
        if (!arguments.length) return hideOnMove;
        hideOnMove = x;
        return mi;
    };

    mi.exclusive = function(x) {
        if (!arguments.length) return exclusive;
        exclusive = x;
        return mi;
    };

    mi.showOnHover = function(x) {
        if (!arguments.length) return showOnHover;
        showOnHover = x;
        return mi;
    };

    mi.hideTooltips = function() {
        while (tooltips.length) mmg.remove(tooltips.pop());
        for (var i = 0; i < markers.length; i++) {
            delete markers[i].clicked;
        }
    };

    mi.add = function() {
        on = true;
        return mi;
    };

    mi.remove = function() {
        on = false;
        return mi;
    };

    mi.bindMarker = function(marker) {
        var delayed_close = function() {
            if (showOnHover === false) return;
            if (!marker.clicked) close_timer = window.setTimeout(function() {
                mi.hideTooltips();
            }, 2000);
        };

        var show = function(e) {
            if (e && e.type == 'mouseover' && showOnHover === false) return;
            if (!on) return;
            var content = formatter(marker.data);
            // Don't show a popup if the formatter returns an
            // empty string. This does not do any magic around DOM elements.
            if (!content) return;

            if (exclusive && tooltips.length > 0) {
                mi.hideTooltips();
                // We've hidden all of the tooltips, so let's not close
                // the one that we're creating as soon as it is created.
                if (close_timer) window.clearTimeout(close_timer);
            }

            var tooltip = document.createElement('div');
            tooltip.className = 'marker-tooltip';
            tooltip.style.width = '100%';

            var wrapper = tooltip.appendChild(document.createElement('div'));
            wrapper.style.cssText = 'position: absolute; left: -10px; top: -10px; width: 300px; pointer-events: none;';

            var popup = wrapper.appendChild(document.createElement('div'));
            popup.className = 'map-tooltip';
            popup.style.cssText = 'pointer-events: auto;';

            if (typeof content == 'string') {
                popup.innerHTML = content;
            } else {
                popup.appendChild(content);
            }

            // Align the bottom of the tooltip with the top of its marker
//            wrapper.style.bottom = marker.element.offsetHeight / 2 + 20 + 'px';
            wrapper.style.bottom = marker.element.offsetHeight / 2 + 20 + 'px';

            // Block mouse and touch events
            function stopPropagation(e) {
                e.cancelBubble = true;
                if (e.stopPropagation) { e.stopPropagation(); }
                return false;
            }
            MM.addEvent(popup, 'mousedown', stopPropagation);
            MM.addEvent(popup, 'touchstart', stopPropagation);

            if (showOnHover) {
                tooltip.onmouseover = function() {
                    if (close_timer) window.clearTimeout(close_timer);
                };
                // tooltip.onmouseout = delayed_close;

                tooltip.application_pod = $(content).find('.application_pod').html();

                console.log(tooltip);

                $(tooltip).find('.content').bind('click',function() {   	
                  water.loadDataPanel(tooltip.application_pod);
                }); 
            }

            var t = {
                element: tooltip,
                data: {},
                interactive: false,
                location: marker.location.copy()
            };
            tooltips.push(t);
            marker.tooltip = t;
            mmg.add(t);
            mmg.draw();
        };

        marker.showTooltip = show;

        marker.element.onclick = marker.element.ontouchstart = function() {
            show();
            marker.clicked = true;
        };

        marker.element.onmouseover = show;
        marker.element.onmouseout = delayed_close;
    };

    function bindPanned() {
        mmg.map.addCallback('panned', function() {
            if (hideOnMove) {
                while (tooltips.length) {
                    mmg.remove(tooltips.pop());
                }
            }
        });
    }

    if (mmg) {
        // Remove tooltips on panning
        mmg.addCallback('drawn', bindPanned);

        // Bind present markers
        var markers = mmg.markers();
        for (var i = 0; i < markers.length; i++) {
            mi.bindMarker(markers[i]);
        }

        // Bind future markers
        mmg.addCallback('markeradded', function(_, marker) {
            // Markers can choose to be not-interactive. The main example
            // of this currently is marker bubbles, which should not recursively
            // give marker bubbles.
            if (marker.interactive !== false) mi.bindMarker(marker);
        });

        // Save reference to self on the markers instance.
        mmg.interaction = mi;
    }

    return mi;
};

mmg_interaction = mapbox.markers.interaction;

water.loadDataPanel = function(application_pod){
  console.log(application_pod);
   Core.query({ 
     $and: [{'kind': 'right'},{'properties.application_pod': water.trim(application_pod) }
  ] 
    }, water.loadDataPanelData, {'limit': 0});
};

water.loadDataPanelData = function(results){
  if(results !== undefined){
    if(results[0] !== undefined){
      var content = water.formatTooltipStrings(results[0]);
      console.log(results[0]);
    
      $('#map-panel .map-detail').html(content);
    }
  }
};


water.trim = function(str){
    str = str.replace(/^\s+/, '');
    for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return str;
}



water.setupMap = function() {
  // Create map.
  water.map = mapbox.map(water.map_defaults.div_container);
  // Add satellite layer.
  water.map.addLayer(mapbox.layer().id(water.map_defaults.satellite_layer));
  // Load interactive water rights mapbox layer (has transparent background. Rendered in Tilemill with 45K+ datapoints)        
  mapbox.load(water.map_defaults.zoomed_out_marker_layer, function(interactive){
      water.map.addLayer(interactive.layer);
      water.map.interaction.movetip();
  });

  // Add map interface elements.
  water.map.ui.zoomer.add();
  water.map.ui.hash.add();
  water.map.ui.zoombox.add();
  
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
  water.map.centerzoom({ lat: 38.52, lon: -121.50 }, 8);
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
            water.map.interaction.movetip(); 
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
};

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

    //$('.iphone-debug').html("lat: " + lat + " lon: " + lon + "<br />");

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
/*       = water.formatTooltipStrings(feature); */
var diversion_amount = "#";
var diversion_unit = "unit";
var o ='<span class="content">' 
      + '<span class="name">' + feature.properties.name+ '</span>'
      + '<span class="diversion"><span class="diversion-amount">' + diversion_amount + '</span>'
      + '<span class="diversion-unit"> ' + diversion_unit + '</span></span>'
      + '<span class="application_pod">' + feature.properties.application_pod + '</span></span>';

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
  //$('.iphone-debug').html($('.iphone-debug').html() + "<br />drawRightsMarkers<br />");
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
        if(feature.properties.first_name){
          string += feature.properties.first_name + " ";
        }
        if(feature.properties.holder){ 
          string += feature.properties.holder_name;
        }
        else {
          string += feature.properties.name;
        }
        string += "</p>"
        
        string += "Diversion Type: " + feature.properties.diversion_type + "<br />";
        string += "Direct Diversion Amount: "  + "<br />";feature.properties.direct_div_amount;
        string += "Face amount: " + feature.properties.face_amount + " " + feature.properties.face_value_units + "<br />";
        string += "Diversion Acre Feet" + feature.properties.diversion_acre_feet + "<br />";
        string += "Storage" + feature.properties.diversion_storage_amount + "<br />";
        string += "POD unit" + feature.properties.pod_unit + "<br />";

        if(feature.properties.reports) {
        
          for(r in reports){
            var report = reports[r];
            if(report.usage !== undefined){
             if (report.usage instanceof Array) {
                for(var i in report['usage']) {
                string +=  "Usage" + report['usage'][i] + ', ' + report['usage_quantity'][i];
                }
             }
             else{
                string +=  "Usage" + report['usage'] + ', ' + report['usage_quantity'];
             }
           }
        }
      
      string += "<h4>Extra Stuff</h4>"
      + "<p>" + "pod_id: " +  feature.properties.pod_id + "</p>" 
      + "<p>" + "application_pod: " +  feature.properties.application_pod + "</p>"
      + "<p>" + "water_right_id: " +  feature.properties.water_right_id + "</p>"
      + "<p>" + "Source: " +  feature.properties.source + "</p>";
    }
  
       // console.log(feature.properties.station_code);

/*
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
*/
/*

    if (feature.properties.agency_cd !== undefined) {

      string +=  
        "<p>" + "Station Name: " + feature.properties.station_nm + "</p>"
      + "<p>" + "Station ID: " + feature.properties.site_no + "</p>"
      + "<p>" + "Water Temperature: " + feature.tempValue + " " + feature.tempUnitAbrv + "</p>"
      + "<p>" + "Physical Discharge: " + "<strong>" + feature.flowValue + "</strong>" +" "+ feature.flowUnitAbrv + "</p>"
      + "<p>" + "Gage Height: " + feature.gageValue + feature.gageUnitAbrv + "</p>"
      ;

      // &parameterCd=00004,00010,00060,00064,00065

        $.ajax({
          type: "GET",
          url: "/usgs/" + feature.properties.site_no + "/00010",
          dataType: 'json',
          success: function(data) {
            
            // feature.siteName = data.value.timeSeries[0].sourceInfo.siteName;

            //00010 Physical Temperature, water, degrees Celsius, Temperature, water  deg C
            feature.tempUnitAbrv = data.value.timeSeries[0].variable.unit.unitAbbreviation;
            feature.tempValue = data.value.timeSeries[0].values[0].value[0].value;
            
            //00004 Physical Stream width, feet, Instream features, est. stream width ft
            //00064 Physical Mean depth of stream, feet, Depth ft

            // console.log(data.value.timeSeries[0].values[0].value[0].value);

          }
        });

        $.ajax({
          type: "GET",
          url: "/usgs/" + feature.properties.site_no + "/00060",
          dataType: 'json',
          success: function(data) {
            
            //00060 Physical Discharge, cubic feet per second, Stream flow, mean. daily cfs
            feature.flowUnitAbrv = data.value.timeSeries[0].variable.unit.unitAbbreviation;
            feature.flowValue = data.value.timeSeries[0].values[0].value[0].value

          }
        });

        $.ajax({
          type: "GET",
          url: "/usgs/" + feature.properties.site_no + "/00065",
          dataType: 'json',
          success: function(data) {

            //00065 Physical Gage height, feet, Height, gage ft
            feature.gageUnitAbrv = data.value.timeSeries[0].variable.unit.unitAbbreviation;
            feature.ageValue = data.value.timeSeries[0].values[0].value[0].value;

          }
        });
*/
      

      // $.when( getUSGS()).done(function(results1) {
        
      //   console.log(results1); 
      // });
    
    }  
    return string;
};

water.triggerMapMoveTimeout = function() {
  return setTimeout(water.markersQuery, 1000);
};


