#!/bin/bash -e

# Usage: ./deploy.sh [prod/dev/etc]
#
# ~/.aws/config
#   [default]
#       region = eu-west-1
#   [profile prod]
#       role_arn = arn:aws:iam::123456789012:role/AccessRole
#       source_profile = default
#       region = eu-west-1
#   [profile dev]
#       role_arn = arn:aws:iam::123456789012:role/AccessRole
#       source_profile = default
#       region = eu-west-1

CFN_TEMPLATE="infrastructure.yml"
APPLICATION="bwrs"
ENVIRONMENT="$1"
VPCID="$2"
SUBNETIDS="$3"
ALLOWED_TRAFFIC_CIDR_IP="$4"

function log_usage {
    echo "Usage: ./deploy.sh [prod/dev/etc] vpc-a123baa3 subnet-123a351e,subnet-123a351b,subnet-123a351c 1.123.123.3/32"
}

function lint {
    cfn-lint "$CFN_TEMPLATE"
}

function deploy {
    aws cloudformation deploy \
        --template-file "$CFN_TEMPLATE" \
        --stack-name "$APPLICATION-$ENVIRONMENT" \
        --profile $ENVIRONMENT \
        --capabilities CAPABILITY_IAM \
        --parameter-overrides \
          Application=$APPLICATION \
          Environment=$ENVIRONMENT \
          VPCID=$VPCID \
          SubnetIDs=$SUBNETIDS \
          AllowedTrafficCidrIp=$ALLOWED_TRAFFIC_CIDR_IP
}

# Ensure an enviroment is specified
if [ -z "$ENVIRONMENT" ]; then
  echo "Environment name not supplied!"
  log_usage
  exit 1
fi
# Ensure a VPC ID is specified
if [ -z "$VPCID" ]; then
  echo "VPCID not supplied!"
  log_usage
  exit 1
fi
# Ensure subnet IDs are specified
if [ -z "$SUBNETIDS" ]; then
  echo "SUBNETIDS (comma-separated) not supplied!"
  log_usage
  exit 1
fi
# Ensure allowed traffic Cidr IP is specified
if [ -z "$ALLOWED_TRAFFIC_CIDR_IP" ]; then
  echo "ALLOWED_TRAFFIC_CIDR_IP not supplied!"
  log_usage
  exit 1
fi

lint && deploy
