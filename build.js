var spawn = require('child_process').spawn;
var path = require('path');
var tar = require('tar');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var containsPath = require('contains-path');

function cleanTmp(tmpPath) {
  try {
    mkdirp.sync(tmpPath);
  } catch (e) {
    console.log(e);
  }

  rimraf.sync(path.join(tmpPath, '*'));
}

module.exports = function (appPath, tmpPath, api) {
  cleanTmp(tmpPath);

  return new Promise((resolve, reject) => {
    var bundlePath = api.resolvePath(tmpPath, 'bundle.tar.gz');

    tar.c({
      file: bundlePath,
      onwarn(message, data) { console.log(message, data)},
      cwd: path.resolve(api.getBasePath(), appPath),
      portable: true,
      gzip: {
        level: 9
      },
      filter(path, stat) {
        if (containsPath(path, './.git')) {
          return false;
        } else if (containsPath(path, './node_modules')) {
          return false;
        }

        return true;
      }
    }, ['.'], (err) => {
      if (err) {
        console.log('err bundling');
        console.log(err);
        reject(err);
      } else {
        resolve();
      }
    })
  });
}
