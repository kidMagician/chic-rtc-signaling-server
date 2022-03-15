"use strict";function _typeof(obj) {"@babel/helpers - typeof";return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {return typeof obj;} : function (obj) {return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;}, _typeof(obj);}Object.defineProperty(exports, "__esModule", { value: true });exports.ChannelServer = void 0;


var _sessionManager = require("../../session-manager/session-manager");
var _nodeManager = require("../../node-manager/node-manager");function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}function _defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}function _createClass(Constructor, protoProps, staticProps) {if (protoProps) _defineProperties(Constructor.prototype, protoProps);if (staticProps) _defineProperties(Constructor, staticProps);Object.defineProperty(Constructor, "prototype", { writable: false });return Constructor;}function _inherits(subClass, superClass) {if (typeof superClass !== "function" && superClass !== null) {throw new TypeError("Super expression must either be null or a function");}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });Object.defineProperty(subClass, "prototype", { writable: false });if (superClass) _setPrototypeOf(subClass, superClass);}function _setPrototypeOf(o, p) {_setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {o.__proto__ = p;return o;};return _setPrototypeOf(o, p);}function _createSuper(Derived) {var hasNativeReflectConstruct = _isNativeReflectConstruct();return function _createSuperInternal() {var Super = _getPrototypeOf(Derived),result;if (hasNativeReflectConstruct) {var NewTarget = _getPrototypeOf(this).constructor;result = Reflect.construct(Super, arguments, NewTarget);} else {result = Super.apply(this, arguments);}return _possibleConstructorReturn(this, result);};}function _possibleConstructorReturn(self, call) {if (call && (_typeof(call) === "object" || typeof call === "function")) {return call;} else if (call !== void 0) {throw new TypeError("Derived constructors may only return object or undefined");}return _assertThisInitialized(self);}function _assertThisInitialized(self) {if (self === void 0) {throw new ReferenceError("this hasn't been initialised - super() hasn't been called");}return self;}function _isNativeReflectConstruct() {if (typeof Reflect === "undefined" || !Reflect.construct) return false;if (Reflect.construct.sham) return false;if (typeof Proxy === "function") return true;try {Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));return true;} catch (e) {return false;}}function _getPrototypeOf(o) {_getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {return o.__proto__ || Object.getPrototypeOf(o);};return _getPrototypeOf(o);}var EventEmitter = require('events').EventEmitter;var util = require('util');var utiles = require('./../../utiles/utiles');
var async = require('async');
var logger = require('../../logger').logger;var

ChannelServer = /*#__PURE__*/function (_EventEmitter) {_inherits(ChannelServer, _EventEmitter);var _super = _createSuper(ChannelServer);

  function ChannelServer() {var _this;_classCallCheck(this, ChannelServer);

    _this = _super.call(this);
    _this.conf = {};
    _this.server;
    _this.signal;
    _this.serverName;return _this;

  }_createClass(ChannelServer, [{ key: "init", value:

    function init(conf, signalingServer, callback) {

      this.conf = {
        host: conf.host || utiles.getIP(),
        port: conf.port || 9090,
        zookeeper: conf.zookeeper,
        redis: conf.redis };



      this.serverName = conf.serverName;

      this.conf.balancing = {
        SCALE: 60, // 단계별 Connection 수
        BUFFER_COUNT: 10, // replica 수정에 대한 인계치 버퍼
        MAX_LEVEL: 4, // scale 배수
        REPLICA_BASE_NUMBER: 4 //
      };

      if (!signalingServer) {
        callback(new Error("websocket cant not be null"));
      }

      this.signal = signalingServer;

      var self = this;

      async.parallel([
      function (parallelCallback) {

        var startReplicas = Math.pow(Number(self.conf.balancing['REPLICA_BASE_NUMBER']), Number(self.conf.balancing['MAX_LEVEL']));

        self.nodeManager = new _nodeManager.NodeManager(self.conf.zookeeper, false, function (err) {

          if (err) {

            return parallelCallback(err);
          }

          self.nodeManager.addServerNode(self.conf, startReplicas, function (err, path) {

            if (err) {
              return parallelCallback(err);
            }
            var serverName = path.substring(path.lastIndexOf('/') + 1, path.length);
            self.serverNodePath = path;

            self.serverName = serverName.split('^')[0];

            self.replicas = startReplicas;


            parallelCallback(err);



          });




        });

      },
      function (parallelCallback) {

        self.sessionManger = new _sessionManager.SessionManager(self.conf.redis, function (err) {
          if (err) {
            parallelCallback(err);
          }

          parallelCallback(null);

        });
      }],
      function (err) {

        if (err) {
          return callback(err);
        }

        self._start();
        logger.info("channel server successfully inited port: " + conf.port);
        callback(null);


      });



      process.on('uncaughtException', function (error) {
        logger.info("channel uncaughtException.... " + error.toString());
        self.sessionManger.removeAll("chicRTC", self.serverName, function (err) {
          process.nextTick(function () {process.exit(1);});
        });

      });



    } }, { key: "_start", value:

    function _start() {

      var self = this;


      this.signal.on('enterRoom', function (roomID, room, userID) {

        self.sessionManger.addUserinfo(
        'CHIC_RTC', roomID, userID, function (err) {
          //TODO: err handle
        });


      });

      this.signal.on("createRoom", function (roomID, room, userID) {

        async.parallel(
        [
        function (asyncCB) {

          self.sessionManger.addUserinfo(
          'CHIC_RTC', room.roomID, userID, asyncCB);


        },
        function (asyncCB) {
          self.sessionManger.updateServerInfo(
          'CHIC_RTC', roomID, self.serverName, asyncCB);

        }],


        function (err, result) {

          if (err) {
            //TODO: errHandle
          }
          //TODO: something
        });



      });

      this.signal.on("leaveRoom", function (roomID, room, userID) {

        self.sessionManger.removeUserinfo(
        'CHIC_RTC',
        roomID,
        userID,
        function (err) {
          if (err) {
            //TODO: errHandle
          }
        });


        if (!room) {

          self.sessionManger.removeServerinfo(
          'CHIC_RTC',
          roomID,
          function (err) {
            if (err) {
              //TODO: errHandle
            }
          });

        }


      });
    } }]);return ChannelServer;}(EventEmitter);exports.ChannelServer = ChannelServer;
//# sourceMappingURL=channel-server.js.map