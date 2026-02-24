var logging = require("./logging");
var node_redis = require("redis");
var config = require("../config");

var redis = null;
var lastRedisErrorMessage = null;
var lastRedisErrorAt = 0;
var redis_disabled = false;
var memory_cache = new Map();
var memory_enabled = false;

function is_redis_usable() {
  return !redis_disabled && !!(redis && redis.isOpen);
}

function normalize_user_id(userId) {
  return userId && userId.toLowerCase();
}

function enable_memory_cache(reason) {
  if (!memory_enabled) {
    logging.warn("Using in-memory cache backend" + (reason ? " (" + reason + ")" : "") + ".");
  }
  memory_enabled = true;
  redis_disabled = true;
}

function get_memory(userId) {
  return memory_cache.get(userId) || null;
}

function set_memory(userId, data) {
  memory_cache.set(userId, data);
}

function safe_callback(callback, err, value) {
  if (typeof callback === "function") {
    callback(err, value);
  }
}

// sets up redis connection
// flushes redis when using ephemeral storage (e.g. Heroku)
function connect_redis() {
  if (config.caching.backend === "none") {
    logging.warn("Cache backend disabled (CACHE_BACKEND=none).");
    redis_disabled = true;
    return;
  }

  if (config.caching.backend === "memory") {
    enable_memory_cache("CACHE_BACKEND=memory");
    return;
  }

  logging.log("connecting to redis...");
  if (!config.redis_enabled || !config.redis) {
    enable_memory_cache("redis disabled by configuration");
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
      var client = redis;
      redis = null;
      enable_memory_cache("redis auth/protocol error");
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
    redis = null;
    enable_memory_cache("redis connect failed");
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
  userId = normalize_user_id(userId);

  if (memory_enabled) {
    var details = get_memory(userId) || {};
    details.a = Number(!!slim);
    if (!details.t) {
      details.t = Date.now();
    }
    set_memory(userId, details);
    safe_callback(callback, null);
    return;
  }

  if (!is_redis_usable()) {
    safe_callback(callback, null);
    return;
  }

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
  userId = normalize_user_id(userId);

  var sub = temp ? config.caching.local - 60 : 0;
  var time = Date.now() - sub;

  if (memory_enabled) {
    var details = get_memory(userId) || {};
    details.t = time;
    set_memory(userId, details);
    safe_callback(callback, null);
    return;
  }

  if (!is_redis_usable()) {
    safe_callback(callback, null);
    return;
  }

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
  userId = normalize_user_id(userId);

  // store shorter null value instead of "null" string
  skin_hash = skin_hash === null ? "" : skin_hash;
  cape_hash = cape_hash === null ? "" : cape_hash;

  if (memory_enabled) {
    var details = get_memory(userId) || {};
    if (cape_hash !== undefined) {
      details.c = cape_hash;
    }
    if (skin_hash !== undefined) {
      details.s = skin_hash;
    }
    if (slim !== undefined) {
      details.a = Number(!!slim);
    }
    details.t = Date.now();
    set_memory(userId, details);
    safe_callback(callback, null);
    return;
  }

  if (!is_redis_usable()) {
    safe_callback(callback, null);
    return;
  }

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
  userId = normalize_user_id(userId);

  if (memory_enabled) {
    memory_cache.delete(userId);
    return;
  }

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
  userId = normalize_user_id(userId);

  if (memory_enabled) {
    var data = get_memory(userId);
    var details = null;
    if (data) {
      details = {
        skin: data.s === "" ? null : data.s,
        cape: data.c === "" ? null : data.c,
        slim: data.a === 1 || data.a === "1" || data.a === true,
        time: Number(data.t)
      };
    }
    safe_callback(callback, null, details);
    return;
  }

  if (!is_redis_usable()) {
    safe_callback(callback, null, null);
    return;
  }

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