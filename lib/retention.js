var fs = require("fs");
var path = require("path");
var config = require("../config");
var logging = require("./logging");
var cache = require("./cache");

var running = false;
var timer = null;

function getThresholdMs() {
  return Date.now() - (config.caching.retention_days * 24 * 60 * 60 * 1000);
}

async function cleanupRedis(thresholdMs) {
  var redis = cache.get_redis();
  if (!redis || !redis.isOpen) {
    return 0;
  }

  var uuidKey = /^[a-f0-9]{32}$/;
  var removed = 0;
  for await (var key of redis.scanIterator({ MATCH: "*", COUNT: 100 })) {
    if (!uuidKey.test(key)) {
      continue;
    }

    try {
      var keyType = await redis.type(key);
      if (keyType !== "hash") {
        continue;
      }

      var data = await redis.hGetAll(key);
      var timestamp = Number(data && data.t);
      if (timestamp && timestamp < thresholdMs) {
        await redis.del(key);
        removed += 1;
      }
    } catch (err) {
      logging.warn("retention redis cleanup error", key, err && err.message);
    }
  }

  return removed;
}

async function cleanupDirectory(dirPath, thresholdMs) {
  var removed = 0;

  try {
    var entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".png") {
        continue;
      }

      var fullPath = path.join(dirPath, entry.name);
      try {
        var stats = await fs.promises.stat(fullPath);
        if (stats.mtimeMs < thresholdMs) {
          await fs.promises.unlink(fullPath);
          removed += 1;
        }
      } catch (err) {
        logging.warn("retention file cleanup error", fullPath, err && err.message);
      }
    }
  } catch (err) {
    logging.warn("retention read directory error", dirPath, err && err.message);
  }

  return removed;
}

async function cleanupFiles(thresholdMs) {
  var directories = [
    config.directories.faces,
    config.directories.helms,
    config.directories.skins,
    config.directories.renders,
    config.directories.capes,
  ];

  var totalRemoved = 0;
  for (var i = 0; i < directories.length; i += 1) {
    totalRemoved += await cleanupDirectory(directories[i], thresholdMs);
  }

  return totalRemoved;
}

async function runCleanup(trigger) {
  if (running) {
    return;
  }

  running = true;
  var thresholdMs = getThresholdMs();

  try {
    var removedKeys = await cleanupRedis(thresholdMs);
    var removedFiles = await cleanupFiles(thresholdMs);
    logging.log("retention cleanup", trigger, "removed", removedKeys, "redis keys and", removedFiles, "files");
  } catch (err) {
    logging.error("retention cleanup failed", err);
  } finally {
    running = false;
  }
}

function start() {
  if (!config.caching.retention_enabled || config.caching.retention_days <= 0) {
    logging.log("retention cleanup disabled");
    return;
  }

  var intervalMs = Math.max(1, config.caching.retention_interval_hours) * 60 * 60 * 1000;
  runCleanup("startup");
  timer = setInterval(function() {
    runCleanup("interval");
  }, intervalMs);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  start: start,
  stop: stop,
};
