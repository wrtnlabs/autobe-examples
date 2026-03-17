import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate> | undefined,
): ITodoAppTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.name(2),
    description:
      input?.description !== undefined
        ? (input.description ?? null)
        : RandomGenerator.content({ paragraphs: 1 }),
    start_date:
      input?.start_date !== undefined
        ? (input.start_date ?? null)
        : typia.random<string & tags.Format<"date-time">>(),
    due_date:
      input?.due_date !== undefined
        ? (input.due_date ?? null)
        : typia.random<string & tags.Format<"date-time">>(),
  };
}
