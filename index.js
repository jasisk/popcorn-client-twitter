var util = require("util"),
    es = require("event-stream"),
    config = require("rc")("popcorn", {
      port: 6379,
      server: "127.0.0.1",
      dbFileName: "popcorn.db",
      channel: "popcorn",
      legitOffset: 60*2,
      burnOffset: 60*15
    }),
    redis = require("./lib/redis")(config),
    twitter = require("./lib/twitter")(config),
    leveldb = require("./lib/leveldb")(config);

var burnTimer, isBurned, bagNumber=2;
var messages = [
  "Popcorn has been made. Go get it.",
  "Popcorn has been made. Come get some.",
  "Popcorn. I has it.",
  "You should get some popcorn right now.",
  "Someone is nicer than you. Popcorn's ready.",
  "You know what you could go for right now? Corn, oil, and salt. Get it.",
  "You know the rice crispy elves? I don't trust snap and crackle. Love Pop, though. P.S. Popcorn's ready.",
  "What's a self-aware popcorn machine's favorite music? Why, hip POP of course. Get it? Get it.",
  "Many indigenous peoples in mesoamerica called corn, \"maize.\" Popmaize is ready.",
  "Lions, tigers and hippoPOPamuses, oh my! Popcorn's ready.",
  "Don't try to butter me up -- I already am. Popcorn's ready.",
  "Love the color of that shirt you're wearing today. Really makes your eyes POP. Popcorn's ready."
];

function getMessage(){
  var messageNumber = Math.floor(Math.random()*messages.length);
  return messages[messageNumber];
}

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
    if (!isBurned) {
      util.log("Popcorned. Informing Twitters.");
      twitter.setStatus(getMessage() + " Batch #" + (bagNumber++) + ".", function(){});
    } else {
      util.log("Burning popcorn turned off.");
      twitter.setStatus("Crisis averted. Burning popcorn turned off.", function(){});
    }
  } else {
    util.log("Phony popcorn attempt. Nice try.");
  }
});

redis.on("on", function(data){
  isBurned = false;
  clearTimeout(burnTimer);
  burnTimer = setTimeout(function(){
    isBurned = true;
    util.log("Popcorn burning. Informing Twitters.");
    twitter.setStatus("Popcorn is burning. Someone go turn it off.", function(){});
  }, config.burnOffset * 1000);
});

process.on("SIGINT", function(){
  console.log();
  redis.quit();
  process.exit(0);
});
