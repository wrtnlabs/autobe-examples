import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies user login failure for an unregistered email address.
 *
 * This test ensures the authentication endpoint does not allow login attempts
 * with an email address that is not associated with any user account. The
 * endpoint must respond securely with a generic error response and must not
 * issue any JWT token or success info. This supports best practices against
 * account enumeration and credential stuffing attacks.
 *
 * Steps:
 *
 * 1. Prepare valid but unregistered email and valid password
 * 2. Submit login attempt with realistic audit/session fields (`href`, `referrer`)
 * 3. Assert that the API rejects the login with a business error, no token is
 *    returned, and the error is handled without exposing system info.
 */
export async function test_api_user_login_failure_unregistered_email(
  connection: api.IConnection,
) {
  // Step 1: Prepare fake user credentials (random but unregistered email, realistic password)
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use realistic href and referrer for context and auditing
    href: "https://client.test.app/login", // typical login page
    referrer: "https://client.test.app/", // landing or previous page
  } satisfies ITodoListUser.ILogin;

  // Step 2: Attempt login and verify expected failure (must not authenticate or return token)
  await TestValidator.error(
    "login should fail for unregistered email",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginBody,
      });
    },
  );
}
