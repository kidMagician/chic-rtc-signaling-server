import * as errors from './errors'
import ws from 'ws'
/**
 * websocket에 접속되어 있는 user 관리 하는 모듈 
 */

interface User{
    userID:string
    connection:ws.WebSocket
    status:string
    roomID?:string
}

var users :{[key:string]:User}={}   

const USER_STATUS={
    INROOM : 'inroom',   
    ONLINE :'online'
}

export {
    users,
    USER_STATUS,
    User
};


/**
 * 
 * @param {string} userID 
 * @param {Object} connection -websocket 커넥션 객체 
 * @param {function}} callback 
 */
export function createUser(userID:string,connection:ws.WebSocket,callback:any){

    if(!userID){
        callback(new errors.InvalidMessageError('userID can not be null'));
    }

    if(!connection){
        callback(new errors.ServerError('connection can not be null'))
    }
    if(!users[userID]){
        users[userID] ={
            userID:userID,
            connection:connection,
            status:USER_STATUS.ONLINE
        };
        return callback(null,true);

    }else{
        
        return callback(null,false); 
    }

}
/**
 * 
 * @param {string} userID 
 * @param {function} callback 
 */
export function deleteUser(userID:string){
    
    delete users[userID];
    
}

/**
 * 
 * @param {string} userID 
 * @param {Object} message 
 * @param {function} callback 
 */
export function sendTo(userID:string, message:{}) { 

    if(!userID){
        throw new errors.InvalidMessageError("userID can not be null")
    }

    if(!users[userID]){
        throw new errors.InvalidMessageError("connection is not avaliavle userID:"+ userID)
    }

    
    users[userID].connection.send(JSON.stringify(message));

    
}

/**
 * 유저가 접속되어 있는지 접속되어 있지 않는지 확인해주는 function(중복 접속 금지)
 * @param {String} userID 
 * @returns {Boolean} 
 */
export function authenticate(userID:string){

    if(users[userID]){ 
        
        return true;

    }else{
        
        return false;
    }

}


/**
 * websocket connection으로부터 user를 찾아주는 function
 * @param {ws.WebSocket} conn 
 * @param {function} callback 
 */
export function findUserFromConnection(conn:ws.WebSocket,callback:any){


    if(!conn){
        return callback(new errors.InvalidMessageError("connection can not be null"));
    }

    for(var userID in users){
        if(users[userID].connection ===conn){

            return callback(null,true,userID)
        }
    }

    return callback(null,false,null)
}


/**
 * 
 * @param {string} userID 
 * @param {function} callback 
 */
export function isInRoom(userID:string,callback:any){
    
    if(!userID){
        return callback(new errors.InvalidMessageError("usernaem can not be null"));
    }
    
    if(users[userID].status ===USER_STATUS.INROOM){

        return callback(null,true,users[userID].roomID);

    }else{

        return callback(null,false,null);
    }
    
}

/**
 * 불특정 유저에게 브로드케스트 메시지를 보내는 function
 * @param {string[]} userIDs 
 * @param {string} message 
 */
export function broadcast(userIDs:[],message:string){

    userIDs.forEach(userID => {
        users[userID].connection.send(JSON.stringify(message))
    });
}

export function getUserNum(){

    return Object.keys(users).length
}

export function getConnection(userID:string,callback:any){
    if(!userID){
        
        callback(new errors.ServerError("userID can not be null"))
    
    }else{
        if(users[userID].connection){
            callback(null, users[userID].connection)
        }else{
            callback(null,false)
        }

    }
}
