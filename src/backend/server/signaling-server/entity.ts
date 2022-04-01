import ws from 'ws'

interface Room{
    users:{[key:string]:User},
    roomID:string
}

interface User{
    userID:string
    connection:ws.WebSocket
    status:string
    roomID?:string|null
}

export {
    User,
    Room
}