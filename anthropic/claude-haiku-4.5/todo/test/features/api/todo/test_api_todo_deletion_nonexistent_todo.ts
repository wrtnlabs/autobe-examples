import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that deletion attempts on non-existent todos are properly handled.
 *
 * An authenticated user attempts to delete a todo with an ID that does not
 * exist in the system. The system should return a 404 Not Found error with an
 * appropriate error message. This validates error handling for edge cases where
 * a todo ID may be invalid, malformed, or refer to a todo that was previously
 * deleted or never existed.
 *
 * Test Flow:
 *
 * 1. Register a new user to establish authentication context
 * 2. Generate a non-existent todo ID (valid UUID format but not in system)
 * 3. Attempt to delete the non-existent todo using the authenticated connection
 * 4. Validate that an error is thrown with proper error response
 * 5. Confirm the API properly handles the edge case
 */
export async function test_api_todo_deletion_nonexistent_todo(
  connection: api.IConnection,
) {
  // 1. Register a new user to establish authentication context
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // 2. Generate a non-existent todo ID (valid UUID format but not in system)
  const nonexistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the non-existent todo and validate error handling
  await TestValidator.error(
    "attempting to delete non-existent todo should throw error",
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: nonexistentTodoId,
      });
    },
  );
}
