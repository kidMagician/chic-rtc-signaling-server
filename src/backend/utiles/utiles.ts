

function getIP() {

  var interfaces = require('os').networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) return alias.address;
    }
  }

  return '0.0.0.0';
};

function setWSProtocal(url:string,wss:string){
  if(wss){
    return 'wss://'+url
  }else{
    return 'ws://'+url
  }  
  
}

function getGoogleComputIp(hostname:string){

  return "104.154.203.178"
}

export {getIP,setWSProtocal,getGoogleComputIp}