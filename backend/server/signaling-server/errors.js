var util = require('util')
var userModule = require('./user')
// var logger = require('../logger').logger

const ERR_TYPE ={
    INVALIDMESSAGE: "err:invalidMessage",
    INVALIDUSER: "err:invalidUser",
    SERVER_ERR:"err:serverError"
}


function SignalingServerError(type,message){
    
    this.type =type
    this.message = message
    Error.call(this, message);

}

util.inherits(SignalingServerError, Error);


SignalingServerError.prototype.sendErrMessage = function(conn){

    var message = {
        type: this.type,
        message: this.message
    }
    
    // logger.info("send errMessage",message)

    try{
        conn.send(JSON.stringify(message))
    }catch(e){
        closeConnection(conn)
    }
    

}

SignalingServerError.prototype.sendErrMessagewithUserID = function(userID){

    var message = {
        type: this.type,
        message: this.message
    }
    
    // logger.info(
    //     "send errMessage \n"
    //     +"userID: ", +userID
    //     +"message: ", message

    // )

    userModule.sendTo(userID,message,(err)=>{
        
    })  
    

}

module.exports.SignalingServerError =SignalingServerError


function InvalidMessageError(message){

    SignalingServerError.call(this,ERR_TYPE.INVALIDMESSAGE,message)
}

util.inherits(InvalidMessageError, SignalingServerError);

module.exports.InvalidMessageError = InvalidMessageError


function ServerError(message){
    
    SignalingServerError.call(this,ERR_TYPE.SERVER_ERR,message)
}

util.inherits(ServerError,SignalingServerError)

module.exports.ServerError = ServerError


function InvalidUserError(message){

    SignalingServerError.call(this,ERR_TYPE.INVALIDMESSAGE,message)
}

util.inherits(InvalidUserError,SignalingServerError)

module.exports.InvalidUserError =InvalidUserError




