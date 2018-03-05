#!/bin/bash

APPNAME=<%= appName %>

sudo docker rm -f $APPNAME || true
sudo docker network disconnect bridge -f $APPNAME || true
