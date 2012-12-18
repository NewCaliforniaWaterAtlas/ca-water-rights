/**
 * Lemonopoly data variable. Contains filtered object lists like 'activities', 'challenges', and 'challenge_statuses'
 */
water.jsonData = {};

/**
 * Data loading wrapper for JSON formatted data, runs callback/closure to make sure data is really loaded.
 * vars contains the callback and other data to pass through to the later functions.
 */
water.loadJSON = function(vars) {
  var vars = vars;
  var contentData = vars.path;
  var getData = $.ajax({
    url:  contentData,
    dataType: 'json',
    data: vars.data,
    success: water.setData,
    error: water.loadDataError
  });
  getData.vars = vars;
};

/**
 * Set data into jsonData object, then run callback.
 */
water.setData = function(data, statusText, jqxhr) {
  if (data.length === undefined) {
    console.log("no results or undefined");
    return false;
  } 
  water.jsonData[jqxhr.vars.dataName] = data;
  water.jsonData[jqxhr.vars.dataName]["vars"] = jqxhr.vars;

  var callback = jqxhr.vars.callback;
  callback();

  return false;
};
