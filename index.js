var SessionServer = require('./backend/server/session-server/session-server').SessionServer

var sessionServer =new SessionServer()

var sessionConf ={
  
    "port": 3000
}

sessionServer.init(sessionConf,undefined,(err)=>{

    if(err){

        logger.info('session server init failed err:',err.toString())

        //TODO: process kill
    
    }else{
        
        logger.info("sessionServer inited")

        sessionServer.listen((err)=>{

            if(err){
        
                logger.info('session server listening failed err:',err)
                    //TODO process kill
            }else{

                logger.info("sessionServer listening port ",sessionConf.port)
                
            }
            
        })
    }

})