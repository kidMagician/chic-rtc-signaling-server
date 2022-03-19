"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.SessionServer = void 0;



var _sessionManager = require("../../session-manager/session-manager");
var _nodeManager = require("../../node-manager/node-manager");
var _constants = _interopRequireDefault(require("../../node-manager/constants"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { "default": obj };}function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}function _defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}function _createClass(Constructor, protoProps, staticProps) {if (protoProps) _defineProperties(Constructor.prototype, protoProps);if (staticProps) _defineProperties(Constructor, staticProps);Object.defineProperty(Constructor, "prototype", { writable: false });return Constructor;}var express = require('express');var bodyParser = require('body-parser');

var utiles = require('../../utiles/utiles');
var logger = require('../../logger').logger;
var async = require('async');var










SessionServer = /*#__PURE__*/function () {







  function SessionServer() {_classCallCheck(this, SessionServer);
  }_createClass(SessionServer, [{ key: "init", value:

    function init(conf, callback) {var _this = this;

      this.conf = {
        port: conf.port || '8000',
        host: conf.host || utiles.getIP(),
        redis: conf.redis,
        zookeeper: conf.zookeeper };



      this.server = express();

      var self = this;

      async.parallel([
      function (paralCallback) {

        _this.sessionManager = new _sessionManager.SessionManager(_this.conf.redis, function (err) {
          if (err) {

            logger.info('session server init failed err:', err.toString());


            paralCallback(err); //TODO:  Callback was already called err 
          }

          paralCallback(null);


        });
      },
      function (paralCallback) {
        self.nodeManager = new _nodeManager.NodeManager(self.conf.zookeeper, true, function (err) {

          if (err) {
            return paralCallback(err);
          }

          self.nodeManager.createEphemeralPath(
          _constants["default"].META_PATH + _constants["default"].SESSION_SERVER_PATH + '/' + self.conf.host + ':' + self.conf.port,
          function (err) {

            if (err) {
              paralCallback(err);
            } else {

              self.nodeManager.getConfigInfo('balancing', function (data) {
                if (data) {
                  self.conf.balancing = data;
                }
              });

              paralCallback(null);
            }
          });




        });
      }],
      function (err) {

        if (err) {
          return callback(err);
        }

        self._start();

        logger.info(
        "sessionServer sucessfully inited " +
        "\nconf:" + JSON.stringify(self.conf));


        callback(null);

      });
    } }, { key: "_start", value:

    function _start() {


      this.server.use(bodyParser());

      var FRONTENDPATH = require('./constants').FRONTENDPATH;
      this.server.use(express["static"](FRONTENDPATH));

      var self = this;

      this.server.get('/room/:rid/user/:uid', function (req, res) {

        logger.debug("[Seeion server] http get params:" + JSON.stringify(req.params));

        if (!req.params.rid || !req.params.uid) {

          // var err= new errors.BadRequestError("userID or roomID could not be null")    //TODO: errors 정의해서 넣기

          // throw err
        }

        self.sessionManager.retrieveConnectedNode('CHIC_RTC', req.params.rid, function (sessionData) {

          var users = [];
          var serverNode;

          if (sessionData || sessionData.userInfo) {

            users = sessionData.userInfo;

          }

          var room = {
            roomID: req.params.rid,
            users: users };


          serverNode = self.nodeManager.getServerNode(req.params.rid);

          var responseData = {
            serverinfo: {
              signalServer: {
                serverName: serverNode.name,
                url: utiles.setWSProtocal(serverNode.url, null) },

              stunServer: { "url": "stun:stun2.1.google.com:19302" } },

            room: room };


          logger.debug(
          "[Seeion server] http get params:" + JSON.stringify(req.params) +
          "\n response data:" + JSON.stringify(responseData));


          res.set("Access-Control-Allow-Origin", "*");
          res.send(responseData);
        });



      });

      this.server.get('/', function (req, res) {

        res.sendFile(FRONTENDPATH + "/views/client.html");

      });

    } }, { key: "listen", value:

    function listen(callback) {

      try {
        if (!this.conf.ssl) {

          this.server.listen(this.conf.port, callback);
        } else {

          var https = require('https');
          var options = {
            key: this.conf.ssl.key,
            cert: this.conf.ssl.cert };


          https.createServer(options, this.server).listen(this.conf.port, callback);

        }

        logger.info("sessionServer listening port ", this.conf.port);

        //CHECK: try catch working??

      } catch (exception) {

        console.info('session server listening failed err:', exception);

        return callback(exception);
      }

      return callback(null);

    } }]);return SessionServer;}();exports.SessionServer = SessionServer;
//# sourceMappingURL=session-server.js.map