# mup-node plugin

Deploy your Node.js apps with Meteor Up!

This plugin is under development and is missing some features.

## Getting started

First, install mup and mup-node with:

```bash
npm i -g mup mup-node
```

Second, create a config with
``bash
mup init
``

Open the config, and make the following adjustments:

For each server:
- host - Usually is the IP Address of the server
- server authentication - You can use a password or set pem to the path to a private key. If neither are set, it uses ssh-agent

In the `app` section:

- name: A unique name, with no spaces
- path: Path to the app, relative to the config.
- type: Set to `node` to let mup know that this plugin will manage the app

Third, setup the server. Mup will install everything needed to run the app. Run:

```bash
mup setup
```

Fourth, deploy the app. Run

```bash
mup deploy
```

Mup will upload your app, build a docker container, and run it.

## Bundling

`mup-node` copies the app's files to the server. The `.git` and `node_module` directories are ignored.

## Building Image

The base image is `node:<node version>`. As long as the package.json doesn't change, the `node_modules` is cached between deploys.

## Options

`mup-node` is configured with the `app` object in your config. The available options are:

```js
module.exports = {
  app: {
    name: 'name-of-app',
    path: '../path/to/app',
    type: 'node',
    nodeVersion: '8.8.1',
    servers: {
      one: {},
      two: {}
    },
    env: {
      MONGO_URL: 'mongodb://localhost:8000',
      // Port the app is available on, defaults to 80
      PORT: 5000
    },
    docker: {
      args: ['--network=net'],
      networks: ['net2', 'net3']
    }
  }
}

```
