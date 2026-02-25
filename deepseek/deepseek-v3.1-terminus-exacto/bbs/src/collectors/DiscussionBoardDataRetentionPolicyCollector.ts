import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardDataRetentionPolicyCollector {
  export async function collect(props: {
    body: IDiscussionBoardDataRetentionPolicy.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      policy_name: props.body.policy_name,
      description: props.body.description,
      retention_period_days: props.body.retention_period_days,
      retention_action: props.body.retention_action,
      compliance_standard: props.body.compliance_standard ?? null,
      is_active: props.body.is_active,
      last_enforced_at: null,
      next_enforcement_due: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_data_retention_policiesCreateInput;
  }
}
