import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test login attempt with credentials for an account that has registered but
 * not yet completed email verification.
 *
 * Expects login to be blocked and the error message to indicate verification is
 * required before authentication is allowed.
 *
 * Steps:
 *
 * 1. Generate a random, valid login credential (email + password) with RFC
 *    5322-compliant email address format and valid password, and simulate a
 *    user registration where the account is created but _not_ verified. (Assume
 *    such a test fixture user exists in the test system, as there are no APIs
 *    for user registration or email verification exposed within this test
 *    scope.)
 * 2. Attempt to authenticate using the generated credential against the
 *    /auth/user/login endpoint.
 * 3. Assert that the login is rejected (raises error) and the returned error
 *    message makes it clear that verification is required.
 */
export async function test_api_user_login_pending_verification(
  connection: api.IConnection,
) {
  // Prepare a login credential for a user who is not verified
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  // A realistic test would require a fixture setup where such a user exists (registered but unverified).
  // Here, we assume the test environment provides such a user, or the email/password are linked to a known pending-verification account.

  // Attempt to login and expect the API to reject it (authentication denied with message about pending verification)
  await TestValidator.error(
    "login is blocked for pending-verification user",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email,
          password,
          href: "https://localhost/login",
          referrer: "https://localhost/",
          ip: null,
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
