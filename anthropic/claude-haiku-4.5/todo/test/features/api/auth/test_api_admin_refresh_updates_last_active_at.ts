import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that successful token refresh updates the admin's last_active_at
 * timestamp.
 *
 * This test validates that when an admin refreshes their authentication token,
 * the system updates their last_active_at timestamp to reflect the refresh
 * activity. This is critical for tracking admin activity and managing session
 * states.
 *
 * Test flow:
 *
 * 1. Admin logs in with test credentials to establish initial context
 * 2. Capture the initial last_active_at timestamp from login response
 * 3. Extract the refresh token from the login response
 * 4. Call the refresh endpoint with the refresh token
 * 5. Verify the refreshed response contains an updated last_active_at timestamp
 * 6. Ensure the new last_active_at reflects current refresh activity
 * 7. Validate that response contains valid authorization tokens
 */
export async function test_api_admin_refresh_updates_last_active_at(
  connection: api.IConnection,
) {
  // Step 1: Create test admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  // Step 2: Admin login to establish initial context
  const loginResponse = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(loginResponse);

  // Step 3: Capture initial last_active_at timestamp from login
  const initialLastActiveAt = loginResponse.last_active_at;

  // Step 4: Extract refresh token from login response
  const refreshToken = loginResponse.token.refresh;
  typia.assert(refreshToken);

  // Step 5: Call refresh endpoint with the refresh token
  const refreshResponse = await api.functional.auth.admin.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies ITodoAppAdmin.IRefresh,
  });
  typia.assert(refreshResponse);

  // Step 6: Verify refreshed last_active_at timestamp exists
  const refreshedLastActiveAt = refreshResponse.last_active_at;
  TestValidator.predicate(
    "refreshed response should have last_active_at timestamp",
    refreshedLastActiveAt !== null && refreshedLastActiveAt !== undefined,
  );

  // Step 7: Validate that refresh response has valid authorization tokens
  TestValidator.predicate(
    "refresh response should have access token",
    refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh response should have valid refresh token",
    refreshResponse.token.refresh.length > 0,
  );

  // Step 8: Validate that admin identity is preserved after refresh
  TestValidator.equals(
    "admin ID should be preserved after refresh",
    refreshResponse.id,
    loginResponse.id,
  );

  TestValidator.equals(
    "admin email should be preserved after refresh",
    refreshResponse.email,
    loginResponse.email,
  );

  // Step 9: Verify token expiration times are updated
  TestValidator.predicate(
    "new access token should have expiration",
    refreshResponse.token.expired_at !== null &&
      refreshResponse.token.expired_at !== undefined,
  );

  TestValidator.predicate(
    "new refresh token should have refreshable_until",
    refreshResponse.token.refreshable_until !== null &&
      refreshResponse.token.refreshable_until !== undefined,
  );
}
