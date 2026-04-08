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
 * Test that a seller can successfully refresh their authentication tokens using a valid refresh token.
 *
 * Validates the complete seller token refresh flow including seller registration, token refresh operation, and verification of new token issuance. Ensures that the refresh operation correctly generates new access and refresh tokens while preserving seller identity information.
 *
 * Special attention is given to verifying that the new tokens are different from the original tokens and that the seller's account information remains consistent throughout the refresh operation.
 *
 * 1. Register a new seller account with valid credentials using authorize_seller_join utility.
 * 2. Capture the refresh token from the registration response.
 * 3. Create a new connection for the refresh operation.
 * 4. Call the refresh endpoint with the captured refresh token using authorize_seller_refresh utility.
 * 5. Verify the response contains new access and refresh tokens.
 * 6. Verify the new tokens are different from the original tokens.
 * 7. Verify the seller identity information is correctly preserved.
 * 8. Verify the token expiration timestamps are updated.
 */
export async function test_api_seller_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(registeredSeller);
  // 2. Capture the refresh token from the registration response
  const originalRefreshToken = registeredSeller.token.refresh;
  const originalAccessToken = registeredSeller.token.access;
  // 3. Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call the refresh endpoint with the captured refresh token
  const refreshedSeller = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedSeller);
  // 5. Verify the response contains new access and refresh tokens
  TestValidator.predicate(
    "refresh response contains access token",
    refreshedSeller.token.access !== undefined &&
      refreshedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh response contains refresh token",
    refreshedSeller.token.refresh !== undefined &&
      refreshedSeller.token.refresh.length > 0,
  );
  // 6. Verify the new tokens are different from the original tokens
  TestValidator.notEquals(
    "access token should be different after refresh",
    originalAccessToken,
    refreshedSeller.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    originalRefreshToken,
    refreshedSeller.token.refresh,
  );
  // 7. Verify the seller identity information is correctly preserved
  TestValidator.equals(
    "seller id should match",
    registeredSeller.id,
    refreshedSeller.id,
  );
  TestValidator.equals(
    "seller email should match",
    registeredSeller.email,
    refreshedSeller.email,
  );
  TestValidator.equals(
    "seller approval status should match",
    registeredSeller.approval_status,
    refreshedSeller.approval_status,
  );
  TestValidator.equals(
    "seller shop name should match",
    registeredSeller.shop_name,
    refreshedSeller.shop_name,
  );
  TestValidator.equals(
    "seller shop description should match",
    registeredSeller.shop_description,
    refreshedSeller.shop_description,
  );
  // 8. Verify the token expiration timestamps are updated
  TestValidator.notEquals(
    "access token expiration should be updated",
    registeredSeller.token.expired_at,
    refreshedSeller.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh token expiration should be updated",
    registeredSeller.token.refreshable_until,
    refreshedSeller.token.refreshable_until,
  );
}
