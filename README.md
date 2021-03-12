# bwrs-infra
Infrastructure for bitwarden_rs

## Dev Container
This project contains VS Code Dev Container configuration with pinned versions of AWS CLI and cfn-lint.

[.devcontainer/devcontainer.json](.devcontainer.json) expects ~/.aws to exist in your home directory.
It will be mounted within the container in read-only mode.