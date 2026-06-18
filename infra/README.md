# AWS Deployment Options

This starter can be deployed to AWS a few different ways. The repo now includes
a recommended CDK path in `infra/aws-cdk/`; the other options are documented so
you can choose based on cost, operational needs, and how much AWS surface area
you want to own.

## Recommendation

Use **Option A: CDK with CloudFront, ECS Fargate, and RDS** for anything that
should look like a real production path. It keeps the frontend cheap and global,
runs the FastAPI server as a container, keeps Postgres private, and avoids
Kubernetes-level complexity.

## Option A: CDK, CloudFront, ECS Fargate, RDS

Path: `infra/aws-cdk/`

What it creates:

- VPC with public subnets for the load balancer and Fargate tasks.
- Isolated private subnets for Postgres.
- RDS PostgreSQL with generated database credentials in Secrets Manager.
- FastAPI container built from `server/Dockerfile.prod` and deployed to ECS
  Fargate behind an Application Load Balancer.
- A separate ECS task definition for Alembic migrations.
- S3 bucket for the Vite build output.
- CloudFront distribution serving the SPA and proxying `/api/*` to the API.
- A placeholder Clerk secret in Secrets Manager that you replace after deploy.

Why this is the default:

- It matches the repo's existing production shape: static client, containerized
  API, external Postgres, explicit migrations.
- It supports same-origin API calls through CloudFront, so the client can keep
  the production default of using `window.location.origin`.
- It is easy to extend later with a custom domain, WAF, private ECS tasks with a
  NAT gateway, or CI/CD.

Tradeoffs:

- More AWS resources than App Runner.
- More expensive than a single EC2 instance.
- The starter uses public-subnet Fargate tasks to avoid NAT Gateway cost. Inbound
  traffic is still restricted by security groups, but a stricter production
  variant would move tasks into private subnets and add NAT or VPC endpoints.

## Option B: App Runner API, CloudFront/S3 Frontend, RDS

Best when you want the least container orchestration.

Shape:

- Vite frontend in S3 behind CloudFront.
- FastAPI container in AWS App Runner.
- RDS PostgreSQL in private subnets.
- App Runner VPC connector for database access.
- Migrations run from CI, CodeBuild, or a small one-off ECS task.

Why you might pick it:

- Fewer ECS concepts to understand.
- App Runner handles a lot of service deployment mechanics.
- Good fit for small teams and simple APIs.

Why it is not the default here:

- Alembic migrations are less naturally modeled than with ECS task definitions.
- You still need VPC connector and secret wiring for RDS and Clerk.
- It becomes less flexible once you need custom networking, sidecars, or more
  backend services.

## Option C: Single EC2 Host Running Production Compose

Best for a cheap demo, prototype, or small internal deployment.

Shape:

- One EC2 instance with Docker installed by user data.
- Existing `docker-compose.prod.yml` runs nginx and FastAPI.
- RDS PostgreSQL is still recommended, but local Postgres can be acceptable for
  disposable demos.
- TLS can be handled by an ALB, Caddy, Traefik, or nginx plus Certbot.

Why you might pick it:

- Lowest conceptual overhead.
- Reuses the current production Compose file almost directly.
- Cheapest path for a small always-on deployment if you use a small instance.

Why it is not the default:

- You own patching, host security, disk pressure, and deployment rollbacks.
- Scaling is manual.
- It is easy for a "temporary" server to become production without the right
  backups and monitoring.

## Option D: Elastic Beanstalk

This is viable, but not a great fit for this repo as-is. The app has a static
frontend, a separate API, Postgres, and migrations. Beanstalk is better when the
whole app can be packaged as one web service. If you want a managed PaaS-style
experience, App Runner is cleaner for the API and CloudFront/S3 is cleaner for
the frontend.

## What To Add Next

The CDK stack intentionally starts with the core deployable resources. Good next
steps are:

- GitHub Actions OIDC role for `cdk deploy`.
- Custom domain and ACM certificate for CloudFront.
- CloudFront response headers policy and optional WAF.
- Private Fargate tasks with NAT Gateway or VPC endpoints.
- RDS backup retention and deletion protection tuned per environment.
- A scripted migration command that reads CDK outputs and calls `aws ecs run-task`.
