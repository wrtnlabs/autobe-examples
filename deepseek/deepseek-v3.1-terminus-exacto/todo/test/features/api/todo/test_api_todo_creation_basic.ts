import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful creation of a basic todo item with minimal required fields.
 *
 * This test validates that authenticated users can create todos with only the
 * required title field, using default 'pending' status and optional description
 * field. Ensures system generates proper ownership assignment and handles
 * minimal input scenarios correctly.
 */
export async function test_api_todo_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create basic todo with minimal required fields
  // Generate a realistic todo title that respects the 1-255 character constraint
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  }).substring(0, 100); // Ensure it's within reasonable length

  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: todoTitle,
      // Description and status are optional - testing minimal input scenario
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Comprehensive validation of todo creation
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "todo status defaults to pending",
    todo.status,
    "pending",
  );
  TestValidator.predicate(
    "description is undefined when not provided",
    todo.description === undefined,
  );

  // Additional business logic validation
  TestValidator.predicate("title is not empty", todo.title.length > 0);
  TestValidator.predicate(
    "title length is within constraints",
    todo.title.length >= 1 && todo.title.length <= 255,
  );

  // Validate that status is one of the allowed values
  TestValidator.predicate(
    "status is valid",
    todo.status === "pending" || todo.status === "completed",
  );
}
