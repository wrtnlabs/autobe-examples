import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with minimum required text length (1 character) to
 * validate lower boundary condition handling. User creates a todo with exactly
 * 1 character of text content, verifying that the system accepts the minimum
 * valid input and properly stores single-character todos. This test ensures
 * that the text length validation works correctly at the lower boundary.
 */
export async function test_api_todo_creation_minimum_text_length(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userName = RandomGenerator.name();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Validate user authentication response
  TestValidator.equals("user email should match input", user.email, userEmail);
  TestValidator.equals("user name should match input", user.name, userName);
  TestValidator.predicate(
    "user should have valid token",
    user.token.access.length > 0,
  );

  // Step 2: Create todo with minimum text length (exactly 1 character)
  const minimumText = "A"; // Single character text

  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: minimumText,
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Validate that the todo was created with correct text content
  TestValidator.equals(
    "todo text should match minimum input",
    todo.text,
    minimumText,
  );
  TestValidator.predicate(
    "todo should have exactly 1 character",
    todo.text.length === 1,
  );
  TestValidator.equals(
    "todo completed status should match input",
    todo.completed,
    false,
  );
  TestValidator.predicate(
    "todo should have valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  TestValidator.predicate(
    "todo creation timestamp should be valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(todo.created_at),
  );
  TestValidator.predicate(
    "todo update timestamp should be valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(todo.updated_at),
  );
  TestValidator.equals(
    "todo deleted_at should be undefined for new todo",
    todo.deleted_at,
    undefined,
  );
}
