import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_edit_history_entry(
  input?: DeepPartial<IMultiUserTodoEditHistoryEntry.ICreate> | undefined,
): IMultiUserTodoEditHistoryEntry.ICreate {
  return {
    title: input?.title ?? typia.random<string & tags.MinLength<1>>(),
    description:
      input?.description === undefined
        ? RandomGenerator.pick([
            null,
            null,
            RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 1,
              wordMax: 10,
            }),
          ])
        : input.description,
    startDate:
      input?.startDate === undefined
        ? RandomGenerator.pick([null, true])
          ? typia.random<string & tags.Format<"date-time">>()
          : null
        : input.startDate,
    dueDate:
      input?.dueDate === undefined
        ? RandomGenerator.pick([null, true])
          ? typia.random<string & tags.Format<"date-time">>()
          : null
        : input.dueDate,
  };
}
