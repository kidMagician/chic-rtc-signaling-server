"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SessionManager = void 0;function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}function _defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}function _createClass(Constructor, protoProps, staticProps) {if (protoProps) _defineProperties(Constructor.prototype, protoProps);if (staticProps) _defineProperties(Constructor, staticProps);Object.defineProperty(Constructor, "prototype", { writable: false });return Constructor;}
var RedisManager = require('./redis-manager');

var logger = require('../logger').logger;
var async = require('async');

var Constants = {
  SERVER_INFO: 'SERVER_INFO',
  USER_INFO: 'USER_INFO' };var



SessionManager = /*#__PURE__*/function () {

  function SessionManager(config, callback) {_classCallCheck(this, SessionManager);

    this.conf = {};

    if (typeof config == 'function' && !callback) {
      callback = config;

      // default configurations
      // this.conf.expire = 120; // redis expire TTL (seconds)

    } else {
      if (config) this.conf = config;
    }

    this.redisClient = new RedisManager(this.conf);


    this.redisClient.on("error", function (err) {

      logger.error("Redis error encountered : " + err);
      if (callback) callback("Redis error encountered :" + err);
    });

    this.redisClient.on("end", function (err) {

      logger.warn("Redis connection closed");
      if (callback) callback('ERR-REDIS', 'failed to connect to Redis server(s). ');
    });

    this.redisClient.once("connect", function () {

      logger.info("successfully redis connected");
      if (callback) callback(null);
    });

  }_createClass(SessionManager, [{ key: "retrieveConnectedNode", value:

    /**
     * Get the server number according to channel name from redis hash table.
      * @name retrieve
    * @function
    * @param {string} app - application key
    * @param {string} channel - channel name
    * @param {callback} callback - callback function
    */

    function retrieveConnectedNode(app, roomID, callback) {var _this = this;

      var ukey = Constants.USER_INFO + ":" + app + ":" + roomID;
      var skey = Constants.SERVER_INFO + ":" + app + ":" + roomID;

      var serverInfo;
      var userInfo;

      async.parallel(
      [
      function (asyncCB) {

        _this.redisClient.smembers(ukey, function (err, res) {
          userInfo = res;

          return asyncCB();
        });

      },
      function (asyncCB) {
        _this.redisClient.get(skey, function (err, res) {

          serverInfo = res;

          return asyncCB();
        });

      }],
      function (err, results) {

        if (err) {
          return callback(err); //TODO: errhanld
        }

        callback({
          userInfo: userInfo,
          serverInfo: serverInfo });



      });



      return;

    } }, { key: "addUserinfo", value:

    function addUserinfo(app, roomID, userID, callback) {

      var ukey = Constants.USER_INFO + ":" + app + ":" + roomID;

      this.redisClient.sadd(ukey, userID, function (err, result) {

        if (err) {
          callback(err);

          return;
        }

        logger.debug(
        "successfully add userInfo(set) in redis " + "\n key: ".concat(
        ukey, ", value:").concat(userID));


        callback();

        return;

      });

      return;
    } }, { key: "updateServerInfo", value:

    function updateServerInfo(app, roomID, server, callback) {

      var skey = Constants.SERVER_INFO + ":" + app + ":" + roomID;

      this.redisClient.set(skey, server, function (err, result) {

        if (err) {
          callback(err);

          return;
        }

        logger.debug(
        "successfully set serverinfo(strings) in redis, " + "key: ".concat(
        skey, ", value: ").concat(server));


        return callback();

      });

      return;
    } }, { key: "removeServerinfo", value:



    function removeServerinfo(app, roomID, callback) {

      var skey = Constants.SERVER_INFO + ":" + app + ":" + roomID;

      this.redisClient.del(skey, function (err, result) {

        if (err) {
          callback(err);

          return;
        }

        logger.debug(
        "successfully del serverinfo(strings) in redis" +
        "skey:" + skey);


        return callback();

      });

      return;

    }


    /**
     * Remove server datas from redis hash table
    
     * @name remove
     * @function
     * @param {string} app - application key
     * @param {string} roomID - room ID
     * @param {string} server - server name
    
     */ }, { key: "removeUserinfo", value:

    function removeUserinfo(app, roomID, userID, callback) {

      var ukey = Constants.USER_INFO + ":" + app + ":" + roomID;

      this.redisClient.srem(ukey, userID, function (err, result) {

        if (err) {

          return callback(err); //TODO: add err message 
        }

        logger.debug(
        "successfully remove userinfo(strings) in redis" + "\nkey".concat(
        ukey, ", value: ").concat(userID));


        return callback();

      });

      //TODO: errhandle

      return;

    } }, { key: "removeAllUserinfo", value:

    function removeAllUserinfo(app, roomID) {

      var ukey = Constants.USER_INFO + ":" + app + ":" + roomID;

      //대충 코드 짬 다시 짜야함

      this.redisClient.smembers(ukey, function (err, result) {

        if (err) {
          return callback(err);
          //TODO: errHandle
        }

        var memberCount = result;

        for (var i = 0; i < memberCount; i++) {
          self.redisClient.spop(roomID);
        }

      });

      return;

    } }, { key: "removeAll", value:



    function removeAll(app, server, callback) {

      var self = this;

      var skey = server;

      this.redisClient.smembers(skey, function (err, results) {

        if (err) {

          return callback(err); //TODO: errHandle
        }

        logger.debug(JSON.stringify(results));
        console.log(JSON.stringify(results));
        var roomIDs = results;

        roomIDs.forEach(function (roomID) {

          var hkey = Constants.SMOOTHY_CONNECTION + ':' + app + ':' + roomID;

          self.redisClient.hdel(hkey, server);

        });

        self.redisClient.del(skey);

        callback(null);

      });

    } }]);return SessionManager;}();







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
exports.SessionManager = SessionManager;
//# sourceMappingURL=session-manager.js.map