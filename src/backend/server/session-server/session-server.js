var express = require('express');

var bodyParser = require('body-parser');
import {SessionManager} from "../session-manager/session-manager"

var utiles = require('../../utiles/utiles')
const  logger  = require('../logger').logger

class SessionServer{
    
    constructor(){
        this.conf={};
        this.server
        this.sessionServer
    }

    init(conf,callback){
    
        this.conf ={
            port: conf.port || '8000',
            host: this.conf.host || utiles.getIP(),
            redis: conf.redis
    
        }
    
        this.server = express()

        var self =this
    
        this.sessionManager =new SessionManager(this.conf.redis,function (err) {
            if (!err) {
    
                self._start()
    
                logger.info(
                    "sessionServer sucessfully inited "+
                    "\nconf:" +JSON.stringify(self.conf)
                )
    
                callback(null);
            }else{
    
                logger.info('session server init failed err:',err.toString())
    
                
                callback(err);  //TODO:  Callback was already called err 
            }
            
        });
    
    
    }

    _start(){
        
    
        this.server.use(bodyParser())
    
        var FRONTENDPATH = require('./constants').FRONTENDPATH;
        this.server.use(express.static(FRONTENDPATH))
        
        var self =this

        this.server.get('/room/:rid/user/:uid',function(req,res){
    
            logger.debug("[Seeion server] http get params:" +JSON.stringify(req.params))
    
            if(!req.params.rid||!req.params.uid){
                
                var err= new errors.BadRequestError("userID or roomID could not be null")
    
                throw err
            }
    
            self.sessionManager.retrieveConnectedNode('CHIC_RTC',req.params.rid,(sessionData)=>{
                
                var users =[]
    
                if(sessionData || sessionData.userInfo){
    
                    users =sessionData.userInfo 
                  
                }
    
                var room ={
                    roomID: req.params.rid,
                    users: users
                }
    
                // var serverNode
    
                var responseData ={
                    serverinfo:{
                        signalServer:{
                            serverName: "chic-rtc-test-server",
                            url: "ws://localhost:9000",
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
    
        this.server.get('/',function(req,res){
            
            res.sendFile(FRONTENDPATH+"/views/client.html");
    
        })
    
    }

    listen = function(callback){

        try{
            if(!this.conf.ssl){
    
                this.server.listen(this.conf.port,(callback))
            }else{
    
                var https = require('https')
                var options = {  
                    key: this.conf.ssl.key,
                    cert: this.conf.ssl.cert
                };
        
                https.createServer(options,this.server).listen(this.conf.port,callback)
    
            }
    
            logger.info("sessionServer listening port ",this.conf.port)
    
            //CHECK: try catch working??
    
        }catch(exception){
    
            console.info('session server listening failed err:',exception)
            
            return callback(exception)
        }
    
        return callback(null)
    
    }

}



export {SessionServer}