import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo creation data for E2E testing.
 *
 * Generates a complete ITodoAppTodo.ICreate with randomized values. The title
 * is always generated as a realistic short task name using a paragraph with 3
 * sentences. Description, start date, and due date are optional and default to
 * realistic content and ISO 8601 date-time strings respectively.
 *
 * All properties accept overrides via the DeepPartial input parameter,
 * allowing tests to customize specific fields while relying on defaults for
 * the rest.
 */
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate> | undefined,
): ITodoAppTodo.ICreate {
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
