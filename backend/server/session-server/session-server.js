var express = require('express');

var bodyParser = require('body-parser');


var EventEmitter = require('events').EventEmitter;
var util = require('util');


function SessionServer(){

    this.conf={};
    this.server


    EventEmitter.call(this);

}

util.inherits(SessionServer, EventEmitter);

SessionServer.prototype.init = function(conf,server,callback){

    var self = this;

    if(!server){
        self.server = express()
    }else{
        self.server = server
    }

}

SessionServer.prototype._start = function(){

    self.server.use(bodyParser())

    var FRONTENDPATH = require('./constants').FRONTENDPATH;
    self.server.use(express.static(FRONTENDPATH))

    self.server.get('/',function(req,res){
        
        res.sendFile(FRONTENDPATH+"/views/client2.html");
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