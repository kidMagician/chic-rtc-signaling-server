var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utiles = require('./../../utiles/utiles')
var SessionManager = require('../session-manager/session-manager').SessionManager
var async = require('async')
const  logger  = require('../logger').logger

function ChannelServer(){

    this.conf={};
    this.server
    this.serverName

    EventEmitter.call(this);

}

util.inherits(ChannelServer, EventEmitter);

ChannelServer.prototype.init =function(conf,signalingServer,callback){

    this.conf ={
        host: conf.host || utiles.getIP(),
        port: conf.port || 9090,

        redis: conf.redis,
        
    }

    this.serverName= conf.serverName

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
    
    var self = this;
    var signal = this.signal

    signal.on('enterRoom', function(roomID,room,userID) {

        self.sessionManger.addUserinfo(
            'CHIC_RTC',roomID,userID,(err)=>{
                //TODO: err handle
            }
        ); 
        
    }); 

    signal.on("createRoom", function(roomID,room,userID) { 

        async.parallel(
            [
                (asyncCB)=>{

                    self.sessionManger.addUserinfo(
                        'CHIC_RTC',room.roomID,userID,asyncCB
                    )

                },
                (asyncCB)=>{
                    self.sessionManger.updateServerInfo(
                        'CHIC_RTC',roomID,self.serverName,asyncCB
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
            'CHIC_RTC',
            roomID,
            userID,
            (err)=>{
                if(err){
                    //TODO: errHandle
                }
            }
        )

        if(!room){

            self.sessionManger.removeServerinfo(
                'CHIC_RTC',
                roomID,
                (err)=>{
                    if(err){
                        //TODO: errHandle
                    }
                }
            )
        }

       
    })
}



module.exports.ChannelServer = ChannelServer