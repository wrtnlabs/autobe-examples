import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo app todo creation data for E2E testing.
 *
 * Generates a complete ITodoAppTodo.ICreate with randomized values for testing
 * todo task creation functionality. All fields are customizable via the input
 * parameter for specific test scenarios.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete ITodoAppTodo.ICreate object with all required fields
 */
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate>,
): ITodoAppTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 4 }),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
