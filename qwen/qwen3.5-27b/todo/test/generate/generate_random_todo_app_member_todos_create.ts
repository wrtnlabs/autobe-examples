import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_todo } from "../prepare/prepare_random_todo_app_todo";

/**
 * Generate a random todo item via the API for E2E testing.
 *
 * Prepares random todo creation data using the prepare function, then calls the
 * creation endpoint to create a new todo for the authenticated member. The todo
 * includes a required title and optional description, start date, and due date.
 * Newly created todos are automatically marked as incomplete.
 *
 * This function supports partial input override through DeepPartial, allowing
 * test scenarios to customize specific fields while auto-generating others.
 */
export async function generate_random_todo_app_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodo.ICreate> | undefined;
  },
): Promise<ITodoAppTodo> {
  const prepared: ITodoAppTodo.ICreate = prepare_random_todo_app_todo(
    props.body,
  );
  const result: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}
