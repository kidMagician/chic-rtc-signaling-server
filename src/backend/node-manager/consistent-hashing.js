var crypto = require('crypto');

var ConsistentHashing = exports.ConsistentHashing = function (servers, options) {
  this.replicas = 160;
  this.algorithm = 'md5';
  this.ring = {};
  this.keys = [];
  this.nodes = [];

  this.nodemap = {};

  if (options && options.replicas)  this.replicas = options.replicas;
  if (options && options.algorithm) this.algorithm = options.algorithm;

  if (!servers) servers = {};

  for (var key in servers) {
    var ninfo = servers[key].split('^');
    this.addNode(ninfo[0], servers[key], ninfo[2]);
  }
};


ConsistentHashing.prototype.addNode = function(name, node, re) {
  this.nodes.push(node);

  if (re) {

  } else {
    re = this.replicas;
  }

  for (var i = 0; i < re; i++) {
    var key = this.crypto((node.id || node) + ':' + i);

    this.keys.push(key);
    this.ring[key] = node;
  }

  this.keys.sort();
  this.nodemap[name] = node;
};



ConsistentHashing.prototype.getNodeMap = function () {
  return this.nodemap;
};

ConsistentHashing.prototype.getNode = function (key) {
  if (this.getRingLength() == 0) return 0;

  var hash = this.crypto(key);
  var pos = this.getNodePosition(hash);

  var result = this.ring[this.keys[pos]];
  return {name: result.split('^')[0], url: result.split('^')[1], replicas: result.split('^')[2]};

};

ConsistentHashing.prototype.getNodeByName = function (name) {
  
  if (this.getRingLength() == 0) return 0;

  var result = this.nodemap[name];

  if (result) {
    return {name: result.split('^')[0], url: result.split('^')[1], replicas: result.split('^')[2]};
  } else {
    return null;
  }
};

ConsistentHashing.prototype.getNodePosition = function (hash) {
  var upper = this.getRingLength() - 1;
  var lower = 0;
  var idx = 0;
  var comp = 0;

  if (upper == 0) return 0;

  while (lower <= upper) {
    idx = Math.floor((lower + upper) / 2);
    comp = this.compare(this.keys[idx], hash);

    if (comp == 0) {
      return idx;
    } else if (comp > 0) {
      upper = idx - 1;
    } else {
      lower = idx + 1;
    }
  }

  if (upper < 0) {
    upper = this.getRingLength() - 1;
  }

  return upper;
};


ConsistentHashing.prototype.getRingLength = function () {
  return Object.keys(this.ring).length;
};


ConsistentHashing.prototype.compare = function (v1, v2) {
  return v1 > v2 ? 1 : v1 < v2 ? -1 : 0;
};


ConsistentHashing.prototype.crypto = function (str) {
  return crypto.createHash(this.algorithm).update(str).digest('hex');
};
