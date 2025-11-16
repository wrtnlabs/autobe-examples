import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test token refresh chain workflow with multiple successive refreshes.
 *
 * This test validates that seller authentication tokens can be refreshed
 * multiple times in succession. Since no login/registration endpoint is
 * available in the provided API functions, this test focuses on validating the
 * refresh mechanism itself through multiple consecutive refresh operations.
 *
 * The test performs:
 *
 * 1. Initial token refresh using a test refresh token
 * 2. 4 additional consecutive refresh operations (5 total refreshes)
 * 3. Validation that each refresh succeeds and returns valid token structure
 * 4. Verification that refresh token rotation works correctly
 * 5. Confirmation that all newly issued tokens are unique
 */
export async function test_api_seller_token_refresh_after_multiple_refreshes(
  connection: api.IConnection,
) {
  // Generate initial test refresh token for the refresh chain
  // Note: In a real scenario this would come from initial login,
  // but login API is not available in the provided functions
  const initialRefreshToken = RandomGenerator.alphaNumeric(64);

  let currentRefreshToken: string = initialRefreshToken;
  const refreshCount = 5;
  const refreshedSellers: IShoppingMallSeller.IAuthorized[] = [];

  // Perform multiple consecutive token refreshes
  for (let i = 0; i < refreshCount; i++) {
    const refreshedSeller: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });

    typia.assert(refreshedSeller);

    // Validate seller data structure
    TestValidator.predicate(
      `refresh iteration ${i + 1} returns valid seller ID`,
      typeof refreshedSeller.id === "string" && refreshedSeller.id.length > 0,
    );

    TestValidator.predicate(
      `refresh iteration ${i + 1} returns valid email`,
      typeof refreshedSeller.email === "string" &&
        refreshedSeller.email.includes("@"),
    );

    // Validate token structure
    typia.assert(refreshedSeller.token);

    TestValidator.predicate(
      `refresh iteration ${i + 1} provides non-empty access token`,
      refreshedSeller.token.access.length > 0,
    );

    TestValidator.predicate(
      `refresh iteration ${i + 1} provides non-empty refresh token`,
      refreshedSeller.token.refresh.length > 0,
    );

    // Verify refresh token rotation - new token should differ from previous
    if (i > 0) {
      TestValidator.notEquals(
        `refresh iteration ${i + 1} rotates refresh token from previous iteration`,
        refreshedSeller.token.refresh,
        refreshedSellers[i - 1].token.refresh,
      );
    }

    // Store refreshed seller data
    refreshedSellers.push(refreshedSeller);

    // Update current refresh token for next iteration
    currentRefreshToken = refreshedSeller.token.refresh;
  }

  // Validate all refresh operations completed successfully
  TestValidator.equals(
    "completed all refresh iterations",
    refreshedSellers.length,
    refreshCount,
  );

  // Verify token uniqueness across all refreshes
  const accessTokens = refreshedSellers.map((s) => s.token.access);
  const refreshTokens = refreshedSellers.map((s) => s.token.refresh);

  const uniqueAccessTokens = new Set(accessTokens);
  const uniqueRefreshTokens = new Set(refreshTokens);

  TestValidator.equals(
    "all access tokens are unique across refresh chain",
    uniqueAccessTokens.size,
    refreshCount,
  );

  TestValidator.equals(
    "all refresh tokens are unique across refresh chain",
    uniqueRefreshTokens.size,
    refreshCount,
  );

  // Verify token expiration timestamps are present and valid
  for (let i = 0; i < refreshedSellers.length; i++) {
    const token = refreshedSellers[i].token;

    TestValidator.predicate(
      `refresh iteration ${i + 1} has valid expired_at timestamp`,
      typeof token.expired_at === "string" && token.expired_at.length > 0,
    );

    TestValidator.predicate(
      `refresh iteration ${i + 1} has valid refreshable_until timestamp`,
      typeof token.refreshable_until === "string" &&
        token.refreshable_until.length > 0,
    );
  }
}
