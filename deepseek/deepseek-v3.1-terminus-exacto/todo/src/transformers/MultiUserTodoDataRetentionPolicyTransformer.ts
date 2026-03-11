import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoDataRetentionPolicyTransformer {
  export type Payload =
    Prisma.multi_user_todo_data_retention_policiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        policy_name: true,
        target_entity_type: true,
        retention_period_days: true,
        archival_strategy: true,
        enforcement_enabled: true,
        compliance_required: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        backupLogs: {
          select: { id: true },
        } satisfies Prisma.multi_user_todo_backup_logsFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_data_retention_policiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoDataRetentionPolicy> {
    // Note: backupLogs are selected but not used by the DTO
    return {
      id: input.id,
      policy_name: input.policy_name,
      target_entity_type: input.target_entity_type,
      retention_period_days: input.retention_period_days,
      archival_strategy: input.archival_strategy,
      enforcement_enabled: input.enforcement_enabled,
      compliance_required: input.compliance_required,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
