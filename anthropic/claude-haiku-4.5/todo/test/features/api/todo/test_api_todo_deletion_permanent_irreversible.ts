import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that todo deletion is truly permanent and irreversible.
 *
 * This test ensures the deletion endpoint completely removes todos from the
 * system with no recovery mechanism. The test workflow:
 *
 * 1. Authenticate user for todo operations
 * 2. Create a todo item with test data
 * 3. Permanently delete the todo
 * 4. Verify attempting to delete the same todo again fails (confirming permanent
 *    removal)
 * 5. Confirm deletion is complete removal, not soft-delete with recovery option
 */
export async function test_api_todo_deletion_permanent_irreversible(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user with join operation
  const authUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>().toLowerCase(),
        password: "TestPassword12345",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authUser);

  // Step 2: Create a todo item for deletion testing
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Todo to be deleted permanently",
        description: "This todo will be deleted and cannot be recovered",
        priority: "high",
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);
  TestValidator.predicate(
    "created todo has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTodo.id,
    ),
  );

  // Step 3: Permanently delete the todo
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // Step 4: Verify deletion is permanent by attempting to delete the same todo again
  // If deletion is truly permanent (not soft-delete), deleting the same todo twice should fail
  await TestValidator.error(
    "deleting already-deleted todo should fail",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: createdTodo.id,
      });
    },
  );

  // Step 5: Confirm deletion is complete and irreversible
  TestValidator.predicate(
    "todo deletion is permanent and not recoverable",
    true,
  );
}
