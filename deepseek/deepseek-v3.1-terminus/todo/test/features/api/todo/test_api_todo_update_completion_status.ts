import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test the update functionality for todo items by changing the completion
 * status from incomplete to complete and vice versa. This test validates that
 * the todo item can be properly marked as completed and then reverted back to
 * incomplete status, ensuring the completion status toggle works correctly.
 */
export async function test_api_todo_update_completion_status(
  connection: api.IConnection,
) {
  // 1. User authentication setup
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // 2. Create initial todo item
  const todoContent = RandomGenerator.paragraph({ sentences: 3 });
  const initialTodo = await api.functional.minimalTodo.todos.create(
    connection,
    {
      body: {
        content: todoContent,
      } satisfies IMinimalTodoTodo.ICreate,
    },
  );
  typia.assert(initialTodo);

  // Validate initial state - should be incomplete
  TestValidator.equals(
    "new todo should be incomplete",
    initialTodo.completed,
    false,
  );

  // 3. Update todo to complete status
  const completedTodo = await api.functional.minimalTodo.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        completed: true,
      } satisfies IMinimalTodoTodo.IUpdate,
    },
  );
  typia.assert(completedTodo);

  // Validate completion status change
  TestValidator.equals(
    "todo should be marked as completed",
    completedTodo.completed,
    true,
  );
  TestValidator.equals(
    "content should remain unchanged",
    completedTodo.content,
    initialTodo.content,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    completedTodo.updated_at,
    initialTodo.updated_at,
  );

  // 4. Revert back to incomplete status
  const revertedTodo = await api.functional.minimalTodo.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        completed: false,
      } satisfies IMinimalTodoTodo.IUpdate,
    },
  );
  typia.assert(revertedTodo);

  // Validate reversion to incomplete status
  TestValidator.equals(
    "todo should be reverted to incomplete",
    revertedTodo.completed,
    false,
  );
  TestValidator.equals(
    "content should still be unchanged",
    revertedTodo.content,
    initialTodo.content,
  );
  TestValidator.notEquals(
    "updated_at should change again",
    revertedTodo.updated_at,
    completedTodo.updated_at,
  );
}
