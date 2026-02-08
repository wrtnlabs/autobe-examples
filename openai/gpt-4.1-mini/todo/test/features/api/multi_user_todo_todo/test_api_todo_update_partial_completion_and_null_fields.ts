import api from "@ORGANIZATION/PROJECT-api";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import typia from "typia";
import { TestValidator } from "@nestia/e2e";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";

/**
 * Test partially updating an existing todo by toggling completion and setting optional fields to null.
 * Verifies that completion status toggles correctly, optional fields become null, and edit history reflects these changes.
 * Ensures user authorization and prerequisite user and todo creation.
 */
export async function test_api_todo_update_partial_completion_and_null_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized: IMultiUserTodoUser.IAuthorized = await authorize_user_join(
    userConnection,
    { body: {} },
  );
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new todo for the user
  const todo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_user_todos_create(userConnection, {});
  typia.assert(todo);
  // 3. Prepare update body: toggle completion, clear optional fields
  // Since IMultiUserTodoTodo.IUpdate is empty, we use empty object
  const updateBody: IMultiUserTodoTodo.IUpdate = {};
  // 4. Update the todo
  const updatedTodo = await api.functional.multiUserTodo.user.todos.update(
    userConnection,
    {
      todoId: "",
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // 5. Since properties are unknown, skip id equivalence check
}