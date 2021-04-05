import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as route53 from '@aws-cdk/aws-route53';
import * as cdk from '@aws-cdk/core';
import * as efs from '@aws-cdk/aws-efs';
import * as ssm from '@aws-cdk/aws-ssm';
import { DeploymentControllerType } from '@aws-cdk/aws-ecs';

interface BwrsStackProps extends cdk.StackProps {
  readonly environmentName: string;
  readonly containerImage: string;
}

export class BwrsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: BwrsStackProps) {
    super(scope, id, props);

    // Local variables
    const applicationName = 'bwrs'
    
    // Environment specific variables
    const environmentRootDomainName = ssm.StringParameter.valueFromLookup(this, `/dwlab/${props.environmentName}/root-domain-name`)
    const environmentVPCID = ssm.StringParameter.valueFromLookup(this, `/dwlab/${props.environmentName}/vpc-id`)
    const applicationDomainName = `${applicationName}.${environmentRootDomainName}`;

    // Get VPC details
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: environmentVPCID
    });

    // Get DNS details
    const myHostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: environmentRootDomainName
    });

    // Create public certificate
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: applicationDomainName,
      validation: acm.CertificateValidation.fromDns(myHostedZone),
    });

    // Create the service using an ECS CDK pattern
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "FargateService", {
      vpc: vpc,
      assignPublicIp: true,
      certificate: certificate,
      domainName: applicationDomainName,
      domainZone: myHostedZone,
      redirectHTTP: true,
      openListener: false,
      desiredCount: 1,
      memoryLimitMiB: 512,
      cpu: 256,
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry(props.containerImage),
        containerPort: 80
      },
    });

    // Load balancer target group health check
    service.targetGroup.configureHealthCheck({
      path: '/alive',
      healthyHttpCodes: '200'    
    });

    // Create the EFS file system for shared Bitwarden data
    const fileSystem = new efs.FileSystem(this, 'MyEfsFileSystem', {
      vpc: vpc,
      encrypted: true, // file system is not encrypted by default
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS, // files are not transitioned to infrequent access (IA) storage by default
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE, // default
    });

    // Allow the ECS service tasks to connect to the EFS file system
    fileSystem.connections.allowDefaultPortFrom(service.service.connections);

    // Create a volume struct so other items can grab its props
    const volume = { 
      name: 'data',
      efsVolumeConfiguration: { 
        fileSystemId: fileSystem.fileSystemId,
      }, 
    }; 

    // Add the volume to the ECS service
    service.taskDefinition.addVolume(volume);

    // Specify the mount point for the EFS volume
    service.taskDefinition.defaultContainer?.addMountPoints({ // if we scale do volumes apply?
      sourceVolume: volume.name,
      containerPath: '/data',
      readOnly: false
    })
  }
}
