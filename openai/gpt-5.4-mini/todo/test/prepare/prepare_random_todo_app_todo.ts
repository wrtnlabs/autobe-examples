import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo creation data for E2E testing.
 *
 * Generates a complete ITodoAppTodo.ICreate object with realistic values for
 * the required title and the optional description, start date, and due date.
 * Every property may be selectively overridden through the DeepPartial input.
 */
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate> | undefined,
): ITodoAppTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.name(2),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 3 }),
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
