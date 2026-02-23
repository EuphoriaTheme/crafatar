var helpers = require("../helpers");
var cache = require("../cache");
var sanitizeDefaultRedirect = require("../default-redirect");

function handle_default(img_status, def, req, err, callback) {
  if (!def) {
    callback({
      status: img_status,
      body: null,
      err: err
    });
    return;
  }

  var cleanDefault = String(def || "").replace(/-/g, "");
  if (helpers.id_valid(cleanDefault)) {
    req.url.searchParams.delete("default");
    req.url.path_list[1] = cleanDefault;
    req.url.pathname = req.url.path_list.join("/");
    callback({
      status: img_status,
      redirect: req.url.toString(),
      err: err
    });
    return;
  }

  var safeRedirect = sanitizeDefaultRedirect(def);
  if (!safeRedirect) {
    callback({
      status: -2,
      body: "Invalid Default",
      code: 422,
      err: err
    });
    return;
  }

  callback({
    status: img_status,
    redirect: safeRedirect,
    err: err
  });
}

// GET cape request
module.exports = function(req, callback) {
  var userId = (req.url.path_list[1] || "").split(".")[0];
  var def = req.url.searchParams.get('default');
  var rid = req.id;

  // check for extra paths
  if (req.url.path_list.length > 2) {
    callback({
      status: -2,
      body: "Invalid Path",
      code: 404
    });
    return;
  }

  // strip dashes
  userId = userId.replace(/-/g, "");
  if (!helpers.id_valid(userId)) {
    callback({
      status: -2,
      body: "Invalid UUID"
    });
    return;
  }

  try {
    helpers.get_cape(rid, userId, function(err, hash, status, image) {
      if (err) {
        if (err.code === "ENOENT") {
          // no such file
          cache.remove_hash(rid, userId);
        }
      }
      if (image) {
        callback({
          status: status,
          body: image,
          type: "image/png",
          hash: hash,
          err: err
        });
      } else {
        handle_default(status, def, req, err, callback);
      }
    });
  } catch(e) {
    callback({
      status: -1,
      err: e
    });
  }
};