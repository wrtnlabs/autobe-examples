import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test that updating a non-existent todo returns 404 error.
 *
 * This test validates the proper error handling behavior when attempting to
 * update a todo that does not exist in the system. The scenario involves:
 *
 * 1. User authentication - A user registers and logs in to establish an
 *    authenticated session
 * 2. Invalid todo update attempt - The authenticated user attempts to update a
 *    todo with a non-existent UUID that was never created
 * 3. Error validation - The system returns a 404 Not Found error without revealing
 *    whether the todo exists, preventing information disclosure attacks
 * 4. Security - The test ensures proper ownership validation and prevents access
 *    to todos that don't belong to the user
 *
 * The test verifies that the API correctly rejects attempts to update
 * non-existent todos with appropriate HTTP 404 error responses.
 */
export async function test_api_todo_update_nonexistent_todo_returns_not_found(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const user: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(user);
  TestValidator.predicate(
    "user authentication successful",
    user.id !== undefined,
  );

  // Step 2: Generate a non-existent todo ID (valid UUID format but never created)
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to update the non-existent todo
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ITodoAppTodo.IUpdate;

  // Step 4: Verify that the API returns 404 error
  await TestValidator.httpError(
    "updating non-existent todo should return 404",
    404,
    async () => {
      await api.functional.todoApp.authenticatedUser.todos.update(connection, {
        todoId: nonExistentTodoId,
        body: updateBody,
      });
    },
  );
}
