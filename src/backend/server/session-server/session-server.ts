import express from 'express'

import bodyParser from 'body-parser'

import {SessionManager} from "../../session-manager/session-manager"
import { NodeManager } from "../../node-manager/node-manager";
import NodeConstants from "../../node-manager/constants"
import  https  from 'https'
import utiles  from '../../utiles/utiles'
import  {logger} from '../../logger'
var  async = require('async')


interface SessionConfig { 
    port: string|Number;
    host: string|null;
    redis: any;
    zookeeper: any;
    balancing?: any;
    ssl?:{
        key:string,
        cert:string
    }
}

class SessionServer{

    conf:SessionConfig;
    server:express.Express
    sessionManager:SessionManager
    nodeManager:NodeManager
    
    constructor(){
    }

    init(conf:any,callback:any){
    
        this.conf ={
            port: conf.port || '8000',
            host: conf.host || utiles.getIP(),
            redis: conf.redis,
            zookeeper: conf.zookeeper
    
        }
    
        this.server = express()

        var self =this

        async.parallel([
            (paralCallback:any)=>{
    
                this.sessionManager =new SessionManager(this.conf.redis,function (err:Error) {
                    if (err) {
                        
                        logger.error('session server init failed ')
                        return paralCallback(err);  
                    }

                    paralCallback(null)

                    
                });
            },
            (paralCallback:any)=>{
                self.nodeManager = new NodeManager(self.conf.zookeeper,true,(err:Error)=>{

                    if(err){
                        logger.error('nodeManager init failed ')
                        return paralCallback(err)
                    }

                    self.nodeManager.createEphemeralPath(
                        NodeConstants.META_PATH + NodeConstants.SESSION_SERVER_PATH + '/' + self.conf.host + ':' + self.conf.port,
                        null,
                        function (err:Error) {

                            if(err){
                                return paralCallback(err)
                            }else{

                                self.nodeManager.getConfigInfo('balancing', function (data:any) {
                                    if (data) {
                                        self.conf.balancing = data;
                                    }
                                });

                                paralCallback(null)
                            }                         
                        }
                    )

                    
                       
                });
            }
        ],(err:Error)=>{

            if(err){
                return callback(err)
            }

            self._start()

            logger.info(
                "sessionServer sucessfully inited "+
                "\nconf:" +JSON.stringify(self.conf)
            )

            callback(null);

        })
    }

    _start(){
        
    
        this.server.use(bodyParser())
    
        var FRONTENDPATH = require('./constants').FRONTENDPATH;
        this.server.use(express.static(FRONTENDPATH))
        
        var self =this

        this.server.get('/room/:rid/user/:uid',function(req:express.Request,res:express.Response){
    
            logger.debug("[Seeion server] http get params:" +JSON.stringify(req.params))
    
            if(!req.params.rid||!req.params.uid){
                
                // var err= new errors.BadRequestError("userID or roomID could not be null")    //TODO: errors 정의해서 넣기
    
                // throw err
            }
    
            self.sessionManager.retrieveConnectedNode('CHIC_RTC',req.params.rid,(err:Error,sessionData:any)=>{

                if(err){
                    logger.error(err)
                    //TODO: errHandle send ServerError
                }
                
                var users:[] =[]
                var serverNode
    
                if(sessionData || sessionData.userInfo){
    
                    users =sessionData.userInfo 
                  
                }
    
                var room ={
                    roomID: req.params.rid,
                    users: users
                }
    
                serverNode =self.nodeManager.getServerNode(req.params.rid)
    
                var responseData ={
                    serverinfo:{
                        signalServer:{
                            serverName: serverNode.name,
                            url: utiles.setWSProtocal(serverNode.url,null)
                        },
                        stunServer: {"url": "stun:stun2.1.google.com:19302" }
                    },
                    room :room
                }
    
                logger.debug(
                    "[Seeion server] http get params:" +JSON.stringify(req.params) +
                    "\n response data:" + JSON.stringify(responseData)
                )
        
                res.set("Access-Control-Allow-Origin","*")
                res.send(responseData)
            })
    
           
        
        })
    
        this.server.get('/',function(req:express.Request,res:express.Response){
            
            res.sendFile(FRONTENDPATH+"/views/client.html");
    
        })
    
    }

    listen(callback:any){

        
        if(!this.conf.ssl){

            this.server.listen(this.conf.port)
            
        }else{

            
            var options = {  
                key: this.conf.ssl.key,
                cert: this.conf.ssl.cert
            };
    
            https.createServer(options,this.server).listen(this.conf.port)

        }

        logger.info("sessionServer listening port ",this.conf.port)

        //TODO: port 사용중일떄 에러 발생하도록 하기
        // logger.error('session server listening failed')
        // return callback(exception)
        
    
        return callback(null)
    
    }

}



export {SessionServer}