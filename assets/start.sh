#!/bin/bash
set -e

APPNAME=<%= appName %>
APP_PATH=/opt/$APPNAME
ENV_FILE=$APP_PATH/config/env.list
APP_IMAGE=mup-<%= appName.toLowerCase() %>:latest
PORT=<%= exposePort %>

set +e
sudo docker rm -f $APPNAME
sudo docker network disconnect bridge -f $APPNAME
set -e

sudo docker run \
  -d \
  --restart=always \
  <% if (typeof proxyConfig === "object") { %> \
  --expose=3000 \
  <% } else { %> \
  --publish=$PORT:3000 \
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
