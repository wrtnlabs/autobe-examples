import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful token refresh workflow using a valid refresh token.
 *
 * This test validates that sellers can use their refresh tokens to obtain new
 * access tokens without re-entering credentials. The refresh mechanism enables
 * continuous authenticated access while maintaining security through token
 * rotation.
 *
 * Workflow:
 *
 * 1. Generate initial seller authentication data with valid tokens
 * 2. Extract the refresh token from the authentication data
 * 3. Call the token refresh endpoint with the refresh token
 * 4. Verify new tokens are issued with updated expiration timestamps
 * 5. Validate seller profile information is included in response
 * 6. Confirm new access token is automatically set in connection headers
 */
export async function test_api_seller_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate initial seller authentication data to simulate existing login
  const initialAuth = typia.random<IShoppingMallSeller.IAuthorized>();
  typia.assert(initialAuth);

  // Step 2: Extract the refresh token from initial authentication
  const refreshToken = initialAuth.token.refresh;
  TestValidator.predicate(
    "initial refresh token exists",
    refreshToken.length > 0,
  );

  // Step 3: Use the refresh token to request new access tokens
  const refreshedAuth = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedAuth);

  // Step 4: Verify that new tokens are issued
  TestValidator.predicate(
    "new access token is issued",
    refreshedAuth.token.access.length > 0,
  );

  TestValidator.predicate(
    "new refresh token is issued",
    refreshedAuth.token.refresh.length > 0,
  );

  // Step 5: Verify token expiration timestamps are present and valid
  TestValidator.predicate(
    "access token expiration is set",
    refreshedAuth.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token expiration is set",
    refreshedAuth.token.refreshable_until.length > 0,
  );

  // Step 6: Validate seller profile information is included in response
  TestValidator.predicate(
    "seller ID is valid UUID",
    refreshedAuth.id.length > 0,
  );

  TestValidator.predicate(
    "seller email is present",
    refreshedAuth.email.length > 0,
  );

  TestValidator.predicate(
    "seller full name is present",
    refreshedAuth.full_name.length > 0,
  );

  TestValidator.predicate(
    "seller business name is present",
    refreshedAuth.business_name.length > 0,
  );

  TestValidator.predicate(
    "seller store name is present",
    refreshedAuth.store_name.length > 0,
  );

  TestValidator.predicate(
    "seller status is valid",
    refreshedAuth.status.length > 0,
  );

  // Step 7: Verify that the new access token was automatically set in connection headers
  if (connection.headers?.Authorization) {
    TestValidator.equals(
      "authorization header matches new access token",
      connection.headers.Authorization,
      refreshedAuth.token.access,
    );
  }
}
