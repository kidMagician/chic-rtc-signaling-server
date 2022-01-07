var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utiles = require('./../../utiles/utiles')
var SessionManager = require('../session-manager/session-manager').SessionManager
var async = require('async')
const  logger  = require('../logger').logger

function ChannelServer(){

    this.conf={};
    this.server

    EventEmitter.call(this);

}

util.inherits(ChannelServer, EventEmitter);

ChannelServer.prototype.init =function(conf,signalingServer,callback){

    this.conf ={
        host: conf.host || utiles.getIP(),
        port: conf.port || 9090,

        redis: conf.redis,
    }

    if(!signalingServer){
        callback(new Error("websocket cant not be null"))
    }

    this.signal = signalingServer;

    var self = this

    self.sessionManger = new SessionManager(self.conf.redis,(err)=>{
        if (err) {
            callback(err);
        }

        callback(null)
          
    })

    process.on('uncaughtException', function(error) {
        logger.info("channel uncaughtException.... "+ error.toString())
        self.sessionManger.removeAll("chicRTC",self.serverName,(err)=>{
            process.nextTick(function() { process.exit(1) })
        })

    })

    self._start()

    logger.info("chennel server successfully inited")
    callback(null)
}

ChannelServer.prototype._start = function(){
    
    self = this;
    signal = this.signal

    signal.on('enterRoom', function(roomID,room,userID) {

        self.sessionManger.addUserinfo(
            'chicRTC',roomID,userID,(err)=>{
                //TODO: err handle
            }
        ); 
        
    }); 

    signal.on("createRoom", function(roomID,room,userID) { 

        async.parallel(
            [
                (asyncCB)=>{

                    self.sessionManger.addUserinfo(
                        'chicRTC',room.roomID,userID,asyncCB
                    )

                },
                (asyncCB)=>{
                    self.sessionManger.updateServerInfo(
                        'chicRTC',roomID,self.serverName,asyncCB
                    ); 
                }
                
            ],
            (err,result)=>{

                if(err){
                    //TODO: errHandle
                }
                //TODO: something
            }

        )

    })

    signal.on("leaveRoom", function(roomID,room,userID) { 


        self.sessionManger.removeUserinfo(
            'chic-rtc',
            roomID,
            userID,
            (err)=>{
                if(err){
                    //TODO: errHandle
                }
            }
        )

        //???: serverinfo를 지울것인가? 말것인가?
    })
}



module.exports.ChannelServer = ChannelServer