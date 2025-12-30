#!/bin/bash

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"


LOGFILE="./logs/current.log"

# Check if the log file exists and is not empty
if [ -f "$LOGFILE" ] && [ -s "$LOGFILE" ]; then

    TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
    ROTATED_LOGFILE="${LOGFILE%.*}-$TIMESTAMP.log" # like current-2025-10-18_15-30-00.log

    echo "changing $LOGFILE to $ROTATED_LOGFILE"
    cp "$LOGFILE" "$ROTATED_LOGFILE"
    truncate -s 0 "$LOGFILE"

    echo "Compressing $ROTATED_LOGFILE"
    gzip "$ROTATED_LOGFILE"

    echo "Old log is $ROTATED_LOGFILE.gz"
else
    echo "Log file $LOGFILE is empty or does not exist. Skipping rotation."
fi