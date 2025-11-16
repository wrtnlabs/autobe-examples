import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Ensure that deleting a non-existent todo user as an admin produces a
 * not-found style HTTP error and does not corrupt the admin context so that
 * subsequent operations continue to work.
 *
 * Business context:
 *
 * - The DELETE /todoApp/todoAdmin/todoUsers/{todoUserId} endpoint is reserved for
 *   administrative operators (todoAdmin) to remove end-user accounts held in
 *   the `todo_app_todousers` table.
 * - When an admin attempts to delete a user ID that does not exist, the system
 *   must respond with a not-found style error (typically HTTP 404), rather than
 *   treating it as success or leaking internal details.
 * - The failed delete must not impact the admin authentication context or other
 *   users; it should be a clean, contained error.
 *
 * Test steps:
 *
 * 1. Register a new admin via POST /auth/todoAdmin/join, using a random but valid
 *    ITodoAppTodoAdminJoin.IRequest payload. This call should succeed and cause
 *    the SDK to attach a valid access token onto the connection object for
 *    authenticated admin operations.
 * 2. Generate a random UUID string to represent a todoUserId that does not
 *    correspond to any existing user. The test does not create any todo users,
 *    so any UUID is effectively non-existent from the perspective of this
 *    test.
 * 3. Invoke api.functional.todoApp.todoAdmin.todoUsers.erase(connection, {
 *    todoUserId }) inside TestValidator.httpError to assert that the operation
 *    throws an HttpError with 404 status (not found semantics).
 * 4. After the error has been verified, perform a simple follow-up admin operation
 *    (another join with a different email) to confirm that the connection and
 *    backend remain usable after the failed delete.
 */
export async function test_api_todo_admin_delete_nonexistent_user(
  connection: api.IConnection,
) {
  // 1. Register an initial admin to establish an authenticated context.
  const firstJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const firstAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(firstAdmin);

  // Basic sanity check on returned admin identity.
  TestValidator.equals(
    "joined admin email should match input email",
    firstAdmin.email,
    firstJoinBody.email,
  );

  // 2. Generate a random UUID for a todoUserId that does not exist.
  const nonExistentTodoUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the non-existent user and assert not-found error.
  await TestValidator.httpError(
    "deleting non-existent todo user should yield 404 not found error",
    404,
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.erase(connection, {
        todoUserId: nonExistentTodoUserId,
      });
    },
  );

  // 4. Follow-up join to ensure admin-related operations still work
  //    after the failed delete attempt.
  const secondJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const secondAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: secondJoinBody,
    });
  typia.assert(secondAdmin);

  TestValidator.equals(
    "second joined admin email should match its input email",
    secondAdmin.email,
    secondJoinBody.email,
  );
}
