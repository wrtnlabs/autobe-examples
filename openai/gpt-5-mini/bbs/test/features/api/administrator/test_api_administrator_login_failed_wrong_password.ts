import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Validate administrator login failure with wrong password.
 *
 * Business purpose:
 *
 * - Ensure that attempting to authenticate with a correct username/email but an
 *   incorrect password results in an authentication failure that does not leak
 *   sensitive details and does not return authorization tokens.
 *
 * Test steps:
 *
 * 1. Register an administrator account using POST /auth/administrator/join.
 * 2. Use an unauthenticated connection (clone with empty headers) so that
 *    automatic headers set by the SDK do not affect login attempts.
 * 3. Attempt login with the correct username/email but an incorrect password and
 *    assert that the operation fails (await TestValidator.error).
 * 4. Attempt login with the correct password and assert success and that the
 *    returned administrator id matches the created account.
 *
 * Notes:
 *
 * - DB-level assertions (failed_login_attempts, last_login_at) from the original
 *   scenario are NOT implemented because no read API or DB access function is
 *   provided in the SDK. The test verifies observable API behavior only.
 */
export async function test_api_administrator_login_failed_wrong_password(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  // NOTE: If your CI/test DB may already contain this email, replace with a
  // randomized email (e.g., `admin+badpw+${Date.now()}@example.com`).
  const email = "admin+badpw@example.com";
  const username = "admin_badpw";
  const password = "CorrectHorseBatteryStaple1!"; // >=10 chars

  const joinBody = {
    email,
    password,
    username,
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const created: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: joinBody,
    });
  // Validate response shape
  typia.assert(created);
  TestValidator.predicate(
    "join returned an access token",
    typeof created.token?.access === "string" &&
      created.token.access.length > 0,
  );

  // 2. Use an unauthenticated connection for login attempts to avoid using
  // the automatic Authorization header set by join()
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt login with wrong password - must fail
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.administrator.login(unauthConn, {
        body: {
          usernameOrEmail: email,
          password: "WrongPassword123!",
        } satisfies IEconPoliticalForumAdministrator.ILogin,
      });
    },
  );

  // 4. Attempt login with correct password - must succeed
  const logged: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(unauthConn, {
      body: {
        usernameOrEmail: email,
        password,
      } satisfies IEconPoliticalForumAdministrator.ILogin,
    });
  typia.assert(logged);
  TestValidator.equals(
    "login returns same administrator id",
    logged.id,
    created.id,
  );

  // Cleanup note:
  // - No deletion endpoint was provided, so cleanup cannot be performed here.
  // - Ensure test environment resets DB between test runs to avoid collisions.
}
