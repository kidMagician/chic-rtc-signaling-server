"use strict";function _typeof(obj) {"@babel/helpers - typeof";return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {return typeof obj;} : function (obj) {return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;}, _typeof(obj);}Object.defineProperty(exports, "__esModule", { value: true });exports.broadcast = broadcast;exports.checkfull = checkfull;exports.createRoom = createRoom;exports.enterRoom = enterRoom;exports.isRoom = isRoom;exports.leaveRoom = leaveRoom;exports.rooms = void 0;














var user = _interopRequireWildcard(require("./user"));function _getRequireWildcardCache(nodeInterop) {if (typeof WeakMap !== "function") return null;var cacheBabelInterop = new WeakMap();var cacheNodeInterop = new WeakMap();return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) {return nodeInterop ? cacheNodeInterop : cacheBabelInterop;})(nodeInterop);}function _interopRequireWildcard(obj, nodeInterop) {if (!nodeInterop && obj && obj.__esModule) {return obj;}if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") {return { "default": obj };}var cache = _getRequireWildcardCache(nodeInterop);if (cache && cache.has(obj)) {return cache.get(obj);}var newObj = {};var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;for (var key in obj) {if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;if (desc && (desc.get || desc.set)) {Object.defineProperty(newObj, key, desc);} else {newObj[key] = obj[key];}}}newObj["default"] = obj;if (cache) {cache.set(obj, newObj);}return newObj;}var ROOM_AVAILABLE_USER_NUM = require('./constants').ROOM_AVAILABLE_USER_NUM;var MAX_ROOM_NAME_LENGTH = require('./constants').MAX_ROOM_NAME_LENGTH;var MIN_ROOM_NAME_LENGTH = require('./constants').MIN_ROOM_NAME_LENGTH;var errors = require('./errors');var rooms = {};exports.rooms = rooms;

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
function isRoom(roomID, callback) {

  if (!roomID) {
    return callback(new errors.InvalidMessageError('roomID cat not be null'));
  }

  if (!rooms[roomID]) {
    callback(null, false);
  } else {
    return callback(null, true);
  }

}

/**
 * 
 * @param {string} roomID 
 * @param {string} userID 
 * @param {function} callback 
 */
function createRoom(roomID, userID, callback) {

  // if(!isNameForbidden(roomID)){

  //     return callback(new Error('roomID is forbiddenNames'));     
  // }

  // if(!isNameTooLong(roomID)){

  //     return callback(new Error('roomID is too Long'));
  // }

  // if(!isNameTooShort(roomID)){

  //     return callback(new Error('roomID is too Short'))
  // }

  if (!roomID) {

    return callback(new errors.InvalidMessageError('roomeID can not be null'));
  }

  if (user.users[userID]) {

    user.users[userID].status = user.USER_STATUS.INROOM;
    user.users[userID].roomID = roomID;

    var users = {};

    users[userID] = user.users[userID];

    rooms[roomID] = {
      roomID: roomID,
      users: users };


  } else {
    return callback(new errors.InvalidUserError(userID + ' dont have connection you have to login first'));
  }

  var room = rooms[roomID];

  return callback(null, room);

}
/**
 * 
 * @param {string} roomID 
 * @param {function} callback 
 */
function deleteRoom(roomID, callback) {

  if (!roomID) {

    return callback(new errors.InvalidMessageError('roomID can not be null'));
  }

  delete rooms[roomID];

  return callback(null);
}
/**
 * 
 * @param {string} roomID 
 * @param {string} userID 
 * @param {function} callback 
 */

function enterRoom(roomID, userID, callback) {

  if (!roomID) {
    return callback(new errors.InvalidMessageError('roomename can not be null'));
  }

  if (!userID) {
    return callback(new errors.InvalidMessageError('userID cant not be null'));
  }

  if (!rooms[roomID]) {
    return callback(new errors.InvalidMessageError('room is not avaliavle \n roomID:' + roomID)); //it will never happen
  }

  if (!rooms[roomID].users[userID]) {

    user.users[userID].status = user.USER_STATUS.INROOM;
    user.users[userID].roomID = roomID;

    rooms[roomID].users[userID] = user.users[userID];

    return callback(null, rooms[roomID]);

  } else {

    return callback(
    new errors.InvalidMessageError(
    'user is alredy in the room \n' +
    'userID: ' + userID + '\n' +
    'roomID: ' + roomID));


  }

}

/**
 * 
 * @param {string} userID 
 * @param {string} roomID 
 * @param {function} callback 
 */
function leaveRoom(userID, roomID, callback) {

  if (!roomID) {
    return callback(new errors.InvalidMessageError('roomename can not be null'));
  }

  if (!userID) {
    return callback(new errors.InvalidMessageError('userID can not be null'));
  }

  if (rooms[roomID].users[userID]) {

    rooms[roomID].users[userID].status = user.USER_STATUS.ONLINE;
    rooms[roomID].users[userID].roomID = null;
    delete rooms[roomID].users[userID];

    if (Object.keys(rooms[roomID].users).length <= 0) {
      deleteRoom(roomID, function (err) {

        if (err) {
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
function checkfull(roomID, callback) {

  if (!roomID) {
    return callback(new errors.InvalidMessageError('roomeID can not be null'));
  }

  if (roomID.length <= ROOM_AVAILABLE_USER_NUM) {
    return callback(null, true);
  } else {
    return callback(null, false);
  }

}


/**
 * 룸에 있는 모든 인원에게 메시지 보내는 function
 * @param {string} from_userID 
 * @param {string} roomID 
 * @param {Object} message   
 * @param {function} callback 
 */
function broadcast(from_userID, roomID, message, callback) {

  if (!from_userID) {
    return callback(new errors.InvalidMessageError('userID can not be null'));
  }

  if (!roomID) {
    return callback(new errors.InvalidMessageError('roomID can not be null'));
  }

  if (!rooms[roomID]) {
    return callback(new errors.InvalidMessageError('room is not available'));
  }

  for (var userID in rooms[roomID].users) {
    if (userID != from_userID) {
      try {
        user.sendTo(userID, message);
      } catch (err) {
        callback(err);
      }

    }
  }

  return callback(null);

}
//# sourceMappingURL=room.js.map