import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_todo_history_entry(
  input?: DeepPartial<ITodoAppTodoHistoryEntry.ICreate> | undefined,
): ITodoAppTodoHistoryEntry.ICreate {
  return {
    changedTitle:
      input?.changedTitle ?? RandomGenerator.paragraph({ sentences: 2 }),
    changedDescription:
      input?.changedDescription ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    changedStartDate:
      input?.changedStartDate ??
      typia.random<string & tags.Format<"date-time">>(),
    changedDueDate:
      input?.changedDueDate ??
      typia.random<string & tags.Format<"date-time">>(),
    changedCompletionStatus:
      input?.changedCompletionStatus ??
      RandomGenerator.paragraph({ sentences: 1 }),
  };
}
