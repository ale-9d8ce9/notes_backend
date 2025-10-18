#!/bin/bash

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

node index.js >> ./notes/logs/current.log 2>&1
