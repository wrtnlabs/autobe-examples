import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test the behavior when attempting to delete a todo item that has already been
 * soft deleted.
 *
 * This scenario validates that the system properly handles deletion attempts on
 * already-deleted items, ensuring appropriate error handling or idempotent
 * behavior. The test creates a todo item, deletes it once, then attempts to
 * delete it again to verify the system's response to duplicate deletion
 * operations.
 *
 * Steps:
 *
 * 1. Create a user account for authentication
 * 2. Create a new todo item to be deleted
 * 3. Delete the todo item successfully
 * 4. Attempt to delete the same todo item again
 * 5. Verify the system's response to duplicate deletion (idempotent behavior)
 */
export async function test_api_todo_delete_already_deleted(
  connection: api.IConnection,
) {
  // 1. Create a user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new todo item to be deleted
  const todoContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todo = await api.functional.minimalTodo.todos.create(connection, {
    body: {
      content: todoContent,
    } satisfies IMinimalTodoTodo.ICreate,
  });
  typia.assert(todo);

  // 3. Delete the todo item successfully
  await api.functional.minimalTodo.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to delete the same todo item again
  // This should succeed due to idempotent behavior of soft deletion
  await api.functional.minimalTodo.todos.erase(connection, {
    todoId: todo.id,
  });

  // 5. Verify idempotent behavior - no error should be thrown
  // The second deletion should complete successfully like the first one
  TestValidator.predicate(
    "duplicate deletion should succeed without errors",
    true, // If we reach this point without error, the test passes
  );
}
