var logging = require("../logging");
var config = require("../../config");
var path = require("path");
var read = require("fs").readFileSync;
var ejs = require("ejs");

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

// GET index request
module.exports = function(req, callback) {
  if (config.server.debug_enabled) {
    // allow changes without reloading
    compile();
  }
  var html = index({
    title: "Crafatar",
    domain: getDomain(req),
    config: config
  });
  callback({
    body: html,
    type: "text/html; charset=utf-8"
  });
};