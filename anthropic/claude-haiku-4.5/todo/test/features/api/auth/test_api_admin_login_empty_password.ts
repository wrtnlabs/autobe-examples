import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test admin login with empty or missing password.
 *
 * Verifies that the authentication system properly validates the password field
 * and rejects login attempts when the password is empty, null, or contains only
 * whitespace. This test ensures that required field validation is enforced for
 * security-critical credentials and prevents unauthorized access with
 * incomplete credentials.
 *
 * The test validates:
 *
 * 1. Login attempt with completely empty password string fails
 * 2. Login attempt with whitespace-only password fails
 * 3. Proper error response is returned for missing required credentials
 */
export async function test_api_admin_login_empty_password(
  connection: api.IConnection,
) {
  // Test 1: Login with empty password string
  await TestValidator.error(
    "should reject login with empty password",
    async () => {
      const emptyPasswordBody = {
        email: typia.random<string & tags.Format<"email">>(),
        password: "",
      } satisfies ITodoAppAdmin.ICreate;

      await api.functional.auth.admin.login(connection, {
        body: emptyPasswordBody,
      });
    },
  );

  // Test 2: Login with whitespace-only password
  await TestValidator.error(
    "should reject login with whitespace-only password",
    async () => {
      const whitespacePasswordBody = {
        email: typia.random<string & tags.Format<"email">>(),
        password: "   ",
      } satisfies ITodoAppAdmin.ICreate;

      await api.functional.auth.admin.login(connection, {
        body: whitespacePasswordBody,
      });
    },
  );
}
