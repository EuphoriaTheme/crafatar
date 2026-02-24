/* globals describe, it, before, after */

var assert = require("assert");
var request = require("../lib/http-client");
var server = require("../lib/server");
var cache = require("../lib/cache");
var config = require("../config");

config.server.port = 3000;
config.server.bind = "127.0.0.1";

describe("Crafatar CI", function() {
  this.timeout(20000);

  before(function(done) {
    server.boot(function() {
      done();
    });
  });

  it("returns 405 for POST /", function(done) {
    request.post("http://localhost:3000", function(error, res) {
      assert.ifError(error);
      assert.strictEqual(res.statusCode, 405);
      done();
    });
  });

  it("serves home page", function(done) {
    request.get("http://localhost:3000", function(error, res, body) {
      assert.ifError(error);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(String(res.headers["content-type"]).startsWith("text/html"));
      assert.ok(body);
      done();
    });
  });

  it("serves stylesheet", function(done) {
    request.get("http://localhost:3000/stylesheets/style.css", function(error, res, body) {
      assert.ifError(error);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(String(res.headers["content-type"]).startsWith("text/css"));
      assert.ok(body);
      done();
    });
  });

  it("serves URL-encoded asset path", function(done) {
    request.get("http://localhost:3000/%73tylesheets/style.css", function(error, res, body) {
      assert.ifError(error);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(String(res.headers["content-type"]).startsWith("text/css"));
      assert.ok(body);
      done();
    });
  });

  after(function(done) {
    server.close(function() {
      var redis = cache.get_redis();
      if (redis && typeof redis.quit === "function") {
        redis.quit();
      }
      done();
    });
  });
});
