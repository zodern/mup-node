var path = require('path');

module.exports = {
  npmScripts(api, appPath) {
    var pkgPath = api.resolvePath(api.getBasePath(), appPath, 'package.json');

    var pkg = require(pkgPath);
    return pkg.scripts || {};
  }
};
