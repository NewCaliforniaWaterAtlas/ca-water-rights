var water = {};

window.onload = function() {
  water.navigation();
  water.setupMap();
  water.setupAddress();
  water.setupFilters();


  $('a[data-toggle="tab"]').on('shown', function (e) {
    if ($(e.target).attr('href') == '#map') {
        // force redraw by rezooming to the current zoom level - since map does not load when page loads if the tab is hidden. most of the map is set up, it just needs to be redrawn. can't find a redraw function in modest maps.
      
        water.centerMap();
    }
  });
};



//
// Address handling (a back button) for twitter bootstrap
//
water.setupAddress = function () {
  // Add a hash to the URL when the user clicks on a tab.
  // Not IE7 compatible but oh well. If we need that we can switch to jquery address.
  $('a[data-toggle="tab"]').bind('click', function(e) {
    history.pushState(null, null, $(this).attr('href'));
  });

  // Navigate to a tab when the history changes
  window.addEventListener("popstate", function(e) {
    var activeTab = $('[href=' + location.hash + ']');
    if (activeTab.length) {
      activeTab.tab('show');
    } else {
      $('.nav-tabs a:first').tab('show');
    }
  });
};

water.setupFilters = function () {
  $(".search-holders").typeahead({
    minLength: 3,
    source: function (query, process) {
      return $.get('/search/holders?value=' + query, function (data) {
        $('#search-panel .list-content').hide();
        water.drawSearchRightsMarkersLayer(data);
      });
    }
  });
};

water.displayPanel = function(panel){
  panel.css('left','0px');
};

water.displayPanelContainer = function(panel){
  panel.css('visibility','visible');
  panel.css('right','0px');
};

water.hidePanelContainer = function(panel){
  panel.css('right','-1000px');
};

water.hidePanel = function(panel){
  panel.css('left','1000px');
};

water.navigationHidePanels = function(){
  water.hidePanelContainer($('#data-panel'));
  water.hidePanel($('#rights-panel'));
  water.hidePanel($('.alert'));
  water.hidePanel($('#search-panel'));
  water.hidePanel($('#sensor-panel'));
  $('#legend').hide();
};

water.navigation = function(){
  water.navigationHidePanels();
  
  
  $('#button-water-rights').toggle(function(){
    water.navigationHidePanels();
    water.displayPanelContainer($('#data-panel'));
    water.displayPanel($('#rights-panel'));

    water.hideSearch();
    water.hideSensors();
    water.displayRights();
    
    },function(){
    water.navigationHidePanels();
    water.hidePanelContainer($('#data-panel'));
    water.hidePanel($('#rights-panel'));
  });
  
  $('#button-sensors').toggle(function(){
    water.navigationHidePanels();
    water.displayPanelContainer($('#data-panel'));
    water.displayPanel($('#sensor-panel'));

    water.hideRights();
    water.hideSearch();
    water.displaySensors();
  },function(){
    water.navigationHidePanels();
    water.hidePanelContainer($('#data-panel'));
    water.hidePanel($('#sensor-panel')); 
  });

  $('#button-search').toggle(function(){
    water.navigationHidePanels();
    water.displayPanelContainer($('#data-panel'));
    water.displayPanel($('#search-panel'));

    water.displaySearch();
    water.hideRights();
    water.hideSensors();
    
  },function(){
    water.navigationHidePanels();
    water.hidePanelContainer($('#data-panel'));
    water.hidePanel($('#search-panel')); 
  });

};

water.displaySearch = function(){
  water.updateNavState();
  $('#button-search').addClass('active');
};

water.hideSearch = function(){
  water.clearMarkerLayers();
};

water.updateNavState = function(){
  $('#button-water-rights').removeClass('active');
  $('#button-search').removeClass('active');
  $('#button-sensors').removeClass('active');
  $('.navbar .nav li.active').removeClass('active');
};

water.displayRights = function(){
  water.updateNavState();
  $('#button-water-rights').addClass('active');
  
/*   water.loadMarkers(); */
  if(water.map.getLayer(water.map_defaults.zoomed_out_marker_layer) === undefined) {
    mapbox.load(water.map_defaults.zoomed_out_marker_layer, function(interactive){
      water.map.addLayer(interactive.layer);
      water.map.interaction.movetip();
      water.map.interaction.refresh(); 
    });
  }
};

water.hideRights = function(){
  water.map.removeLayer(water.map_defaults.zoomed_out_marker_layer);
  // other rights layers?
};

water.displaySensors = function(){
  water.updateNavState();
  $('#button-sensors').addClass('active');

  water.loadSensorLayer();
  water.map.interaction.refresh(); 

  $('#legend').show();
  $('#legend .sensors').show();
};

water.hideSensors = function(){
  $('#legend .sensors').hide();
  $('#legend').hide();
  water.map.removeLayer(water['markers_sensor_usgs']);
  water.map.interaction.refresh();
};

/*

$(function(){
  // modal
  $('#myModal').modal({
    backdrop: false,
    show: true
  })

})



*/
