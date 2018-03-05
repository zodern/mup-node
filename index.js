var handlers = require('./command-handlers');
var validator = require('./validate.js');

function onlyNodeEnabled(commandName) {
  return function (api) {
    var appConfig = api.getConfig().app;

    if (appConfig && appConfig.type === 'node') {
      return api.runCommand(commandName);
    }
  }
}

module.exports = {
  name: 'node',
  description: 'Deploy node.js apps',
  commands: {
    setup: {
      description: 'Setup node.js',
      handler: handlers.setup
    },
    deploy: {
      description: 'Deploy app',
      handler: handlers.deploy
    },
    reconfig: {
      description: 'Reconfig app',
      handler: handlers.reconfig
    },
    start: {
      description: 'Start app',
      handler: handlers.start
    },
    stop: {
      description: 'Stop app',
      handler: handlers.stop
    },
    logs: {
      description: 'View app\'s logs',
      handler: handlers.logs
    },
    // hidden commands
    build: {
      description: false,
      handler: handlers.build
    },
    push: {
      description: false,
      handler: handlers.push
    }
  },
  hooks: {
    'post.default.setup': onlyNodeEnabled('node.setup'),
    'post.default.reconfig': onlyNodeEnabled('node.reconfig'),
    'post.default.deploy': onlyNodeEnabled('node.deploy'),
    'post.default.logs': onlyNodeEnabled('node.logs'),
    'post.default.start': onlyNodeEnabled('node.start'),
    'post.default.stop': onlyNodeEnabled('node.stop')
  },
  validate: {
    app(config, utils) {
      if (config.app && config.app.type === 'node') {
        return validator(config, utils);
      }
      return [];
    }
  }
}