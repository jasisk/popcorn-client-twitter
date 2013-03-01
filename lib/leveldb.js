var es = require("event-stream");
var levelup = require("levelup");
var stream = es.through();
var leveldb;

stream.set = function(key, val, callback){
  leveldb.put(key, val, function(err){
    if (err) {
      stream.emit("error", err);
    }
    callback(err);
  });
};

stream.get = function(key, callback){
  leveldb.get(key, function(err, val){
    if (err) {
      stream.emit("error", err);
    }
    callback(err, val);
  });
};

stream.on("data", function(data){
  stream.pause();
  stream.set(Date.now(), data, function(){
    stream.resume();
  });
});

var exports = module.exports = function(config){
  leveldb = levelup("./" + config.dbFileName);
  return stream;
};