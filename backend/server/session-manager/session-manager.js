var events = require('events'),
  util = require('util'),
  RedisManager = require('./redis-manager');
  logger =require('../logger').logger


var SessionManager = exports.SessionManager = function (config, callback) {

  this.conf = {};

  if (typeof(config) == 'function' && !callback) {
    callback = config;

    // default configurations
    // this.conf.expire = 120; // redis expire TTL (seconds)

  } else {
    if (config) this.conf = config;
  }

  this.redisClient = new RedisManager(this.conf);

  events.EventEmitter.call(this);

  this.redisClient.on("error", function (err) {
    logger.error("Redis error encountered : " + err);
  });

  this.redisClient.on("end", function (err) {
    logger.warn("Redis connection closed");
    if (callback) callback('ERR-REDIS', 'failed to connect to Redis server(s). ');
  });

  this.redisClient.once("connect", function () {
    if (callback) callback(null);
  });
};

util.inherits(SessionManager, events.EventEmitter);


/**
 * Get the server number according to channel name from redis hash table.

 * @name retrieve
 * @function
 * @param {string} app - application key
 * @param {string} channel - channel name
 * @param {callback} callback - callback function
 */
SessionManager.prototype.retrieveConnectedNode = function (app, roomID, callback) {

  var serverinfo
  var roominfo

  async.parallel(
    [
      (asyncCB)=>{

        this.redisClient.smembers(roomID, function (err, res) {
          roominfo=res

          return;
        });

      },
      (asyncCB)=>{
        this.redisClient.get(roomID, function (err, res) {

          serverinfo=res

          return;
        });

      }
    ],(err,results)=>{

      if(err){
        //TODO: errhanld
      }

      callback({
        serverinfo,
        roominfo
      })
      
    }

  )

  return

};

// /**
//  * Update connection informations into redis server.
//  * If the number of connections in this channel is ZERO, delete data from redis hash table.
//  *
//  * @name update
//  * @function
//  * @param {string} app - application key
//  * @param {string} channel - channel name
//  * @param {string} server - server number (auth-generated into zookeeper)
//  * @param {number} userlist -userList
//  *
//  */
// SessionManager.prototype.updateConnectedNode = function (app, roomID, server, userlist, callback) {

//   var hkey =  app + ':' + roomID;
//   var skey =  app + ':' + server;

//   var self =this;

//   if (callback) {
//     if (userlist) {
//       async.parallel([
//         function(asyncCB){

//           self.redisClient.hset(hkey, server, userlist, asyncCB)

//         },function(asyncCB){

//           self.redisClient.sadd(skey,roomID,asyncCB);

//         }
//       ],(err,results)=>{

//         if(err){
//           return callback(err)
//         }
//         return callback(null,results);
//       })

//       if (this.conf && this.conf.expire) {
//         this.redisClient.expire(hkey, this.conf.expire, function (err, res) {
//         });
//       }
//     } else {
//       async.parallel([
//         function(asyncCB){

//           self.redisClient.hdel(hkey, server, asyncCB);

//         },function(asyncCB){
//           self.redisClient.srem(skey,roomID,asyncCB);
//         }
//       ],(err,results)=>{

//         if(err){
//           return callback(err)
//         }
//         return callback(null,results);
//       })

//     }

//   } else {
//     if (userlist ) {

//       this.redisClient.hset(hkey, server, userlist);
//       this.redisClient.sadd(skey,roomID);

//       if (this.conf && this.conf.expire) {
//         this.redisClient.expire(hkey, this.conf.expire, function (err, res) {
//         });
//       }

//     } else {
//       this.redisClient.hdel(hkey, server);
//       this.redisClient.srem(skey,roomID);
//     }
//   }
  
// };


SessionManager.prototype.addUserinfo == function (app, roomID, userId, callback) {

  var ukey =userId

  self.redisClient.sadd(roomID,ukey,callback)

  return;
}

SessionManager.prototype.updateServerInfo == function (app, roomID, server, callback) {

  var skey = server;

  self.redisClient.set(roomID,skey,callback);

  return;
}


/**
 * Remove server datas from redis hash table

 * @name remove
 * @function
 * @param {string} app - application key
 * @param {string} roomID - room ID
 * @param {string} server - server name

 */

SessionManager.prototype.removeUserinfo =function(app,roomID,userID){

  self.redisClient.srem(roomID,userID) //TODO: errhandle

  return;

}

SessionManager.prototype.removeAllUserinfo =function(app,roomID){

  //대충 코드 짬 다시 짜야함

  this.redisClient.smembers(roomIDs,(err,result)=>{

    if(err){
      //TODO: errHandle
    }

    var memberCount =result

    for(var i=0; i<memberCount;i++){
      self.redisClient.spop(roomID) 
    }
    
  })

  return;

}

SessionManager.prototype.removeServerinfo =function(app,roomID){

  self.redisClient.del(roomID,userID) //TODO: errhandle

  return;

}

SessionManager.prototype.removeAll = function (app, server,callback) {

  var self = this;
  
  var skey = Constants.SMOOTHY_CONNECTION + ':' + app + ':' + server;

  this.redisClient.smembers(skey,(err,results)=>{
    
    if(err){
      
      return; //TODO: errHandle
    }

    logger.debug(JSON.stringify(results));

    var roomIDs =results;

    roomIDs.forEach((roomID)=>{

      var hkey = Constants.SMOOTHY_CONNECTION + ':' + app + ':' + roomID;
      
      self.redisClient.hdel(hkey,server)

    })

    self.redisClient.del(skey)

    callback(null)

  });

};