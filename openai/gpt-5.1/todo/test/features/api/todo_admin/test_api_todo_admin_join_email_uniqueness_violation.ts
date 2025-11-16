import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Validate that /auth/todoAdmin/join enforces email uniqueness for admin
 * accounts.
 *
 * Business goal:
 *
 * - Ensure that the todoAdmin registration endpoint does not allow multiple
 *   administrator accounts to share the same email address, as
 *   `todo_app_todoadmins.email` is unique.
 * - Verify that a second registration attempt with an already-registered email
 *   fails and does not yield a new ITodoAppTodoAdmin.IAuthorized context.
 *
 * Scenario steps:
 *
 * 1. Register an initial admin using api.functional.auth.todoAdmin.join with a
 *    random, valid email and password plus valid href/referrer URIs.
 * 2. Attempt to register a second admin with the _same_ email but a different
 *    password (and any valid href/referrer).
 * 3. Assert that the second attempt results in an error (typically a
 *    client/conflict HTTP error) rather than a successful
 *    ITodoAppTodoAdmin.IAuthorized payload.
 * 4. Ensure that the original authorized admin object remains valid by
 *    re-asserting its type; we cannot query the DB, so we rely on the fact that
 *    no second authorized object is ever produced for the duplicate email.
 */
export async function test_api_todo_admin_join_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register an initial admin successfully.
  const firstJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.todo-app.test/register",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const firstAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(firstAdmin);

  // 2. Prepare a second registration payload with the same email but different password.
  const secondJoinBody = {
    email: firstJoinBody.email,
    password: RandomGenerator.alphaNumeric(20),
    href: "https://admin.todo-app.test/register?attempt=2",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  // 3. Attempt duplicate registration and expect failure.
  await TestValidator.error(
    "duplicate todoAdmin email must be rejected",
    async () => {
      await api.functional.auth.todoAdmin.join(connection, {
        body: secondJoinBody,
      });
    },
  );

  // 4. Re-assert that the original admin object is still structurally valid.
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(firstAdmin);
}
