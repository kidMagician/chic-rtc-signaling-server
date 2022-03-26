var util = require('util')
var userModule = require('./user')
var logger = require('../../logger').logger

const ERR_TYPE ={
    INVALIDMESSAGE: "err:invalidMessage",
    INVALIDUSER: "err:invalidUser",
    SERVER_ERR:"err:serverError"
}


export class SignalingServerError extends Error{
    
    type:string
    message:string

    constructor(type:string,message:string){

        super(message)
    
        this.type =type
        this.message = message
        
    
    }

    sendErrMessage(conn:any){

        var message = {
            type: this.type,
            message: this.message
        }
        
        logger.info("send errMessage",message)
    
        try{
            conn.send(JSON.stringify(message))
        }catch(e){
            //closeConnection(conn) TODO: errHandle
        }
        
    
    }

    sendErrMessagewithUserID(userID:string){

        var message = {
            type: this.type,
            message: this.message
        }
        
        logger.info(
            "send errMessage \n"
            +"userID: ", +userID
            +"message: ", message
    
        )
    
        userModule.sendTo(userID,message,(err:Error)=>{
            //TODO: errHandle
        })  
        
    
    }
    

}



export class InvalidMessageError extends SignalingServerError{

    constructor(message:string){

        super(ERR_TYPE.INVALIDMESSAGE,message)
    }
}


export class ServerError extends SignalingServerError{

    constructor(message:string){
    
        super(ERR_TYPE.SERVER_ERR,message)
    }
}


export class InvalidUserError extends SignalingServerError{

    constructor(message:string){

        super(ERR_TYPE.INVALIDMESSAGE,message)
    }
}




