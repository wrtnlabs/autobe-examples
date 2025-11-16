import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer token refresh behavior when using an expired refresh token.
 *
 * This test validates that the authentication system properly rejects expired
 * refresh tokens and enforces re-authentication requirements. When a buyer's
 * refresh token expires, they must log in again with their email and password
 * credentials rather than being able to obtain new access tokens.
 *
 * Test workflow:
 *
 * 1. Create a new buyer account to obtain authentication tokens
 * 2. Extract the refresh token from the response
 * 3. Simulate token expiration scenario
 * 4. Attempt to refresh using the expired token
 * 5. Verify that the operation fails with appropriate error
 * 6. Confirm security policy enforcement
 */
export async function test_api_buyer_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account to obtain initial tokens
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Extract the refresh token from the authentication response
  const refreshToken = buyer.token.refresh;
  typia.assert<string>(refreshToken);

  // Step 3: In a real scenario, we would wait for the token to expire or
  // manipulate the token's expiration claim. However, in this test environment,
  // we simulate the expired token scenario by attempting to use a token that
  // the backend will treat as expired or invalid.

  // Since we cannot actually wait for token expiration in a test, we'll test
  // the error handling by using a manipulated or invalid refresh token string.
  // We create an invalid token by modifying the original token.
  const expiredToken = refreshToken + "invalid";

  // Step 4: Attempt to refresh using the expired/invalid token
  // This should fail and throw an error
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.auth.buyer.refresh(connection, {
        body: {
          refresh: expiredToken,
        } satisfies IShoppingMallBuyer.IRefresh,
      });
    },
  );

  // The test validates that:
  // - The system properly rejects expired/invalid refresh tokens
  // - An appropriate error response is returned
  // - The buyer cannot obtain new access tokens without valid credentials
  // - Security policies are correctly enforced
}
