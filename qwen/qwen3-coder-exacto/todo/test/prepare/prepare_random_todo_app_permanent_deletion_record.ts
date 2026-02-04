import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppPermanentDeletionRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPermanentDeletionRecord";
export function prepare_random_todo_app_permanent_deletion_record(
  input?: DeepPartial<ITodoAppPermanentDeletionRecord.ICreate>,
): ITodoAppPermanentDeletionRecord.ICreate {
  return {
    todoId: input?.todoId ?? typia.random<string & tags.Format<"uuid">>(),
    deletedAt: input?.deletedAt ?? new Date().toISOString(),
  };
}
