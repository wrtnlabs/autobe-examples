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
 * Generate a random todo via the API for E2E testing.
 *
 * Prepares random todo creation data using the prepare function, then calls the
 * todo creation endpoint. The authenticated member's identity is automatically
 * associated with the todo. Returns the created todo with all fields populated
 * including its generated ID and timestamps.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial input to override specific fields of the
 *                     todo creation data
 * @returns The newly created todo with all populated fields
 */
export async function generate_random_todo_app_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodo.ICreate> | undefined;
  }
): Promise<ITodoAppTodo> {
  const prepared: ITodoAppTodo.ICreate = prepare_random_todo_app_todo(
    props.body
  );
  return await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: prepared,
    },
  );
}