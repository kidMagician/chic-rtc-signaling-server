var SessionServer = require('./backend/server/session-server/session-server').SessionServer
var ChannelServer = require('./backend/server/channel-server/channel-server').ChannelServer

// var sessionServer =new SessionServer()

// var sessionConf ={
  
//     "port": 8080
// }


// sessionServer.init(sessionConf,undefined,(err)=>{

//     if(err){

//         console.info('session server init failed err:',err.toString())

//         //TODO: process kill
    
//     }else{
        
//         console.info("sessionServer inited")

//         sessionServer.listen((err)=>{

//             if(err){
        
//                 console.info('session server listening failed err:',err)
//                     //TODO process kill
//             }else{

//                 console.info("sessionServer listening port ",sessionConf.port)
                
//             }
            
//         })
//     }

// })

var wsPort = 9000;
var WebSocketServer = require('ws').Server; 
var wss = new WebSocketServer(
    {
        port: wsPort,
        // server:server
    }
    
); 

var SignalingServer = require('./backend/server/signaling-server/signaling-server').SignalingServer
var signalingServer = new SignalingServer()

signalingServer.init(wss,(err)=>{

    if(err){
        console.error("fail channel server init err: "+ err.toString())
        return
    }

    var ChannelServer = require('./backend/server/channel-server/channel-server').ChannelServer
    var channelserver =new ChannelServer()

    var channelConf={
        "redis": {
            host:"127.0.0.1", 
            port:"6379",
            // password:"0000",
        },
        "host": "127.0.0.1",
        "port": wsPort,
        "ssl": false
    }

    channelserver.init(channelConf,signalingServer,(err)=>{

        if(err){

            console.log('channel server init failed err:',err.toString())
            // logger.info('channel server init failed err:',err.toString())

        }else{
            console.log("channel server inited port" ,wsPort )
            // logger.info("channel server inited port" ,wsPort )
        }

    });
  
})

