#!/bin/bash
set -e
trap cleanup SIGINT

function cleanup() {
  echo "Script interrupted, exiting."
  exit 1
}

VENV_DIR="src/venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv $VENV_DIR
fi

source $VENV_DIR/bin/activate

#python3 -m ensurepip --upgrade
echo "Installing dependencies..."
python3 -m pip install -r src/requirements.txt

eland_import_hub_model --url "http://localhost:9200/" --hub-model-id cl-tohoku/bert-base-japanese-v3 --task-type text_embedding --start --insecure --clear-previous

deactivate


