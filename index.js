var SessionServer = require('./backend/server/session-server/session-server').SessionServer

var sessionServer =new SessionServer()

var sessionConf ={
  
    "port": 8080
}


sessionServer.init(sessionConf,undefined,(err)=>{

    if(err){

        console.info('session server init failed err:',err.toString())

        //TODO: process kill
    
    }else{
        
        console.info("sessionServer inited")

        sessionServer.listen((err)=>{

            if(err){
        
                console.info('session server listening failed err:',err)
                    //TODO process kill
            }else{

                console.info("sessionServer listening port ",sessionConf.port)
                
            }
            
        })
    }

})