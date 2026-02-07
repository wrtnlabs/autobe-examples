import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardDataRetentionPolicyAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_data_retention_policiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        policy_name: true,
        description: true,
        retention_period_days: true,
        retention_action: true,
        compliance_standard: true,
        is_active: true,
        last_enforced_at: true,
        next_enforcement_due: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_data_retention_policiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardDataRetentionPolicy.ISummary> {
    return {
      id: input.id,
      policy_name: input.policy_name,
      retention_period_days: input.retention_period_days,
      retention_action: input.retention_action,
      compliance_standard: input.compliance_standard ?? undefined,
      is_active: input.is_active,
      last_enforced_at:
        input.last_enforced_at !== null
          ? toISOStringSafe(input.last_enforced_at)
          : null,
      next_enforcement_due:
        input.next_enforcement_due !== null
          ? toISOStringSafe(input.next_enforcement_due)
          : null,
    };
  }
}
