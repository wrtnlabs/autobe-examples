import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that token refresh preserves the authenticated admin's identity.
 *
 * This test validates that when an admin's access token expires and needs
 * renewal, the refresh token operation returns authorization data for the same
 * admin account. The admin identity (id and email) must remain consistent
 * across token refreshes.
 *
 * Test workflow:
 *
 * 1. Create admin credentials (email and password)
 * 2. Perform admin login to obtain initial access and refresh tokens
 * 3. Capture the authenticated admin's id and email from login response
 * 4. Use the refresh token to request new tokens
 * 5. Verify that the refreshed authorization data contains the same admin id and
 *    email
 * 6. Confirm that token refresh maintains admin session integrity
 */
export async function test_api_admin_refresh_preserves_admin_identity(
  connection: api.IConnection,
) {
  // Step 1: Generate admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  // Step 2: Perform admin login to obtain initial tokens
  const loginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(loginResponse);

  // Step 3: Capture the authenticated admin's identity
  const adminIdFromLogin = loginResponse.id;
  const adminEmailFromLogin = loginResponse.email;
  const refreshToken = loginResponse.token.refresh;

  // Step 4: Use the refresh token to request new tokens
  const refreshResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppAdmin.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 5: Verify that the refreshed authorization data contains the same admin id and email
  TestValidator.equals(
    "admin id preserved after refresh",
    adminIdFromLogin,
    refreshResponse.id,
  );
  TestValidator.equals(
    "admin email preserved after refresh",
    adminEmailFromLogin,
    refreshResponse.email,
  );

  // Step 6: Verify that the new tokens are valid and different from original tokens
  TestValidator.notEquals(
    "new access token differs from original",
    loginResponse.token.access,
    refreshResponse.token.access,
  );
}
