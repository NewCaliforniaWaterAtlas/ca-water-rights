// mongo
var MongoDB = require('./mongo').MongoDB;

function enginecallback() {
  console.log("engine::authed");
}

EngineProvider = function() {
  var process = process;
  //this.db = new MongoDB('127.0.0.1',27017); //localhost
  //this.db = new MongoDB('127.4.131.129',27017); //localhost
  var host = process.env.OPENSHIFT_MONGODB_DB_HOST;
  var port = process.env.OPENSHIFT_MONGODB_DB_PORT;
  this.db = new MongoDB(host,port); //openshift

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

EngineProvider.prototype.find_many_by = function(blob,handler) {
  this.db.find_many_by(blob,handler);
};

exports.EngineProvider = EngineProvider;

