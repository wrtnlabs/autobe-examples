import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test successful token refresh with valid refresh token.
 *
 * This test validates the admin authentication token refresh flow. It
 * establishes an authenticated admin context by performing login with
 * credentials, extracts the refresh token from the response, and then uses that
 * refresh token to obtain a new access token. The test verifies that the
 * refresh operation succeeds and returns properly structured token information
 * with updated expiration timestamps, confirming that the new access token can
 * be used for subsequent authenticated requests. This ensures administrators
 * can maintain continuous session access without requiring credential
 * re-submission.
 *
 * Test flow:
 *
 * 1. Perform admin login to obtain initial access and refresh tokens
 * 2. Extract the refresh token from the login response
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Validate the response contains new access token and updated expiration info
 * 5. Confirm the response includes admin profile information
 * 6. Verify the new tokens are properly formatted and non-empty
 */
export async function test_api_admin_refresh_token_success_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Perform admin login to obtain initial access and refresh tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const loginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(loginResponse);

  // Step 2: Extract the refresh token from the login response
  const refreshToken = loginResponse.token.refresh;

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    refreshToken.length > 0,
  );

  // Step 3: Call the refresh endpoint with the valid refresh token
  const refreshResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppAdmin.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 4: Validate the response contains new access token and updated expiration info
  TestValidator.predicate(
    "new access token should exist",
    refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "new refresh token should exist",
    refreshResponse.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration should be set",
    refreshResponse.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiration should be set",
    refreshResponse.token.refreshable_until.length > 0,
  );

  // Step 5: Confirm the response includes admin profile information
  TestValidator.predicate(
    "admin ID should exist in response",
    refreshResponse.id.length > 0,
  );

  TestValidator.equals(
    "admin email should match the original login email",
    refreshResponse.email,
    adminEmail,
  );

  TestValidator.predicate(
    "admin created_at should be set",
    refreshResponse.created_at.length > 0,
  );

  TestValidator.predicate(
    "admin updated_at should be set",
    refreshResponse.updated_at.length > 0,
  );

  // Step 6: Verify the new tokens are different from the original (indicating refresh)
  TestValidator.notEquals(
    "new access token should differ from original",
    refreshResponse.token.access,
    loginResponse.token.access,
  );

  TestValidator.notEquals(
    "new access token expiration should differ from original",
    refreshResponse.token.expired_at,
    loginResponse.token.expired_at,
  );
}
