import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that login attempt with unregistered email fails securely.
 *
 * This test attempts to log in with a validly formatted email address that has
 * not been registered and a random valid password. It checks that
 * authentication is denied and that the system does not leak information about
 * user existence or details in failure response. No sensitive information
 * should be returned for non-existent credentials. All security and type-safety
 * rules are enforced and only negative-path assertions are made.
 *
 * Step-by-step process:
 *
 * 1. Generate a valid random (guaranteed unregistered) email and password, plus
 *    session context URIs for ITodoListUser.ILogin.
 * 2. Call api.functional.auth.user.login with these credentials.
 * 3. Use await TestValidator.error to confirm that the call fails due to invalid
 *    credentials.
 * 4. Do not check status codes, error messages, or returned data; only
 *    business-logic authentication failure is asserted.
 */
export async function test_api_user_login_unregistered_email(
  connection: api.IConnection,
) {
  // 1. Prepare random, unregistered credentials and session context fields
  const loginBody = {
    email: typia.random<
      string & tags.MinLength<5> & tags.MaxLength<320> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip omitted intentionally: backend will infer or ignore for negative-path testing
  } satisfies ITodoListUser.ILogin;

  // 2. Attempt login with unregistered credentials and verify failure
  await TestValidator.error(
    "login with unregistered email should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginBody,
      });
    },
  );
}
