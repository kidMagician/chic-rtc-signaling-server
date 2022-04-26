var fs = require('fs');
var argv  = require('optimist').argv;
var net = require('net');
var os = require('os');

var utils =require('./../src/backend/utiles/utiles');
var logger = require('../src/backend/logger').logger



var help =[

    "usage: start [type] [options] ",
    "",
    "Starts a SMoothy Server using the specified command-line options",
    "",
    "Examples:",
    "  $ start --session",
    "  $ start --session --config ../config.json",
    "  $ start --channel",
    "",
    "Options:",
    "  --port   PORT       Port that the channel server should run on",
    "  --config OUTFILE    Location of the configuration file for the server",
    "  --host   DOMAIN     Hostname",
    "  -h, --help          You're staring at it",
    "",
    "Environments:",
    "  TYPE         server type [session | channel] (default : session)",
    "  HOST         hostname (default : 0.0.0.0)",
    "  PORT         port (default : 0.0.0.0)",
    "  ZOOKEEPER    zookeeper address (default : 127.0.0.1:2181)",
    "  REDIS        redis address (default : 127.0.0.1:6379)",
    ""
].join('\n');

if (argv.h || argv.help) {
    console.log(help);
    process.exit(1);
}


var config ={};

if( argv.config ){
    try {
        var data = fs.readFileSync(argv.config);
        config = JSON.parse(data.toString());
    } catch (ex) {
      logger.error('Error starting session server: ' + ex);
      process.exit(1);
    }
}



var options={};


options['host']=argv.host || config.host || process.env.HOST || os.hostname() || utils.getIP();
options['port'] = argv.port || config.port || process.env.PORT || 8080;

options['zookeeper'] = config.zookeeper || process.env.ZOOKEEPER;
options['redis'] = config.redis || process.env.REDIS;

if(argv.session) options['type'] = 'session';
if(argv.channel) options['type'] = 'channel';

if((argv.key ||config.key)&& (argv.cert || config.cert)){
    try{
        options['ssl']={
            key: fs.readFileSync(argv.key ||config.key),
            cert: fs.readFileSync(argv.ket || config.cert)
        }
    }catch(e){
        logger.error(e.toString())
        process.exit(1);
    }
    
}


// var checkPort=function(port,callback){

//     var port = port || options['port'];

//     var tester = net.createServer()
//         .once('error', function (err) {

//         checkPort(callback, port + 100);

//         })
//         .once('listening', function () {
//         tester.once('close', function () {
//             callback(port);
//             })
//             .close();
//         })
//         .listen(port);
// }



if(options['type']=='channel'){

    var wsPort =options['port']
    var wss

    var server;

    if(options['ssl']){
        var https = require('https');
        server = new https.createServer(options['ssl'])

        var WebSocketServer = require('ws').Server; 
        wss = new WebSocketServer(
            {
                autoAcceptConnections: true,
                server:server
            }
            
        ); 

    }else{

        var http = require('http');
        server = new http.createServer()

        var WebSocketServer = require('ws').Server; 
        wss = new WebSocketServer(
            {
                autoAcceptConnections: true,
                server:server
            }
            
        ); 

    }
    

    var SignalingServer = require('../build/backend/server/signaling-server/signaling-server').SignalingServer
    var signalingServer = new SignalingServer()

    signalingServer.init(wss,(err)=>{
        if(!err){

            logger.info("signaling server init port:",wsPort)
            
            var ChannelServer = require('../build/backend/server/channel-server/channel-server').ChannelServer
            var channelserver =new ChannelServer()

            var channelConf={
                "zookeeper": options['zookeeper'],
                "redis": options['redis'],
                "host": options['host'],
                "port": wsPort,
                "ssl": options['ssl']
            }

            channelserver.init(channelConf,signalingServer,(err)=>{
                if(err){
                    logger.error(
                        'channel server init failed err:',err.message,
                        '\n',err.stack
                    )
                    process.exit(1)
                }else{
                    server.listen(wsPort)
                }

            });

        }else{
            logger.error(
                "signaling server init failed err: "+ err.toString()+
                err.stack
            
            )
            process.exit(1)      
        }
        
    })

}else{


    var SessionServer = require('../build/backend/server/session-server/session-server').SessionServer

    var sessionServer =new SessionServer()

    var sessionConf ={
        "zookeeper": options['zookeeper'],
        "redis": options['redis'],
        "port": options['port'],
        "ssl" : options['ssl']
    }

    sessionServer.init(sessionConf,(err)=>{


        if(err){

            logger.error(
                'session server init failed err: ', err.toString()
                ,'\n',err.stack
            )
            process.exit(1)
        }else{
            logger.info("sessionServer inited")

            sessionServer.listen((err)=>{

                if(err){
            
                    logger.error(
                        'session server listening failed err:',err.toString(),
                        '\n',err.stack
                    )
                    process.exit(1)
                }
                
            
            })
        }

    })
}



