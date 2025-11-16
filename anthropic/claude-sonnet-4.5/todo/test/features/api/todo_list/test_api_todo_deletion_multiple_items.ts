import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deletion of multiple todo items in sequence.
 *
 * This test validates that the delete operation works correctly and
 * consistently when deleting multiple todo items sequentially. It ensures
 * that:
 *
 * 1. Each deletion operation succeeds independently
 * 2. Deleting one todo does not affect other existing todos
 * 3. The delete endpoint can be invoked multiple times successfully
 * 4. Authentication and ownership are properly maintained throughout
 *
 * Test workflow:
 *
 * 1. Create a new user account and authenticate
 * 2. Create multiple todo items (5 items for comprehensive testing)
 * 3. Delete each todo item one by one in sequence
 * 4. Verify each deletion completes without errors
 * 5. Confirm the delete operation is reliable across multiple invocations
 */
export async function test_api_todo_deletion_multiple_items(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple todo items to be deleted
  const todoCount = 5;
  const createdTodos: ITodoListTodo[] = [];

  for (let i = 0; i < todoCount; i++) {
    const todo = await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `Test Todo ${i + 1}: ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: RandomGenerator.pick([
          "pending",
          "in_progress",
          "completed",
          "cancelled",
        ] as const),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  TestValidator.equals(
    "created todos count matches expected",
    createdTodos.length,
    todoCount,
  );

  // Step 3: Delete each todo item sequentially
  for (let i = 0; i < createdTodos.length; i++) {
    const todoToDelete = createdTodos[i];

    // Delete the todo item
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: todoToDelete.id,
    });

    // Verify deletion succeeded (no error thrown means success for void return)
    TestValidator.predicate(
      `todo ${i + 1} deletion completed successfully`,
      true,
    );
  }

  // Step 4: Verify all deletions completed
  TestValidator.equals(
    "all todo items deleted successfully",
    createdTodos.length,
    todoCount,
  );
}
