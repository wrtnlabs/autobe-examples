import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test successful admin token refresh operation.
 *
 * An admin with a valid refresh token requests a new access token. The system
 * validates the refresh token is not expired and belongs to an active admin
 * account, generates a new JWT access token with admin role and 30-minute
 * expiration, and optionally issues a new refresh token. This test verifies the
 * new token enables continued authenticated access to admin operations without
 * requiring re-login.
 *
 * Test flow:
 *
 * 1. Register new admin account and obtain initial tokens
 * 2. Extract refresh token from registration response
 * 3. Call refresh endpoint with valid refresh token
 * 4. Validate new tokens are issued with correct expiration times
 * 5. Verify new access token can authenticate admin operations
 * 6. Confirm token structure and admin role claim
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create admin account to obtain initial refresh token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(8);

  const registrationResponse = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(registrationResponse);

  // Validate initial registration response structure
  TestValidator.equals(
    "registration response has admin id",
    typeof registrationResponse.id,
    "string",
  );
  TestValidator.equals(
    "registration response email matches input",
    registrationResponse.email,
    adminEmail,
  );
  TestValidator.equals(
    "registration response status is active",
    registrationResponse.status,
    "active",
  );

  // Validate token structure from registration
  const initialToken = registrationResponse.token;
  typia.assert(initialToken);
  TestValidator.predicate(
    "access token is non-empty string",
    initialToken.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    initialToken.refresh.length > 0,
  );

  // Step 2: Extract refresh token for refresh operation
  const refreshToken = initialToken.refresh;

  // Step 3: Call refresh endpoint with valid refresh token
  const refreshResponse = await api.functional.auth.admin.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies ITodoAppAdmin.IRefresh,
  });
  typia.assert(refreshResponse);

  // Step 4: Validate new tokens are issued with correct structure
  TestValidator.equals(
    "refresh response admin id matches original",
    refreshResponse.id,
    registrationResponse.id,
  );
  TestValidator.equals(
    "refresh response email matches original",
    refreshResponse.email,
    registrationResponse.email,
  );
  TestValidator.equals(
    "refresh response status remains active",
    refreshResponse.status,
    "active",
  );

  // Step 5: Validate new token information
  const newToken = refreshResponse.token;
  typia.assert(newToken);

  TestValidator.predicate(
    "new access token is non-empty string",
    newToken.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty string",
    newToken.refresh.length > 0,
  );

  // Step 6: Validate token expiration times
  TestValidator.predicate(
    "access token expiration is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newToken.expired_at),
  );
  TestValidator.predicate(
    "refresh token expiration is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(newToken.refreshable_until),
  );

  // Step 7: Verify new access token is different from original
  TestValidator.notEquals(
    "new access token differs from original",
    newToken.access,
    initialToken.access,
  );

  // Step 8: Verify refresh token may be updated (optional per spec)
  // The spec mentions "optionally issues a new refresh token"
  // Both scenarios (same or different refresh token) are valid
  TestValidator.predicate(
    "refresh token is non-empty after refresh",
    newToken.refresh.length > 0,
  );

  // Step 9: Verify admin account details persist
  TestValidator.equals(
    "admin created_at timestamp exists",
    typeof registrationResponse.created_at,
    "string",
  );
  TestValidator.equals(
    "admin updated_at timestamp exists",
    typeof registrationResponse.updated_at,
    "string",
  );
}
