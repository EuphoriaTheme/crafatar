var http = require("http");
var https = require("https");

function normalizeOptions(urlOrOptions, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  var requestOptions = typeof urlOrOptions === "string" ? { url: urlOrOptions } : (urlOrOptions || {});
  var merged = Object.assign({}, requestOptions, options || {});
  return {
    options: merged,
    callback: callback,
  };
}

function sendRequest(method, urlOrOptions, options, callback) {
  var normalized = normalizeOptions(urlOrOptions, options, callback);
  var requestOptions = normalized.options;
  var cb = normalized.callback;
  var encoding = requestOptions.encoding === undefined ? "utf8" : requestOptions.encoding;
  var followRedirect = requestOptions.followRedirect !== false;
  var timeout = Number(requestOptions.timeout) || 0;

  function requestUrl(urlValue, redirectsLeft) {
    var requestUrlObj = new URL(urlValue);
    if (requestUrlObj.protocol !== "http:" && requestUrlObj.protocol !== "https:") {
      var protocolError = new Error("Unsupported protocol");
      protocolError.code = "EPROTOCOL";
      cb(protocolError, null, null);
      return;
    }
    var transport = requestUrlObj.protocol === "https:" ? https : http;
    var settled = false;

    var req = transport.request({
      method: method,
      hostname: requestUrlObj.hostname,
      port: requestUrlObj.port || undefined,
      path: requestUrlObj.pathname + requestUrlObj.search,
      headers: requestOptions.headers || {},
    }, function(res) {
      if (
        followRedirect &&
        redirectsLeft > 0 &&
        [301, 302, 303, 307, 308].indexOf(res.statusCode) !== -1 &&
        res.headers.location
      ) {
        settled = true;
        req.destroy();
        requestUrl(new URL(res.headers.location, requestUrlObj).toString(), redirectsLeft - 1);
        return;
      }

      var chunks = [];
      res.on("data", function(chunk) {
        chunks.push(chunk);
      });
      res.on("end", function() {
        if (settled) {
          return;
        }
        settled = true;
        var bodyBuffer = Buffer.concat(chunks);
        var body = encoding === null ? bodyBuffer : bodyBuffer.toString(encoding);
        cb(null, res, body);
      });
    });

    req.on("error", function(err) {
      if (settled) {
        return;
      }
      settled = true;
      cb(err, null, null);
    });

    if (timeout > 0) {
      req.setTimeout(timeout, function() {
        var err = new Error("Request timed out");
        err.code = "ETIMEDOUT";
        req.destroy(err);
      });
    }

    req.end();
  }

  requestUrl(requestOptions.url, 10);
}

module.exports = {
  get: function(urlOrOptions, options, callback) {
    sendRequest("GET", urlOrOptions, options, callback);
  },
  post: function(urlOrOptions, options, callback) {
    sendRequest("POST", urlOrOptions, options, callback);
  },
};
