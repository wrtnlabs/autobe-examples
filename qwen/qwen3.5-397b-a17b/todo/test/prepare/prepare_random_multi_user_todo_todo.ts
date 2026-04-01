import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_todo(
  input?: DeepPartial<IMultiUserTodoTodo.ICreate>,
): IMultiUserTodoTodo.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
    started_at:
      input?.started_at !== undefined
        ? input.started_at
        : typia.random<string & tags.Format<"date-time">>(),
    due_at:
      input?.due_at !== undefined
        ? input.due_at
        : typia.random<string & tags.Format<"date-time">>(),
  };
}
