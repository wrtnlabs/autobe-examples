import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test deletion of completed todo items to validate that completion status does
 * not affect deletion capability. This E2E test follows a complete user
 * workflow: 1) Create a user account and authenticate, 2) Create a todo item
 * with completion status set to true, 3) Delete the completed todo item using
 * the erase API, 4) Verify that the deletion operation succeeds regardless of
 * completion status. The test ensures that both incomplete and completed todos
 * can be deleted successfully, validating that completion status does not
 * interfere with deletion functionality.
 */
export async function test_api_todo_deletion_after_completion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a completed todo item
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: RandomGenerator.paragraph({ sentences: 5 }),
      completed: true,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Verify the todo was created with completed status
  TestValidator.equals("todo should be completed", todo.completed, true);

  // Step 3: Delete the completed todo item
  const deletedTodo = await api.functional.todoApp.user.todos.erase(
    connection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(deletedTodo);

  // Step 4: Verify deletion was successful
  TestValidator.equals(
    "deleted todo ID should match created todo ID",
    deletedTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "deleted todo text should match",
    deletedTodo.text,
    todo.text,
  );
  TestValidator.equals(
    "deleted todo completed status should match",
    deletedTodo.completed,
    todo.completed,
  );
}
