
import zookeeper from 'node-zookeeper-client'
import  {logger} from '../logger'

import constants from './constants'
var  async = require('async')
var  ConsistentHashing = require('./consistent-hashing').ConsistentHashing;

/**
 * 서버정보를 Zookeeper에 등록 후 watching 하면서 사용가능한 서버를 동적으로 관리하기 위한 모듈
 * @module
 * @name NodeManager
 */
 class NodeManager{

    address:string
    ready:boolean
    isWatching:boolean
    nodeRing:any
    servers:any
    serverArray:any
    connected:boolean
    connectionTryNum:number
    zkClient:any

    constructor(addr:string, isWatching:boolean, callback:any) {

        this.address = addr || 'localhost:2181';
        this.ready = false;
        this.isWatching = isWatching;
    
        this.nodeRing = new ConsistentHashing();
        this.servers = {};
        this.serverArray = [];
    
        this.connected = false;
        this.connectionTryNum = 0;
    
        this._connect(isWatching, callback);
    };
  
  
  _connect(isWatching:boolean, callback:any) {
  
    var self = this;
  
    this.zkClient = zookeeper.createClient(this.address, {retries: 2});
  
    this.zkClient.once('connected', function () {

      logger.info("successfully ZOOKEEPER is connected")

      self.connected = true;

      self._initPath('', function () {
        self._initPath(constants.CHANNEL_SERVERS_PATH, function () {
          self._initPath(constants.META_PATH, function () {
            self._initPath(constants.META_PATH + constants.APP_PATH, function () {
              self._initPath(constants.META_PATH + constants.SESSION_SERVER_PATH, function () {

                if (isWatching) {
                  self._watchServerNodes();

                  console.log("start watching serverNodes")
                }

                self.ready = true;
  
                if (callback) callback();
              })
            })
          })
        })
      })
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
  _initPath(nodePath:string, callback:any) {
  
    var self = this;
  
    self.zkClient.exists(
      constants.BASE_ZNODE_PATH + nodePath,
      function (error:Error, stat:any) {
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
  _createZnode(nodePath:string, callback:any) {
    this.zkClient.create(
      constants.BASE_ZNODE_PATH + nodePath,
      zookeeper.CreateMode.PERSISTENT,
      function (error:Error) {
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
  _createEphemeralZnode(nodePath:string, data:any, callback:any) {
  
    var nodeData:any;
  
    if (data && !callback) {
      callback = data;
    } else if (data && callback) {
      nodeData = new Buffer(data);
    }
  
    this.zkClient.create(
      constants.BASE_ZNODE_PATH + nodePath,
      nodeData,
      zookeeper.CreateMode.EPHEMERAL,
      function (error:any) {
  
  
        if (error) {
          if (error.getCode() == zookeeper.Exception.NODE_EXISTS) {
            if (callback) callback(null);
          } else {
            logger.error('Failed to create node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, error.getName());
            if (callback) callback(error);
          }
  
  
        } else {

          logger.info(
            "succeesfully create createEphemeralZnode" +
            "\nnodePath: "+ constants.BASE_ZNODE_PATH + nodePath +
            "\nnodeData: "+ nodeData
          )
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
  _createZnodeWithData(nodePath:string, data:any, callback:any) {
  
    this.zkClient.create(
      constants.BASE_ZNODE_PATH + nodePath,
      new Buffer(data),
      zookeeper.CreateMode.PERSISTENT,
      function (error:Error) {
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
  _removeZnode(nodePath:string, callback:any) {
    this.zkClient.remove(
      constants.BASE_ZNODE_PATH + nodePath,
      -1,
      function (err:Error) {
        if (err) {
          logger.error('Failed to remove node: %s due to: %s.', constants.BASE_ZNODE_PATH + nodePath, err);
          if (callback) callback(err);
        } else {
          if (callback) callback(null);
        }
      }
    );
  };

  _watchServerNodes(){
    var self = this;
    
    this.zkClient.getChildren(
      constants.BASE_ZNODE_PATH + constants.CHANNEL_SERVERS_PATH,
      function (event:any) {
      
        self._watchServerNodes();
      },
      function (error:any, children:any, stat:any) {
        if (error) {

          logger.warn('Failed to list children due to: %s.', error);
          if (error.getCode() == zookeeper.Exception.CONNECTION_LOSS) { 
            self.zkClient.close();
            self._connect(self.isWatching, function (err:Error) {
              if (err) logger.error(err);
            })
          }

        } else {

          var max = children.length;

          var nodeTask = function (taskId:number, value:number, callback:any) {           //its so complicated. change to promise(?) or something

            self._getServerNode(children[taskId], function () {
              taskId++
              if (taskId < max) {
                function_array.splice(function_array.length - 1, 0, nodeTask);
              }
              callback(null, taskId, ++value);   //TODO callback check
            });
          };

          var startTask = function (callback:any) {
            self.servers = {};
            function_array.splice(function_array.length - 1, 0, nodeTask);
            callback(null, 0, 0);       //TODO callback check
          };

          var finalTask = function (taskId:number, value:number, callback:any) {
            callback(null, value);      //TODO callback check
          };

          var function_array = [startTask, finalTask];

          if (max > 0) {

            logger.info('  [event] server nodes [' + max + '] : ' + children);

            async.waterfall(function_array, function (err:Error, result:any) {
              self.serverArray = [];
              self.serverArray = children;
              self.nodeRing = new ConsistentHashing(self.servers);
            });
          } else {
            
            
            self.nodeRing = new ConsistentHashing();
            logger.warn('  [event] server nodes [0] : NOT EXISTED');
          }
        }
      }
    );
  }

  /**
   * get node info from zookeeper and input servers and serverArray
   * @name _getServerNode
   * @function
   * @param {number} childPath - childPath
   * @param {callback} callback -cb
   */
  _getServerNode(childPath:string, cb:any) {
    var self = this;
    var path = constants.BASE_ZNODE_PATH + constants.CHANNEL_SERVERS_PATH + '/' + childPath;

    var _w:any = function (event:any) {
      
      if (event.type == 3) {
        self._getServerNode(childPath,null);
      }
    };

    if (cb && self.serverArray.indexOf(childPath) > -1) {
      _w = undefined;
    }

    self.zkClient.getData(path,
      _w,
      function (error:Error, data:any, stat:any) {

        if (error) {
          logger.error('Fail retrieve server datas: %s.', error);
        } else {

          var replicas = 160;
          if (data !== undefined && data !== null) {
            replicas = data.toString('utf8');
          }

          self.servers[childPath] = childPath + "^" + replicas;

          if (self.serverArray.indexOf(childPath) < 0) {
            self.serverArray.push(childPath);
          }

          if (cb) {
            cb();
          } else {
            self.nodeRing = new ConsistentHashing(self.servers);
            
          }
        }
      }
    );
  };

  _getConfigNode(key:any, cb:any) {
    var self = this;
    var path = constants.BASE_ZNODE_PATH + constants.CONFIG_PATH + '/' + key;
  
    var _w = function (event:any) {
      
      if (event.type == 3) {
        self._getConfigNode(key, cb);
      }
    };
  
    self.zkClient.getData(path,
      _w,
      function (error:Error, data:any, stat:any) {
  
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
      }
    );
  };

  

  addServerNode(config:any, replicas:any, callback:any) {

    var self = this;
    var address = config.host;
    var port =  config.port;
    var serverName = config.serverName;
  
    this.zkClient.getChildren(
      constants.BASE_ZNODE_PATH + constants.CHANNEL_SERVERS_PATH,
      function (error:Error, nodes:any, stats:any) {
        if (error) {
          logger.error(error.stack);
          callback(error);
          return;
        }
  
        var server = address + ':' + port;
        var isExisted = false;
        var names = [];
  
        var existedPathName;
  
        for (var i = 0; i < nodes.length; i++) {
  
          var ninfo = nodes[i].split('^'); 
  
          if (server == ninfo[1]) { 
            existedPathName = nodes[i];
            isExisted = true;
            break;
          }
  
          if ( typeof ninfo[0] == 'number' ){
            names.push(Number(ninfo[0])); 
          } else {
            names.push(ninfo[0]);
          }
  
        }
  
        if (!isExisted) {
  
          if( !serverName ){
            serverName = 10;
            if (names.length > 0) {
              var maxBefore = 0;
              for( var inx in names ){
                if ( typeof names[inx] == 'number' ){
                  maxBefore = names[inx] ;
                }
              }
  
              serverName = maxBefore + Math.floor(Math.random() * (20 - 10 + 1)) + 10;
            }
          }
  
          var nodePath = constants.CHANNEL_SERVERS_PATH + '/' + serverName + '^' + server;
  
          self._createEphemeralZnode(nodePath, replicas + "", (err:Error)=>{
            callback(null,nodePath)
          });
  
        } else {
          if (callback) callback(null,constants.CHANNEL_SERVERS_PATH + '/' + existedPathName);
        }
      }
    );
  };

  getServerNode(key:any) {
    return this.nodeRing.getNode(key);
  };

  createEphemeralPath(path:string, data:any, callback:any) {
    this._createEphemeralZnode(path, data, callback);
  };

  getConfigInfo(key:any, cb:any) {
    return this._getConfigNode(key, cb);
  };
  

}



export {NodeManager}