var request = require("../http-client");
var logging = require("../logging");
var config = require("../../config");

var SESSION_HEALTH_URL = "https://sessionserver.mojang.com/session/minecraft/profile/069a79f444e94726a5befca90e38aaf5";
var SKINS_HEALTH_URL = "https://textures.minecraft.net/";
var STATUS_CACHE_TTL_MS = 60 * 1000;

var cachedStatus = null;
var cachedAt = 0;

function fromHealthResponse(err, res) {
  if (err || !res || typeof res.statusCode !== "number") {
    return {
      status: "down",
      code: null,
    };
  }

  // 4xx means endpoint reachable; 5xx means upstream/server issue.
  return {
    status: res.statusCode < 500 ? "up" : "down",
    code: res.statusCode,
  };
}

function checkHealth(url, callback) {
  request.get({
    url: url,
    timeout: config.server.http_timeout,
    encoding: "utf8",
  }, function(err, res) {
    if (err) {
      logging.warn("status health probe error", url, err.code || err.message || err.toString());
    }
    callback(fromHealthResponse(err, res));
  });
}

function sendStatus(callback, payload) {
  callback({
    body: JSON.stringify(payload),
    type: "application/json; charset=utf-8",
    cache_control: "no-cache, max-age=0",
  });
}

module.exports = function(req, callback) {
  if (req.url.path_list.length > 2 || req.url.path_list[1] !== "mc") {
    callback({
      status: -2,
      body: "Invalid Path",
      code: 404,
    });
    return;
  }

  if (cachedStatus && (Date.now() - cachedAt) < STATUS_CACHE_TTL_MS) {
    sendStatus(callback, cachedStatus);
    return;
  }

  var sessionHealth = null;
  var skinsHealth = null;

  function maybeSend() {
    if (!sessionHealth || !skinsHealth) {
      return;
    }
    cachedStatus = {
      report: {
        session: sessionHealth,
        skins: skinsHealth,
      }
    };
    cachedAt = Date.now();
    sendStatus(callback, cachedStatus);
  }

  checkHealth(SESSION_HEALTH_URL, function(result) {
    sessionHealth = result;
    maybeSend();
  });

  checkHealth(SKINS_HEALTH_URL, function(result) {
    skinsHealth = result;
    maybeSend();
  });
};
