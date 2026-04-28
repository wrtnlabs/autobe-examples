import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random TodoApp todo creation data for E2E testing.
 *
 * Generates a complete ITodoAppTodo.ICreate with randomized values including
 * task title, optional description, start date, and due date. All date-time
 * fields follow ISO 8601 format. Each time the function is called, it produces
 * different realistic data for comprehensive API testing.
 *
 * The title defaults to a 3-word random phrase simulating typical task names.
 * The description defaults to a short paragraph for optional task details.
 * Both start_date and due_date default to random date-time strings.
 */
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate>,
): ITodoAppTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 1 }),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
