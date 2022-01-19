import util = require('util')
import {redis} from 'redis'
import async = require('async')
import * as RedisShard  from 'redis-shard'
import {EventEmitter} from 'events'

class RedisManager extends EventEmitter {

  clients : [];
  masterOptions:{}
  hasSlaveNode:boolean = false;
  shardedClient:[]

  constructor(config:{}){

    super();
    this.masterOptions = config;
  
    if(!this.masterOptions) {
      this.masterOptions = {
        host:"127.0.0.1",
        port:"6379"
      }
    }
  
    var client = redis.createClient(this.masterOptions);
    this.clients.push(client);
  
    
  
    if (this.hasSlaveNode) {
      var options = {servers: config.slave};
      shardedClient = new RedisShard(options);
      clients.push(shardedClient);
    }
  
    var WRITES = [
      "del", "publish", "subscribe", "hset", "hdel", "set", "expire", "hmset", "sadd", "smembers","srem", "hsetnx", "incr", "decr", "hincrby", "lpush", "lrem", "rpop", "zadd", "zrem", "zincrby"
    ];
  
    WRITES.forEach(function (command) {
      self[command] = function () {
        client[command].apply(client, arguments);
      };
    });
  
    var READS = [
      "hget", "hgetall", "get", "hlen", "hscan", "hexists", "mget", "exists", "llen", "lrange", "zcard", "zscore", "zrank", "zrange", "zscore"
    ];
  
    READS.forEach(function (command) {
      self[command] = function () {
        if (shardedClient) {
          shardedClient[command].apply(client, arguments);
        } else {
          client[command].apply(client, arguments);
        }
      };
    });
  
    
  
    // Note: listener will fire once per shard, not once per cluster
    
  
    
  
    return self;

  }

  on(event, listener){
    this.clients.forEach(function (c) {
      c.on(event, function () {
        // append server as last arg passed to listener
        var args = Array.prototype.slice.call(arguments);
        listener.apply(undefined, args);
      });
    });
  };

  once(event:any, listener:any) {
  
    async.parallel(
      [
        function (callback) {
          client.once(event, function () {
            callback(undefined, 'one');
          });
        },
        function (callback) {
          if (hasSlaveNode) {
            var connected = 0;
            shardedClient.once(event, function () {
              connected++;
              if (connected == config.slave.length) {
                callback(undefined, 'two');
              }
            });
          } else {
            callback(undefined, 'two');
          }
        }
      ],
      function (err, results) {
        var args = Array.prototype.slice.call(arguments).concat("result");
        listener.apply(undefined, args);
      }
    );
  };

  batchWrite (){
    return this.client.batch();
  };

  batchRead(){
    if( this.shardedClient ){
      return this.shardedClient.batch();
    } else {
      return client.batch();
    }
  };

  
  
};

export {RedisManager}