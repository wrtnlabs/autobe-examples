import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login request with invalid credentials.
 *
 * Validates that the login endpoint properly rejects authentication attempts
 * with incorrect password even when all required fields are provided. This
 * negative test ensures the API enforces proper credential validation and
 * returns an appropriate error when authentication fails due to invalid
 * password.
 *
 * Steps:
 *
 * 1. Prepare a login request with valid email and uri fields but incorrect
 *    password
 * 2. Attempt to authenticate with valid structure but wrong credentials
 * 3. Verify that the API rejects the request with an authentication error
 */
export async function test_api_user_login_missing_email(
  connection: api.IConnection,
) {
  // Test that login fails when invalid credentials are provided
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "invalidPassword",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
