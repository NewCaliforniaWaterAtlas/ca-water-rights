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

EngineProvider.prototype.save = function(blob,res) {
  console.log("saving");
  console.log(blob);
/*   var _id = blob.param('_id'); */
 
/*   var mydatabase = this.db; */

/*   console.log(_id); */
/*

  this.db.find_one_by_id(_id,function(error,results) {
    if(!results || error) {
      var created_at = new Date();
      var updated_at = new Date();
      var record = {};
      console.log(results);
    }
  });
*/
};


/*
        mydatabase.save( record, function( error, results) {
          if(!results || error) {
            res.redirect('/error#trouble_saving_a_new_record');
          } else {
            res.send(results);
          }
        });
      } else {
        res.send(results);
*/

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

