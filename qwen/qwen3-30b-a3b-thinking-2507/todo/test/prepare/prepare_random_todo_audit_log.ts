import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_audit_log(
  input?: DeepPartial<ITodoAuditLog.ICreate> | undefined,
): ITodoAuditLog.ICreate {
  return {
    event_type:
      input?.event_type ??
      (RandomGenerator.name(1) + "." + RandomGenerator.name(1)).toLowerCase(),
    event_description:
      input?.event_description ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
