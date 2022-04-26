var async = require('async');

import {EventEmitter}  from 'events'
import ws from 'ws'
import * as userModule from './user'
import * as roomModule  from './room'
import * as errors from './errors'
import {logger} from '../../logger'
import { Room } from './entity';

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

interface SignalMessage{
  type:string
}

class SignalingServer extends EventEmitter{
  
  wss:ws

  constructor(){
    super()
  }

  init(wss:ws,callback:any){

    if(wss){

        this.wss = wss

        this._start()

        logger.info("signaling server successfully inited")

        callback(null)

    }else{
        callback(new Error("wss cant not be null"))
    }
    
    return
  }

  _start(){

      var self = this

      self.wss.on('connection', function(connection:ws.WebSocket) {
          
          logger.info("[SignalServer] user connected" );

          self.emit('connection',connection)
      
          connection.on('message', function(message:string) { 
        
            logger.info("got message",message )  

            var parsedMessage:SignalMessage

            async.waterfall([
              function(asyncCallBack:any){
                self.parsingMessage(message,asyncCallBack);
                  
              },
              function(mParsedMessage:any,asyncCallBack:any){
        
                parsedMessage = mParsedMessage;
        
                logger.info("parsedMessage :",parsedMessage)
        
                self.isInvalidMessage(parsedMessage,asyncCallBack)
        
              },
              function(asyncCallBack:any){
        
                if(self.whatType(parsedMessage.type) ==="session"){
          
                  self.handleSessionMessage(parsedMessage,connection,asyncCallBack)
        
                }else{
          
                  self.handleMessage(parsedMessage,asyncCallBack)
                }
          
              }
          
              ],function(e:errors.SignalingServerError){
                if(e){

                  e.sendErrMessage(connection)    //TODO: check what is

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

  parsingMessage(message:string,callback:any){

    var data; 
    
    try { 
        data = JSON.parse(message); 

    } catch (e) { 
        logger.error("Invalid JSON e:",e); 
        
        return callback(new errors.InvalidMessageError("Invalid JSON"))
    }

    return callback(null,data)
  }

  handleSessionMessage(parsedMessage:any,connection:ws.WebSocket,callback:any){    //TODO: make parsedMessage interface 


    var data = parsedMessage
    
    switch (data.type) {
      case SESSION_MESSAGE.LOGIN:

        
        userModule.createUser(data.fromUserID,connection,(err:errors.SignalingServerError,success:Boolean)=>{

          if(err){

            return err.sendErrMessage(connection)
          }

          var message = {
            type: SESSION_MESSAGE.LOGIN,
            success: success
          }

          logger.info("successfully login ",data.fromUserID)

          connection.send(JSON.stringify(message));

          // self.emit()
        });

      break;
      case SESSION_MESSAGE.LOGOUT:
              
        logger.info(data.fromUserID ," logout");
        
        userModule.deleteUser(data.fromUserID)

        var message ={
        
          type: SESSION_MESSAGE.LOGOUT,
          fromUserID: data.fromUserID,
          success: true
        };

        connection.send(JSON.stringify(message));
        
        // self.emit() //TODO: emit what?

      break;
    }

    callback(null)
    
  }

  isInvalidMessage(parsedMessage:any,callback:any){
    
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

  handleMessage(parsedMessage:any,callback:any){

    var self =this

    var data = parsedMessage;

    switch (data.type) {
      
      case ROOM_MESSANGE.ENTER_ROOM: 
          
        logger.info("enter room",data.fromUserID ,data.roomID)

        async.waterfall([
          
          function(asyncCallBack:any){

              if(roomModule.isRoom(data.roomID)){
                logger.info("enterRoom")

                roomModule.enterRoom(data.roomID,data.fromUserID,(err:errors.SignalingServerError,enteredRoom:Room)=>{
                  if(err){

                    asyncCallBack(err);

                  }else{
                    self.emit('enterRoom',data.roomID,enteredRoom,data.fromUserID);  
                    asyncCallBack(null);

                  }
      
                });

              }else{

                
                logger.info("createRoom("+ data.roomID+")")

                roomModule.createRoom(data.roomID,data.fromUserID,(err:errors.SignalingServerError,createdRoom:Room)=>{
                  
                  if(err){
                    asyncCallBack(err)
                  }else{
                    self.emit('createRoom',data.roomID,createdRoom,data.fromUserID);
                    asyncCallBack(null)
                  }

                })
              }

          }],function(err:errors.SignalingServerError){
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

              roomModule.broadcast(data.fromUserID,data.roomID,broadcastMessage,(err:errors.SignalingServerError)=>{
                
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
        
        roomModule.leaveRoom(data.fromUserID,data.roomID,(err:Error)=>{

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

            roomModule.broadcast(data.fromUserID,data.roomID,broadcastMessage,(err:Error)=>{
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


  closeConnection(connection:ws.WebSocket){

    logger.info("ws client connection close")

    var self = this;
    
    userModule.findUserFromConnection(connection,(err:Error,isUser:Boolean,userID:string)=>{
      
      if(err){
        logger.error(err)  //err shuld not be happen
      }

      if(isUser){

        self.closeConnectionWithUserID(userID)

      }
    })

    
  }

  closeConnectionWithUserID(userID:string){

    logger.info('ws client connection close userID:' + userID)

    var self = this
    
    userModule.isInRoom(userID,(err:Error,isRoom:Boolean,roomID:string)=>{

      if(err){
        logger.error(err)
        throw err
      }

      if(isRoom){

        logger.info(userID ,"leaveRoom from " ,roomID)

        roomModule.leaveRoom(userID,roomID,(err:Error)=>{
          
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

              roomModule.broadcast(userID,roomID,broadcastMessage,(err:Error)=>{
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

  whatType(type:string){

    var mType 

    var splitVar =type.split(":")
    
    mType =splitVar[0]

    return mType
    
  }
}

export {SignalingServer}