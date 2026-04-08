import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo app todo creation data for E2E testing.
 *
 * Generates a complete ITodoAppTodo.ICreate with randomized values for todo
 * creation testing. The title is required while description, start_date, and
 * due_date are optional. All date-time fields follow ISO 8601 format.
 *
 * This function supports partial input override through DeepPartial, allowing
 * test scenarios to customize specific fields while auto-generating others.
 */
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate> | undefined,
): ITodoAppTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 5 }),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
