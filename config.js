require("dotenv").config();

function envInt(name, fallback) {
  var value = parseInt(process.env[name], 10);
  return Number.isNaN(value) ? fallback : value;
}

function parseRedisUrl(value) {
  var raw = (value || "").trim();
  if (!raw) {
    return {
      url: "redis://localhost:6379",
      enabled: true,
      warning: null
    };
  }

  try {
    var parsed = new URL(raw);
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
      return {
        url: null,
        enabled: false,
        warning: "REDIS_URL must use redis:// or rediss://. Redis cache will be disabled."
      };
    }
  } catch (err) {
    return {
      url: null,
      enabled: false,
      warning: "REDIS_URL is not a valid URL. Redis cache will be disabled."
    };
  }

  return {
    url: raw,
    enabled: true,
    warning: null
  };
}

var redisConfig = parseRedisUrl(process.env.REDIS_URL);
if (redisConfig.warning) {
  console.warn(redisConfig.warning);
}

var config = {
  avatars: {
    // for avatars
    min_size: envInt("AVATAR_MIN", 1),
    // for avatars; large values might lead to slow response time or DoS
    max_size: envInt("AVATAR_MAX", 512),
    // for avatars; size to be used when no size given
    default_size: envInt("AVATAR_DEFAULT", 160)
  },
  renders: {
    // for 3D rendered skins
    min_scale: envInt("RENDER_MIN", 1),
    // for 3D rendered skins; large values might lead to slow response time or DoS
    max_scale: envInt("RENDER_MAX", 10),
    // for 3D rendered skins; scale to be used when no scale given
    default_scale: envInt("RENDER_DEFAULT", 6)
  },
  directories: {
    // directory where faces are kept. must have trailing "/"
    faces: process.env.FACE_DIR || "./images/faces/",
    // directory where helms are kept. must have trailing "/"
    helms: process.env.HELM_DIR || "./images/helms/",
    // directory where skins are kept. must have trailing "/"
    skins: process.env.SKIN_DIR || "./images/skins/",
    // directory where rendered skins are kept. must have trailing "/"
    renders: process.env.RENDER_DIR || "./images/renders/",
    // directory where capes are kept. must have trailing "/"
    capes: process.env.CAPE_DIR || "./images/capes/"
  },
  caching: {
    // seconds until we will check if user's skin changed.
    // Should be > 60 to comply with Mojang's rate limit
    local: envInt("CACHE_LOCAL", 1200),
    // seconds until browser will request image again
    browser: envInt("CACHE_BROWSER", 3600),
    // If true, redis is flushed on start.
    // Use this to avoid issues when you have a persistent redis database but an ephemeral storage
    ephemeral: process.env.EPHEMERAL_STORAGE === "true",
    // Used for information on the front page
    cloudflare: process.env.CLOUDFLARE === "true",
    // If true, periodically delete stale redis entries and old image files
    retention_enabled: process.env.RETENTION_ENABLED !== "false",
    // Maximum age in days for cache/image retention
    retention_days: envInt("RETENTION_DAYS", 30),
    // Interval in hours between cleanup runs
    retention_interval_hours: envInt("RETENTION_INTERVAL_HOURS", 24)
  },
  // URL of your redis server
  redis: redisConfig.url,
  redis_enabled: redisConfig.enabled,
  server: {
    // port to listen on
    port: envInt("PORT", 3000),
    // IP address to listen on
    bind: process.env.BIND || "0.0.0.0",
    // ms until connection to Mojang is dropped
    http_timeout: envInt("EXTERNAL_HTTP_TIMEOUT", 2000),
    // enables logging.debug & editing index page
    debug_enabled: process.env.DEBUG === "true",
    // set to false if you use an external logger that provides timestamps,
    log_time: process.env.LOG_TIME === "true",
    // rate limit per second for outgoing requests to the Mojang session server
    // requests exceeding this limit are skipped and considered failed
    sessions_rate_limit: envInt("SESSIONS_RATE_LIMIT", NaN),
    // public base URL used in docs/examples (e.g. https://crafatar.com)
    external_url: (process.env.EXTERNAL_URL || "").trim()
  },
  sponsor: {
    sidebar: process.env.SPONSOR_SIDE,
    top_right: process.env.SPONSOR_TOP_RIGHT
  },
};

module.exports = config;