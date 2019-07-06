var spawn = require('child_process').spawn;
var path = require('path');
var tar = require('tar');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var containsPath = require('contains-path');
var ignore = require('ignore');
var fs = require('fs');

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
  const ig = ignore();
  const ignorePath = api.resolvePath(appPath, '.mupignore');
  if (fs.existsSync(ignorePath)) {
    ig.add(fs.readFileSync(ignorePath).toString())
  }

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
      filter(itemPath, stat) {
        if (containsPath(itemPath, './.git')) {
          return false;
        } else if (containsPath(itemPath, './node_modules')) {
          return false;
        }
        
        // Since itemPath usually starts with "./", we resolve it first so it isn't relative to the cwd
        const relativePath = path.relative(appPath, path.resolve(appPath, itemPath));
        if (relativePath.length === 0) {
          return true;
        }
        
        const result = !ig.ignores(relativePath);
        
        return result;
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
