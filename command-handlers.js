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
    var appConfig = api.getConfig().app;
    var tmpPath = tmpBuildPath(appConfig.path, api);
    var list = nodemiral.taskList('Pushing App');
    var sessions = api.getSessions(['app']);
    var npmScripts = utils.npmScripts(api, appConfig.path);
    var postInstallScript = 'mup:postinstall' in npmScripts;

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
        postInstallScript: postInstallScript
      }
    });

    return api.runTaskList(list, sessions, {
      series: true,
      verbose: api.verbose,
    });
  },
  reconfig(api, nodemiral) {
    var list = nodemiral.taskList('Configuring App');
    var appConfig = api.getConfig().app;

    var env = appConfig.env;
    var exposePort = env.PORT;

    env.PORT = 3000

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
        exposePort: exposePort
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
    var appConfig = api.getConfig().app;
    var list = nodemiral.taskList('Start App');

    list.executeScript('Starting the app', {
      script: api.resolvePath(__dirname, 'assets/run-start.sh'),
      vars: {
        appName: appConfig.name
      }
    });
    list.executeScript('Verifying Deployment', {
      script: api.resolvePath(__dirname, 'assets/deploy-check.sh'),
      vars: {
        deployCheckWaitTime: appConfig.deployCheckWaitTime,
        appName: appConfig.name,
        deployCheckPort: 3000
      }
    })

    var sessions = api.getSessions(['app']);

    return api.runTaskList(list, sessions, { verbose: api.verbose, series: true });
  },
  stop(api,nodemiral) {
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