import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_permanent_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a todo user to create todos
  const todoUser = await authorize_todo_user_join(connection, {});
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: `Bearer ${todoUser.token.access}` };
  // Step 2: Create a todo item to later move to trash
  const todo = await generate_random_todo_app_todo_user_todos_create(
    userConnection,
    {},
  );
  // Step 3: Move the todo to trash by deleting it
  await api.functional.todoApp.todoUser.todos.erase(userConnection, {
    todoId: todo.id,
  });
  // Step 4: Test successful permanent deletion of a todo entry from the trash system
  // Perform the permanent deletion
  // Note: Using the todo ID as trashEntryId since we don't have a specific endpoint to retrieve trash entries
  // This would depend on the actual API implementation
  await api.functional.todoApp.todoUser.trash.entries.erase(userConnection, {
    trashEntryId: todo.id,
  });
  // Since there's no API to retrieve a specific trash entry to verify deletion,
  // and no way to list trash entries in the provided SDK,
  // we can only verify that the erase operation didn't throw an error.
  // In a complete implementation with appropriate API endpoints,
  // we would verify that the entry is no longer accessible.
}
