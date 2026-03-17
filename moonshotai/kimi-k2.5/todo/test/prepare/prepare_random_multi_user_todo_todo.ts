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
    title: input?.title ?? RandomGenerator.name(),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({ paragraphs: 1 }),
    startDate:
      input?.startDate !== undefined
        ? input.startDate
        : RandomGenerator.date(
            new Date(),
            30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
    dueDate:
      input?.dueDate !== undefined
        ? input.dueDate
        : RandomGenerator.date(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
  };
}
