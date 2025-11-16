import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful permanent deletion of a todo item by its owner.
 *
 * This test validates the complete deletion workflow where an authenticated
 * user creates a todo and then permanently deletes it. The test verifies that:
 *
 * 1. User registration and authentication succeeds
 * 2. Todo item creation succeeds with valid data
 * 3. Delete operation executes successfully (hard delete)
 * 4. The deletion completes without errors, confirming the todo is removed
 *
 * This tests the happy path of todo deletion where the user owns the todo being
 * deleted and has proper permissions.
 */
export async function test_api_todo_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account and authenticate
  const userRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userRegistration,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo item owned by this user
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "pending" as const,
    priority: "medium" as const,
    completed: false,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoData,
    });
  typia.assert(createdTodo);

  // Verify the todo was created with correct data
  TestValidator.equals("todo title matches", createdTodo.title, todoData.title);
  TestValidator.equals("todo status is pending", createdTodo.status, "pending");
  TestValidator.equals("todo is not completed", createdTodo.completed, false);

  // Step 3: Delete the todo item (hard delete)
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // Deletion completed successfully without errors, confirming the todo has been removed
}
