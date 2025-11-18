import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful admin access token refresh using valid refresh token.
 *
 * This test validates the admin token refresh workflow by creating an admin
 * account, authenticating to obtain initial tokens, then using the refresh
 * token to get a new access token. It verifies that the refresh endpoint
 * returns updated token information while maintaining admin account data
 * consistency, and confirms that the refresh token remains valid for subsequent
 * refresh operations.
 *
 * Test workflow:
 *
 * 1. Create a new admin account via registration endpoint
 * 2. Authenticate admin to obtain initial access and refresh tokens
 * 3. Use refresh token to request a new access token
 * 4. Validate new access token has updated expiration timestamp
 * 5. Verify admin account information remains consistent
 * 6. Confirm refresh token can be reused for additional refreshes
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create admin account via registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdminPass123!";

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com/home",
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(registeredAdmin);

  // Verify registration returned valid admin and tokens
  TestValidator.predicate(
    "registered admin has valid id",
    registeredAdmin.id.length > 0,
  );
  TestValidator.equals(
    "registered admin email matches",
    registeredAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "registration returned access token",
    registeredAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration returned refresh token",
    registeredAdmin.token.refresh.length > 0,
  );

  // Store initial token information for comparison
  const initialAccessToken = registeredAdmin.token.access;
  const initialRefreshToken = registeredAdmin.token.refresh;
  const initialExpiredAt = registeredAdmin.token.expired_at;
  const initialRefreshableUntil = registeredAdmin.token.refreshable_until;

  // Step 2: Authenticate admin to obtain fresh tokens (login after registration)
  const authenticatedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.101",
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(authenticatedAdmin);

  // Verify login response
  TestValidator.equals(
    "authenticated admin id matches",
    authenticatedAdmin.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "authenticated admin email matches",
    authenticatedAdmin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "login returned new access token",
    authenticatedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returned new refresh token",
    authenticatedAdmin.token.refresh.length > 0,
  );

  // Store login token information
  const loginRefreshToken = authenticatedAdmin.token.refresh;
  const loginAccessToken = authenticatedAdmin.token.access;
  const loginExpiredAt = authenticatedAdmin.token.expired_at;

  // Step 3: Use refresh token to obtain a new access token
  const refreshedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refreshToken: loginRefreshToken,
      } satisfies ITodoListAdmin.IRefresh,
    });
  typia.assert(refreshedAdmin);

  // Step 4: Validate new access token has updated expiration
  TestValidator.predicate(
    "refresh returned new access token",
    refreshedAdmin.token.access.length > 0,
  );
  TestValidator.notEquals(
    "new access token differs from login token",
    refreshedAdmin.token.access,
    loginAccessToken,
  );
  TestValidator.predicate(
    "new token expiration is valid",
    new Date(refreshedAdmin.token.expired_at).getTime() > Date.now(),
  );

  // Step 5: Verify admin account information consistency
  TestValidator.equals(
    "admin id remains consistent",
    refreshedAdmin.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "admin email remains consistent",
    refreshedAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin created_at remains consistent",
    refreshedAdmin.created_at,
    registeredAdmin.created_at,
  );
  TestValidator.equals(
    "admin updated_at remains consistent",
    refreshedAdmin.updated_at,
    registeredAdmin.updated_at,
  );

  // Step 6: Confirm refresh token can be reused for subsequent refreshes
  const secondRefresh: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refreshToken: loginRefreshToken,
      } satisfies ITodoListAdmin.IRefresh,
    });
  typia.assert(secondRefresh);

  // Validate second refresh operation
  TestValidator.predicate(
    "second refresh succeeded with new access token",
    secondRefresh.token.access.length > 0,
  );
  TestValidator.notEquals(
    "second refresh access token differs from first",
    secondRefresh.token.access,
    refreshedAdmin.token.access,
  );
  TestValidator.equals(
    "admin data consistency maintained in second refresh",
    secondRefresh.id,
    registeredAdmin.id,
  );
  TestValidator.predicate(
    "second refresh token expiration is valid",
    new Date(secondRefresh.token.expired_at).getTime() > Date.now(),
  );

  // Verify refresh token remains usable (not expired)
  TestValidator.predicate(
    "refresh token still valid",
    new Date(secondRefresh.token.refreshable_until).getTime() > Date.now(),
  );
}
