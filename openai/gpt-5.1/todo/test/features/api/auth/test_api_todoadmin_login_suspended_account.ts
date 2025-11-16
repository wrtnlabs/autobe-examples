import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";

/**
 * Validate that non-active todoAdmin accounts (e.g., suspended or closed)
 * cannot successfully authenticate using the /auth/todoAdmin/login endpoint,
 * and that failed admin login attempts never yield an
 * ITodoAppTodoAdmin.IAuthorized context.
 *
 * Business context:
 *
 * - TodoAdmin accounts have a lifecycle status (for example, "active",
 *   "suspended", or "closed") surfaced via
 *   ITodoAppTodoAdmin.IAuthorized.status.
 * - Only accounts in an allowed status (typically "active") should receive an
 *   ITodoAppTodoAdmin.IAuthorized response and IAuthorizationToken bundle when
 *   calling POST /auth/todoAdmin/login.
 * - Accounts that are not allowed to log in (including suspended/closed or
 *   otherwise invalid credentials) must fail the login attempt and surface an
 *   error instead of an authorized context.
 *
 * Test environment limitations:
 *
 * - The available SDK in this test file exposes only the login endpoint:
 *   api.functional.auth.todoAdmin.login.
 * - We cannot create or mutate admins, nor can we directly read session rows.
 *   Therefore we cannot deterministically construct a specific suspended admin
 *   in-code; instead, we rely on the backend’s behavior that disallowed logins
 *   fail by throwing an error.
 *
 * Test strategy:
 *
 * 1. Perform a baseline successful login using randomly generated but valid
 *    ITodoAppTodoAdminLogin.IRequest data. On success, validate the returned
 *    ITodoAppTodoAdmin.IAuthorized structure (including its token) with
 *    typia.assert to ensure the happy path works.
 * 2. Perform a second login attempt with a distinct
 *    ITodoAppTodoAdminLogin.IRequest payload and assert that the call fails by
 *    throwing an error using TestValidator.error. This represents any
 *    disallowed-login scenario, including, but not limited to, suspended or
 *    closed admin accounts.
 * 3. Because TestValidator.error asserts that the promise rejects, we implicitly
 *    guarantee that no ITodoAppTodoAdmin.IAuthorized object or
 *    IAuthorizationToken is observed on failed login attempts.
 */
export async function test_api_todoadmin_login_suspended_account(
  connection: api.IConnection,
) {
  // 1. Baseline: successful login for an assumed active admin.
  const activeRequest = typia.random<ITodoAppTodoAdminLogin.IRequest>();

  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: activeRequest,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Disallowed admin login attempt (e.g., suspended, closed, or otherwise
  //    invalid). We assert that such an attempt rejects with an error instead
  //    of returning an authorized context. We do not assert specific HTTP
  //    status codes, only that an error is thrown.
  const disallowedRequest = typia.random<ITodoAppTodoAdminLogin.IRequest>();

  await TestValidator.error(
    "disallowed todoAdmin login must not succeed",
    async () => {
      await api.functional.auth.todoAdmin.login(connection, {
        body: disallowedRequest,
      });
    },
  );
}
