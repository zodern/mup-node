#!/bin/bash
set -e

APPNAME=<%= appName %>
APP_PATH=/opt/$APPNAME
ENV_FILE=$APP_PATH/config/env.list
APP_IMAGE=<%- imagePrefix %><%= imageName %>:latest
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
  <% if (typeof proxyConfig === "object" && !proxyConfig.loadBalancing) { %> \
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


# When using a private docker registry, the cleanup run when 
# building the image is only done on one server, so we also
# cleanup here so the other servers don't run out of disk space
<% if (privateRegistry) { %>
  echo "pruning images"
  sudo docker image prune -f || true
<% } %>
