import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random todo creation data for E2E testing.
 *
 * Generates a complete ITodoAppTodo.ICreate with a randomized title.
 * Optional fields (description, start_date, due_date) default to null
 * when not provided, allowing tests to selectively override them.
 *
 * @param input - Optional partial input to override specific fields
 * @returns A fully populated ITodoAppTodo.ICreate instance
 */
export function prepare_random_todo_app_todo(
  input?: DeepPartial<ITodoAppTodo.ICreate>,
): ITodoAppTodo.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description: input?.description ?? null,
    start_date: input?.start_date ?? null,
    due_date: input?.due_date ?? null,
  };
}
