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
        if (!err) {

            logger.info(' (init) REDIS     is connected  (for session data)');
            parallelCallback(null)
        }else{
            logger.info(' (init) REDIS     is connect faild  (for session data) \n err:',err.toString());
            parallelCallback(err);
        }
          
    })

    process.on('uncaughtException', function(error) {
        logger.info("uncaughtException....")
        self.sessionManger.removeAll("smoothyRTC",self.serverName,(err)=>{
            process.nextTick(function() { process.exit(1) })
        })

    })

    self._start()
    callback(null)
}

ChannelServer.prototype._start = function(){
    
    self = this;
    signal = this.signal

    signal.on('enterRoom', function(roomID,room,userID) {

        self.sessionManger.addUserinfo(
            'chicRTC',roomID,userID
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


        self.sessionManger.removeUserinfo(roomID,userID)

        //???: serverinfo를 지울것인가? 말것인가?



    })
}
