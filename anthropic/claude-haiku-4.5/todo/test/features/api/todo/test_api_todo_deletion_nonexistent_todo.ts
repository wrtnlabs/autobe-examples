import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deleting a todo that doesn't exist.
 *
 * This test validates proper error handling when attempting to delete a
 * non-existent todo item. The scenario ensures that the API correctly rejects
 * deletion attempts for todos that don't exist, without leaking information
 * about whether the todo might have existed.
 *
 * Workflow:
 *
 * 1. Authenticate a user via the join endpoint to establish user context
 * 2. Generate a non-existent (random) UUID for a todo that doesn't exist
 * 3. Attempt to delete the non-existent todo
 * 4. Verify the API returns a not-found error
 * 5. Confirm error handling is properly implemented without information leakage
 */
export async function test_api_todo_deletion_nonexistent_todo(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user via join endpoint
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate a non-existent UUID for a todo
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to delete the non-existent todo and verify error
  await TestValidator.error(
    "should fail when deleting non-existent todo",
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
