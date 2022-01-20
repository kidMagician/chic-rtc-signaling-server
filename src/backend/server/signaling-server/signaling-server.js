var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var userModule= require('./user.js');
var roomModule= require('./room.js');
var errors = require('./errors')
var logger =require('../logger').logger

const BROADCASTMESSAGE ={
  ENTER_ROOM:"broadcast:enterRoom",
  LEAVE_ROOM:"broadcast:leaveRoom"
}

const NEGOTIATION_MESSAGE ={
  OFFER:"negotiation:offer",
  ANSWER:"negotiation:answer",
  CANDIDATE:"negotiation:candidate",
  SUCESS_NEGOTIATION:"negotiation:sucess",
  FAILED_NEGOTIATION:"negotiation:failed"
}

const ROOM_MESSANGE ={
  ENTER_ROOM:"room:enterRoom",
  FAILED_ENTER_ROOM:"room:failedEnterRoom",
  LEAVE_ROOM:"room:leaveRoom",
}

const SESSION_MESSAGE ={
  LOGIN: "session:login",
  LOGOUT: "session:logout"
}

const ERR_MESSAGE ={
  INVALIDMESSAGE: "err:invalidMessage",
  INVALIDUSER: "err:invalidUser",
  SERVER_ERR:"err:serverError"
}

function SignalingServer(){
  
  EventEmitter.call(this);
}
util.inherits(SignalingServer, EventEmitter);


SignalingServer.prototype.init = function(wss,callback){

    if(wss){

        this.wss = wss

        this._start()

        logger.info("signaling server successfully inited")

        callback(null)

    }else{
        callback(new Error("wss cant not be null"))
    }
}

SignalingServer.prototype._start = function(){

    var self = this

    self.wss.on('connection', function(connection) {
        
        logger.info("[SignalServer] user connected" );

        self.emit('connection',connection)
    
        connection.on('message', function(message) { 
      
          logger.info("got message",message )  

          var parsedMessage

          async.waterfall([
            function(asyncCallBack){
              self.parsingMessage(message,asyncCallBack);
                
            },
            function(mParsedMessage,asyncCallBack){
      
              parsedMessage = mParsedMessage;
      
              logger.info("parsedMessage :",parsedMessage)
      
              self.isInvalidMessage(parsedMessage,asyncCallBack)
      
            },
            function(asyncCallBack){
      
              if(self.whatType(parsedMessage.type) ==="session"){
        
                self.handleSessionMessage(parsedMessage,connection,asyncCallBack)
      
              }else{
        
                self.handleMessage(parsedMessage,asyncCallBack)
              }
        
            }
        
            ],function(e){
              if(e){

                e.sendErrMessage(connection)

              }
              
            })
          }); 
          
        connection.on("close", function() { 
          if(connection!=null){
            self.closeConnection(connection)
          }
        })    
    })
}

SignalingServer.prototype.parsingMessage = function(message,callback){

  var data; 
  
  try { 
      data = JSON.parse(message); 

  } catch (e) { 
      logger.error("Invalid JSON e:",e); 
      
      return callback(new errors.InvalidMessageError("Invalid JSON"))
  }

  return callback(null,data)
}

SignalingServer.prototype.handleSessionMessage = function(parsedMessage,connection,callback){
  
  var self = this

  var data = parsedMessage
  
  switch (data.type) {
    case SESSION_MESSAGE.LOGIN:

      
      userModule.createUser(data.fromUserID,connection,(err,success)=>{

        if(err){

          err.sendErrMessage(connection)
        }

        var message = {
          type: SESSION_MESSAGE.LOGIN,
          success: success
        }

        logger.info("successfully login ",data.fromUserID)

        connection.send(JSON.stringify(message));

        self.emit()
      });

    break;
    case SESSION_MESSAGE.LOGOUT:
            
      logger.info(data.fromUserID ," logout");
      
      userModule.deleteUser(data.fromUserID)

      message ={
      
        type: SESSION_MESSAGE.LOGOUT,
        fromUserID: data.fromUserID,
        success: true
      };

      connection.send(JSON.stringify(message));
      
      self(emit)

    break;
  }

  callback(null)
  
}

SignalingServer.prototype.isInvalidMessage =function(parsedMessage,callback){
  
  var data = parsedMessage

  if(!data.type){
    
    return callback(new errors.InvalidMessageError("type undefiend"))
  } 

  switch (data.type) {

    case SESSION_MESSAGE.LOGIN:
      if(!data.fromUserID){

        return callback(new errors.InvalidMessageError("fromUserID undefiend"))

      }

    break

    case SESSION_MESSAGE.LOGOUT:
      if(!data.fromUserID){

        return callback(new errors.InvalidMessageError("fromUserID undefiend"))

      }

    break

    case ROOM_MESSANGE.ENTER_ROOM:
      if(!data.fromUserID || !data.roomID){

        return callback(new errors.InvalidMessageError("fromUserID or roomID undefiend"))

      }

    break

    case ROOM_MESSANGE.LEAVE_ROOM:

      if(!data.fromUserID || !data.roomID){

        return callback(new errors.InvalidMessageError("fromUserID or roomID undefiend"))

      }

    break

    case NEGOTIATION_MESSAGE.OFFER:

      if(!data.fromUserID || !data.toUserID || !data.sdp){

        return callback(new errors.InvalidMessageError("fromUserID or toUserID or offer undefiend"))

      }

    break

    case NEGOTIATION_MESSAGE.ANSWER:

      if(!data.fromUserID || !data.toUserID|| !data.sdp){

        return callback(new errors.InvalidMessageError("fromUserID or toUserID or answer undefiend"))

      }

    break;

    case NEGOTIATION_MESSAGE.CANDIDATE:

    if(!data.fromUserID || !data.candidate || !data.toUserID){

      return callback(new errors.InvalidMessageError("fromUserID or toUserID or candidate undefiend"))

    }

    break;

    default:

      return callback(new errors.InvalidMessageError("invalid Type type: " +data.type))

    break;

  }
    
  return callback(null)
  
}

SignalingServer.prototype.handleMessage = function(parsedMessage,callback){

  var self =this

  var data = parsedMessage;

  switch (data.type) {
    
    case ROOM_MESSANGE.ENTER_ROOM: 
        
      logger.info("enter room",data.fromUserID ,data.roomID)

      async.waterfall([
        function(asyncCallBack){
          roomModule.isRoom(data.roomID,asyncCallBack)

        },
        function(isRoom,asyncCallBack){
            if(isRoom){
              logger.info("enterRoom")

              roomModule.enterRoom(data.roomID,data.fromUserID,(err,enteredRoom)=>{
                if(err){

                  asyncCallBack(err);

                }else{
                  self.emit('enterRoom',data.roomID,enteredRoom,data.fromUserID);  
                  asyncCallBack(null);

                }
    
              });

            }else{

              
              logger.info("createRoom("+ data.roomID+")")

              roomModule.createRoom(data.roomID,data.fromUserID,(err,createdRoom)=>{
                
                if(err){
                  asyncCallBack(err)
                }else{
                  self.emit('createRoom',data.roomID,createdRoom,data.fromUserID);
                  asyncCallBack(null)
                }

              })
            }

        }],function(err){
          if(err){

            logger.error(err.toString())

            callback(err)
            
          }else{

            var message ={

              // from:data.fromUserID,
              type: ROOM_MESSANGE.ENTER_ROOM,
              success: true
            }

            userModule.sendTo(data.fromUserID,message);

            var broadcastMessage ={

              from:data.fromUserID,
              type: BROADCASTMESSAGE.ENTER_ROOM,
              userID: data.fromUserID,
            }

            roomModule.broadcast(data.fromUserID,data.roomID,broadcastMessage,(err)=>{
              
              if(err){
                //TODO: errHandle
              }

            })

            
            callback(null)
            
          }
        }
      )
      
          
    break;
    case ROOM_MESSANGE.LEAVE_ROOM: 
    
      logger.info(data.fromUserID ," leave from",data.roomID);
      
      roomModule.leaveRoom(data.fromUserID,data.roomID,(err)=>{

        if(err){
          //can not be err
        }

        self.emit('leaveRoom',data.roomID,roomModule.rooms[data.roomID]);

        var message={

          fromUserID: data.fromUserID,
          type: ROOM_MESSANGE.LEAVE_ROOM,

        }

        userModule.sendTo(data.fromUserID,message);

        var broadcastMessage={
          userID: data.fromUserID,
          type: BROADCASTMESSAGE.LEAVE_ROOM
        }

        if(roomModule.rooms[data.roomID]){

          roomModule.broadcast(data.fromUserID,data.roomID,broadcastMessage,(err)=>{
            if(err){
              
              callback(err)
            }
            
          });

        }
        
        callback(null)

      });
    
    break;

    case NEGOTIATION_MESSAGE.OFFER:
  
      logger.info("Sending offer from ", data.fromUserID,"to ",data.toUserID);
    
      userModule.sendTo(data.toUserID, { 
        fromUserID: data.fromUserID,
        type: NEGOTIATION_MESSAGE.OFFER, 
        sdp: data.sdp, 
        toUserID: data.toUserID
      }); 

      // self.emit();  
      callback(null)

    break;

    case NEGOTIATION_MESSAGE.ANSWER: 

      logger.info("Sending answer from ",data.fromUserID ," to ",data.toUserID); 

      userModule.sendTo(data.toUserID, { 
        fromUserID: data.fromUserID,
        type: NEGOTIATION_MESSAGE.ANSWER, 
        sdp: data.sdp, 
        toUserID: data.toUserID
      }); 

      // self.emit();
      callback(null)

    break; 
    
    case NEGOTIATION_MESSAGE.CANDIDATE: 
      
      logger.info("Sending candidate from",data.fromUserID," to ", data.toUserID); 

      userModule.sendTo(data.toUserID, { 
        fromUserID: data.fromUserID,
        type: NEGOTIATION_MESSAGE.CANDIDATE, 
        candidate: data.candidate, 
        toUserID: data.toUserID
      }); 

      // self.emit();
      callback(null)
      
    break;

    default: 

      logger.error("send Invalide Message err to ",data.fromUserID )
      userModule.sendTo(data.fromUserID, { 
          type: ERR_MESSAGE.INVALIDMESSAGE, 
          message: "sending Invalid Message type:" + data.type 
        }); 
      callback(null)
    
    break; 
  }


}


SignalingServer.prototype.closeConnection = function(connection){

  logger.info("ws client connection close")

  var self = this;
  
  userModule.findUserFromConnection(connection,(err,isUser,userID)=>{
    
    if(err){
      logger.error(err)  //err shuld not be happen
    }

    if(isUser){

      self.closeConnectionWithUserID(userID)

    }
  })

  
}

SignalingServer.prototype.closeConnectionWithUserID = function(userID){

  logger.info('ws client connection close userID:' + userID)

  var self = this
  
  userModule.isInRoom(userID,(err,isRoom,roomID)=>{

    if(err){
      logger.error(err)
      throw err
    }

    if(isRoom){

      logger.info(userID ,"leaveRoom from " ,roomID)

      roomModule.leaveRoom(userID,roomID,(err)=>{
        
        if(err){
          logger.error(err)             // this err never happen. if this happen, server have to die
          throw err
        }else{

          self.emit("leaveRoom",roomID,roomModule.rooms[roomID],userID)

          if(roomModule.rooms[roomID]){

            var broadcastMessage={
              userID: userID,
              type: BROADCASTMESSAGE.LEAVE_ROOM
            }

            roomModule.broadcast(userID,roomID,broadcastMessage,(err)=>{
              if(err){
                logger.error(err);
                throw err
              }
            
            });

          }
        }
      })
    }
  });

  userModule.deleteUser(userID)

}

SignalingServer.prototype.whatType = function(type){

  var mType 

  var splitVar =type.split(":")
  
  mType =splitVar[0]

  return mType
  
}

module.exports.SignalingServer= SignalingServer