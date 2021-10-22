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

        callback(null)

    }else{
        callback(new Error("wss cant not be null"))
    }
}

SignalingServer.prototype._start = function(){

    var self = this

    self.wss.on('connection', function(connection) {
        
        logger.info("[SignalServer] user connected");

        // self.emit('connection',connection)
    
        connection.on('message', function(message) { 
      
          logger.info("got message",message )  

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

SignalingServer.prototype.isInvalidMessage =function(parsedMessage,callback){
}

SignalingServer.prototype.handleSessionMessage = function(parsedMessage,connection,callback){
}

SignalingServer.prototype.handleMessage = function(parsedMessage,callback){
}


SignalingServer.prototype.closeConnection = function(connection){

    logger.info("ws client connection close")
  
}