#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${1:-fullstack-starter-dev}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

if [[ -z "${REGION}" ]]; then
  echo "Set AWS_REGION or AWS_DEFAULT_REGION before running migrations." >&2
  exit 1
fi

output() {
  local key="$1"
  aws cloudformation describe-stacks \
    --region "${REGION}" \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]" \
    --output text
}

CLUSTER_NAME="$(output ClusterName)"
TASK_DEFINITION_ARN="$(output MigrationTaskDefinitionArn)"
SECURITY_GROUP_ID="$(output MigrationSecurityGroupId)"
PUBLIC_SUBNET_IDS="$(output PublicSubnetIds)"

aws ecs run-task \
  --region "${REGION}" \
  --cluster "${CLUSTER_NAME}" \
  --launch-type FARGATE \
  --task-definition "${TASK_DEFINITION_ARN}" \
  --network-configuration "awsvpcConfiguration={subnets=[${PUBLIC_SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
  --query "tasks[0].taskArn" \
  --output text
