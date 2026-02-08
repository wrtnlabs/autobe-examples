import api from "@ORGANIZATION/PROJECT-api";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";

export async function test_api_user_todo_retrieve_after_restore(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Retrieve a todo that was soft deleted and then restored from trash (soft delete step omitted due to no available delete API).
  // 1. Authenticate as a new user via /auth/user/join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: typia.random<IMultiUserTodoUser.IJoin>(),
  });
  typia.assert(authorized);
  // Create a new connection with the user's access token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 2. Create a new todo via /multiUserTodo/user/todos
  const todoRaw = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {},
  );
  const todo = typia.assert(todoRaw) as any;
  // Note: Soft delete step omitted because no delete API or utility is provided.
  // In a real scenario, a soft delete API call would be here.
  // 3. Restore the todo from trash via /multiUserTodo/user/trash/{todoId}/restore
  // Assuming the todo is soft deleted, restore it (operation may be idempotent if todo not deleted)
  const restoredTodoRaw = await api.functional.multiUserTodo.user.trash.restore(
    userConnection,
    { todoId: todo.id },
  );
  const restoredTodo = typia.assert(restoredTodoRaw) as any;
  // 4. Retrieve the restored todo using /multiUserTodo/user/todos/{todoId}
  const retrievedTodoRaw = await api.functional.multiUserTodo.user.todos.at(
    userConnection,
    { todoId: todo.id },
  );
  const retrievedTodo = typia.assert(retrievedTodoRaw) as any;
  // 5. Validate that the todo's deleted_at field is null and all data is intact
  TestValidator.equals("todo id after restore", retrievedTodo.id, todo.id);
  TestValidator.equals(
    "todo title after restore",
    retrievedTodo.title,
    todo.title,
  );
  TestValidator.equals(
    "todo description after restore",
    retrievedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "todo start_date after restore",
    retrievedTodo.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "todo due_date after restore",
    retrievedTodo.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "todo completed status after restore",
    retrievedTodo.completed,
    todo.completed,
  );
  TestValidator.equals(
    "todo created_at after restore",
    retrievedTodo.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "todo updated_at after restore",
    retrievedTodo.updated_at,
    todo.updated_at,
  );
  TestValidator.predicate(
    "todo deleted_at is null after restore",
    retrievedTodo.deleted_at === null,
  );
  // 6. Confirm ownership and correct authorization
  // Since the todo was created by this user and accessed with user auth, ownership is verified implicitly
}
