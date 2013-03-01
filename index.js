var util = require("util"),
    es = require("event-stream"),
    config = require("rc")("popcorn", {
      port: 6379,
      server: "127.0.0.1",
      dbFileName: "popcorn.db",
      channel: "popcorn",
      legitOffset: 5,
      burnOffset: 10
    }),
    redis = require("./lib/redis")(config),
    twitter = require("./lib/twitter")(config),
    leveldb = require("./lib/leveldb")(config);

var burnTimer;

redis.on("log", util.log.bind(util));
twitter.on("log", util.log.bind(util));
twitter.on("error", util.error.bind(util));

es.pipeline(
  redis,
  leveldb,
  es.mapSync(function(data){
    return util.format("%s - Event: %s\n", new Date().toLocaleString(), data);
  }),
  process.stdout
);

redis.on("off", function(data){
  clearTimeout(burnTimer);
  var latestOn = redis.getLatest("on");
  if ( latestOn && latestOn < data - config.legitOffset * 1000 ) {
    util.log("Popcorned. Informing Twitters.");
    twitter.setStatus("[TEST TWEET - IGNORE] Popcorn has been made. Go get it.", function(){});
  } else {
    util.log("Phony popcorn attempt. Nice try.");    
  }
});

redis.on("on", function(data){
  clearTimeout(burnTimer);
  burnTimer = setTimeout(function(){
    util.log("Popcorn burning. Informing Twitters.");
    twitter.setStatus("[TEST TWEET - IGNORE] Popcorn is burning. Someone go turn it off.", function(){});
  }, config.burnOffset * 1000);
});

process.on("SIGINT", function(){
  console.log();
  redis.quit();
  process.exit(0);
});