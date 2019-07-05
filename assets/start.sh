#!/bin/bash
set -e

APPNAME=<%= appName %>
APP_PATH=/opt/$APPNAME
ENV_FILE=$APP_PATH/config/env.list
APP_IMAGE=mup-<%= appName.toLowerCase() %>:latest
EXPOSED_PORT=<%= exposedPort %>
PUBLISHED_PORT=<%= publishedPort %>
BIND="0.0.0.0"

set +e
sudo docker rm -f $APPNAME
sudo docker network disconnect bridge -f $APPNAME
set -e

sudo docker run \
  -d \
  --restart=always \
  <% if (typeof proxyConfig === "object") { %> \
  --expose=$EXPOSED_PORT \
  <% } else { %> \
  --publish=$BIND:$PUBLISHED_PORT:$EXPOSED_PORT \
  <% } %> \
  --hostname="$HOSTNAME-$APPNAME" \
  --env-file=$ENV_FILE \
  --name=$APPNAME \
   <% for(var args in docker.args) { %> <%- docker.args[args] %> <% } %> \
  $APP_IMAGE

echo "Started app's container"

<% for(var network in docker.networks) { %>
  sudo docker network connect <%=  docker.networks[network] %> $APPNAME
<% } %>
