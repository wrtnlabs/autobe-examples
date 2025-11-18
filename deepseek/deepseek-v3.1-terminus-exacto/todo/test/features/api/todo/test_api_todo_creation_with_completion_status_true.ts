import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with explicit completion status set to true.
 *
 * This test validates that users can create todo items that are already marked
 * as completed, supporting various workflow patterns where tasks may be added
 * after completion. The test follows a complete user workflow starting with
 * authentication, then creating a pre-completed todo item.
 *
 * Steps:
 *
 * 1. Create a new user account with proper authentication
 * 2. Create a todo item with completion status explicitly set to true
 * 3. Validate that the created todo has the correct completion status
 * 4. Verify all other todo properties are correctly set
 */
export async function test_api_todo_creation_with_completion_status_true(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo with explicit completion status true
  const todoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: todoText,
        completed: true,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Validate the todo completion status
  TestValidator.equals(
    "todo should be marked as completed",
    createdTodo.completed,
    true,
  );

  // Step 4: Validate other todo properties
  TestValidator.equals(
    "todo text should match input",
    createdTodo.text,
    todoText,
  );
  TestValidator.predicate(
    "todo should have valid creation timestamp",
    createdTodo.created_at !== undefined && createdTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo should have valid update timestamp",
    createdTodo.updated_at !== undefined && createdTodo.updated_at.length > 0,
  );
  TestValidator.predicate(
    "todo should not be soft deleted",
    createdTodo.deleted_at === undefined,
  );
}
