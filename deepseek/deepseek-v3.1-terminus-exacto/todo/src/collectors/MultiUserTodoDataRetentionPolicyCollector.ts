import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoDataRetentionPolicyCollector {
  export async function collect(props: {
    body: IMultiUserTodoDataRetentionPolicy.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      policy_name: props.body.policy_name,
      target_entity_type: props.body.target_entity_type,
      retention_period_days: props.body.retention_period_days,
      archival_strategy: props.body.archival_strategy,
      enforcement_enabled: props.body.enforcement_enabled,
      compliance_required: props.body.compliance_required,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.multi_user_todo_data_retention_policiesCreateInput;
  }
}
