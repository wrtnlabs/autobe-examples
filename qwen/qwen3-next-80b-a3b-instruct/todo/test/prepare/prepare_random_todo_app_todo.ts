import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate>,
): ITodoAppTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      (input?.description === null
        ? null
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 5,
          })),
    start_date:
      input?.start_date ??
      (input?.start_date === null
        ? null
        : typia.random<string & tags.Format<"date-time">>()),
    due_date:
      input?.due_date ??
      (input?.due_date === null
        ? null
        : typia.random<string & tags.Format<"date-time">>()),
  };
}
