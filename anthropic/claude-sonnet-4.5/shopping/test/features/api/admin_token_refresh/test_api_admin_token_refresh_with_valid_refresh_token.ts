import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin JWT token refresh workflow with valid refresh token.
 *
 * This test validates the complete token refresh mechanism for admin users,
 * ensuring that admins can obtain new access tokens using valid refresh tokens
 * without requiring full re-authentication. This enables secure continuous
 * session access while maintaining proper authentication security.
 *
 * The test workflow:
 *
 * 1. Create a new admin account with valid credentials
 * 2. Authenticate to obtain initial access and refresh tokens
 * 3. Use the refresh token to request a new access token
 * 4. Validate the new token structure and admin profile information
 * 5. Verify token expiration timestamps are properly set
 */
export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRoleLevel = "super_admin";

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: adminRoleLevel,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Authenticate the admin to obtain initial tokens
  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // Verify initial login response contains valid tokens
  TestValidator.predicate(
    "login response has access token",
    loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response has refresh token",
    loggedInAdmin.token.refresh.length > 0,
  );

  // Step 3: Use the refresh token to obtain a new access token
  const refreshedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: loggedInAdmin.token.refresh,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  typia.assert(refreshedAdmin);

  // Step 4: Validate the refreshed response structure
  TestValidator.equals(
    "refreshed admin id matches",
    refreshedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "refreshed admin email matches",
    refreshedAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "refreshed admin name matches",
    refreshedAdmin.name,
    adminName,
  );
  TestValidator.equals(
    "refreshed admin role level matches",
    refreshedAdmin.role_level,
    adminRoleLevel,
  );

  // Step 5: Verify new access token is present and different from original
  TestValidator.predicate(
    "new access token is present",
    refreshedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "new access token differs from original",
    refreshedAdmin.token.access !== loggedInAdmin.token.access,
  );

  // Step 6: Verify token structure includes proper expiration timestamps
  TestValidator.predicate(
    "expired_at is a valid date-time",
    refreshedAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is a valid date-time",
    refreshedAdmin.token.refreshable_until.length > 0,
  );

  // Step 7: Verify the refresh token is present (may be renewed or same)
  TestValidator.predicate(
    "refresh token is present",
    refreshedAdmin.token.refresh.length > 0,
  );
}
