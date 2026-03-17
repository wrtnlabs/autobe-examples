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
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
    startDate:
      input?.startDate !== undefined
        ? input.startDate
        : typia.random<string & tags.Format<"date-time">>(),
    dueDate:
      input?.dueDate !== undefined
        ? input.dueDate
        : typia.random<string & tags.Format<"date-time">>(),
  };
}
