import api from "@ORGANIZATION/PROJECT-api";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_todo_app_todo } from "../prepare/prepare_random_todo_app_todo";

/**
 * Generate a random todo item for the authenticated user for E2E testing.
 *
 * Prepares random todo creation data using the prepare function, then calls the
 * creation endpoint. The todo is automatically associated with the authenticated
 * member's account and defaults to an incomplete status. Returns the full todo entity with
 * system-generated fields.
 */
export async function generate_random_todo_app_member_todos_create(
  connection: api.IConnection,
  props?: {
    body?: DeepPartial<ITodoAppTodo.ICreate>;
  }
): Promise<ITodoAppTodo> {
  const prepared: ITodoAppTodo.ICreate = prepare_random_todo_app_todo(props?.body);
  const result: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}