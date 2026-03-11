import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_todo(
  input?: DeepPartial<IMultiUserTodoTodo.ICreate> | undefined,
): IMultiUserTodoTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 1 }),
    description:
      input?.description !== undefined
        ? input.description
        : Math.random() > 0.5
          ? RandomGenerator.content({ paragraphs: 1 })
          : null,
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
