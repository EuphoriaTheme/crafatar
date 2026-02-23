var logging = require("./logging");
var node_redis = require("redis");
var config = require("../config");

var redis = null;
var lastRedisErrorMessage = null;
var lastRedisErrorAt = 0;
var redis_disabled = false;

function is_redis_usable() {
  return !redis_disabled && !!(redis && redis.isOpen);
}

function safe_callback(callback, err, value) {
  if (typeof callback === "function") {
    callback(err, value);
  }
}

// sets up redis connection
// flushes redis when using ephemeral storage (e.g. Heroku)
function connect_redis() {
  logging.log("connecting to redis...");
  if (!config.redis_enabled || !config.redis) {
    logging.warn("Redis cache disabled by configuration.");
    redis_disabled = true;
    return;
  }
  redis = node_redis.createClient({ url: config.redis });

  redis.flushall = function(callback) {
    var promise = redis.flushAll();
    if (callback) {
      promise.then(function() {
        callback();
      }, callback);
    }
    return promise;
  };

  redis.hmset = function(key, fields, value, callback) {
    var obj = {};
    if (Array.isArray(fields)) {
      for (var i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      callback = value;
    } else if (typeof fields === "string") {
      obj[fields] = value;
    } else {
      obj = fields || {};
      callback = value;
    }

    var promise = redis.hSet(key, obj);
    if (callback) {
      promise.then(function() {
        callback();
      }, callback);
    }
    return promise;
  };

  redis.hgetall = function(key, callback) {
    var promise = redis.hGetAll(key).then(function(result) {
      if (result && Object.keys(result).length === 0) {
        return null;
      }
      return result;
    });
    if (callback) {
      promise.then(function(result) {
        callback(null, result);
      }, function(err) {
        callback(err, null);
      });
    }
    return promise;
  };

  redis.on("ready", function() {
    logging.log("Redis connection established.");
    if (config.caching.ephemeral) {
      logging.log("Storage is ephemeral, flushing redis");
      redis.flushall().catch(function(err) {
        logging.error(err);
      });
    }
  });
  redis.on("error", function(err) {
    var message = String((err && err.message) || err);
    if (redis_disabled) {
      return;
    }
    if (/Unknown RESP type/i.test(message) || /WRONGPASS|NOAUTH/i.test(message)) {
      logging.warn("Redis protocol/auth error detected; disabling Redis cache.");
      redis_disabled = true;
      var client = redis;
      redis = null;
      try {
        if (client && typeof client.destroy === "function") {
          client.destroy();
        }
      } catch (e) {}
      return;
    }
    var now = Date.now();
    if (message !== lastRedisErrorMessage || now - lastRedisErrorAt > 10000) {
      logging.error(err);
      lastRedisErrorMessage = message;
      lastRedisErrorAt = now;
    }
  });
  redis.on("end", function() {
    logging.warn("Redis connection lost!");
  });

  redis.connect().catch(function(err) {
    logging.error(err);
  });
}

var exp = {};

// returns the redis instance
exp.get_redis = function() {
  return redis;
};

// set model type to value of *slim*
exp.set_slim = function(rid, userId, slim, callback) {
  logging.debug(rid, "setting slim for", userId, "to " + slim);
  if (!is_redis_usable()) {
    safe_callback(callback, null);
    return;
  }
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();

  redis.hmset(userId, ["a", Number(slim)], function(err) {
    if (err) {
      logging.debug(rid, "redis set_slim failed", err && err.message ? err.message : err);
    }
    safe_callback(callback, null);
  });
};

// sets the timestamp for +userId+
// if +temp+ is true, the timestamp is set so that the record will be outdated after 60 seconds
// these 60 seconds match the duration of Mojang's rate limit ban
// callback: error
exp.update_timestamp = function(rid, userId, temp, callback) {
  logging.debug(rid, "updating cache timestamp (" + temp + ")");
  if (!is_redis_usable()) {
    safe_callback(callback, null);
    return;
  }
  var sub = temp ? config.caching.local - 60 : 0;
  var time = Date.now() - sub;
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();
  redis.hmset(userId, "t", time, function(err) {
    if (err) {
      logging.debug(rid, "redis update_timestamp failed", err && err.message ? err.message : err);
    }
    safe_callback(callback, null);
  });
};

// create the key +userId+, store +skin_hash+, +cape_hash+, +slim+ and current time
// if +skin_hash+ or +cape_hash+ are undefined, they aren't stored
// this is useful to store cape and skin at separate times, without overwriting the other
// +slim+ can be true (alex) or false (steve)
// +callback+ contans error
exp.save_hash = function(rid, userId, skin_hash, cape_hash, slim, callback) {
  logging.debug(rid, "caching skin:" + skin_hash + " cape:" + cape_hash + " slim:" + slim);
  if (!is_redis_usable()) {
    safe_callback(callback, null);
    return;
  }
  // store shorter null value instead of "null" string
  skin_hash = skin_hash === null ? "" : skin_hash;
  cape_hash = cape_hash === null ? "" : cape_hash;
  // store userId in lower case if not null
  userId = userId && userId.toLowerCase();

  var args = [];
  if (cape_hash !== undefined) {
    args.push("c", cape_hash);
  }
  if (skin_hash !== undefined) {
    args.push("s", skin_hash);
  }
  if (slim !== undefined) {
    args.push("a", Number(!!slim));
  }
  args.push("t", Date.now());

  redis.hmset(userId, args, function(err) {
    if (err) {
      logging.debug(rid, "redis save_hash failed", err && err.message ? err.message : err);
    }
    safe_callback(callback, null);
  });
};

// removes the hash for +userId+ from the cache
exp.remove_hash = function(rid, userId) {
  logging.debug(rid, "deleting hash from cache");
  if (!is_redis_usable()) {
    return;
  }
  redis.del(userId.toLowerCase()).catch(function(err) {
    logging.debug(rid, "redis del failed", err && err.message ? err.message : err);
  });
};

// get a details object for +userId+
// {skin: "0123456789abcdef", cape: "gs1gds1g5d1g5ds1", time: 1414881524512}
// callback: error, details
// details is null when userId not cached
exp.get_details = function(userId, callback) {
  if (!is_redis_usable()) {
    safe_callback(callback, null, null);
    return;
  }
  // get userId in lower case if not null
  userId = userId && userId.toLowerCase();
  redis.hgetall(userId, function(err, data) {
    if (err) {
      safe_callback(callback, null, null);
      return;
    }
    var details = null;
    if (data) {
      details = {
        skin: data.s === "" ? null : data.s,
        cape: data.c === "" ? null : data.c,
        slim: data.a === "1",
        time: Number(data.t)
      };
    }
    safe_callback(callback, null, details);
  });
};

connect_redis();
module.exports = exp;