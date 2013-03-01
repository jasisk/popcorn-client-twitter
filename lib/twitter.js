var es = require("event-stream");
var Twitter = require("ntwitter");
var util = require("util");
var stream = es.through();

function lookup(key){
  return key;
}

Twitter.prototype.validate = function(callback){
  this.verifyCredentials(function (err, data) {
    var status;
    if (!err) {
      this.log("Twitter validation was successful");
    } else {
      var errorDetails = JSON.parse(err.data)["errors"];
      var errorMessage = errorDetails[0] && errorDetails[0].message || "Unknown";
      this.error("TWITTER ERROR [%d] - %s", err.statusCode, errorMessage);
    }
    callback(err, data);
  }.bind(this));
};

Twitter.prototype.setStatus = function(status, callback){
  this.updateStatus(status, callback);
};

Twitter.prototype.log = function(){
  var msg = util.format.apply(util, arguments);
  stream.emit("log", "TWITTER - " + msg);
};

Twitter.prototype.error = function(){
  var msg = util.format.apply(util, arguments);
  stream.emit("error", msg);
};


var exports = module.exports = function(config){
  var twitter = new Twitter({
    consumer_key: config.twitter_consumer_key,
    consumer_secret: config.twitter_consumer_secret,
    access_token_key: config.twitter_access_token,
    access_token_secret: config.twitter_access_token_secret
  });
  stream.setStatus = twitter.setStatus.bind(twitter);
  twitter.validate(function(err, data){
    stream.emit("verifyCredentials", JSON.stringify(data));
  });
  return stream;
};

