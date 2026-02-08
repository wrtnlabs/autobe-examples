import api from "@ORGANIZATION/PROJECT-api";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";

/**
 * Test scenario for a user creating a todo with only the required title field provided.
 * Optional fields description, start date, and due date are omitted.
 * Assert the todo is incomplete by default.
 * Verify response contains correct default field values for the missing optional fields (null or empty).
 * Validate that ownership and timestamps are correctly set.
 */
export async function test_api_multi_user_todo_create_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user and authorize
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IMultiUserTodoUser.IJoin = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "SecretPassword123!",
    display_name: RandomGenerator.name(),
  } satisfies IMultiUserTodoUser.IJoin;
  const authorized = await authorize_user_join(userJoinConnection, {
    body: userJoinBody,
  });
  typia.assert(authorized);
  // 2. Use authorized token to create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Create todo with only required title field
  const todoTitle = RandomGenerator.name(1);
  const todoBody: Partial<any> = {
    title: todoTitle,
    description: null,
    start_date: null,
    due_date: null,
  };
  const todoRaw = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {
      body: todoBody,
    },
  );
  const todo = typia.assert<any>(todoRaw);
  // 4. Validate returned todo fields
  TestValidator.equals("title matches input", todo.title, todoTitle);
  TestValidator.equals("completed by default", todo.completed, false);
  // Optional fields should be explicit null or empty
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  // Ownership must be present and non-empty string
  TestValidator.predicate(
    "multi_user_todo_user_id exists",
    typeof todo.multi_user_todo_user_id === "string" && todo.multi_user_todo_user_id.length > 0,
  );
  // created_at and updated_at must be valid date-time strings
  const createdAt = new Date(todo.created_at);
  const updatedAt = new Date(todo.updated_at);
  TestValidator.predicate("created_at is valid date", !isNaN(createdAt.getTime()));
  TestValidator.predicate("updated_at is valid date", !isNaN(updatedAt.getTime()));
  // deleted_at should be null for newly created todos
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
}
