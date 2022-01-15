
import { Response } from 'express';

class HttpError extends Error {

    code:number;
    message:string
    details:string

    constructor(code:number,message:string,details:string){

        super()
        this.code = code;
        this.message = message;
        this.details = details;

        
    }

    send(res:Response) {
    
        res.status(this.code).json({
          error: {
            code: this.code,
            message: this.message,
            details: this.details
          }
        });
    };

    
}


class BadRequestError extends HttpError{
    constructor(details:string){
        super( 400, 'Bad Request', details);
    }

}

class ServerError extends HttpError{
    constructor(details:string){
        super( 500, 'Internal Server Error', details);
    }

}

class NotFoundError extends HttpError{
    constructor(details:string){
        super(  404, 'Not Found', details);
    }

}



export {
    BadRequestError,
    ServerError,
    NotFoundError
}


