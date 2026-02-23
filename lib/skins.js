var logging = require("./logging");
var fs = require("fs");
var PNG = require("pngjs").PNG;

var exp = {};

function readPngBuffer(buffer) {
  return PNG.sync.read(buffer);
}

function writePngBuffer(image) {
  return PNG.sync.write(image, { colorType: 6 });
}

function loadPngFile(filename, callback) {
  fs.readFile(filename, function(err, buffer) {
    if (err) {
      callback(err, null);
      return;
    }

    try {
      callback(null, readPngBuffer(buffer));
    } catch (parseErr) {
      callback(parseErr, null);
    }
  });
}

function savePngFile(filename, image, callback) {
  var out;
  try {
    out = writePngBuffer(image);
  } catch (err) {
    callback(err);
    return;
  }

  fs.writeFile(filename, out, callback);
}

function getIndex(image, x, y) {
  return (image.width * y + x) << 2;
}

function cloneImage(image) {
  var out = new PNG({ width: image.width, height: image.height });
  Buffer.from(image.data).copy(out.data);
  return out;
}

function createEmpty(width, height) {
  return new PNG({ width: width, height: height });
}

function cropImage(image, x, y, width, height) {
  var out = createEmpty(width, height);

  for (var yy = 0; yy < height; yy += 1) {
    for (var xx = 0; xx < width; xx += 1) {
      var sourceIndex = getIndex(image, x + xx, y + yy);
      var targetIndex = getIndex(out, xx, yy);
      out.data[targetIndex] = image.data[sourceIndex];
      out.data[targetIndex + 1] = image.data[sourceIndex + 1];
      out.data[targetIndex + 2] = image.data[sourceIndex + 2];
      out.data[targetIndex + 3] = image.data[sourceIndex + 3];
    }
  }

  return out;
}

function removeTransparency(image) {
  for (var i = 3; i < image.data.length; i += 4) {
    image.data[i] = 255;
  }
  return image;
}

function areaHasTransparency(image, x, y, width, height) {
  for (var yy = 0; yy < height; yy += 1) {
    for (var xx = 0; xx < width; xx += 1) {
      var index = getIndex(image, x + xx, y + yy);
      if (image.data[index + 3] < 255) {
        return true;
      }
    }
  }
  return false;
}

function pasteImage(base, overlay, offsetX, offsetY) {
  for (var y = 0; y < overlay.height; y += 1) {
    for (var x = 0; x < overlay.width; x += 1) {
      var destX = offsetX + x;
      var destY = offsetY + y;

      if (destX < 0 || destY < 0 || destX >= base.width || destY >= base.height) {
        continue;
      }

      var sourceIndex = getIndex(overlay, x, y);
      var targetIndex = getIndex(base, destX, destY);

      var sourceAlpha = overlay.data[sourceIndex + 3] / 255;
      var targetAlpha = base.data[targetIndex + 3] / 255;
      var outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

      if (outAlpha <= 0) {
        base.data[targetIndex] = 0;
        base.data[targetIndex + 1] = 0;
        base.data[targetIndex + 2] = 0;
        base.data[targetIndex + 3] = 0;
        continue;
      }

      base.data[targetIndex] = Math.round(
        (overlay.data[sourceIndex] * sourceAlpha + base.data[targetIndex] * targetAlpha * (1 - sourceAlpha)) / outAlpha
      );
      base.data[targetIndex + 1] = Math.round(
        (overlay.data[sourceIndex + 1] * sourceAlpha + base.data[targetIndex + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha
      );
      base.data[targetIndex + 2] = Math.round(
        (overlay.data[sourceIndex + 2] * sourceAlpha + base.data[targetIndex + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha
      );
      base.data[targetIndex + 3] = Math.round(outAlpha * 255);
    }
  }

  return base;
}

function resizeNearest(image, width, height) {
  var out = createEmpty(width, height);

  for (var y = 0; y < height; y += 1) {
    var sourceY = Math.min(image.height - 1, Math.floor(y * image.height / height));
    for (var x = 0; x < width; x += 1) {
      var sourceX = Math.min(image.width - 1, Math.floor(x * image.width / width));
      var sourceIndex = getIndex(image, sourceX, sourceY);
      var targetIndex = getIndex(out, x, y);

      out.data[targetIndex] = image.data[sourceIndex];
      out.data[targetIndex + 1] = image.data[sourceIndex + 1];
      out.data[targetIndex + 2] = image.data[sourceIndex + 2];
      out.data[targetIndex + 3] = image.data[sourceIndex + 3];
    }
  }

  return out;
}

// extracts the face from an image +buffer+
// result is saved to a file called +outname+
// callback: error
exp.extract_face = function(buffer, outname, callback) {
  try {
    var image = readPngBuffer(buffer);
    var face = removeTransparency(cropImage(image, 8, 8, 8, 8));
    savePngFile(outname, face, callback);
  } catch (err) {
    callback(err);
  }
};

// extracts the helm from an image +buffer+ and lays it over a +facefile+
// +facefile+ is the filename of an image produced by extract_face
// result is saved to a file called +outname+
// callback: error
exp.extract_helm = function(rid, facefile, buffer, outname, callback) {
  var skinImg;
  try {
    skinImg = readPngBuffer(buffer);
  } catch (err) {
    callback(err);
    return;
  }

  loadPngFile(facefile, function(openErr, faceImg) {
    if (openErr) {
      callback(openErr);
      return;
    }

    var faceBuffer = writePngBuffer(faceImg);
    var isOpaque = !areaHasTransparency(skinImg, 32, 0, 32, 32);

    if (isOpaque) {
      logging.debug(rid, "Skin is not transparent, skipping helm!");
      callback(null);
      return;
    }

    var helmImg = cropImage(skinImg, 8, 8, 8, 8);
    var faceHelmImg = pasteImage(cloneImage(faceImg), helmImg, 0, 0);
    var faceHelmBuffer = writePngBuffer(faceHelmImg);

    if (faceHelmBuffer.equals(faceBuffer)) {
      logging.debug(rid, "helm img == face img, not storing!");
      callback(null);
      return;
    }

    savePngFile(outname, faceHelmImg, callback);
  });
};

// resizes the image file +inname+ to +size+ by +size+ pixels
// callback: error, image buffer
exp.resize_img = function(inname, size, callback) {
  loadPngFile(inname, function(err, image) {
    if (err) {
      callback(err, null);
      return;
    }

    try {
      var resized = resizeNearest(image, size, size);
      callback(null, writePngBuffer(resized));
    } catch (bufErr) {
      callback(bufErr, null);
    }
  });
};

// returns "mhf_alex" or "mhf_steve" calculated by the +uuid+
exp.default_skin = function(uuid) {
  // great thanks to Minecrell for research into Minecraft and Java's UUID hashing!
  // https://git.io/xJpV
  // MC uses `uuid.hashCode() & 1` for alex
  // that can be compacted to counting the LSBs of every 4th byte in the UUID
  // an odd sum means alex, an even sum means steve
  // XOR-ing all the LSBs gives us 1 for alex and 0 for steve
  var lsbs_even = parseInt(uuid[ 7], 16) ^
                  parseInt(uuid[15], 16) ^
                  parseInt(uuid[23], 16) ^
                  parseInt(uuid[31], 16);
  return lsbs_even ? "mhf_alex" : "mhf_steve";
};

// helper method for opening a skin file from +skinpath+
// callback: error, image buffer
exp.open_skin = function(rid, skinpath, callback) {
  fs.readFile(skinpath, function(err, buf) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, buf);
    }
  });
};

// write the image +buffer+ to the +outpath+ file
// the image is stripped down by lwip.
// callback: error
exp.save_image = function(buffer, outpath, callback) {
  try {
    var image = readPngBuffer(buffer);
    savePngFile(outpath, image, callback);
  } catch (err) {
    callback(err);
  }
};

module.exports = exp;