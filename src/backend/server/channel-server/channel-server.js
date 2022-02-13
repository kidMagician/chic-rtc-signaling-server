var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utiles = require('./../../utiles/utiles')
import {SessionManager} from '../../session-manager/session-manager'
import { NodeManager } from '../../node-manager/node-manager';
var async = require('async')
const  logger  = require('../../logger').logger

class ChannelServer extends EventEmitter{

    constructor(){

        super()
        this.conf={};
        this.server
        this.signal
        this.serverName

    }

    init(conf,signalingServer,callback){

        this.conf ={
            host: conf.host || utiles.getIP(),
            port: conf.port || 9090,
            zookeeper: conf.zookeeper,
            redis: conf.redis,
            
        }

        this.serverName= conf.serverName

        this.conf.balancing = {
            SCALE: 60, // 단계별 Connection 수
            BUFFER_COUNT: 10, // replica 수정에 대한 인계치 버퍼
            MAX_LEVEL: 4, // scale 배수
            REPLICA_BASE_NUMBER: 4 //
        };

        if(!signalingServer){
            callback(new Error("websocket cant not be null"))
        }

        this.signal = signalingServer;

        var self = this

        async.parallel([
            function(parallelCallback){
    
                var startReplicas = Math.pow(Number(self.conf.balancing['REPLICA_BASE_NUMBER']), Number(self.conf.balancing['MAX_LEVEL']));
    
                self.nodeManager = new NodeManager(self.conf.zookeeper,false,(err)=>{
    
                    if(err){

                        return parallelCallback(err)
                    }

                    self.nodeManager.addServerNode(self.conf, startReplicas, function(err, path) {

                        if(err){
                            return parallelCallback(err)
                        }
                        var serverName = path.substring(path.lastIndexOf('/') + 1, path.length);
                        self.serverNodePath = path;
    
                        self.serverName = serverName.split('^')[0];
    
                        self.replicas = startReplicas;
    
    
                        parallelCallback(err);
                        
    
                        
                    });
                    

                   
                    
                })
    
            },
            function(parallelCallback){

                self.sessionManger = new SessionManager(self.conf.redis,(err)=>{
                    if (err) {
                        parallelCallback(err);
                    }
        
                    parallelCallback(null)
                    
                })
            }
        ],(err)=>{

            if(err){
                return callback(err)
            }

            self._start()
            logger.info("channel server successfully inited port: "+ conf.port)
            callback(null)
            

        })

        

        process.on('uncaughtException', function(error) {
            logger.info("channel uncaughtException.... "+ error.toString())
            self.sessionManger.removeAll("chicRTC",self.serverName,(err)=>{
                process.nextTick(function() { process.exit(1) })
            })

        })

        
        
    }

    _start(){
        
        var self = this;
        

        this.signal.on('enterRoom', function(roomID,room,userID) {

            self.sessionManger.addUserinfo(
                'CHIC_RTC',roomID,userID,(err)=>{
                    //TODO: err handle
                }
            ); 
            
        }); 

        this.signal.on("createRoom", function(roomID,room,userID) { 

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

        this.signal.on("leaveRoom", function(roomID,room,userID) { 

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
}



export {ChannelServer}