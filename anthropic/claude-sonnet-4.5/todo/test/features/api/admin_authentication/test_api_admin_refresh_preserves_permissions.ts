import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that refreshed access tokens maintain admin role permissions.
 *
 * This test validates the admin token refresh workflow to ensure that when an
 * administrator refreshes their access token using a valid refresh token, the
 * new access token maintains all admin role permissions and account information
 * without requiring password re-entry.
 *
 * Test workflow:
 *
 * 1. Create a new admin account via the join endpoint
 * 2. Extract initial access and refresh tokens from the join response
 * 3. Call the refresh endpoint with the refresh token
 * 4. Verify the refreshed response contains identical admin account data
 * 5. Verify token structure validity (access, refresh, expiration timestamps)
 * 6. Confirm admin privileges are preserved across token renewal
 */
export async function test_api_admin_refresh_preserves_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdminPass123!";

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const initialAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(initialAdmin);

  // Step 2: Extract initial tokens
  const initialAccessToken = initialAdmin.token.access;
  const initialRefreshToken = initialAdmin.token.refresh;

  // Step 3: Refresh the access token using the refresh token
  const refreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies ITodoListAdmin.IRefresh;

  const refreshedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshedAdmin);

  // Step 4: Validate that admin account information is preserved
  TestValidator.equals(
    "admin ID preserved after refresh",
    refreshedAdmin.id,
    initialAdmin.id,
  );

  TestValidator.equals(
    "admin email preserved after refresh",
    refreshedAdmin.email,
    initialAdmin.email,
  );

  TestValidator.equals(
    "admin created_at timestamp preserved",
    refreshedAdmin.created_at,
    initialAdmin.created_at,
  );

  TestValidator.equals(
    "admin updated_at timestamp preserved",
    refreshedAdmin.updated_at,
    initialAdmin.updated_at,
  );

  // Step 5: Validate token structure
  typia.assert<IAuthorizationToken>(refreshedAdmin.token);

  // Step 6: Verify new access token is issued (token rotation)
  TestValidator.notEquals(
    "new access token issued after refresh",
    refreshedAdmin.token.access,
    initialAccessToken,
  );

  // Step 7: Verify token expiration fields exist and are valid
  typia.assert<string & tags.Format<"date-time">>(
    refreshedAdmin.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshedAdmin.token.refreshable_until,
  );
}
