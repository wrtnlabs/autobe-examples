import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Verify that admin login fails when the password is incorrect.
 *
 * Business goal:
 *
 * - Ensure that even for an existing admin email, providing a wrong password does
 *   NOT yield `ITodoAppAdminUser.IAuthorized` and instead results in a generic
 *   authentication failure.
 * - Confirm the happy path (join) works so that the failing login truly targets
 *   an existing account.
 *
 * Steps:
 *
 * 1. Call POST /auth/adminUser/join to create a new admin account with a random
 *    but valid email and password.
 * 2. Attempt POST /auth/adminUser/login using the same email but a different
 *    password, plus realistic `href` and `referrer` URIs and optional `ip` and
 *    `user_agent` fields.
 * 3. Use `TestValidator.error` to assert that the login call throws, which implies
 *    no authorized payload nor token was issued.
 * 4. Do not assert HTTP status codes or error messages; only check that an error
 *    occurred for this invalid-credentials scenario.
 */
export async function test_api_admin_user_login_fails_with_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register an admin user with a known email/password
  const joinInput = typia.random<ITodoAppAdminUser.IJoin>();

  const joined: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinInput,
    });
  typia.assert(joined);

  // 2. Prepare a wrong password while reusing the same email
  const wrongPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  // Ensure (best-effort) that wrongPassword differs from original
  const loginBody = {
    email: joinInput.email,
    password:
      wrongPassword === joinInput.password
        ? (typia.random<string & tags.Format<"password">>() as string &
            tags.Format<"password">)
        : wrongPassword,
    href: "https://admin.todo-app.example.com/login",
    referrer: "https://admin.todo-app.example.com/",
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
  } satisfies ITodoAppAdminUser.ILogin;

  // 3. Assert that login with wrong password fails with an error
  await TestValidator.error(
    "admin login must fail with wrong password",
    async () => {
      await api.functional.auth.adminUser.login(connection, {
        body: loginBody,
      });
    },
  );
}
