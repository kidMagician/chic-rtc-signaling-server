"use strict";
var ROOM_AVAILABLE_USER_NUM = require('./constants').ROOM_AVAILABLE_USER_NUM;
var MAX_ROOM_NAME_LENGTH = require('./constants').MAX_ROOM_NAME_LENGTH;
var MIN_ROOM_NAME_LENGTH = require('./constants').MIN_ROOM_NAME_LENGTH;
var errors = require('./errors');
var rooms = {};

module.exports.rooms = rooms;

var user = require('./user.js');

var forbiddenNames = [];



/**
 * 
 * @param {*} roomName 
 */
function isNameForbidden(roomName) {

  return forbiddenNames.indexOf(roomIDs) >= 0;
}

function isNameTooLong(roomID) {

  return roomID.length > MAX_ROOM_NAME_LENGTH;
}

function isNameTooShort(roomID) {

  return roomID.length < MIN_ROOM_NAME_LENGTH;
}

function isUserinRoom(userID, roomID) {

  if (rooms[roomID].users[userID]) {

    return true;
  } else {
    return false;
  }

}



/**
 * Room이 존재하는지 확인
 * @param {string} roomID 
 * @param {function} callback 
 */
module.exports.isRoom = function (roomID, callback) {

  if (!roomID) {
    return callback(new errors.InvalidMessageError('roomID cat not be null'));
  }

  if (!rooms[roomID]) {
    callback(null, false);
  } else {
    return callback(null, true);
  }

};

/**
 * 
 * @param {String} roomID 
 * @param {String} userID 
 * @param {function} callback 
 */
module.exports.createRoom = function (roomID, userID, callback) {

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

};
/**
 * 
 * @param {String} roomID 
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
 * @param {String} roomID 
 * @param {String} userID 
 * @param {function} callback 
 */

module.exports.enterRoom = function (roomID, userID, callback) {

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

};

/**
 * 
 * @param {String} userID 
 * @param {String} roomID 
 * @param {function} callback 
 */
module.exports.leaveRoom = function (userID, roomID, callback) {

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


};

/**
 * 
 * @param {String} roomID 
 * @param {callback} callback 
 */
module.exports.checkfull = function (roomID, callback) {

  if (!roomID) {
    return callback(new errors.InvalidMessageError('roomeID can not be null'));
  }

  if (roomID.length <= ROOM_AVAILABLE_USER_NUM) {
    return callback(null, true);
  } else {
    return callback(null, false);
  }

};


/**
 * 룸에 있는 모든 인원에게 메시지 보내는 function
 * @param {String} from_userID 
 * @param {String} roomID 
 * @param {String} message   
 * @param {function} callback 
 */
module.exports.broadcast = function (from_userID, roomID, message, callback) {

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
      user.sendTo(userID, message, callback);
    }
  }

  return callback(null);

};
//# sourceMappingURL=room.js.map