
var ROOM_AVAILABLE_USER_NUM = require('./constants').ROOM_AVAILABLE_USER_NUM;
var MAX_ROOM_NAME_LENGTH =require('./constants').MAX_ROOM_NAME_LENGTH;
var MIN_ROOM_NAME_LENGTH = require('./constants').MIN_ROOM_NAME_LENGTH;
var errors = require('./errors')

interface Room{
    users:any,
    roomID:string
}

var rooms :{[key:string]:Room} 

export {rooms};

import * as user from './user'

// var forbiddenNames :Array<string>

// /**
//  * 
//  * @param {*} roomName 
//  */
// function isNameForbidden(roomName:string){

//     return forbiddenNames.indexOf(roomIDs) >=0;
// }

// function isNameTooLong(roomID:String){

//     return roomID.length > MAX_ROOM_NAME_LENGTH; 
// }

// function isNameTooShort(roomID:String){

//     return roomID.length < MIN_ROOM_NAME_LENGTH;
// }

// function isUserinRoom(userID:string,roomID:string){

//     if (rooms[roomID].users[userID]){
        
//         return true;
//     }else{
//         return false;
//     }

// }



/**
 * Room이 존재하는지 확인
 * @param {string} roomID 
 * @param {function} callback 
 */
export function isRoom(roomID:string,callback:any){
    
    if(!roomID){
        return callback(new errors.InvalidMessageError('roomID cat not be null'))
    }

    if(!rooms[roomID]){
        callback(null,false)
    }else{
        return callback(null,true)
    }

}

/**
 * 
 * @param {string} roomID 
 * @param {string} userID 
 * @param {function} callback 
 */
export function createRoom(roomID:string,userID:string,callback:any){

    // if(!isNameForbidden(roomID)){

    //     return callback(new Error('roomID is forbiddenNames'));     
    // }

    // if(!isNameTooLong(roomID)){

    //     return callback(new Error('roomID is too Long'));
    // }

    // if(!isNameTooShort(roomID)){

    //     return callback(new Error('roomID is too Short'))
    // }

    if(!roomID){

        return callback(new errors.InvalidMessageError('roomeID can not be null'));
    }

    if(user.users[userID]){

        user.users[userID].status = user.USER_STATUS.INROOM;
        user.users[userID].roomID = roomID;
        
        var users :any ={};

        users[userID]= user.users[userID]; 

        rooms[roomID] = {
            roomID:roomID,
            users:users
        };

    }else{
        return callback(new errors.InvalidUserError(userID+' dont have connection you have to login first'))
    }

    var room = rooms[roomID]

    return callback(null,room)

}
/**
 * 
 * @param {string} roomID 
 * @param {function} callback 
 */
 function deleteRoom(roomID:string,callback:any){

    if(!roomID){

        return callback(new errors.InvalidMessageError('roomID can not be null'));
    }

    delete rooms[roomID]
    
    return callback(null)
}
/**
 * 
 * @param {string} roomID 
 * @param {string} userID 
 * @param {function} callback 
 */

export function enterRoom(roomID:string,userID:string, callback:any){

    if(!roomID){
        return callback(new errors.InvalidMessageError('roomename can not be null'));
    }

    if(!userID){
        return callback(new errors.InvalidMessageError('userID cant not be null'));
    }

    if(!rooms[roomID]){
        return callback(new errors.InvalidMessageError('room is not avaliavle \n roomID:'+roomID))  //it will never happen
    }

    if(!rooms[roomID].users[userID]){

        user.users[userID].status = user.USER_STATUS.INROOM;
        user.users[userID].roomID = roomID;
        
        rooms[roomID].users[userID] =user.users[userID];

        return callback(null,rooms[roomID])
    
    }else{
        
        return callback(
            new errors.InvalidMessageError(
                'user is alredy in the room \n' 
                +'userID: '+ userID + '\n'
                +'roomID: '+ roomID
            )
        );
    }

}

/**
 * 
 * @param {string} userID 
 * @param {string} roomID 
 * @param {function} callback 
 */
export function leaveRoom(userID:string,roomID:string,callback:any){

    if(!roomID){
        return callback(new errors.InvalidMessageError('roomename can not be null'));
    }

    if(!userID){
        return callback(new errors.InvalidMessageError('userID can not be null'));
    }

    if( rooms[roomID].users[userID] ){

        rooms[roomID].users[userID].status = user.USER_STATUS.ONLINE;
        rooms[roomID].users[userID].roomID = null;
        delete rooms[roomID].users[userID];
        
        if(Object.keys(rooms[roomID].users).length<=0){
            deleteRoom(roomID,(err:Error)=>{

                if(err){
                    return callback(err);
                }
            });
        }
    
    }

    return callback(null);
    

}

/**
 * 
 * @param {string} roomID 
 * @param {callback} callback 
 */
export function checkfull(roomID:string,callback:any){

    if(!roomID){
        return callback(new errors.InvalidMessageError('roomeID can not be null'));
    }

    if(roomID.length <= ROOM_AVAILABLE_USER_NUM){
        return callback(null,true);
    }else{
        return callback(null,false);
    }

}


/**
 * 룸에 있는 모든 인원에게 메시지 보내는 function
 * @param {string} from_userID 
 * @param {string} roomID 
 * @param {Object} message   
 * @param {function} callback 
 */
export function broadcast(from_userID:string,roomID:string,message:Object,callback:any){

    if(!from_userID){
        return callback(new errors.InvalidMessageError('userID can not be null'));
    }

    if(!roomID){
        return callback(new errors.InvalidMessageError('roomID can not be null'));
    }

    if(!rooms[roomID]){
        return callback(new errors.InvalidMessageError('room is not available'));
    }

    for(var userID in rooms[roomID].users){
        if(userID != from_userID){
            try{
                user.sendTo(userID,message)
            }catch(err){
                callback(err)
            }
            
        }
    }

    return callback(null)
    
}




