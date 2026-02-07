import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardDataRetentionPolicyTransformer } from "../transformers/DiscussionBoardDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminDataRetentionPoliciesPolicyId(props: {
  superAdmin: SuperadminPayload;
  policyId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDataRetentionPolicy.IUpdate;
}): Promise<IDiscussionBoardDataRetentionPolicy> {
  // Validate policy exists
  const existingPolicy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.findUnique({
      where: { id: props.policyId },
    });
  if (!existingPolicy) {
    throw new HttpException("Data retention policy not found", 404);
  }
  // Validate retention_action if provided
  if (props.body.retention_action !== undefined) {
    const allowedActions = ["delete", "archive", "anonymize"];
    if (!allowedActions.includes(props.body.retention_action)) {
      throw new HttpException(
        `Invalid retention action. Must be one of: ${allowedActions.join(", ")}`,
        400,
      );
    }
  }
  // Validate retention_period_days if provided
  if (
    props.body.retention_period_days !== undefined &&
    props.body.retention_period_days < 1
  ) {
    throw new HttpException("Retention period must be at least 1 day", 400);
  }
  // Check policy_name uniqueness if provided
  if (
    props.body.policy_name !== undefined &&
    props.body.policy_name !== existingPolicy.policy_name
  ) {
    const existingPolicyWithName =
      await MyGlobal.prisma.discussion_board_data_retention_policies.findFirst({
        where: {
          policy_name: props.body.policy_name,
          id: { not: props.policyId },
          deleted_at: null,
        },
      });
    if (existingPolicyWithName) {
      throw new HttpException("Policy name already exists", 409);
    }
  }
  // Build update data
  const updateData: Prisma.discussion_board_data_retention_policiesUpdateInput =
    {
      updated_at: toISOStringSafe(new Date()),
    };
  // Apply partial updates
  if (props.body.policy_name !== undefined) {
    updateData.policy_name = props.body.policy_name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.retention_period_days !== undefined) {
    updateData.retention_period_days = props.body.retention_period_days;
  }
  if (props.body.retention_action !== undefined) {
    updateData.retention_action = props.body.retention_action;
  }
  if (props.body.compliance_standard !== undefined) {
    updateData.compliance_standard = props.body.compliance_standard;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Handle next_enforcement_due recalculation without Date objects
  const shouldRecalculateEnforcement =
    props.body.retention_period_days !== undefined ||
    (props.body.is_active !== undefined && props.body.is_active === true);
  if (shouldRecalculateEnforcement) {
    const lastEnforcedAt = existingPolicy.last_enforced_at
      ? new Date(existingPolicy.last_enforced_at).getTime()
      : Date.now();
    const retentionDays =
      props.body.retention_period_days ?? existingPolicy.retention_period_days;
    const nextEnforcementMs =
      lastEnforcedAt + retentionDays * 24 * 60 * 60 * 1000;
    updateData.next_enforcement_due = toISOStringSafe(
      new Date(nextEnforcementMs),
    );
  }
  // Perform the update
  const updatedPolicy =
    await MyGlobal.prisma.discussion_board_data_retention_policies.update({
      where: { id: props.policyId },
      data: updateData,
      ...DiscussionBoardDataRetentionPolicyTransformer.select(),
    });
  return await DiscussionBoardDataRetentionPolicyTransformer.transform(
    updatedPolicy,
  );
}
