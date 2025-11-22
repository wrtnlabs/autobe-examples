import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test successful administrator token refresh workflow.
 *
 * This test validates the complete administrative token refresh process:
 *
 * 1. Create new administrator account via join endpoint
 * 2. Establish initial authentication session via login endpoint
 * 3. Use refresh token to obtain new access tokens
 * 4. Validate proper token generation and session continuity
 *
 * The test ensures that administrators can maintain authenticated sessions
 * without re-login by successfully refreshing their access tokens using valid
 * refresh tokens, maintaining secure privileged system access.
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";

  const newAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword, // Using the password as hash for this test
        role_level: "admin",
        status: "active",
        first_name: "Test",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(newAdmin);

  // Store the initial access token for comparison
  const initialAccessToken = newAdmin.token.access;
  const initialRefreshToken = newAdmin.token.refresh;

  // Step 2: Login with the created admin account to establish session
  const adminSession: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/dashboard",
        referrer: "https://admin.example.com/login",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(adminSession);

  // Validate that login generated new tokens (different from join tokens)
  TestValidator.notEquals(
    "login should generate different access token than join",
    initialAccessToken,
    adminSession.token.access,
  );

  TestValidator.notEquals(
    "login should generate different refresh token than join",
    initialRefreshToken,
    adminSession.token.refresh,
  );

  // Step 3: Use the refresh token to obtain new access tokens
  const refreshedSession: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: adminSession.token.refresh,
        firstName: "Test",
        lastName: "Admin",
        roleLevel: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.IRefresh,
    });
  typia.assert(refreshedSession);

  // Step 4: Validate the refresh operation
  TestValidator.notEquals(
    "refresh should generate new access token",
    adminSession.token.access,
    refreshedSession.token.access,
  );

  TestValidator.notEquals(
    "refresh should generate new refresh token",
    adminSession.token.refresh,
    refreshedSession.token.refresh,
  );

  // Validate token structure and expiration
  TestValidator.predicate(
    "new access token should be valid JWT format",
    refreshedSession.token.access.split(".").length === 3,
  );

  TestValidator.predicate(
    "new refresh token should be valid format",
    refreshedSession.token.refresh.length > 10,
  );

  TestValidator.predicate(
    "access token should have future expiration",
    new Date(refreshedSession.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token should have future expiration",
    new Date(refreshedSession.token.refreshable_until) > new Date(),
  );

  // Step 5: Validate session continuity
  TestValidator.equals(
    "admin ID should remain consistent after refresh",
    adminSession.id,
    refreshedSession.id,
  );

  // Verify that refresh token expiration is later than access token expiration
  const accessExpiry = new Date(refreshedSession.token.expired_at);
  const refreshExpiry = new Date(refreshedSession.token.refreshable_until);

  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshExpiry > accessExpiry,
  );
}
