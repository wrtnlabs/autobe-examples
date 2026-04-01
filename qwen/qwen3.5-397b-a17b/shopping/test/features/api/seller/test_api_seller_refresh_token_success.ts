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
 * Test successful seller authentication token refresh using a valid refresh token.
 *
 * This test validates the token refresh workflow for seller accounts:
 * 1. Registers a new seller account to obtain initial authentication tokens
 * 2. Uses the refresh token to obtain a new access/refresh token pair
 * 3. Verifies token rotation (new tokens differ from original)
 * 4. Verifies seller identity is preserved across refresh
 * 5. Validates response structure matches IAuthorizationToken specification
 */
export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account to obtain initial tokens
  const joinResult: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(joinResult);
  // Step 2: Capture original tokens and seller ID
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const sellerId = joinResult.id;
  // Step 3: Refresh tokens using the refresh token
  const refreshResult: IShoppingMallSeller.IAuthorized =
    await authorize_seller_refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  typia.assert(refreshResult);
  // Step 4: Capture new tokens
  const newAccessToken = refreshResult.token.access;
  const newRefreshToken = refreshResult.token.refresh;
  const refreshedSellerId = refreshResult.id;
  // Step 5: Validate token rotation (new tokens must differ from original)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    newRefreshToken,
  );
  // Step 6: Validate seller identity is preserved
  TestValidator.equals(
    "seller ID preserved after refresh",
    sellerId,
    refreshedSellerId,
  );
  // Step 7: Validate expiration logic (refreshable_until >= expired_at)
  const expiredAtDate = new Date(refreshResult.token.expired_at);
  const refreshableUntilDate = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after or equal to expired_at",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );
}
