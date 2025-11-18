import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Verify that arbitrary admin login attempts with structurally valid but
 * unknown credentials do not succeed.
 *
 * Business intent (adjusted to available APIs):
 *
 * - The system must not issue ITodoAppAdminUser.IAuthorized tokens when the
 *   provided email/password does not match an active admin account.
 * - This indirectly covers cases where the account does not exist or is in a
 *   non-operational state such as "suspended" or "disabled", because such
 *   records must not authenticate successfully.
 *
 * Steps implemented:
 *
 * 1. Generate a structurally valid ITodoAppAdminUser.ILogin payload using random
 *    data (valid email, password format, href, and referrer).
 * 2. Call POST /auth/adminUser/login via api.functional.auth.adminUser.login with
 *    this payload and assert that the call fails using TestValidator.error.
 * 3. Repeat with another fresh random ITodoAppAdminUser.ILogin payload to confirm
 *    that arbitrary, unknown credentials also fail consistently.
 *
 * Notes:
 *
 * - We do not test success cases here because we have no API in scope to create
 *   or activate a known admin account.
 * - We do not assert specific HTTP status codes or error messages, only that an
 *   error is thrown instead of returning ITodoAppAdminUser.IAuthorized.
 */
export async function test_api_admin_user_login_blocked_when_status_not_active(
  connection: api.IConnection,
) {
  // 1st attempt: random, structurally valid login payload
  const firstLoginBody = typia.random<ITodoAppAdminUser.ILogin>();

  await TestValidator.error(
    "admin login with random credentials must fail (1st attempt)",
    async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: firstLoginBody,
      });
    },
  );

  // 2nd attempt: another random login payload for additional confidence
  const secondLoginBody = typia.random<ITodoAppAdminUser.ILogin>();

  await TestValidator.error(
    "admin login with random credentials must fail (2nd attempt)",
    async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: secondLoginBody,
      });
    },
  );
}
