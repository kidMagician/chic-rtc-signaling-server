var RedisManager = require('./redis-manager')

import {logger}  from '../logger'
const async = require('async')

var Constants = {
  SERVER_INFO: 'SERVER_INFO',
  USER_INFO: 'USER_INFO'
}

interface SessionData{
  userInfo:string[]         //username set
  serverInfo:string    //servername
}


class SessionManager{
  
  conf:any
  redisClient:any
  
  constructor(config:any, callback:any) {

    this.conf = {};

    if (typeof(config) == 'function' && !callback) {
      callback = config;

      // default configurations
      // this.conf.expire = 120; // redis expire TTL (seconds)

    } else {
      if (config) this.conf = config;
    }

    this.redisClient = new RedisManager(this.conf);


    this.redisClient.on("error", function (err:Error) {

      logger.error("Redis error encountered : " + err);
      if (callback) callback("Redis error encountered :" +err);
    });

    this.redisClient.on("end", function (err:Error) {

      logger.warn("Redis connection closed");
      if (callback) callback('ERR-REDIS', 'failed to connect to Redis server(s). ');
    });

    this.redisClient.once("connect", function () {

      logger.info("successfully redis connected")
      if (callback) callback(null);
    });

  };

  /**
   * Get the server number according to channel name from redis hash table.

  * @name retrieve
  * @function
  * @param {string} app - application key
  * @param {string} channel - channel name
  * @param {callback} callback - callback function
  */
  retrieveConnectedNode(app:string, roomID:string, callback:any) {

    var ukey =Constants.USER_INFO +":"+app +":"+ roomID
    var skey = Constants.SERVER_INFO+":"+ app +":"+roomID;

    var sessionData:SessionData
    

    async.parallel(
      [
        (asyncCB:any)=>{

          this.redisClient.smembers(ukey, function (err:Error, res:string[]) {

            if(err){
              return asyncCB(err);
            }
            
            sessionData.userInfo=res

            return asyncCB();
          });

        },
        (asyncCB:any)=>{
          this.redisClient.get(skey, function (err:Error, res:string) {

            if(err){
              return asyncCB(err);
            }

            sessionData.serverInfo=res

            return asyncCB();
          });

        }
      ],(err:Error,results:any)=>{

        if(err){
          return callback(err) //TODO: errhanld
        }

        callback(null,sessionData)
        
      }

    )

    return

  };

  addUserinfo(app:string, roomID:string, userID:string, callback:any) {

    var ukey =Constants.USER_INFO +":"+app +":"+ roomID
  
    this.redisClient.sadd(ukey,userID,(err:Error,result:any)=>{
  
      if(err){
        callback(err)
  
        return
      }
  
      logger.debug(
        "successfully add userInfo(set) in redis " +
        `\n key: ${ukey}, value:${userID}` 
      )
  
      callback()
  
      return 
  
    })
  
    return;
  }
  
  updateServerInfo(app:string, roomID:string, server:string, callback:any) {

    var skey = Constants.SERVER_INFO+":"+ app +":"+roomID;
  
    this.redisClient.set(skey,server,(err:Error,result:any)=>{
  
      if(err){
        callback(err)
  
        return
      }
  
      logger.debug(
        "successfully set serverinfo(strings) in redis, "+
        `key: ${skey}, value: ${server}` 
      )
  
      return callback()
  
    });
  
    return;
  }
  
  
  
  removeServerinfo(app:string, roomID:string, callback:any) {

    var skey = Constants.SERVER_INFO+":"+ app +":"+roomID;
  
    this.redisClient.del(skey,(err:Error,result:any)=>{
  
      if(err){
        callback(err)
  
        return
      }
  
      logger.debug(
        "successfully del serverinfo(strings) in redis"+
        "skey:" +skey 
      )
  
      return callback()
  
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
  
   */
  
  removeUserinfo(app:string,roomID:string,userID:string,callback:any){
  
    var ukey =Constants.USER_INFO +":"+app +":"+ roomID
  
    this.redisClient.srem(ukey,userID,(err:Error,result:any)=>{
  
      if(err){
        
        return callback(err) //TODO: add err message 
      }
  
      logger.debug(
        "successfully remove userinfo(strings) in redis"+
        `\nkey${ukey}, value: ${userID}` 
      )
  
      return callback()
  
    });
  
      //TODO: errhandle
  
    return;
  
  }
  
  removeAllUserinfo(app:string,roomID:string,callback:any){
  
    var ukey =Constants.USER_INFO +":"+app +":"+ roomID
  
    //대충 코드 짬 다시 짜야함
  
    this.redisClient.smembers(ukey,(err:Error,result:any)=>{
  
      if(err){
        return callback(err)
        //TODO: errHandle
      }
  
      var memberCount =result
  
      for(var i=0; i<memberCount;i++){
        this.redisClient.spop(roomID) 
      }
      
    })
  
    return;
  
  }
  
  
  
  removeAll(app:string, server:string,callback:any) { //TODO: 수정하자.
  
    var self = this;
    
    var skey = server;
  
    this.redisClient.smembers(skey,(err:Error,results:any)=>{
      
      if(err){
        
        return callback(err); //TODO: errHandle
      }
  
      logger.debug(JSON.stringify(results));
      console.log(JSON.stringify(results));
      var roomIDs =results;
  
      roomIDs.forEach((roomID:string)=>{
  
        var hkey = app + ':' + roomID;
        
        self.redisClient.hdel(hkey,server)
  
      })
  
      self.redisClient.del(skey)
  
      callback(null)
  
    });
  
  };

}





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




export {
  SessionManager,
  SessionData
}