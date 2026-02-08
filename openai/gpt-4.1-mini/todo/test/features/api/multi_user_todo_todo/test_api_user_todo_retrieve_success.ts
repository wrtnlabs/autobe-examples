import api from "@ORGANIZATION/PROJECT-api";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";

export async function test_api_user_todo_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve a detailed todo by its unique identifier.
  //
  // - Authenticate as a new user via /auth/user/join.
  // - Create a new todo via /multiUserTodo/user/todos with required title and optional fields.
  // - Retrieve the todo using its ID with /multiUserTodo/user/todos/{todoId}.
  // - Validate the response contains all todo fields including title, description, start date, due date, completion status, timestamps, and deleted_at is null.
  // - Ensure the retrieved todo belongs to the authenticated user.

  // 1. Authenticate user by joining
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: {} satisfies IMultiUserTodoUser.IJoin,
  });
  typia.assert(userAuthorized);

  // Prepare authorized connection with access token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: userAuthorized.token.access },
  };

  // 2. Create a todo with required title and optional fields via utility
  const newTodo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(newTodo);

  // 3. Retrieve the todo by its ID
  const retrievedTodo = await api.functional.multiUserTodo.user.todos.at(
    userConnection,
    {
      todoId: (newTodo as any).id,
    },
  );
  typia.assert(retrievedTodo);

  // 4. Validate fields and ownership
  const r = retrievedTodo as any;
  const n = newTodo as any;
  TestValidator.equals("todo id matches", r.id, n.id);
  TestValidator.equals(
    "todo user id matches",
    r.multi_user_todo_user_id,
    n.multi_user_todo_user_id,
  );
  TestValidator.equals("todo title matches", r.title, n.title);
  TestValidator.equals("todo description matches", r.description, n.description);
  TestValidator.equals("todo start_date matches", r.start_date, n.start_date);
  TestValidator.equals("todo due_date matches", r.due_date, n.due_date);
  TestValidator.equals("todo completed status matches", r.completed, n.completed);
  TestValidator.equals("todo created_at matches", r.created_at, n.created_at);
  TestValidator.equals("todo updated_at matches", r.updated_at, n.updated_at);
  TestValidator.equals("todo deleted_at should be null", r.deleted_at, null);
}
