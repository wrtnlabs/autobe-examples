import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_private_todo_app_todo(
  input?: DeepPartial<IPrivateTodoAppTodo.ICreate>,
): IPrivateTodoAppTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
