import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_multi_user_todo_app_todo(
  input?: DeepPartial<IMultiUserTodoAppTodo.ICreate> | undefined,
): IMultiUserTodoAppTodo.ICreate {
  return {
    title: input?.title ?? typia.random<string & tags.MinLength<1>>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    startDate:
      input?.startDate ?? typia.random<string & tags.Format<"date-time">>(),
    dueDate:
      input?.dueDate ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
