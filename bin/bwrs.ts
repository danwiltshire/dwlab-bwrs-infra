#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { BwrsStack } from '../lib/bwrs-stack';

const app = new cdk.App();

const env = { // Use details provided by CLI --profile
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
}

// Development environment
new BwrsStack(app, 'bwrs-dev', {
    env: env,
    environmentName: 'dev',
    containerImage: 'bitwardenrs/server:1.19.0'
});

// Production environment
new BwrsStack(app, 'bwrs-prod', {
    env: env,
    environmentName: 'prod',
    containerImage: 'bitwardenrs/server:1.19.0'
});
