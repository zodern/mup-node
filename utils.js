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
  },
  getImagePrefix(privateRegistry) {
    if (privateRegistry && privateRegistry.imagePrefix) {
      return `${privateRegistry.imagePrefix}/`;
    }

    return '';
  },
  getImageName(appConfig) {
    if (appConfig.docker && appConfig.docker.imageName) {
      return appConfig.docker.imageName;
    }

    return `mup-${appConfig.name.toLowerCase()}`;
  }
};
