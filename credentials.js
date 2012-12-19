var host = process.env.OPENSHIFT_MONGODB_DB_HOST || "127.0.0.1";
var port = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;

var credentials = {
  mongo_password: '',
  db_host: host,
  db_port: port
};

module.exports = credentials;