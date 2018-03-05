#!/bin/bash
set -e

APP_DIR=/opt/<%= appName %>

cd $APP_DIR
sudo bash config/start.sh
