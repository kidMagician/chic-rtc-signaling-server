var errors =require('./errors')
/**
 * websocket에 접속되어 있는 user 관리 하는 모듈 
 */

var users ={};  

const USER_STATUS={
    INROOM : 'inroom',   
    ONLINE :'online'
}

module.exports.users = users;
module.exports.USER_STATUS=USER_STATUS;

/**
 * 
 * @param {String} userID 
 * @param {Object} connection -websocket 커넥션 객체 
 * @param {function}} callback 
 */
module.exports.createUser =function(userID,connection,callback){

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
 * @param {String} userID 
 * @param {function} callback 
 */
module.exports.deleteUser = function(userID){
    
    delete users[userID];
    
}

/**
 * 
 * @param {String} userID 
 * @param {String} message 
 * @param {function} callback 
 */
module.exports.sendTo = function (userID, message,callback) { 

    if(!userID){
        return callback(new errors.InvalidMessageError("userID can not be null"));
    }

    if(!users[userID]){
        return callback(new errors.InvalidMessageError("connection is not avaliavle userID:"+ userID));
    }

    try{
        users[userID].connection.send(JSON.stringify(message));

    }catch(e){

       return callback(e)
    
    }
}

/**
 * 유저가 접속되어 있는지 접속되어 있지 않는지 확인해주는 function(중복 접속 금지)
 * @param {String} userID 
 * @returns {Boolean} 
 */
module.exports.authenticate = function(userID){

    if(users[userID]){ 
        
        return true;

    }else{
        
        return false;
    }

}


/**
 * websocket connection으로부터 user를 찾아주는 function
 * @param {String} conn 
 * @param {function} callback 
 */
module.exports.findUserFromConnection = function(conn,callback){


    if(!conn){
        return callback(new errors.InvalidMessageError("connection can not be null"));
    }

    for(userID in users){
        if(users[userID].connection ===conn){

            return callback(null,true,userID)
        }
    }

    return callback(null,false,null)
}


/**
 * 
 * @param {String} userID 
 * @param {function} callback 
 */
module.exports.isInRoom = function(userID,callback){
    
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
 * @param {String[]} userIDs 
 * @param {String} message 
 */
module.exports.broadcast = function(userIDs,message){

    userIDs.array.forEach(userID => {
        users[userID].connection.send(JSON.stringify(message))
    });
}

module.exports.getUserNum = function(){

    return Object.keys(users).length
}

module.exports.getConnection= function(userID,callback){
    if(!userID){
        
        callback(new errors.ServerError("userID can not be null"))
    
    }else{
        if(users[userID].connection){
            callback(null, users[userID].connection)
        }else{
            callbak(null,false)
        }

    }
}
