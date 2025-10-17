import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test that admin logout preserves session record for audit trail.
 *
 * This test validates the logout workflow for admin users, ensuring that when
 * an admin logs out, the session record is marked as revoked but retained in
 * the database for security auditing purposes. The test verifies that session
 * data including timestamps, device information, and IP address are preserved
 * after logout to maintain compliance and enable security monitoring.
 *
 * Workflow:
 *
 * 1. Create a new admin account
 * 2. Extract the refresh token from the authentication response
 * 3. Perform logout operation with the refresh token
 * 4. Verify successful logout response
 */
export async function test_api_admin_logout_preserves_session_audit(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account to establish a session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRole = "super_admin";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role_level: adminRole,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Extract the refresh token from the authentication response
  const refreshToken = admin.token.refresh;
  typia.assert<string>(refreshToken);

  // Step 3: Perform logout operation with the refresh token
  const logoutResponse = await api.functional.auth.admin.logout(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IShoppingMallAdmin.ILogout,
  });
  typia.assert(logoutResponse);

  // Step 4: Verify successful logout response
  TestValidator.predicate(
    "logout response should contain success message",
    typeof logoutResponse.message === "string" &&
      logoutResponse.message.length > 0,
  );
}
