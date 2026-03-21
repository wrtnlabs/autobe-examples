import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_todo(
  input?: DeepPartial<IMultiUserTodoTodo.ICreate>,
): IMultiUserTodoTodo.ICreate {
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description: input?.description ?? null,
    startDate:
      input?.startDate ??
      (RandomGenerator.date(now, thirtyDays).toISOString() as any),
    dueDate:
      input?.dueDate ??
      (RandomGenerator.date(now, sixtyDays).toISOString() as any),
  };
}
