import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

/**
 * Verify that admin login rejects an incorrect password for an existing admin
 * account without issuing an authorization payload.
 *
 * Business goal
 *
 * - Ensure that POST /auth/admin/login enforces credential correctness, returning
 *   an authentication error when the password is wrong even if the email
 *   belongs to a real admin.
 * - Confirm that successful registration via POST /auth/admin/join still works,
 *   and that a subsequent invalid-password login attempt does not produce an
 *   authorized admin context.
 * - Avoid relying on specific HTTP status codes or error bodies, focusing only on
 *   the presence of an error for the invalid login attempt.
 *
 * Scenario
 *
 * 1. Register a valid admin via POST /auth/admin/join with a known email and
 *    password.
 * 2. Attempt to log in via POST /auth/admin/login using the same email but an
 *    incorrect password, providing realistic href/referrer values.
 * 3. Assert that the login attempt fails (throws), indicating authentication
 *    failure without examining HTTP status codes.
 * 4. Ensure that the failed login attempt does not yield any
 *    IShoppingMallAdmin.IAuthorized payload.
 */
export async function test_api_admin_login_rejects_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a valid admin via /auth/admin/join
  const joinInput = typia.random<IShoppingMallAdminJoin.ICreate>();

  const joined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinInput,
    });
  typia.assert(joined);

  // 2. Attempt to log in with the same email but an incorrect password
  const wrongPassword: string = `${joinInput.password}-wrong`;

  const invalidLoginBody = {
    email: joinInput.email,
    password: wrongPassword,
    href: joinInput.href,
    referrer: joinInput.referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;

  // 3. Assert that the login attempt fails (throws)
  await TestValidator.error(
    "admin login must fail with wrong password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: invalidLoginBody,
      });
    },
  );

  // 4. Confirm the original join response is still a valid authorized payload
  typia.assert<IShoppingMallAdmin.IAuthorized>(joined);
}
