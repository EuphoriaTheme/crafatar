// validate external redirect URLs provided by query params
// returns sanitized URL string or null when invalid/unsafe
module.exports = function(defaultUrl) {
  if (!defaultUrl || typeof defaultUrl !== "string") {
    return null;
  }

  if (defaultUrl.length > 2048) {
    return null;
  }

  try {
    var parsed = new URL(defaultUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (e) {
    return null;
  }

  return null;
};
