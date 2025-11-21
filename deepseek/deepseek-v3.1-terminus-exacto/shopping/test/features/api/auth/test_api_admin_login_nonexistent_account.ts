import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test administrator login with non-existent email address.
 *
 * Attempts to authenticate using an email that does not correspond to any
 * registered administrator account. Verifies that the system returns an
 * appropriate error response without confirming whether the email exists
 * (security best practice).
 */
export async function test_api_admin_login_nonexistent_account(
  connection: api.IConnection,
) {
  // Generate a valid email format that does not exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create a realistic login request with proper security context
  const loginRequest = {
    email: nonExistentEmail,
    password: "invalid_password_123",
    href: "https://shopping-mall-admin.example.com/login",
    referrer: "https://shopping-mall-admin.example.com/dashboard",
    ip: "192.168.1.100",
  } satisfies IShoppingMallAdministrator.ILogin;

  // Attempt login with non-existent credentials and verify it fails
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      return await api.functional.auth.admin.login(connection, {
        body: loginRequest,
      });
    },
  );
}
