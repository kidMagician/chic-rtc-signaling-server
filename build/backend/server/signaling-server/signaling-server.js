"use strict";function _typeof(obj) {"@babel/helpers - typeof";return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {return typeof obj;} : function (obj) {return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;}, _typeof(obj);}Object.defineProperty(exports, "__esModule", { value: true });exports.SignalingServer = void 0;function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}function _defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}function _createClass(Constructor, protoProps, staticProps) {if (protoProps) _defineProperties(Constructor.prototype, protoProps);if (staticProps) _defineProperties(Constructor, staticProps);Object.defineProperty(Constructor, "prototype", { writable: false });return Constructor;}function _inherits(subClass, superClass) {if (typeof superClass !== "function" && superClass !== null) {throw new TypeError("Super expression must either be null or a function");}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });Object.defineProperty(subClass, "prototype", { writable: false });if (superClass) _setPrototypeOf(subClass, superClass);}function _setPrototypeOf(o, p) {_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {o.__proto__ = p;return o;};return _setPrototypeOf(o, p);}function _createSuper(Derived) {var hasNativeReflectConstruct = _isNativeReflectConstruct();return function _createSuperInternal() {var Super = _getPrototypeOf(Derived),result;if (hasNativeReflectConstruct) {var NewTarget = _getPrototypeOf(this).constructor;result = Reflect.construct(Super, arguments, NewTarget);} else {result = Super.apply(this, arguments);}return _possibleConstructorReturn(this, result);};}function _possibleConstructorReturn(self, call) {if (call && (_typeof(call) === "object" || typeof call === "function")) {return call;} else if (call !== void 0) {throw new TypeError("Derived constructors may only return object or undefined");}return _assertThisInitialized(self);}function _assertThisInitialized(self) {if (self === void 0) {throw new ReferenceError("this hasn't been initialised - super() hasn't been called");}return self;}function _isNativeReflectConstruct() {if (typeof Reflect === "undefined" || !Reflect.construct) return false;if (Reflect.construct.sham) return false;if (typeof Proxy === "function") return true;try {Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));return true;} catch (e) {return false;}}function _getPrototypeOf(o) {_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {return o.__proto__ || Object.getPrototypeOf(o);};return _getPrototypeOf(o);}var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var userModule = require('./user.js');
var roomModule = require('./room.js');
var errors = require('./errors');
var logger = require('../../logger').logger;

var BROADCASTMESSAGE = {
  ENTER_ROOM: "broadcast:enterRoom",
  LEAVE_ROOM: "broadcast:leaveRoom" };


var NEGOTIATION_MESSAGE = {
  OFFER: "negotiation:offer",
  ANSWER: "negotiation:answer",
  CANDIDATE: "negotiation:candidate",
  SUCESS_NEGOTIATION: "negotiation:sucess",
  FAILED_NEGOTIATION: "negotiation:failed" };


var ROOM_MESSANGE = {
  ENTER_ROOM: "room:enterRoom",
  FAILED_ENTER_ROOM: "room:failedEnterRoom",
  LEAVE_ROOM: "room:leaveRoom" };


var SESSION_MESSAGE = {
  LOGIN: "session:login",
  LOGOUT: "session:logout" };


var ERR_MESSAGE = {
  INVALIDMESSAGE: "err:invalidMessage",
  INVALIDUSER: "err:invalidUser",
  SERVER_ERR: "err:serverError" };var


SignalingServer = /*#__PURE__*/function (_EventEmitter) {_inherits(SignalingServer, _EventEmitter);var _super = _createSuper(SignalingServer);

  function SignalingServer() {_classCallCheck(this, SignalingServer);return _super.call(this);

  }_createClass(SignalingServer, [{ key: "init", value:

    function init(wss, callback) {

      if (wss) {

        this.wss = wss;

        this._start();

        logger.info("signaling server successfully inited");

        callback(null);

      } else {
        callback(new Error("wss cant not be null"));
      }
    } }, { key: "_start", value:

    function _start() {

      var self = this;

      self.wss.on('connection', function (connection) {

        logger.info("[SignalServer] user connected");

        self.emit('connection', connection);

        connection.on('message', function (message) {

          logger.info("got message", message);

          var parsedMessage;

          async.waterfall([
          function (asyncCallBack) {
            self.parsingMessage(message, asyncCallBack);

          },
          function (mParsedMessage, asyncCallBack) {

            parsedMessage = mParsedMessage;

            logger.info("parsedMessage :", parsedMessage);

            self.isInvalidMessage(parsedMessage, asyncCallBack);

          },
          function (asyncCallBack) {

            if (self.whatType(parsedMessage.type) === "session") {

              self.handleSessionMessage(parsedMessage, connection, asyncCallBack);

            } else {

              self.handleMessage(parsedMessage, asyncCallBack);
            }

          }],

          function (e) {
            if (e) {

              e.sendErrMessage(connection);

            }

          });
        });

        connection.on("close", function () {
          if (connection != null) {
            self.closeConnection(connection);
          }
        });
      });
    } }, { key: "parsingMessage", value:

    function parsingMessage(message, callback) {

      var data;

      try {
        data = JSON.parse(message);

      } catch (e) {
        logger.error("Invalid JSON e:", e);

        return callback(new errors.InvalidMessageError("Invalid JSON"));
      }

      return callback(null, data);
    } }, { key: "handleSessionMessage", value:

    function handleSessionMessage(parsedMessage, connection, callback) {

      var self = this;

      var data = parsedMessage;

      switch (data.type) {
        case SESSION_MESSAGE.LOGIN:


          userModule.createUser(data.fromUserID, connection, function (err, success) {

            if (err) {

              return err.sendErrMessage(connection);
            }

            var message = {
              type: SESSION_MESSAGE.LOGIN,
              success: success };


            logger.info("successfully login ", data.fromUserID);

            connection.send(JSON.stringify(message));

            self.emit();
          });

          break;
        case SESSION_MESSAGE.LOGOUT:

          logger.info(data.fromUserID, " logout");

          userModule.deleteUser(data.fromUserID);

          message = {

            type: SESSION_MESSAGE.LOGOUT,
            fromUserID: data.fromUserID,
            success: true };


          connection.send(JSON.stringify(message));

          self(emit);

          break;}


      callback(null);

    } }, { key: "isInvalidMessage", value:

    function isInvalidMessage(parsedMessage, callback) {

      var data = parsedMessage;

      if (!data.type) {

        return callback(new errors.InvalidMessageError("type undefiend"));
      }

      switch (data.type) {

        case SESSION_MESSAGE.LOGIN:
          if (!data.fromUserID) {

            return callback(new errors.InvalidMessageError("fromUserID undefiend"));

          }

          break;

        case SESSION_MESSAGE.LOGOUT:
          if (!data.fromUserID) {

            return callback(new errors.InvalidMessageError("fromUserID undefiend"));

          }

          break;

        case ROOM_MESSANGE.ENTER_ROOM:
          if (!data.fromUserID || !data.roomID) {

            return callback(new errors.InvalidMessageError("fromUserID or roomID undefiend"));

          }

          break;

        case ROOM_MESSANGE.LEAVE_ROOM:

          if (!data.fromUserID || !data.roomID) {

            return callback(new errors.InvalidMessageError("fromUserID or roomID undefiend"));

          }

          break;

        case NEGOTIATION_MESSAGE.OFFER:

          if (!data.fromUserID || !data.toUserID || !data.sdp) {

            return callback(new errors.InvalidMessageError("fromUserID or toUserID or offer undefiend"));

          }

          break;

        case NEGOTIATION_MESSAGE.ANSWER:

          if (!data.fromUserID || !data.toUserID || !data.sdp) {

            return callback(new errors.InvalidMessageError("fromUserID or toUserID or answer undefiend"));

          }

          break;

        case NEGOTIATION_MESSAGE.CANDIDATE:

          if (!data.fromUserID || !data.candidate || !data.toUserID) {

            return callback(new errors.InvalidMessageError("fromUserID or toUserID or candidate undefiend"));

          }

          break;

        default:

          return callback(new errors.InvalidMessageError("invalid Type type: " + data.type));

          break;}



      return callback(null);

    } }, { key: "handleMessage", value:

    function handleMessage(parsedMessage, callback) {

      var self = this;

      var data = parsedMessage;

      switch (data.type) {

        case ROOM_MESSANGE.ENTER_ROOM:

          logger.info("enter room", data.fromUserID, data.roomID);

          async.waterfall([
          function (asyncCallBack) {
            roomModule.isRoom(data.roomID, asyncCallBack);

          },
          function (isRoom, asyncCallBack) {
            if (isRoom) {
              logger.info("enterRoom");

              roomModule.enterRoom(data.roomID, data.fromUserID, function (err, enteredRoom) {
                if (err) {

                  asyncCallBack(err);

                } else {
                  self.emit('enterRoom', data.roomID, enteredRoom, data.fromUserID);
                  asyncCallBack(null);

                }

              });

            } else {


              logger.info("createRoom(" + data.roomID + ")");

              roomModule.createRoom(data.roomID, data.fromUserID, function (err, createdRoom) {

                if (err) {
                  asyncCallBack(err);
                } else {
                  self.emit('createRoom', data.roomID, createdRoom, data.fromUserID);
                  asyncCallBack(null);
                }

              });
            }

          }], function (err) {
            if (err) {

              logger.error(err.toString());

              callback(err);

            } else {

              var message = {

                // from:data.fromUserID,
                type: ROOM_MESSANGE.ENTER_ROOM,
                success: true };


              userModule.sendTo(data.fromUserID, message);

              var broadcastMessage = {

                from: data.fromUserID,
                type: BROADCASTMESSAGE.ENTER_ROOM,
                userID: data.fromUserID };


              roomModule.broadcast(data.fromUserID, data.roomID, broadcastMessage, function (err) {

                if (err) {
                  //TODO: errHandle
                }

              });


              callback(null);

            }
          });



          break;
        case ROOM_MESSANGE.LEAVE_ROOM:

          logger.info(data.fromUserID, " leave from", data.roomID);

          roomModule.leaveRoom(data.fromUserID, data.roomID, function (err) {

            if (err) {
              //can not be err
            }

            self.emit('leaveRoom', data.roomID, roomModule.rooms[data.roomID]);

            var message = {

              fromUserID: data.fromUserID,
              type: ROOM_MESSANGE.LEAVE_ROOM };



            userModule.sendTo(data.fromUserID, message);

            var broadcastMessage = {
              userID: data.fromUserID,
              type: BROADCASTMESSAGE.LEAVE_ROOM };


            if (roomModule.rooms[data.roomID]) {

              roomModule.broadcast(data.fromUserID, data.roomID, broadcastMessage, function (err) {
                if (err) {

                  callback(err);
                }

              });

            }

            callback(null);

          });

          break;

        case NEGOTIATION_MESSAGE.OFFER:

          logger.info("Sending offer from ", data.fromUserID, "to ", data.toUserID);

          userModule.sendTo(data.toUserID, {
            fromUserID: data.fromUserID,
            type: NEGOTIATION_MESSAGE.OFFER,
            sdp: data.sdp,
            toUserID: data.toUserID });


          // self.emit();  
          callback(null);

          break;

        case NEGOTIATION_MESSAGE.ANSWER:

          logger.info("Sending answer from ", data.fromUserID, " to ", data.toUserID);

          userModule.sendTo(data.toUserID, {
            fromUserID: data.fromUserID,
            type: NEGOTIATION_MESSAGE.ANSWER,
            sdp: data.sdp,
            toUserID: data.toUserID });


          // self.emit();
          callback(null);

          break;

        case NEGOTIATION_MESSAGE.CANDIDATE:

          logger.info("Sending candidate from", data.fromUserID, " to ", data.toUserID);

          userModule.sendTo(data.toUserID, {
            fromUserID: data.fromUserID,
            type: NEGOTIATION_MESSAGE.CANDIDATE,
            candidate: data.candidate,
            toUserID: data.toUserID });


          // self.emit();
          callback(null);

          break;

        default:

          logger.error("send Invalide Message err to ", data.fromUserID);
          userModule.sendTo(data.fromUserID, {
            type: ERR_MESSAGE.INVALIDMESSAGE,
            message: "sending Invalid Message type:" + data.type });

          callback(null);

          break;}



    } }, { key: "closeConnection", value:


    function closeConnection(connection) {

      logger.info("ws client connection close");

      var self = this;

      userModule.findUserFromConnection(connection, function (err, isUser, userID) {

        if (err) {
          logger.error(err); //err shuld not be happen
        }

        if (isUser) {

          self.closeConnectionWithUserID(userID);

        }
      });


    } }, { key: "closeConnectionWithUserID", value:

    function closeConnectionWithUserID(userID) {

      logger.info('ws client connection close userID:' + userID);

      var self = this;

      userModule.isInRoom(userID, function (err, isRoom, roomID) {

        if (err) {
          logger.error(err);
          throw err;
        }

        if (isRoom) {

          logger.info(userID, "leaveRoom from ", roomID);

          roomModule.leaveRoom(userID, roomID, function (err) {

            if (err) {
              logger.error(err); // this err never happen. if this happen, server have to die
              throw err;
            } else {

              self.emit("leaveRoom", roomID, roomModule.rooms[roomID], userID);

              if (roomModule.rooms[roomID]) {

                var broadcastMessage = {
                  userID: userID,
                  type: BROADCASTMESSAGE.LEAVE_ROOM };


                roomModule.broadcast(userID, roomID, broadcastMessage, function (err) {
                  if (err) {
                    logger.error(err);
                    throw err;
                  }

                });

              }
            }
          });
        }
      });

      userModule.deleteUser(userID);

    } }, { key: "whatType", value:

    function whatType(type) {

      var mType;

      var splitVar = type.split(":");

      mType = splitVar[0];

      return mType;

    } }]);return SignalingServer;}(EventEmitter);exports.SignalingServer = SignalingServer;
//# sourceMappingURL=signaling-server.js.map