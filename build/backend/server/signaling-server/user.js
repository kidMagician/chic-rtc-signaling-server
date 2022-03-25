"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.USER_STATUS = void 0;exports.authenticate = authenticate;exports.broadcast = broadcast;exports.createUser = createUser;exports.deleteUser = deleteUser;exports.findUserFromConnection = findUserFromConnection;exports.getConnection = getConnection;exports.getUserNum = getUserNum;exports.isInRoom = isInRoom;exports.sendTo = sendTo;exports.users = void 0;var errors = require('./errors');
/**
 * websocket에 접속되어 있는 user 관리 하는 모듈 
 */








var users = {};exports.users = users;

var USER_STATUS = {
  INROOM: 'inroom',
  ONLINE: 'online' };exports.USER_STATUS = USER_STATUS;









/**
 * 
 * @param {string} userID 
 * @param {Object} connection -websocket 커넥션 객체 
 * @param {function}} callback 
 */
function createUser(userID, connection, callback) {

  if (!userID) {
    callback(new errors.InvalidMessageError('userID can not be null'));
  }

  if (!connection) {
    callback(new errors.ServerError('connection can not be null'));
  }
  if (!users[userID]) {
    users[userID] = {
      userID: userID,
      connection: connection,
      status: USER_STATUS.ONLINE };

    return callback(null, true);

  } else {

    return callback(null, false);
  }

}
/**
 * 
 * @param {string} userID 
 * @param {function} callback 
 */
function deleteUser(userID) {

  delete users[userID];

}

/**
 * 
 * @param {string} userID 
 * @param {Object} message 
 * @param {function} callback 
 */
function sendTo(userID, message) {

  if (!userID) {
    throw new errors.InvalidMessageError("userID can not be null");
  }

  if (!users[userID]) {
    throw new errors.InvalidMessageError("connection is not avaliavle userID:" + userID);
  }


  users[userID].connection.send(JSON.stringify(message));


}

/**
 * 유저가 접속되어 있는지 접속되어 있지 않는지 확인해주는 function(중복 접속 금지)
 * @param {String} userID 
 * @returns {Boolean} 
 */
function authenticate(userID) {

  if (users[userID]) {

    return true;

  } else {

    return false;
  }

}


/**
 * websocket connection으로부터 user를 찾아주는 function
 * @param {any} conn 
 * @param {function} callback 
 */
function findUserFromConnection(conn, callback) {


  if (!conn) {
    return callback(new errors.InvalidMessageError("connection can not be null"));
  }

  for (var userID in users) {
    if (users[userID].connection === conn) {

      return callback(null, true, userID);
    }
  }

  return callback(null, false, null);
}


/**
 * 
 * @param {string} userID 
 * @param {function} callback 
 */
function isInRoom(userID, callback) {

  if (!userID) {
    return callback(new errors.InvalidMessageError("usernaem can not be null"));
  }

  if (users[userID].status === USER_STATUS.INROOM) {

    return callback(null, true, users[userID].roomID);

  } else {

    return callback(null, false, null);
  }

}

/**
 * 불특정 유저에게 브로드케스트 메시지를 보내는 function
 * @param {string[]} userIDs 
 * @param {string} message 
 */
function broadcast(userIDs, message) {

  userIDs.forEach(function (userID) {
    users[userID].connection.send(JSON.stringify(message));
  });
}

function getUserNum() {

  return Object.keys(users).length;
}

function getConnection(userID, callback) {
  if (!userID) {

    callback(new errors.ServerError("userID can not be null"));

  } else {
    if (users[userID].connection) {
      callback(null, users[userID].connection);
    } else {
      callback(null, false);
    }

  }
}
//# sourceMappingURL=user.js.map