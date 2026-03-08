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

/**
 * Test token rotation by verifying that refreshed tokens differ from initial tokens.
 *
 * Business Context:
 * For enhanced security, when a refresh token is used, the system should issue
 * new tokens that differ from the initial tokens. This demonstrates proper token
 * rotation and prevents replay attacks where a stolen refresh token could be
 * reused multiple times.
 *
 * Setup Steps:
 * 1. Create a new seller account via POST /shoppingMall/auth/seller/join
 * 2. Record the initial access token and refresh token
 *
 * Test Execution:
 * 1. Call POST /shoppingMall/auth/seller/refresh with the initial refresh token
 * 2. Extract the new access token and new refresh token
 * 3. Compare initial tokens with new tokens
 *
 * Validation Points:
 * - New access token is different from initial access token
 * - New refresh token is different from initial refresh token (rotation strategy)
 * - Seller profile in response matches the registered seller
 */
export async function test_api_seller_token_refresh_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Create a new seller account and get initial tokens
  const initialAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(initialAuth);
  // Record initial tokens
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // Step 2: Refresh the tokens using the refresh token
  const refreshedAuth = await authorize_seller_refresh(sellerConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Extract new tokens
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;
  // Step 3: Validate token rotation - tokens should be different
  TestValidator.notEquals(
    "access token should be rotated",
    initialAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    initialRefreshToken,
    newRefreshToken,
  );
  // Step 4: Verify seller profile matches
  TestValidator.equals("seller ID matches", initialAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "seller email matches",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "shop name matches",
    initialAuth.shopName,
    refreshedAuth.shopName,
  );
}
