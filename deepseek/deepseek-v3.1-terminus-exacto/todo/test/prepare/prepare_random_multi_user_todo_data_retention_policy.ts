import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_data_retention_policy(
  input?: DeepPartial<IMultiUserTodoDataRetentionPolicy.ICreate>,
): IMultiUserTodoDataRetentionPolicy.ICreate {
  return {
    policy_name:
      input?.policy_name ?? RandomGenerator.paragraph({ sentences: 2 }),
    target_entity_type:
      input?.target_entity_type ??
      RandomGenerator.pick([
        "todo",
        "edit_history",
        "audit_log",
        "user_data",
        "system_log",
      ] as const),
    retention_period_days:
      input?.retention_period_days ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    archival_strategy:
      input?.archival_strategy ??
      RandomGenerator.pick([
        "archive",
        "delete",
        "anonymize",
        "encrypt",
        "compress",
      ] as const),
    enforcement_enabled:
      input?.enforcement_enabled ??
      RandomGenerator.pick([true, false] as const),
    compliance_required:
      input?.compliance_required ??
      RandomGenerator.pick([true, false] as const),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.pick([
            RandomGenerator.paragraph({ sentences: 3 }),
            null,
          ] as const),
  };
}
