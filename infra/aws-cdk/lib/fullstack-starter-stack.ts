import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface FullstackStarterStackProps extends StackProps {
  appName: string;
  stage: string;
  clerkJwtIssuer: string;
  clerkAudience: string;
  corsAllowOrigins: string;
  dbName: string;
  dbUsername: string;
  desiredCount: number;
}

export class FullstackStarterStack extends Stack {
  constructor(scope: Construct, id: string, props: FullstackStarterStackProps) {
    super(scope, id, props);

    const namePrefix = `${props.appName}-${props.stage}`;
    const repoRoot = path.resolve(__dirname, "../../..");
    const clientDistPath = path.join(repoRoot, "client", "dist");
    const serverPath = path.join(repoRoot, "server");

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "db",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      credentials: rds.Credentials.fromGeneratedSecret(props.dbUsername),
      databaseName: props.dbName,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO,
      ),
      backupRetention: Duration.days(7),
      deletionProtection: props.stage === "prod",
      removalPolicy: props.stage === "prod" ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY,
    });

    const clerkSecret = new secretsmanager.Secret(this, "ClerkSecret", {
      secretName: `/${namePrefix}/clerk`,
      description:
        "Clerk backend secret for the FastAPI service. Replace the placeholder value after first deploy.",
      secretObjectValue: {
        CLERK_SECRET_KEY: cdk.SecretValue.unsafePlainText("replace-me"),
      },
    });

    const serverImage = new ecrAssets.DockerImageAsset(this, "ServerImage", {
      directory: serverPath,
      file: "Dockerfile.prod",
      platform: ecrAssets.Platform.LINUX_AMD64,
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: `${namePrefix}-cluster`,
    });

    const serverLogGroup = new logs.LogGroup(this, "ServerLogGroup", {
      logGroupName: `/ecs/${namePrefix}/server`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const serverEnvironment = {
      DB_HOST: database.dbInstanceEndpointAddress,
      DB_PORT: database.dbInstanceEndpointPort,
      DB_NAME: props.dbName,
      DB_USER: props.dbUsername,
      CLERK_JWT_ISSUER: props.clerkJwtIssuer,
      CLERK_AUDIENCE: props.clerkAudience,
      CORS_ALLOW_ORIGINS: props.corsAllowOrigins,
    };

    const serverSecrets = {
      DB_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, "password"),
      CLERK_SECRET_KEY: ecs.Secret.fromSecretsManager(
        clerkSecret,
        "CLERK_SECRET_KEY",
      ),
    };

    const api = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "ApiService",
      {
        cluster,
        publicLoadBalancer: true,
        desiredCount: props.desiredCount,
        cpu: 512,
        memoryLimitMiB: 1024,
        assignPublicIp: true,
        taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        taskImageOptions: {
          image: ecs.ContainerImage.fromDockerImageAsset(serverImage),
          containerPort: 8000,
          environment: serverEnvironment,
          secrets: serverSecrets,
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: "server",
            logGroup: serverLogGroup,
          }),
        },
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
        circuitBreaker: { rollback: true },
        minHealthyPercent: 100,
        healthCheckGracePeriod: Duration.seconds(90),
      },
    );

    api.targetGroup.configureHealthCheck({
      path: "/api/health",
      healthyHttpCodes: "200",
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
    });

    database.connections.allowDefaultPortFrom(api.service, "API to Postgres");
    database.secret!.grantRead(api.taskDefinition.executionRole!);
    clerkSecret.grantRead(api.taskDefinition.executionRole!);

    const migrationSecurityGroup = new ec2.SecurityGroup(
      this,
      "MigrationSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for one-off Alembic migration tasks.",
      },
    );
    database.connections.allowDefaultPortFrom(
      migrationSecurityGroup,
      "Migration task to Postgres",
    );

    const migrationTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "MigrationTaskDefinition",
      {
        cpu: 512,
        memoryLimitMiB: 1024,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      },
    );

    migrationTaskDefinition.addContainer("migrate", {
      image: ecs.ContainerImage.fromDockerImageAsset(serverImage),
      command: ["alembic", "upgrade", "head"],
      environment: serverEnvironment,
      secrets: serverSecrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "migrate",
        logGroup: serverLogGroup,
      }),
    });

    database.secret!.grantRead(migrationTaskDefinition.executionRole!);
    clerkSecret.grantRead(migrationTaskDefinition.executionRole!);

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: props.stage === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== "prod",
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `${namePrefix} frontend and API`,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: new origins.LoadBalancerV2Origin(api.loadBalancer, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "DeployFrontend", {
      sources: [s3deploy.Source.asset(clientDistPath)],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
      prune: true,
    });

    const publicSubnetIds = vpc.publicSubnets.map((subnet) => subnet.subnetId);

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "ApiLoadBalancerUrl", {
      value: `http://${api.loadBalancer.loadBalancerDnsName}`,
    });
    new cdk.CfnOutput(this, "ClusterName", {
      value: cluster.clusterName,
    });
    new cdk.CfnOutput(this, "MigrationTaskDefinitionArn", {
      value: migrationTaskDefinition.taskDefinitionArn,
    });
    new cdk.CfnOutput(this, "MigrationSecurityGroupId", {
      value: migrationSecurityGroup.securityGroupId,
    });
    new cdk.CfnOutput(this, "PublicSubnetIds", {
      value: publicSubnetIds.join(","),
    });
    new cdk.CfnOutput(this, "ClerkSecretName", {
      value: clerkSecret.secretName,
    });
    new cdk.CfnOutput(this, "DatabaseSecretName", {
      value: database.secret!.secretName,
    });
    new cdk.CfnOutput(this, "SiteBucketName", {
      value: siteBucket.bucketName,
    });
  }
}
