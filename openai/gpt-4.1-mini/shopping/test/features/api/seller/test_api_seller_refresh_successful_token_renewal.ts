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

export async function test_api_seller_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the primary success path for seller token refresh.
  // 1. Seller registers an account via /shoppingMall/auth/seller/join
  // 2. Seller receives initial tokens and a valid refresh token
  // 3. Seller uses refresh token to obtain new access and refresh tokens
  // 4. Validate response structure and ensure old token is invalidated
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register seller account and obtain initial authorized session tokens
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Capture initial tokens
  const initialToken = authorized.token;
  // Validate initial token fields
  typia.assert(initialToken);
  TestValidator.predicate(
    "initial access token is non-empty",
    initialToken.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token is non-empty",
    initialToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at is valid ISO date",
    !isNaN(Date.parse(initialToken.expired_at)),
  );
  TestValidator.predicate(
    "initial refreshable_until is valid ISO date",
    !isNaN(Date.parse(initialToken.refreshable_until)),
  );
  // Step 2: Use refresh token to obtain new tokens
  // Prepare a new connection to simulate different request
  const refreshConnection: api.IConnection = { host: connection.host };
  // Call authorize_seller_refresh with old refresh token
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh: initialToken.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  const refreshedToken = refreshed.token;
  // Validate refreshed token fields
  typia.assert(refreshedToken);
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty",
    refreshedToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at is valid ISO date",
    !isNaN(Date.parse(refreshedToken.expired_at)),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is valid ISO date",
    !isNaN(Date.parse(refreshedToken.refreshable_until)),
  );
  // Check that new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token must change after refresh",
    refreshedToken.access,
    initialToken.access,
  );
  TestValidator.notEquals(
    "refresh token must change after refresh",
    refreshedToken.refresh,
    initialToken.refresh,
  );
  TestValidator.notEquals(
    "expired_at must change after refresh",
    refreshedToken.expired_at,
    initialToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until must change after refresh",
    refreshedToken.refreshable_until,
    initialToken.refreshable_until,
  );
  // Step 3: Attempting to reuse old refresh token should fail
  await TestValidator.error("using old refresh token fails", async () => {
    await authorize_seller_refresh(refreshConnection, {
      body: {
        refresh: initialToken.refresh,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
}
