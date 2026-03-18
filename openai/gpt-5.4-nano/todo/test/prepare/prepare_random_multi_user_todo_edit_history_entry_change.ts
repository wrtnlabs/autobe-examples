import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_edit_history_entry_change(
  input?: DeepPartial<IMultiUserTodoEditHistoryEntryChange.ICreate>,
): IMultiUserTodoEditHistoryEntryChange.ICreate {
  return {
    changedField:
      input?.changedField ??
      RandomGenerator.pick([
        "title",
        "description",
        "start_date",
        "due_date",
      ] as const),
    fromValue:
      input?.fromValue ??
      (Math.random() < 0.3
        ? null
        : RandomGenerator.paragraph({ sentences: 2 })),
    toValue:
      input?.toValue ??
      (Math.random() < 0.3
        ? null
        : RandomGenerator.paragraph({ sentences: 2 })),
  };
}
