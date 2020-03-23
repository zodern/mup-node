var builder = require('./build');
var random = require('random-seed');
var uuid = require('uuid');
var os = require('os');
var path = require('path');
var utils = require('./utils');

function tmpBuildPath(appPath, api) {
  var rand = random.create(appPath);
  var uuidNumbers = [];
  for (var i = 0; i < 16; i++) {
    uuidNumbers.push(rand(255));
  }

  return api.resolvePath(
    os.tmpdir(),
    `mup-node-${uuid.v4({ random: uuidNumbers })}`
  );
}

module.exports = {
  setup(api, nodemiral) {
    var appConfig = api.getConfig().app;

    if (!appConfig) {
      console.error('error: no configs found for app');
      process.exit(1);
    }

    var list = nodemiral.taskList('Setup App');

    list.executeScript('Setup Environment', {
      script: api.resolvePath(__dirname, 'assets/setup.sh'),
      vars: {
        name: appConfig.name
      }
    });

    var sessions = api.getSessions(['app']);

    return api.runTaskList(list, sessions, { verbose: api.verbose });
  },
  build(api) {
    var appPath = api.getConfig().app.path;

    return builder(appPath, tmpBuildPath(appPath, api), api);
  },
  push(api, nodemiral) {
    var {
      app: appConfig,
      privateDockerRegistry
    } = api.getConfig();
    var tmpPath = tmpBuildPath(appConfig.path, api);
    var list = nodemiral.taskList('Pushing App');
    var sessions = api.getSessions(['app']);
    var npmScripts = utils.npmScripts(api, appConfig.path);
    var postInstallScript = 'mup:postinstall' in npmScripts;
    var startScript = 'start' in npmScripts;
    var packageLock = utils.hasPackageLock(api, appConfig.path);

    if (!startScript) {
      console.log('package.json is missing start script.');
    }

    list.copy('Pushing App bundle to the Server', {
      src: path.resolve(tmpPath, 'bundle.tar.gz'),
      dest: `/opt/${appConfig.name}/tmp/bundle.tar.gz`,
      progressBar: true
    });

    list.executeScript('Build Image', {
      script: api.resolvePath(__dirname, 'assets/build-image.sh'),
      vars: {
        appName: appConfig.name,
        nodeVersion: appConfig.nodeVersion,
        env: appConfig.env,
        startScript: appConfig.startScript,
        buildInstructions: appConfig.docker.buildInstructions,
        postInstallScript: postInstallScript,
        packageLock,
        privateRegistry: privateDockerRegistry,
        imagePrefix: utils.getImagePrefix(privateDockerRegistry),
        imageName: utils.getImageName(appConfig)
      }
    });

    return api.runTaskList(list, sessions, {
      series: true,
      verbose: api.verbose,
    });
  },
  reconfig(api, nodemiral) {
    var list = nodemiral.taskList('Configuring App');
    var {
      app: appConfig,
      privateDockerRegistry,
    } = api.getConfig();

    var env = appConfig.env;
    var publishedPort = env.PORT || 80;
    var exposedPort = appConfig.docker.imagePort || 3000;

    env.PORT = exposedPort;

    list.copy('Sending Environment Variables', {
      src: api.resolvePath(__dirname, 'assets/env.list'),
      dest: `/opt/${appConfig.name}/config/env.list`,
      vars: {
        env: env,
        appName: appConfig.name
      }
    });

    list.copy('Sending Start Script', {
      src: api.resolvePath(__dirname, 'assets/start.sh'),
      dest: `/opt/${appConfig.name}/config/start.sh`,
      vars: {
        appName: appConfig.name,
        docker: appConfig.docker,
        proxyConfig: api.getConfig().proxy,
        exposedPort: exposedPort,
        publishedPort: publishedPort,
        privateRegistry: privateDockerRegistry,
        imagePrefix: utils.getImagePrefix(privateDockerRegistry),
        imageName: utils.getImageName(appConfig)
      }
    })

    var sessions = api.getSessions(['app']);

    return api.runTaskList(list, sessions, {
      series: true,
      verbose: api.verbose
    }).then(() => api.runCommand('node.start'))
  },
  deploy(api) {
    return api.runCommand('node.build')
      .then(() => api.runCommand('node.push'))
      .then(() => api.runCommand('node.reconfig'));
  },
  start(api, nodemiral) {
    var {
      app: appConfig,
      privateDockerRegistry,
    } = api.getConfig();
    var list = nodemiral.taskList('Start App');

    list.executeScript('Starting the app', {
      script: api.resolvePath(__dirname, 'assets/run-start.sh'),
      vars: {
        appName: appConfig.name
      }
    });

    if (appConfig.deployCheckWaitTime !== -1) {
      list.executeScript('Verifying Deployment', {
        script: api.resolvePath(__dirname, 'assets/deploy-check.sh'),
        vars: {
          deployCheckWaitTime: appConfig.deployCheckWaitTime,
          appName: appConfig.name,
          deployCheckPort: appConfig.docker.imagePort || 3000,
          imageName: utils.getImageName(appConfig),
          imagePrefix: utils.getImagePrefix(privateDockerRegistry),
          privateRegistry: privateDockerRegistry
        }
      })
    }

    var sessions = api.getSessions(['app']);

    return api.runTaskList(list, sessions, { verbose: api.verbose, series: true });
  },
  stop(api, nodemiral) {
    const appConfig = api.getConfig().app;
    const sessions = api.getSessions(['app']);
    const list = nodemiral.taskList('Stop Meteor');

    list.executeScript('Stop Meteor', {
      script: api.resolvePath(__dirname, 'assets/stop.sh'),
      vars: {
        appName: appConfig.name
      }
    });

    return api.runTaskList(list, sessions, { verbose: api.verbose });
  },
  async destroy(api, nodemiral) {
    const config = api.getConfig();
    const options = api.getOptions();

    if (!options.force) {
      console.error('The destroy command completely removes the app from the server');
      console.error('If you are sure you want to continue, use the `--force` option');
      process.exit(1);
    } else {
      console.log('The app will be completely removed from the server.');
      console.log('Waiting 5 seconds in case you want to cancel by pressing ctr + c');
      await new Promise(resolve => setTimeout(resolve, 1000 * 5));
    }

    const list = nodemiral.taskList('Destroy App');
    const sessions = api.getSessions(['app']);

    if (api.swarmEnabled()) {
      console.error('Destroying app when using swarm is not implemented');
      process.exit(1);
    }

    list.executeScript('Stop App', {
      script: api.resolvePath(__dirname, 'assets/stop.sh'),
      vars: {
        appName: config.app.name
      }
    });

    list.executeScript('Destroy App', {
      script: api.resolvePath(__dirname, 'assets/destroy.sh'),
      vars: {
        name: config.app.name
      }
    });

    return api.runTaskList(list, sessions, {
      series: true,
      verbose: api.verbose
    });
  },
  logs(api) {
    var appConfig = api.getConfig().app;
    var args = api.getArgs();
    if (args[0] === 'node') {
      args.shift();
    }

    var sessions = api.getSessions(['app']);

    return api.getDockerLogs(appConfig.name, sessions, args);
  }
}
