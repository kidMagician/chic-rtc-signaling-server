"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.NodeManager = void 0;function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}function _defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}function _createClass(Constructor, protoProps, staticProps) {if (protoProps) _defineProperties(Constructor.prototype, protoProps);if (staticProps) _defineProperties(Constructor, staticProps);Object.defineProperty(Constructor, "prototype", { writable: false });return Constructor;}function _defineProperty(obj, key, value) {if (key in obj) {Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });} else {obj[key] = value;}return obj;}
var zookeeper = require('node-zookeeper-client'),
logger = require('../logger').logger,

constants = require('./constants'),
async = require('async'),
ConsistentHashing = require('./consistent-hashing').ConsistentHashing;

/**
 * 서버정보를 Zookeeper에 등록 후 watching 하면서 사용가능한 서버를 동적으로 관리하기 위한 모듈
 * @module
 * @name NodeManager
 */var
NodeManager = /*#__PURE__*/function () {

  function NodeManager(addr, isWatching, callback) {_classCallCheck(this, NodeManager);_defineProperty(this, "_getConfigNode",











































































































































































































































































































































    function (key, cb) {
      var self = this;
      var path = constants.BASE_ZNODE_PATH + constants.CONFIG_PATH + '/' + key;

      var _w = function _w(event) {

        if (event.type == 3) {
          self._getConfigNode(key, cb);
        }
      };

      self.zkClient.getData(path,
      _w,
      function (error, data, stat) {

        if (error) {

          if (error.name == "NO_NODE") {
            if (cb) {
              cb(configData);
            }
          } else {
            logger.error(error);
          }
        }

        if (data) {

          var tmp = data.toString('utf8');
          var configData = JSON.parse(tmp);

          if (cb) {
            cb(configData);
          }

        } else {
          if (cb) {
            cb();
          }
        }
      });

    });this.address = addr || 'localhost:2181';this.ready = false;this.isWatching = isWatching;this.nodeRing = new ConsistentHashing();this.servers = {};this.serverArray = [];this.connected = false;this.connectionTryNum = 0;this._connect(isWatching, callback);}_createClass(NodeManager, [{ key: "_connect", value: function _connect(isWatching, callback) {var self = this;this.zkClient = zookeeper.createClient(this.address, { retries: 2 });this.zkClient.once('connected', function () {logger.info("successfully ZOOKEEPER is connected");self.connected = true;self._initPath('', function () {self._initPath(constants.CHANNEL_SERVERS_PATH, function () {self._initPath(constants.META_PATH, function () {self._initPath(constants.META_PATH + constants.APP_PATH, function () {self._initPath(constants.META_PATH + constants.SESSION_SERVER_PATH, function () {if (isWatching) {self._watchServerNodes();console.log("start watching serverNodes");}self.ready = true;if (callback) callback();});});});});}); //TODO: write watching code
      });this.zkClient.connect();} }, { key: "isReady", value: /**
     * User 정보가 있는지 확인 후에 있는 경우 수정한다. deviceId를 필수로 입력받아야 한다.
     * @name isReady
     * @function
     */function isReady() {return this.ready;} }, { key: "_initPath", value: /**
     * Zookeeper에 nodePath가 있는지 확인 후 없는 경우 생성함.
     * @private
     * @name _initPath
     * @function
     * @param {string} nodePath - node path
     * @param {callback} done - 초기화 후 수행할 callback function
     */function _initPath(nodePath, callback) {var self = this;self.zkClient.exists(constants.BASE_ZNODE_PATH + nodePath, function (error, stat) {if (error) {logger.error(error.stack);return;}if (!stat) {self._createZnode(nodePath, callback);} else {if (callback) callback(null);}});} }, { key: "_createZnode", value: /**
     * Zookeeper에 node를 persistent 모드로 생성함.
     * @private
     * @name _createZnode
     * @function
     * @param {string} nodePath - node path
     * @param {callback} done - 초기화 후 수행할 callback function
     */function _createZnode(nodePath, callback) {this.zkClient.create(constants.BASE_ZNODE_PATH + nodePath, zookeeper.CreateMode.PERSISTENT, function (error) {if (error) {logger.error('Failed to create node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, error);if (callback) callback(error);} else {if (callback) callback(null);}});} }, { key: "_createEphemeralZnode", value: /**
     * Zookeeper에 node를 EPHEMERAL 모드로 생성함.
     * @private
     * @name _createEphemeralZnode
     * @function
     * @param {string} nodePath - node path
     * @param {data} data - node data
     * @param {callback} done - 초기화 후 수행할 callback function
     */function _createEphemeralZnode(nodePath, data, callback) {var nodeData;if (data && !callback) {callback = data;} else if (data && callback) {nodeData = new Buffer(data);}this.zkClient.create(constants.BASE_ZNODE_PATH + nodePath, nodeData, zookeeper.CreateMode.EPHEMERAL, function (error) {if (error) {if (error.getCode() == zookeeper.Exception.NODE_EXISTS) {if (callback) callback(null);} else {logger.error('Failed to create node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, error.getName());if (callback) callback(error);}} else {logger.info("succeesfully create createEphemeralZnode" + "\nnodePath: " + constants.BASE_ZNODE_PATH + nodePath + "\nnodeData: " + nodeData);if (callback) callback(null);}});} }, { key: "_createZnodeWithData", value: /**
     * Zookeeper에 node를 persistent 모드로 생성함.
     * @private
     * @name _createZnodeWithData
     * @function
     * @param {string} nodePath - node path
     * @param {object} - node에 저장할 data
     * @param {callback} callback - 초기화 후 수행할 callback function
     */function _createZnodeWithData(nodePath, data, callback) {this.zkClient.create(constants.BASE_ZNODE_PATH + nodePath, new Buffer(data), zookeeper.CreateMode.PERSISTENT, function (error) {if (error) {logger.error('Failed to create node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, error);if (callback) callback(error);} else {if (callback) callback(null);}});} }, { key: "_removeZnode", value: /**
     * Zookeeper에서 node를 삭제함
     * @private
     * @name _removeZnode
     * @function
     * @param {string} nodePath - node path
     * @param {callback} callback - 초기화 후 수행할 callback function
     */function _removeZnode(nodePath, callback) {this.zkClient.remove(constants.BASE_ZNODE_PATH + nodePath, -1, function (err) {if (err) {logger.error('Failed to remove node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, err);if (callback) callback(err);} else {if (callback) callback(null);}});} }, { key: "_watchServerNodes", value: function _watchServerNodes() {var self = this;this.zkClient.getChildren(constants.BASE_ZNODE_PATH + constants.CHANNEL_SERVERS_PATH, function (event) {self._watchServerNodes();}, function (error, children, stat) {if (error) {logger.warn('Failed to list children due to: %s.', error);if (error.getCode() == zookeeper.Exception.CONNECTION_LOSS) {self.zkClient.close();self._connect(self.isWatching, function (err) {if (err) logger.error(err);});}} else {var max = children.length;var nodeTask = function nodeTask(taskId, value, callback) {//its so complicated. change to promise(?) or something
            self._getServerNode(children[taskId], function () {taskId++;if (taskId < max) {function_array.splice(function_array.length - 1, 0, nodeTask);}callback(null, taskId, ++value); //TODO callback check
            });};var startTask = function startTask(callback) {self.servers = {};function_array.splice(function_array.length - 1, 0, nodeTask);callback(null, 0, 0); //TODO callback check
          };var finalTask = function finalTask(taskId, value, callback) {callback(null, value); //TODO callback check
          };var function_array = [startTask, finalTask];if (max > 0) {logger.info('  [event] server nodes [' + max + '] : ' + children);async.waterfall(function_array, function (err, result) {self.serverArray = [];self.serverArray = children;self.nodeRing = new ConsistentHashing(self.servers);});} else {self.nodeRing = new ConsistentHashing();logger.warn('  [event] server nodes [0] : NOT EXISTED');}}});} /**
     * get node info from zookeeper and input servers and serverArray
     * @name _getServerNode
     * @function
     * @param {number} childPath - childPath
     * @param {callback} callback -cb
     */ }, { key: "_getServerNode", value: function _getServerNode(childPath, cb) {var self = this;var path = constants.BASE_ZNODE_PATH + constants.CHANNEL_SERVERS_PATH + '/' + childPath;var _w = function _w(event) {if (event.type == 3) {self._getServerNode(childPath);}};if (cb && self.serverArray.indexOf(childPath) > -1) {_w = undefined;}self.zkClient.getData(path, _w, function (error, data, stat) {if (error) {logger.error('Fail retrieve server datas: %s.', error);} else {var replicas = 160;if (data !== undefined && data !== null) {replicas = data.toString('utf8');}self.servers[childPath] = childPath + "^" + replicas;if (self.serverArray.indexOf(childPath) < 0) {self.serverArray.push(childPath);}if (cb) {cb();} else {self.nodeRing = new ConsistentHashing(self.servers);}}});} }, { key: "addServerNode", value: function addServerNode(config, replicas, callback) {var self = this;var address = config.host;var port = config.port;var serverName = config.serverName;this.zkClient.getChildren(constants.BASE_ZNODE_PATH + constants.CHANNEL_SERVERS_PATH, function (error, nodes, stats) {if (error) {logger.error(error.stack);callback(error);return;}var server = address + ':' + port;var isExisted = false;var names = [];var existedPathName;for (var i = 0; i < nodes.length; i++) {var ninfo = nodes[i].split('^');if (server == ninfo[1]) {existedPathName = nodes[i];isExisted = true;break;}if (typeof names[inx] == 'number') {names.push(Number(ninfo[0]));} else {names.push(ninfo[0]);}}if (!isExisted) {if (!serverName) {serverName = 10;if (names.length > 0) {var maxBefore = 0;for (var inx in names) {if (typeof names[inx] == 'number') {maxBefore = names[inx];
                }
              }

              serverName = maxBefore + Math.floor(Math.random() * (20 - 10 + 1)) + 10;
            }
          }

          var nodePath = constants.CHANNEL_SERVERS_PATH + '/' + serverName + '^' + server;

          self._createEphemeralZnode(nodePath, replicas + "", function (err) {
            callback(null, nodePath);
          });

        } else {
          if (callback) callback(null, constants.CHANNEL_SERVERS_PATH + '/' + existedPathName);
        }
      });

    } }, { key: "getServerNode", value:

    function getServerNode(key) {
      return this.nodeRing.getNode(key);
    } }, { key: "createEphemeralPath", value:

    function createEphemeralPath(path, data, callback) {
      this._createEphemeralZnode(path, data, callback);
    } }, { key: "getConfigInfo", value:

    function getConfigInfo(key, cb) {
      return this._getConfigNode(key, cb);
    } }]);return NodeManager;}();exports.NodeManager = NodeManager;
//# sourceMappingURL=node-manager.js.map