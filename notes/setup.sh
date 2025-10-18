#!/bin/bash

previous_DIR=$(pwd)
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

npm install

mkdir ./logs
touch ./logs/current.log

mkdir ./data

touch ./notes.db

cd "$previous_DIR"
echo "Setup complete. Installed packages and created logs/ and data/ directories and notes.db file."
