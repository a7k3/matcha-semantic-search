#!/bin/bash
set -e
trap cleanup SIGINT

function cleanup() {
  echo "Script interrupted, exiting."
  exit 1
}

sudo sysctl -w vm.max_map_count=262144

docker-compose -f docker-compose.yaml
