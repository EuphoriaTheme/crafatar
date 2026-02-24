var logging = require("../logging");
var config = require("../../config");
var path = require("path");
var fs = require("fs");
var read = fs.readFileSync;
var ejs = require("ejs");
var packageJson = require("../../package.json");

var str;
var index;

// pre-compile the index page
function compile() {
  logging.log("Compiling index page");
  str = read(path.join(__dirname, "..", "views", "index.html.ejs"), "utf-8");
  index = ejs.compile(str);
}

compile();

function firstHeaderValue(value) {
  return String(value || "").split(",")[0].trim();
}

function getDomain(req) {
  var external = String(config.server.external_url || "").trim();
  if (external) {
    return external.replace(/\/$/, "");
  }

  var forwardedProto = firstHeaderValue(req.headers["x-forwarded-proto"]);
  var proto = forwardedProto || "http";
  var forwardedHost = firstHeaderValue(req.headers["x-forwarded-host"]);
  var host = forwardedHost || req.headers.host || "localhost";
  return proto + "://" + host;
}

function getAssetVersion() {
  var files = [
    path.join(__dirname, "..", "public", "javascript", "crafatar.js"),
    path.join(__dirname, "..", "public", "stylesheets", "style.css"),
  ];
  var latestMtimeMs = 0;

  for (var i = 0; i < files.length; i += 1) {
    try {
      var stat = fs.statSync(files[i]);
      if (stat && stat.mtimeMs > latestMtimeMs) {
        latestMtimeMs = stat.mtimeMs;
      }
    } catch (err) {}
  }

  if (latestMtimeMs > 0) {
    return String(Math.floor(latestMtimeMs));
  }
  return packageJson.version || "dev";
}

// GET index request
module.exports = function(req, callback) {
  if (config.server.debug_enabled) {
    // allow changes without reloading
    compile();
  }
  var html = index({
    title: "Crafatar",
    domain: getDomain(req),
    config: config,
    assetVersion: getAssetVersion(),
  });
  callback({
    body: html,
    type: "text/html; charset=utf-8",
    cache_control: "no-cache, max-age=0",
  });
};
