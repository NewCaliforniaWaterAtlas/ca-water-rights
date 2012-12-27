// mongo
var MongoDB = require('./mongo').MongoDB;

function enginecallback() {
  console.log("engine::authed");
}


EngineProvider = function() {
  var credentials = require('./credentials.js'); 
  this.db = new MongoDB(credentials); //openshift
  console.log("server::engine database is " + this.db );
};

EngineProvider.prototype.count_all_by = function(hash,callback) {
  return this.db.count_all_by(hash,callback);
}

EngineProvider.prototype.find_one_by_id = function(id,handler) {
  this.db.find_one_by_id(id,handler);
};

EngineProvider.prototype.findAll = function(handler) {
  this.db.find(handler);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////
// query
/////////////////////////////////////////////////////////////////////////////////////////////////////

EngineProvider.prototype.find_many_by = function(blob,handler,arg1,options) {
console.log(options);
  this.db.find_many_by(blob,handler,arg1, options);
};

exports.EngineProvider = EngineProvider;

