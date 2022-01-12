"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
var express = __importStar(require("express"));
var session_manager_1 = require("../session-manager/session-manager");
var errors = require('./errors');
var bodyParser = require('body-parser');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utiles = require('../../utiles/utiles');
var logger = require('../logger').logger;
var SessionServer = /** @class */ (function () {
    function SessionServer() {
    }
    SessionServer.prototype.init = function (conf, server, callback) {
        var self = this;
        self.conf = {
            port: conf.port || '8000',
            host: self.conf.host || utiles.getIP(),
            redis: conf.redis,
            ssl: conf.ssl
        };
        if (!server) {
            self.server = express();
        }
        else {
            self.server = server;
        }
        this.sessionManager = new session_manager_1.SessionManager(self.conf.redis, function (err) {
            if (!err) {
                self._start();
                logger.info("sessionServer sucessfully inited " +
                    "\nconf:" + JSON.stringify(self.conf));
                callback(null);
            }
            else {
                logger.info('session server init failed err:', err.toString());
                callback(err); //TODO:  Callback was already called err 
            }
        });
    };
    SessionServer.prototype._start = function () {
        var self = this;
        self.server.use(bodyParser());
        var FRONTENDPATH = require('./constants').FRONTENDPATH;
        self.server.use(express.static(FRONTENDPATH));
        self.server.get('/room/:rid/user/:uid', function (req, res) {
            logger.debug("[Seeion server] http get params:" + JSON.stringify(req.params));
            if (!req.params.rid || !req.params.uid) {
                var err = new errors.BadRequestError("userID or roomID could not be null");
                throw err;
            }
            self.sessionManager.retrieveConnectedNode('CHIC_RTC', req.params.rid, function (sessionData) {
                var users = [];
                if (sessionData || sessionData.userInfo) {
                    users = sessionData.userInfo;
                }
                var room = {
                    roomID: req.params.rid,
                    users: users
                };
                // var serverNode
                var responseData = {
                    serverinfo: {
                        signalServer: {
                            serverName: "chic-rtc-test-server",
                            url: "ws://localhost:9000",
                        },
                        stunServer: { "url": "stun:stun2.1.google.com:19302" }
                    },
                    room: room
                };
                logger.debug("[Seeion server] http get params:" + JSON.stringify(req.params) +
                    "\n response data:" + JSON.stringify(responseData));
                res.set("Access-Control-Allow-Origin", "*");
                res.send(responseData);
            });
        });
        self.server.get('/', function (req, res) {
            res.sendFile(FRONTENDPATH + "/views/client.html");
        });
    };
    SessionServer.prototype.listen = function (callback) {
        try {
            if (!this.conf.ssl) {
                this.server.listen(this.conf.port, (callback));
            }
            else {
                var https = require('https');
                var options = {
                    key: this.conf.ssl.key,
                    cert: this.conf.ssl.cert
                };
                https.createServer(options, this.server).listen(this.conf.port, callback);
            }
            logger.info("sessionServer listening port ", this.conf.port);
            //CHECK: try catch working??
        }
        catch (exception) {
            console.info('session server listening failed err:', exception);
            return callback(exception);
        }
        return callback(null);
    };
    return SessionServer;
}());
exports.SessionServer = SessionServer;
// util.inherits(SessionServer, EventEmitter);
// module.exports.SessionServer = SessionServer
