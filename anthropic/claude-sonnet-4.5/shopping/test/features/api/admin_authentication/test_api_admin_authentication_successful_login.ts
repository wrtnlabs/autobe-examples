import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin login authentication workflow with successful credential
 * validation.
 *
 * This test validates the complete admin authentication flow:
 *
 * 1. Create a new admin account with valid credentials
 * 2. Authenticate using login endpoint with the same credentials
 * 3. Verify login response contains valid JWT tokens and admin profile
 * 4. Confirm token structure includes access, refresh tokens and expiration times
 */
export async function test_api_admin_authentication_successful_login(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account to obtain test credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureP@ss123";
  const adminName = RandomGenerator.name();
  const roleLevel = "super_admin";

  const createBody = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role_level: roleLevel,
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(createdAdmin);

  // Validate created admin response structure
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin name matches",
    createdAdmin.name,
    adminName,
  );
  TestValidator.equals(
    "created admin role_level matches",
    createdAdmin.role_level,
    roleLevel,
  );
  typia.assert<IAuthorizationToken>(createdAdmin.token);

  // Step 2: Authenticate using login endpoint with the same credentials
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IShoppingMallAdmin.ILogin;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Verify login response contains complete admin profile
  TestValidator.equals(
    "logged in admin id matches",
    loggedInAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "logged in admin email matches",
    loggedInAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "logged in admin name matches",
    loggedInAdmin.name,
    adminName,
  );
  TestValidator.equals(
    "logged in admin role_level matches",
    loggedInAdmin.role_level,
    roleLevel,
  );

  // Step 4: Validate JWT token structure and properties
  typia.assert<IAuthorizationToken>(loggedInAdmin.token);

  TestValidator.predicate(
    "access token is non-empty string",
    loggedInAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    loggedInAdmin.token.refresh.length > 0,
  );

  // Verify token expiration timestamps are valid date-time strings
  typia.assert<string & tags.Format<"date-time">>(
    loggedInAdmin.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    loggedInAdmin.token.refreshable_until,
  );

  // Verify expiration times are in the future
  const expiredAt = new Date(loggedInAdmin.token.expired_at);
  const refreshableUntil = new Date(loggedInAdmin.token.refreshable_until);
  const now = new Date();

  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );

  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );
}
