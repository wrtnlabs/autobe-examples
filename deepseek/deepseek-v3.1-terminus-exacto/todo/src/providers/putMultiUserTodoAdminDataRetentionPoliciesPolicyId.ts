import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoDataRetentionPolicyTransformer } from "../transformers/MultiUserTodoDataRetentionPolicyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoAdminDataRetentionPoliciesPolicyId(props: {
  admin: AdminPayload;
  policyId: string & tags.Format<"uuid">;
  body: IMultiUserTodoDataRetentionPolicy.IUpdate;
}): Promise<IMultiUserTodoDataRetentionPolicy> {
  // Ensure policy exists
  await MyGlobal.prisma.multi_user_todo_data_retention_policies.findUniqueOrThrow(
    {
      where: { id: props.policyId },
    },
  );
  // Check policy_name uniqueness if being updated
  if (props.body.policy_name !== undefined) {
    const existing =
      await MyGlobal.prisma.multi_user_todo_data_retention_policies.findFirst({
        where: {
          policy_name: props.body.policy_name,
          deleted_at: null,
          id: { not: props.policyId },
        },
      });
    if (existing) {
      throw new HttpException("Policy name must be unique", 400);
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.multi_user_todo_data_retention_policiesUpdateInput =
    {
      ...(props.body.policy_name !== undefined && {
        policy_name: props.body.policy_name,
      }),
      ...(props.body.target_entity_type !== undefined && {
        target_entity_type: props.body.target_entity_type,
      }),
      ...(props.body.retention_period_days !== undefined && {
        retention_period_days: props.body.retention_period_days,
      }),
      ...(props.body.archival_strategy !== undefined && {
        archival_strategy: props.body.archival_strategy,
      }),
      ...(props.body.enforcement_enabled !== undefined && {
        enforcement_enabled: props.body.enforcement_enabled,
      }),
      ...(props.body.compliance_required !== undefined && {
        compliance_required: props.body.compliance_required,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    };
  await MyGlobal.prisma.multi_user_todo_data_retention_policies.update({
    where: { id: props.policyId },
    data: updateData,
  });
  // Fetch updated policy with transformer
  const updated =
    await MyGlobal.prisma.multi_user_todo_data_retention_policies.findUniqueOrThrow(
      {
        where: { id: props.policyId },
        ...MultiUserTodoDataRetentionPolicyTransformer.select(),
      },
    );
  return await MultiUserTodoDataRetentionPolicyTransformer.transform(updated);
}
