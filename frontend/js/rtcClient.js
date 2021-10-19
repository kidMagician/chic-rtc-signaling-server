function initRtcPeerClient(iceServers,otherUserID,remoteVideo,callback){


    var configuration = {"iceServers": [
                            // iceServers.stunServer,
                            iceServers.turnServer
                            // {
                            //     url: 'turn:numb.viagenie.ca',
                            //     "username":"webrtc@live.com",
                            //     "credential":"webrtc@live.com"
                            // }
                      ]}; 

    var conn = new webkitRTCPeerConnection(configuration); 
    
    var peerClient={peerConnection:conn}
    
    peerClient.remoteVideo = remoteVideo

    peerClient._eventEmmiter = new EventEmitter();
    
    peerClient.addEventListener =function(event,callback){
        peerClient._eventEmmiter.addListener(event,callback)
    }
    
    conn.addStream(stream); 
          
    conn.onaddstream = function (e) { 
        remoteVideo.srcObject = e.stream; 
    };
          
    conn.onicecandidate = function (event) { 
    if (event.candidate) { 
        
        signalingSocket.send({ 
            type: NEGOTIATION_MESSAGE.CANDIDATE, 
            candidate: event.candidate,
            toUserID: otherUserID
        });
       
    }};

    conn.oniceconnectionstatechange = function(event){
        switch(conn.iceConnectionState){
            case "connected":

                console.log(otherUserID," peerConnection connected ")

                // peerClient._eventEmmiter.emit("connected")
                // todo eventEmit
                
            break;
            case "disconnected":

                console.log(otherUserID," peerConnection disconnected ")

                // peerClient._eventEmmiter.emitemit("disconnected")

            break;
            case "failed":

            console.log(otherUserID," peerConnection failed ")

                // peerClient._eventEmmiter.emitemit("failed")
                //to do event
            
            break;
            case "closed":

                console.log(otherUserID," peerConnection closed ")
              
            break;
        }
    }
          
    return callback(null,peerClient)

}

function isCompletedRtcPeerClient(client){

    if(client.peerConnection.iceConnectionState ==="completed"){
        return true;
    }else{
        return false;
    }

}



