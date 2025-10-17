import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin logout functionality with current session refresh token
 * revocation.
 *
 * This test validates the complete logout workflow for admin users:
 *
 * 1. Creates a new admin account (which automatically establishes an authenticated
 *    session)
 * 2. Calls the logout endpoint with the session's refresh token
 * 3. Verifies that the logout completes successfully and the session is terminated
 *
 * The test ensures that the logout operation properly revokes the refresh
 * token, marking the session as revoked in the database. After logout, the
 * admin must authenticate again to access the platform, as the revoked refresh
 * token can no longer be used to generate new access tokens.
 */
export async function test_api_admin_logout_current_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  // The join operation automatically authenticates the admin and returns tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();
  const adminRoleLevel = "admin";

  const createAdminBody = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role_level: adminRoleLevel,
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });

  // Validate the join response contains proper admin data and tokens
  typia.assert(authorizedAdmin);

  // Verify admin properties match the input
  TestValidator.equals(
    "admin email matches",
    authorizedAdmin.email,
    adminEmail,
  );
  TestValidator.equals("admin name matches", authorizedAdmin.name, adminName);
  TestValidator.equals(
    "admin role level matches",
    authorizedAdmin.role_level,
    adminRoleLevel,
  );

  // Step 2: Extract the refresh token from the authorization response
  const refreshToken: string = authorizedAdmin.token.refresh;

  // Verify the refresh token exists
  TestValidator.predicate("refresh token exists", refreshToken.length > 0);

  // Step 3: Logout the admin by revoking the current session's refresh token
  const logoutBody = {
    refresh_token: refreshToken,
  } satisfies IShoppingMallAdmin.ILogout;

  const logoutResponse: IShoppingMallAdmin.ILogoutResponse =
    await api.functional.auth.admin.logout(connection, {
      body: logoutBody,
    });

  // Validate the logout response
  typia.assert(logoutResponse);

  // Verify logout confirmation message is present
  TestValidator.predicate(
    "logout message exists",
    logoutResponse.message.length > 0,
  );
}
