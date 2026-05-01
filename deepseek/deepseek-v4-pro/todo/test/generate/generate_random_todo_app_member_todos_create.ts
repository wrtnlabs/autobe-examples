import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { prepare_random_todo_app_todo } from "../prepare/prepare_random_todo_app_todo";
/**
 * Generate a random todo for the authenticated member via the API for E2E testing.
 *
 * Prepares random todo data using the prepare function, then calls the creation endpoint. The created todo includes all server-assigned fields such as ID, completed_at (null by default), created_at, and updated_at timestamps.
 *
 * The todo is scoped to the authenticated member and is invisible to all other members. Newly created todos are incomplete by default and appear in the active todo list, not in the trash.
 */
export async function generate_random_todo_app_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodo.ICreate>;
  }
): Promise<ITodoAppTodo> {
  const prepared: ITodoAppTodo.ICreate = prepare_random_todo_app_todo(props.body);
  const result: ITodoAppTodo = await api.functional.todoApp.member.todos.create(connection, {
    body: prepared,
  });
  return result;
}