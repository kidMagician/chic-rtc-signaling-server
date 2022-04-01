import {EventEmitter} from 'events'
import util from 'util';
import utiles from './../../utiles/utiles'
import {SessionManager} from '../../session-manager/session-manager'
import { NodeManager } from '../../node-manager/node-manager';
import { SignalingServer } from '../signaling-server/signaling-server';
var async =require('async')
import  {logger}  from '../../logger'
import { Room } from '../signaling-server/entity';



interface ChannelConfig{
    host:String
    port:String
    zookeeper:any       //TODO: make zooConf interface 
    redis:any           //TODO: make redisConf interface
    balancing:{
        SCALE: number,          // 단계별 Connection 수
        BUFFER_COUNT: number,   // replica 수정에 대한 인계치 버퍼
        MAX_LEVEL: number,         // scale 배수
        REPLICA_BASE_NUMBER: number //
    }
}

class ChannelServer extends EventEmitter{

    conf:ChannelConfig;
    signal:SignalingServer;
    serverName:string;
    sessionManager:SessionManager
    nodeManager:NodeManager
    serverNodePath:String
    replicas:number

    constructor(){

        super()

    }

    init(conf:any,signalingServer:SignalingServer,callback:any){

        this.conf ={
            host: conf.host || utiles.getIP(),
            port: conf.port || 9090,
            zookeeper: conf.zookeeper,
            redis: conf.redis,
            balancing:{
                SCALE: 60, // 단계별 Connection 수
                BUFFER_COUNT: 10, // replica 수정에 대한 인계치 버퍼
                MAX_LEVEL: 4, // scale 배수
                REPLICA_BASE_NUMBER: 4 //
            }
            
        }

        this.serverName= conf.serverName


        if(!signalingServer){
            callback(new Error("websocket cant not be null"))
        }

        this.signal = signalingServer;

        var self = this

        async.parallel([
            function(parallelCallback:any){
    
                var startReplicas = Math.pow(Number(self.conf.balancing['REPLICA_BASE_NUMBER']), Number(self.conf.balancing['MAX_LEVEL']));
    
                self.nodeManager = new NodeManager(self.conf.zookeeper,false,(err:Error)=>{
    
                    if(err){

                        return parallelCallback(err)
                    }

                    self.nodeManager.addServerNode(self.conf, startReplicas, function(err:Error, path:String) {

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
            function(parallelCallback:any){

                self.sessionManager = new SessionManager(self.conf.redis,(err:Error)=>{
                    if (err) {
                        parallelCallback(err);
                    }
        
                    parallelCallback(null)
                    
                })
            }
        ],(err:Error)=>{

            if(err){
                return callback(err)
            }

            self._start()
            logger.info("channel server successfully inited port: "+ conf.port)
            callback(null)
            

        })

        

        process.on('uncaughtException', function(error) {
            logger.info("channel uncaughtException.... "+ error.toString())
            self.sessionManager.removeAll("chicRTC",self.serverName,(err:Error)=>{
                process.nextTick(function() { process.exit(1) })
            })

        })

        
        
    }

    _start(){
        
        var self = this;
        

        self.signal.on('enterRoom', function(roomID:string,room:Room,userID:string) {

            self.sessionManager.addUserinfo(
                'CHIC_RTC',roomID,userID,(err:Error)=>{
                    if(err){
                        return logger.error(err) //TODO: errHandle
                    }
                }
            ); 
            
        }); 

        this.signal.on("createRoom", function(roomID:string,room:Room,userID:string) { 

            async.parallel(
                [
                    (asyncCB:any)=>{

                        self.sessionManager.addUserinfo(
                            'CHIC_RTC',room.roomID,userID,asyncCB
                        )

                    },
                    (asyncCB:any)=>{
                        self.sessionManager.updateServerInfo(
                            'CHIC_RTC',roomID,self.serverName,asyncCB
                        ); 
                    }
                    
                ],
                (err:Error,result:any)=>{

                    if(err){
                        return logger.error(err)
                    }
                    //TODO: something
                }

            )

        })

        this.signal.on("leaveRoom", function(roomID:string,room:Room,userID:string) { 

            self.sessionManager.removeUserinfo(
                'CHIC_RTC',
                roomID,
                userID,
                (err:Error)=>{
                    if(err){
                        return logger.error(err) //TODO: errHandle
                    }
                }
            )

            if(!room){

                self.sessionManager.removeServerinfo(
                    'CHIC_RTC',
                    roomID,
                    (err:Error)=>{
                        if(err){
                            return logger.error(err) //TODO: errHandle
                        }
                    }
                )
            }

        
        })
    }
}



export {ChannelServer}