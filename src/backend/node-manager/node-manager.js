
var zookeeper = require('node-zookeeper-client'),
  logger = require('../logger').logger

  constants = require('./constants'),
  async = require('async'),
  ConsistentHashing = require('./consistent-hashing').ConsistentHashing;

/**
 * 서버정보를 Zookeeper에 등록 후 watching 하면서 사용가능한 서버를 동적으로 관리하기 위한 모듈
 * @module
 * @name NodeManager
 */
 class NodeManager{
 
    constructor(addr, isWatching, callback) {

        this.address = addr || 'localhost:2181';
        this.ready = false;
        this.isWatching = isWatching;

    
        var self = this;
    
        this.nodeRing = new ConsistentHashing();
        this.appInfos = {};
        this.servers = {};
        this.serverArray = [];
        this.appArray = [];
    
        this.connected = false;
        this.connectionTryNum = 0;
    
        this._connect(isWatching, callback);
    
        var connectTry = function () {
    
        if (!self.connected) {
            if (self.connectionTryNum > 3) {
            if (callback) callback(new Error('zookeeper - failed to connect to [' + self.address + ']'));
            } else {
    
            if (self.connectionTryNum > 1) logger.warn(' (init) ZOOKEEPER connection retry ' + (self.connectionTryNum - 1));
            self.connectionTryNum++;
            setTimeout(connectTry, 2000);
            }
        }
        };
        connectTry();
    };
  
  
  _connect(isWatching, callback) {
  
    var self = this;
  
    this.zkClient = zookeeper.createClient(this.address, {retries: 2});
  
    this.zkClient.once('connected', function () {
        //TODO: write watching code
    });
  
    this.zkClient.connect();
  };
  
  /**
   * User 정보가 있는지 확인 후에 있는 경우 수정한다. deviceId를 필수로 입력받아야 한다.
   * @name isReady
   * @function
   */
  isReady() {
    return this.ready;
  };
  
  /**
   * Zookeeper에 nodePath가 있는지 확인 후 없는 경우 생성함.
   * @private
   * @name _initPath
   * @function
   * @param {string} nodePath - node path
   * @param {callback} done - 초기화 후 수행할 callback function
   */
  _initPath(nodePath, callback) {
  
    var self = this;
  
    self.zkClient.exists(
      constants.BASE_ZNODE_PATH + nodePath,
      function (error, stat) {
        if (error) {
          logger.error(error.stack);
          return;
        }
  
        if (!stat) {
          self._createZnode(nodePath, callback);
        } else {
          if (callback) callback(null);
        }
      });
  
  };
  
  /**
   * Zookeeper에 node를 persistent 모드로 생성함.
   * @private
   * @name _createZnode
   * @function
   * @param {string} nodePath - node path
   * @param {callback} done - 초기화 후 수행할 callback function
   */
  _createZnode(nodePath, callback) {
    this.zkClient.create(
      constants.BASE_ZNODE_PATH + nodePath,
      zookeeper.CreateMode.PERSISTENT,
      function (error) {
        if (error) {
          logger.error('Failed to create node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, error);
          if (callback) callback(error);
        } else {
          if (callback) callback(null);
        }
      }
    );
  };
  
  /**
   * Zookeeper에 node를 EPHEMERAL 모드로 생성함.
   * @private
   * @name _createEphemeralZnode
   * @function
   * @param {string} nodePath - node path
   * @param {data} data - node data
   * @param {callback} done - 초기화 후 수행할 callback function
   */
  _createEphemeralZnode(nodePath, data, callback) {
  
    var nodeData;
  
    if (data && !callback) {
      callback = data;
    } else if (data && callback) {
      nodeData = new Buffer(data);
    }
  
    this.zkClient.create(
      constants.BASE_ZNODE_PATH + nodePath,
      nodeData,
      zookeeper.CreateMode.EPHEMERAL,
      function (error) {
  
  
        if (error) {
          if (error.getCode() == zookeeper.Exception.NODE_EXISTS) {
            if (callback) callback(null);
          } else {
            logger.error('Failed to create node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, error.getName());
            if (callback) callback(error);
          }
  
  
        } else {
          if (callback) callback(null);
        }
      }
    );
  };
  
  /**
   * Zookeeper에 node를 persistent 모드로 생성함.
   * @private
   * @name _createZnodeWithData
   * @function
   * @param {string} nodePath - node path
   * @param {object} - node에 저장할 data
   * @param {callback} callback - 초기화 후 수행할 callback function
   */
  _createZnodeWithData(nodePath, data, callback) {
  
    this.zkClient.create(
      constants.BASE_ZNODE_PATH + nodePath,
      new Buffer(data),
      zookeeper.CreateMode.PERSISTENT,
      function (error) {
        if (error) {
          logger.error('Failed to create node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, error);
          if (callback) callback(error);
        } else {
          if (callback) callback(null);
        }
      }
    );
  };
  
  /**
   * Zookeeper에서 node를 삭제함
   * @private
   * @name _removeZnode
   * @function
   * @param {string} nodePath - node path
   * @param {callback} callback - 초기화 후 수행할 callback function
   */
  _removeZnode(nodePath, callback) {
    this.zkClient.remove(
      constants.BASE_ZNODE_PATH + nodePath,
      -1,
      function (err) {
        if (err) {
          logger.error('Failed to remove node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, err);
          if (callback) callback(err);
        } else {
          if (callback) callback(null);
        }
      }
    );
  };
}

export {NodeManager}