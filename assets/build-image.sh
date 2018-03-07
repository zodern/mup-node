#!/bin/bash

set -e

APPNAME=<%= appName %>
APP_DIR=/opt/$APPNAME
IMAGE=mup-<%= appName.toLowerCase() %>
BASE_IMAGE=node:<%= nodeVersion %>

set +e
sudo docker pull $BASE_IMAGE
set -e

cd $APP_DIR/tmp
sudo rm -rf bundle
mkdir bundle
sudo tar -xzf bundle.tar.gz -C bundle
sudo chmod 777 ./ -R
cd bundle

sudo cat <<EOT > Dockerfile
FROM node:<%= nodeVersion %>
RUN mkdir -p /home/node/app || true

WORKDIR /home/node/app
<% for(var instruction in buildInstructions) { %>
<%=  buildInstructions[instruction] %>
<% } %>

COPY ./package.json /home/node/app/package.json
RUN npm install --unsafe-perm
COPY ./ ./

CMD [ "npm", "run", "<%= startScript %>" ]
EOT

sudo chmod 777 ./Dockerfile
echo "Building image"
sudo docker build -t $IMAGE:build .
sudo rm -rf bundle
sudo docker tag $IMAGE:latest $IMAGE:previous || true
sudo docker tag $IMAGE:build $IMAGE:latest
sudo docker image prune -f