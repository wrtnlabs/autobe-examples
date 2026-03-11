import { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_system_audit_log_parameter(
  input?:
    | DeepPartial<IDiscussionBoardSystemAuditLogParameter.ICreate>
    | undefined,
): IDiscussionBoardSystemAuditLogParameter.ICreate {
  return {
    parameterKey:
      input?.parameterKey ??
      RandomGenerator.pick([
        "field_name",
        "old_value",
        "new_value",
        "target_id",
        "operation_type",
        "user_id",
        "timestamp",
        "ip_address",
        "action",
        "resource_type",
      ] as const),
    parameterValue: input?.parameterValue ?? RandomGenerator.alphabets(10),
  };
}
