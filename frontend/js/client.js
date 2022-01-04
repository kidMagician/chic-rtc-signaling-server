var connectedUser;
var room;

var peerConns={}; 
var stream;
var signalingSocket;
var iceServers={};

const BROADCASTMESSAGE ={
      ENTER_ROOM:"broadcast:enterRoom",
      LEAVE_ROOM:"broadcast:leaveRoom"
}
  
const NEGOTIATION_MESSAGE ={
      OFFER:"negotiation:offer",
      ANSWER:"negotiation:answer",
      CANDIDATE:"negotiation:candidate",
      SUCESS_NEGOTIATION:"negotiation:sucess",
      FAILED_NEGOTIATION:"negotiation:failed"
}

const ROOM_MESSANGE ={
      ENTER_ROOM:"room:enterRoom",
      FAILED_ENTER_ROOM:"room:failedEnterRoom",
      LEAVE_ROOM:"room:leaveRoom",
}

const SESSION_MESSAGE ={
      LOGIN: "session:login",
      LOGOUT: "session:logout"
}

const ERR_MESSAGE ={
      INVALIDMESSAGE: "err:invalidMessage",
      INVALIDUSER: "err:invalidUser",
      SERVER_ERR:"err:serverError"
}

function SignalingSocket(){

}

SignalingSocket.prototype.init= function(wsURL,callback){
      try{
            this.websocket = new WebSocket(wsURL);
      }catch(e){
            console.log(e)
      }

      this.websocket.onopen = function () { 
            console.log("Connected to the signaling server");
            callback() 
      };
            
      
      this.websocket.onmessage = function (msg) { 
            console.log("Got message", msg.data);
            
            var data = JSON.parse(msg.data); 
            
            switch(data.type) { 
            
                  case SESSION_MESSAGE.LOGIN: 
                        handleLogin(data.success); 
                  break;

                  case SESSION_MESSAGE.LOGOUT: 
                        handleLogout();  
                  break;

                  case "authenticate":
                        handleAuthenticate(data.success);
                  break;

                  case ROOM_MESSANGE.ENTER_ROOM:
                        handleEnterRoom();
                  break;

                  case ROOM_MESSANGE.LEAVE_ROOM:
                        handleLeaveRoom();
                  break;

                  case NEGOTIATION_MESSAGE.OFFER: 
                        handleOffer( data.fromUserID,data.sdp); 
                  break;

                  case NEGOTIATION_MESSAGE.ANSWER: 
                        handleAnswer(data.fromUserID,data.sdp); 
                  break; 
                  
                  case NEGOTIATION_MESSAGE.CANDIDATE: 
                        handleCandidate(data.fromUserID,data.candidate); 
                  break; 
                  
                  case BROADCASTMESSAGE.LEAVE_ROOM:
                        handleBroadcastLeaveRoom(data.userID);
                  break;
                              
                  default:

                  break; 
            }
      };
            
      this.websocket.onerror = function (err) { 
            console.log("Got error", err); 
      };  
     
}

SignalingSocket.prototype.send = function (message) { 
      if (connectedUser.name) { 
            message.fromUserID = connectedUser.name; 
      } 
      
      console.log("send Message" +JSON.stringify(message))

      try{
            this.websocket.send(JSON.stringify(message)); 
      }catch(exception){
      
            console.log("failed webscoket send\ndetail:",exception)
      
      }
    
};
 
var userIDInput = document.querySelector('#userIDInput'); 

var roomPage = document.querySelector('#RoomPage'); 
var roomIDInput = document.querySelector('#roomIDInput'); 
var enterRoomBtn = document.querySelector('#enterRoomBtn'); 

var callPage = document.querySelector('#callPage'); 
var inviteoUserIDInput = document.querySelector('#inviteUserIDInput');
var inviteBtn = document.querySelector('#inviteBtn'); 
var displayRoomID =document.querySelector("#displayRoomID");

var leaveRoomBtn = document.querySelector('#leaveRoomBtn');

var videoArea = document.querySelector('#videoArea');
var localVideo = document.querySelector('#localVideo'); 


callPage.style.display = "none";

function getChannelinfo(userID,roomID,callback) {
      httpRequest = new XMLHttpRequest();
  
      if(!httpRequest) {
            console.log('XMLHttpRequest not working')
            callback(new Error('XMLHttpRequest not working'))
      }

      var url

      if(window.location.protocol =='https:'){
            url= 'https://rtc-session.smoothy-dev.com/room/'+roomID+'/user/'+userID //+'/nationcode/kor' 
      }else{
            url= 'http://127.0.0.1:8080/room/'+roomID+'/user/'+userID //+ '/nationcode/kor'
      }

      httpRequest.open('GET',url ,true);

      httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                  if (httpRequest.status === 200) {

                        var response = httpRequest.responseText
                        console.log(response)

                        callback(null, parsingResponseData(response))

                  } else {

                        console.log('http response err');
                        callback(new Error('http response err'))

                  }
            }
      }

      function parsingResponseData(responseText){

            return JSON.parse(responseText)
      }

      httpRequest.send(null);

}
  

enterRoomBtn.addEventListener("click",function(){
    
      connectedUser={
            name: userIDInput.value
      };

      var roomID = roomIDInput.value;

      room = {roomID:roomID};

      displayRoomID.innerHTML =roomID;	

      getChannelinfo(userIDInput.value,roomIDInput.value,function(err,channelInfo){

            if(err){
                  console.log(err.toString())
                  
            }else{
                  if(channelInfo.room.users){
                        
                        room.users =channelInfo.room.users

                  }else{
                        room.users =[]
                  }

                  if(channelInfo.serverinfo.stunServer){
                        iceServers.stunServer =channelInfo.serverinfo.stunServer
                  }

                  if(channelInfo.serverinfo.turnServer){
                        iceServers.turnServer =channelInfo.serverinfo.turnServer
                  }
                  
                  signalingSocket = new SignalingSocket() 
                  
                  signalingSocket.init(channelInfo.serverinfo.signalServer.url,function(){
                        if (connectedUser.name.length > 0) { 
                              signalingSocket.send({ 
                                    type: SESSION_MESSAGE.LOGIN, 
                              }); 
                        }
                  })
            
            

            }

      })
      
});


inviteBtn.addEventListener("click", function () { 
      var inviteUserID = inviteUserIDInput.value;
            
      if (inviteUserID.length > 0) { 

            signalingSocket.send({ 
                  type: "invite", 
                  toUserID: inviteUserID,
                  roomID: room.roomID
            });
      }
});

leaveRoomBtn.addEventListener("click", function () { 

      signalingSocket.send({ 
         type: ROOM_MESSANGE.LEAVE_ROOM, 
         roomID: room.roomID
      });  
         
});
  
function handleLogin(success) { 
      if (success === false) { 

            connectedUser =null;
            alert("Ooops...try a different userID"); 

      } else { 

            if (room.roomID.length > 0) {       
                  signalingSocket.send({
                        type: ROOM_MESSANGE.ENTER_ROOM,
                        roomID: room.roomID
                  });
            }
      } 
};

function handleAuthenticate(success){

      if(!success){
            alert("ooops.....user is not valid ");
      }

}

function handleEnterRoom(){
      var users =room.users

      switchToCallpage()

      if(users.length<=0){

            navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) { 
                  stream = myStream;      
                  localVideo.srcObject = stream;
                              
            }, function (error) { 
                  console.log(error); 
            
            });

      }else{

            navigator.webkitGetUserMedia({ video: true, audio: true }, function (myStream) { 
                  stream = myStream; 
                        
                  localVideo.srcObject = stream;
                  users.forEach((user,i)=>{

                        var userID = user.userID
                        
                        createRemoteVideo(videoArea,null,(err,remoteVideo)=>{
                              if(err){
                              console.log(err)
                              }
                              
                              if(remoteVideo){
                                    
                                    initRtcPeerClient(iceServers,userID,remoteVideo,(err,client)=>{

                                          peerConns[userID]=client

                                          var conn = client.peerConnection
                                          
                                          conn.createOffer(function (offer) { 
                                          
                                                signalingSocket.send({ 
                                                      type: NEGOTIATION_MESSAGE.OFFER, 
                                                      sdp: offer,
                                                      toUserID:userID
                                                }); 

                                                conn.setLocalDescription(offer); 

                                          }, function (error) { 
                                                alert("Error when creating an offer"); 
                                          });
                        
                                    })

                              }else{
                              console.log("videoTemplete not available")
                              }

                        })

                  })
  
                 
            }, function (error) { 

                  console.log(error);
                  
            });
            
      }
}

function handleOffer(userID,offer) { 

      createRemoteVideo(videoArea,null,(err,remoteVideo)=>{
            if(err){
                  console.log(err)
            }
            
            if(remoteVideo){

                  initRtcPeerClient(iceServers,userID,remoteVideo,(err,client)=>{

                        peerConns[userID]=client

                        var conn =client.peerConnection
                        
                        conn.setRemoteDescription(new RTCSessionDescription(offer));
            
                        conn.createAnswer(function (answer) { 
                              conn.setLocalDescription(answer); 
                                    
                              signalingSocket.send({ 
                              type: NEGOTIATION_MESSAGE.ANSWER, 
                              sdp: answer,
                              toUserID: userID
                              });
                              
                        }, function (error) { 
                              alert("Error when creating an answer"); 
                        }); 

                  })

            }else{
                  console.log("videoTemplete not available")
            }

      })
      
};
  
function handleAnswer(userID,answer) { 
      peerConns[userID].peerConnection.setRemoteDescription(new RTCSessionDescription(answer)); 
};
  
function handleCandidate(userID,candidate) { 
      peerConns[userID].peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); 
};

function handleLeaveRoom(){

      room = null;
      
      stream.getTracks().forEach((track,i)=>{
            track.stop();
      })
      
      for( userID in peerConns){

            peerConns[userID].peerConnection.close(); 
            peerConns[userID].peerConnection.onicecandidate = null; 
            peerConns[userID].peerConnection.onaddstream = null;

            peerConns[userID].remoteVideo.pause();
            deleteRemoteleteRemoteVideo(peerConns[userID].remoteVideo)
            peerConns[userID].remoteVideo=null

      }

      signalingSocket.send(
            {
                  type:SESSION_MESSAGE.LOGOUT
            }
      )
      

}

function handleBroadcastLeaveRoom(userID){

      console.log(userID +" gone")

      if(peerConns[userID]){

            peerConns[userID].peerConnection.close();
            peerConns[userID].peerConnection.onicecandidate = null; 
            peerConns[userID].peerConnection.onaddstream = null;

            peerConns[userID].remoteVideo.pause()
            deleteRemoteleteRemoteVideo(peerConns[userID].remoteVideo)
            peerConns[userID].remoteVideo=null
      }
}
  
function handleLogout() { 
      connectedUser = null; 

      switchToRoomPage()
      
};

function createRemoteVideo(dom,source,callback){

      var remoteVideo=document.createElement('video');
      remoteVideo.autoplay =true;

      if(source){
            remoteVideo.srcObject = source
      }

      dom.appendChild(remoteVideo)

      return callback(null,remoteVideo);

}

function deleteRemoteleteRemoteVideo(remoteVideo){

      var parentElement = remoteVideo.parentElement

      parentElement.removeChild(remoteVideo)

      remoteVideo.srcObject =null;

}

function switchToCallpage(){

      roomPage.style.display ="none";
      callPage.style.display = "block";
}


function switchToRoomPage(){

      roomPage.style.display ="block";
      callPage.style.display = "none";

}