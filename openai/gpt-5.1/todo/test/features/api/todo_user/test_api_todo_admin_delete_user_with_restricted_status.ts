import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";

/**
 * Validate that todoAdmin cannot delete todoUser accounts that are in a
 * restricted/protected status.
 *
 * Business context: Administrative operators (todoAdmin) manage end-user
 * accounts (todoUser) through privileged APIs. Certain lifecycle statuses, such
 * as a hypothetical "protected" status, should prevent permanent deletion of a
 * user record to preserve auditability or comply with policy.
 *
 * This E2E test walks through the full workflow to ensure that when a todoUser
 * is set to a restricted status, a delete attempt via the admin deletion
 * endpoint fails and leaves the account intact.
 *
 * Step-by-step process:
 *
 * 1. Register a new todoAdmin via /auth/todoAdmin/join to obtain an administrative
 *    session.
 * 2. Register a new todoUser via /auth/todoUser/join and capture its id.
 * 3. Ensure the connection is authenticated as todoAdmin (re-join admin if
 *    necessary, because todoUser.join also sets Authorization header).
 * 4. As todoAdmin, update the todoUser via PUT
 *    /todoApp/todoAdmin/todoUsers/{todoUserId} to set status to a restricted
 *    value, e.g. "protected".
 * 5. Attempt to delete the same todoUser via DELETE
 *    /todoApp/todoAdmin/todoUsers/{todoUserId}. Expect this operation to fail
 *    with some domain-rule error (we only assert that an error occurs, not the
 *    specific HTTP status code).
 * 6. Finally, GET the todoUser via the admin GET endpoint and assert that:
 *
 *    - The user still exists (id matches original id).
 *    - The status is still "protected" (no change from the failed delete).
 */
export async function test_api_todo_admin_delete_user_with_restricted_status(
  connection: api.IConnection,
) {
  // 1. Register an admin (todoAdmin.join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a todoUser (todoUser.join)
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  const todoUserId = userAuthorized.id;

  // 3. Ensure connection is authenticated as admin again
  const adminRejoinBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    displayName: adminJoinBody.displayName ?? null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminReauthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert(adminReauthorized);

  // 4. As admin, set the user status to a restricted/protected value
  const restrictedStatus = "protected";

  const updatedUser: ITodoAppTodoUser =
    await api.functional.todoApp.todoAdmin.todoUsers.update(connection, {
      todoUserId,
      body: {
        status: restrictedStatus,
      } satisfies ITodoAppTodoUser.IUpdate,
    });
  typia.assert(updatedUser);

  TestValidator.equals(
    "updated user id should match original",
    updatedUser.id,
    todoUserId,
  );
  TestValidator.equals(
    "updated user status should be protected",
    updatedUser.status,
    restrictedStatus,
  );

  // 5. Attempt to delete the protected user and expect failure
  await TestValidator.error(
    "deleting a protected-status todoUser should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.erase(connection, {
        todoUserId,
      });
    },
  );

  // 6. Verify the user still exists and status remains protected
  const reloadedUser: ITodoAppTodoUser =
    await api.functional.todoApp.todoAdmin.todoUsers.at(connection, {
      todoUserId,
    });
  typia.assert(reloadedUser);

  TestValidator.equals(
    "reloaded user id should match original",
    reloadedUser.id,
    todoUserId,
  );
  TestValidator.equals(
    "reloaded user status should still be protected",
    reloadedUser.status,
    restrictedStatus,
  );
}
