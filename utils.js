var path = require('path');
var fs = require('fs');

module.exports = {
  npmScripts(api, appPath) {
    var pkgPath = api.resolvePath(api.getBasePath(), appPath, 'package.json');

    var pkg = require(pkgPath);
    return pkg.scripts || {};
  },
  hasPackageLock(api, appPath) {
    var lockPath = api.resolvePath(api.getBasePath(), appPath, 'package-lock.json');

    return fs.existsSync(lockPath)
  }
};
