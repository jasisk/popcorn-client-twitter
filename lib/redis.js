var redis = require("redis"),
    es = require("event-stream"),
    util = require("util"),
    events = require("events");

module.exports = function(options){
  var inst = new Client(options);

  var stream = es.readable(function(c,n){
    var self = this;
    inst.client.on("message", function(channel, message){
      var evt = JSON.parse(message);
      if (evt.type){
        if (!!~["on", "off"].indexOf(evt.type)) {
          self.emit(evt.type, Date.now());
        }
        inst._latest[evt.type] = Date.now();
        self.emit("data", evt.type);
      }
    });
  });
  inst.setBind(stream);
  inst.on("log", stream.emit.bind(stream, "log"));
  return stream;
};

util.inherits(Client, events.EventEmitter);

function Client(options){
  this._latest = {};
  var self = this;
  if (!options) options = {};
  this.client = this.createClient(options.port, options.server);
  this.client.on("connect", function(){
    self.subscribe(options.channel);
  });
}

Client.prototype.setBind = function(stream){
  var self = this;
  this.client.on("connect", function(){
    self.log("Connected to redis");
  });
  stream.quit = this.quit.bind(this);
  stream.getLatest = function(evt){
    return self._latest[evt];
  };
};

Client.prototype.createClient = function(port, server){
  return redis.createClient(port, server);
};

Client.prototype.quit = function(now){
  if (true !== now) {
    this.log("Closing redis client gracefully");
    this.client.quit();
  } else {
    this.log("Closing redis client forcefully");
    this.client.end();
  }
};

Client.prototype.log = function(){
  this.emit("log", util.format.apply(util, arguments));
};

Client.prototype.subscribe = function(channel){
  this.client.subscribe(channel);
  this.client.on("subscribe", function(channel){
    this.log(util.format("Subscribed to \"%s\" channel", channel));
  }.bind(this));
};

