import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that admin login fails with incorrect credentials and does not
 * return an authorized admin payload.
 *
 * Business expectations covered by this test:
 *
 * - Calling POST /auth/adminUser/login with syntactically valid but incorrect
 *   credentials must result in an authentication failure (an error) instead of
 *   returning ITodoAppAdminUser.IAuthorized.
 * - Repeated failed attempts must consistently fail and never succeed with an
 *   authorized admin response.
 *
 * Technical notes and limitations:
 *
 * - We only have access to the public login API and cannot inspect underlying
 *   database tables like todo_app_adminusers or todo_app_adminuser_sessions, so
 *   DB-side assertions are out of scope.
 * - We must not touch or inspect `connection.headers` from the test code; header
 *   management is fully controlled by the SDK.
 * - We also avoid asserting on specific HTTP status codes; instead we only assert
 *   that an error is thrown for invalid credentials.
 */
export async function test_api_admin_user_login_failure_with_incorrect_password(
  connection: api.IConnection,
) {
  // Build a syntactically valid but bogus login payload. We use random values
  // that satisfy required formats, but there is no guarantee that such an
  // account exists or that the password matches; this is acceptable because we
  // are explicitly validating failure behavior.
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.ILogin;

  // Perform several failed login attempts and assert consistent failure
  // behavior. Any successful resolution of the login call would cause this
  // validator to fail the test.
  const attempts = 3;
  for (let i = 0; i < attempts; ++i) {
    const title = `failed admin login attempt #${i + 1}`;

    await TestValidator.error(title, async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: loginBody,
      });
    });
  }
}
