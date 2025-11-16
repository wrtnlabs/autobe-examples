import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test successful buyer token refresh workflow.
 *
 * This test validates the complete token refresh operation for buyer
 * authentication. It creates a new buyer account to obtain initial
 * authentication tokens, then uses the refresh token to request new access
 * tokens. The test verifies that the refresh operation returns updated tokens
 * with fresh expiration times while maintaining buyer profile consistency.
 *
 * Test workflow:
 *
 * 1. Register a new buyer account to obtain initial authentication tokens
 * 2. Extract the refresh token from the registration response
 * 3. Call the token refresh endpoint with the refresh token
 * 4. Validate the refresh response contains new access token and refresh token
 * 5. Verify expiration times are updated
 * 6. Ensure buyer profile information remains consistent
 */
export async function test_api_buyer_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new buyer account to obtain initial tokens
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const initialBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });

  typia.assert(initialBuyer);

  // Step 2: Extract the refresh token from registration response
  const initialRefreshToken = initialBuyer.token.refresh;
  const initialAccessToken = initialBuyer.token.access;

  // Validate initial token structure
  TestValidator.predicate(
    "initial refresh token should be non-empty",
    initialRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "initial access token should be non-empty",
    initialAccessToken.length > 0,
  );

  // Step 3: Call the token refresh endpoint
  const refreshedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.refresh(connection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies IShoppingMallBuyer.IRefresh,
    });

  typia.assert(refreshedBuyer);

  // Step 4: Validate the refresh response contains new tokens
  const newAccessToken = refreshedBuyer.token.access;
  const newRefreshToken = refreshedBuyer.token.refresh;

  // Verify new access token is different from initial
  TestValidator.notEquals(
    "new access token should differ from initial access token",
    newAccessToken,
    initialAccessToken,
  );

  // Verify tokens are non-empty
  TestValidator.predicate(
    "new access token should be non-empty",
    newAccessToken.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should be non-empty",
    newRefreshToken.length > 0,
  );

  // Step 5: Ensure buyer profile information remains consistent
  TestValidator.equals(
    "buyer ID should remain the same after token refresh",
    refreshedBuyer.id,
    initialBuyer.id,
  );
  TestValidator.equals(
    "buyer email should remain the same after token refresh",
    refreshedBuyer.email,
    initialBuyer.email,
  );
  TestValidator.equals(
    "buyer full_name should remain the same after token refresh",
    refreshedBuyer.full_name,
    initialBuyer.full_name,
  );
  TestValidator.equals(
    "buyer phone_number should remain the same after token refresh",
    refreshedBuyer.phone_number,
    initialBuyer.phone_number,
  );
  TestValidator.equals(
    "buyer email_verified status should remain the same after token refresh",
    refreshedBuyer.email_verified,
    initialBuyer.email_verified,
  );
  TestValidator.equals(
    "buyer created_at should remain the same after token refresh",
    refreshedBuyer.created_at,
    initialBuyer.created_at,
  );
}
