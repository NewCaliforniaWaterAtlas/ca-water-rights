var host = process.env.OPENSHIFT_MONGODB_DB_HOST || "127.0.0.1";
var port = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;

var credentials = {
  mongo_user: 'www',
  mongo_password: 'changeme',
  mongo_host: host,
  mongo_port: port,
  mongo_db: 'watertransfer',
  mongo_collection: 'rights',
};

module.exports = credentials;
