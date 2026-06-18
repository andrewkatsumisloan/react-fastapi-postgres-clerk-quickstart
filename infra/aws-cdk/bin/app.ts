#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { FullstackStarterStack } from "../lib/fullstack-starter-stack";

const app = new cdk.App();

const appName = app.node.tryGetContext("appName") ?? "fullstack-starter";
const stage = app.node.tryGetContext("stage") ?? "dev";
const clerkJwtIssuer = app.node.tryGetContext("clerkJwtIssuer") ?? "";
const clerkAudience = app.node.tryGetContext("clerkAudience") ?? "";
const corsAllowOrigins = app.node.tryGetContext("corsAllowOrigins") ?? "";
const dbName = app.node.tryGetContext("dbName") ?? "app";
const dbUsername = app.node.tryGetContext("dbUsername") ?? "appuser";
const desiredCount = Number(app.node.tryGetContext("desiredCount") ?? "1");

new FullstackStarterStack(app, `${appName}-${stage}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  appName,
  stage,
  clerkJwtIssuer,
  clerkAudience,
  corsAllowOrigins,
  dbName,
  dbUsername,
  desiredCount,
});
