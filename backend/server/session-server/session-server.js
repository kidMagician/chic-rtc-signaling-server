var express = require('express');

var bodyParser = require('body-parser');
var SessionManager = require("../session-manager/session-manager").SessionManager


var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utiles = require('./../../utiles/utiles')
const  logger  = require('../logger').logger

function SessionServer(){

    this.conf={};
    this.server


    EventEmitter.call(this);

}

util.inherits(SessionServer, EventEmitter);

SessionServer.prototype.init = function(conf,server,callback){

    var self = this;

    self.conf ={
        port: conf.port || '8000',
        host: self.conf.host || utiles.getIP(),
        redis: conf.redis

    }

    if(!server){
        self.server = express()
    }else{
        self.server = server
    }

    self.sessionManager =new SessionManager(self.conf.redis,function (err) {
        if (!err) {
            logger.info(' (init) REDIS is connected');

            self._start()

            callback(null);
        }else{
            callback(err);  //TODO:  Callback was already called err 
        }
        
    });

    
    callback(null)

}

SessionServer.prototype._start = function(){

    var self = this;

    self.server.use(bodyParser())

    var FRONTENDPATH = require('./constants').FRONTENDPATH;
    self.server.use(express.static(FRONTENDPATH))

    self.server.get('/room/:rid/user/:uid',function(req,res){

        if(!req.params.rid||!req.params.uid){
            
            var err= new errors.BadRequestError("userID or roomID could not be null")

            throw err
        }

        self.sessionManager.retrieveConnectedNode('chicRTC',req.params.rid,(sessionData)=>{

            var room ={
                roomID: req.params.rid,
                users: [] ||  sessionData.userInfo 
            }

            var serverNode
    
            res.set("Access-Control-Allow-Origin","*")
            res.send(
                {
                    serverinfo:{
                        signalServer:{
                            serverName: "chic-rtc-test-server",
                            url: "localhost",
                        },
                        stunServer: {"url": "stun:stun2.1.google.com:19302" }
                    },
                    room :room
                }
            )
        })

       
    
    })

    self.server.get('/',function(req,res){
        
        res.sendFile(FRONTENDPATH+"/views/client.html");

    })

}

SessionServer.prototype.listen = function(callback){

    try{
        if(!this.conf.ssl){

            this.server.listen(this.conf.port)
        }else{

            var https = require('https')
            var options = {  
                key: this.conf.ssl.key,
                cert: this.conf.ssl.cert
            };
    
            https.createServer(options,this.server).listen(this.conf.port)

        }

    }catch(exception){
        logger.error(exception)
        return callback(exception)
    }

    return callback(null)

}

module.exports.SessionServer = SessionServer