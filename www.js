var networking = require("./lib/networking");
var logging = require("./lib/logging");
var config = require("./config");
var retention = require("./lib/retention");
var fs = require("fs");

function ensureImageDirectories() {
  var directories = [
    config.directories.faces,
    config.directories.helms,
    config.directories.skins,
    config.directories.renders,
    config.directories.capes,
  ];

  for (var i = 0; i < directories.length; i += 1) {
    var dirPath = directories[i];
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (err) {
      logging.warn("failed to create image directory", dirPath, err && err.message);
    }
  }
}

process.on("uncaughtException", function(err) {
  logging.error("uncaughtException", err.stack || err.toString());
  process.exit(1);
});

setInterval(networking.resetCounter, 1000);
ensureImageDirectories();
retention.start();

require("./lib/server.js").boot();
