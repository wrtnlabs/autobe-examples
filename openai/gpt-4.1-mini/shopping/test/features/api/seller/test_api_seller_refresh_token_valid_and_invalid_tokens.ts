import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_token_valid_and_invalid_tokens(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the seller token refresh operation which allows an authenticated seller to obtain a new JWT access token using a valid refresh token.
   * The test should include the following scenarios:
   *
   * 1. Successful refresh: The seller must first register (join) to get initial tokens, then use the valid refresh token to request a new access token. Verify that the response contains new valid tokens with proper expiration dates, and the seller identity information remains consistent.
   *
   * 2. Expired refresh token scenario: Simulate or mock an expired refresh token and verify that the refresh request fails with an appropriate error response indicating token expiration, enforcing security.
   *
   * 3. Invalid refresh token scenario: Use a malformed or invalid refresh token and verify that the server rejects the request with relevant error response, preventing unauthorized access.
   *
   * Dependencies:
   * - The seller join operation must be called first to create the seller account and acquire a valid refresh token.
   */
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput: Partial<IShoppingMallSeller.IJoin> = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shopName: RandomGenerator.name(1),
  };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(authorizedSeller);
  // Use the refresh token from initial join response
  const validRefreshToken = authorizedSeller.token.refresh;
  // Create fresh connection for refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  // 1. Successful refresh scenario
  const refreshSuccessResponse = await authorize_seller_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: validRefreshToken,
      },
    },
  );
  typia.assert(refreshSuccessResponse);
  // Validate that the seller identity remains consistent
  TestValidator.equals(
    "seller id remains the same after refresh",
    refreshSuccessResponse.id,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "seller email remains the same after refresh",
    refreshSuccessResponse.email,
    authorizedSeller.email,
  );
  TestValidator.equals(
    "seller shopName remains the same after refresh",
    refreshSuccessResponse.shopName,
    authorizedSeller.shopName,
  );
  // Validate that the new tokens are different and have future expiration
  TestValidator.notEquals(
    "access token changes after refresh",
    refreshSuccessResponse.token.access,
    authorizedSeller.token.access,
  );
  TestValidator.notEquals(
    "refresh token changes after refresh",
    refreshSuccessResponse.token.refresh,
    authorizedSeller.token.refresh,
  );
  const now = new Date();
  const accessTokenExpiry = new Date(refreshSuccessResponse.token.expired_at);
  const refreshTokenExpiry = new Date(
    refreshSuccessResponse.token.refreshable_until,
  );
  TestValidator.predicate(
    "access token expires in the future",
    accessTokenExpiry > now,
  );
  TestValidator.predicate(
    "refresh token expires in the future",
    refreshTokenExpiry > now,
  );
  // 2. Expired refresh token scenario
  // We simulate an expired token by using a refresh token string that is known invalid
  // or a token string that has definitely expired (e.g., random string)
  const expiredRefreshToken = RandomGenerator.alphaNumeric(64); // very unlikely to be valid
  await TestValidator.httpError(
    "refresh fails with expired refresh token",
    401,
    async () => {
      await authorize_seller_refresh(refreshConnection, {
        body: { refreshToken: expiredRefreshToken },
      });
    },
  );
  // 3. Invalid refresh token scenario
  const invalidRefreshToken = "invalid.refresh.token";
  await TestValidator.httpError(
    "refresh fails with invalid refresh token",
    401,
    async () => {
      await authorize_seller_refresh(refreshConnection, {
        body: { refreshToken: invalidRefreshToken },
      });
    },
  );
}
