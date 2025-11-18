import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful todo creation workflow with valid todo text.
 *
 * This E2E test validates the complete workflow for creating a todo item with
 * valid data. A user registers for the Todo application, authenticates, and
 * then creates a new todo item. The test validates that system-generated fields
 * (ID, timestamps) are properly set and the core todo creation functionality
 * works correctly.
 */
export async function test_api_todo_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Validate user authentication response
  TestValidator.equals("user email matches input email", user.email, userEmail);
  TestValidator.predicate(
    "user has valid authentication token",
    user.token.access.length > 0,
  );
  TestValidator.predicate(
    "user has valid refresh token",
    user.token.refresh.length > 0,
  );

  // Step 2: Create todo with valid data (ensure text meets 1-500 character constraint)
  const todoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: todoText,
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Validate todo creation response
  TestValidator.equals("todo text matches input text", todo.text, todoText);
  TestValidator.equals("todo completed status is false", todo.completed, false);
  TestValidator.equals(
    "todo deleted_at is undefined",
    todo.deleted_at,
    undefined,
  );

  // Validate timestamp order (created_at should be <= updated_at)
  const createdDate = new Date(todo.created_at);
  const updatedDate = new Date(todo.updated_at);
  TestValidator.predicate(
    "created_at timestamp is before or equal to updated_at",
    createdDate <= updatedDate,
  );
}
