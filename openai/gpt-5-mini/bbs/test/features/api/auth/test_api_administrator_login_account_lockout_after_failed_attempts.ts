import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_login_account_lockout_after_failed_attempts(
  connection: api.IConnection,
) {
  /**
   * Test: Administrator account lockout after repeated failed login attempts.
   *
   * Flow:
   *
   * 1. Create administrator account with IEconPoliticalForumAdministrator.IJoin
   * 2. Perform LOCKOUT_THRESHOLD failed login attempts with incorrect password and
   *    expect 401 Unauthorized for each attempt
   * 3. Attempt correct login immediately after threshold is reached and expect the
   *    account to be locked (accept 401/403/423 as possible lock indicators)
   *
   * Notes:
   *
   * - This test cannot directly assert DB fields (failed_login_attempts,
   *   locked_until) because no read endpoint is provided in the SDK. Test
   *   verifies observable behavior via login responses only.
   */

  // 0) Configurable test constants
  const adminEmail = "admin+lock@example.com";
  const adminUsername = "admin_lock";
  const adminPassword = "Secur3P@ss!"; // satisfies MinLength<10>

  // When SDK does not expose the configured lockout threshold, use a sane default.
  // If test infra provides the exact threshold, replace this constant.
  const LOCKOUT_THRESHOLD = 5;

  // 1) Create administrator account
  const created: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  // Validate response shape (typia.assert performs complete runtime validation)
  typia.assert(created);

  // Business-level sanity check: token must be present
  TestValidator.predicate(
    "admin join returns token",
    typeof created.token?.access === "string",
  );

  // 2) Perform repeated failed login attempts
  const wrongPassword = "WrongPassword-1!";
  for (let i = 1; i <= LOCKOUT_THRESHOLD; ++i) {
    // Each incorrect attempt should produce unauthorized (401) until lockout
    await TestValidator.httpError(
      `failed login attempt #${i} should be 401 Unauthorized`,
      401,
      async () => {
        await api.functional.auth.administrator.login(connection, {
          body: {
            usernameOrEmail: adminEmail,
            password: wrongPassword,
          } satisfies IEconPoliticalForumAdministrator.ILogin,
        });
      },
    );
  }

  // 3) After threshold is reached, a correct credential attempt should be
  // rejected due to account lockout. Accept common lock-related statuses.
  await TestValidator.httpError(
    "correct login during locked period should fail (account locked)",
    [401, 403, 423],
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          usernameOrEmail: adminEmail,
          password: adminPassword,
        } satisfies IEconPoliticalForumAdministrator.ILogin,
      });
    },
  );

  // Teardown note: The SDK provided does not include delete/unlock operations
  // for the created administrator. Test harness or CI must clear the account
  // or reset the DB between runs. This test intentionally avoids manipulating
  // connection.headers or any protected runtime state.
}
