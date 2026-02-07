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

export async function test_api_seller_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account with pending approval
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_seller_join(joinConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Login to activate session and obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: {} satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // Extract refresh token from login response
  const oldRefreshToken = loginResponse.token.refresh;
  // 3. Refresh token operation - IRefresh has no properties, so empty object is required
  const refreshConnection: api.IConnection = { host: connection.host };
  // Must send empty object as IRefresh is defined as {} - no refresh_token property exists
  const refreshResponse = await authorize_seller_refresh(refreshConnection, {
    body: {} satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate refresh response contains new tokens
  TestValidator.notEquals(
    "new access token differs from old",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    oldRefreshToken,
    refreshResponse.token.refresh,
  );
  TestValidator.predicate("new access token has 30-minute expiration", () => {
    const now = new Date();
    const expiresAt = new Date(refreshResponse.token.expired_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    return diffMs > 1700000 && diffMs < 1900000; // 28-32 minutes in ms
  });
  TestValidator.predicate("new refresh token has 30-day expiration", () => {
    const now = new Date();
    const refreshUntil = new Date(refreshResponse.token.refreshable_until);
    const diffMs = refreshUntil.getTime() - now.getTime();
    return diffMs > 2558400000 && diffMs < 2592000000; // 29.6-30 days in ms
  });
  // 5. Verify old access token no longer works - must use a protected endpoint
  const oldTokenConnection: api.IConnection = { host: connection.host };
  oldTokenConnection.headers = {
    Authorization: `Bearer ${joinResponse.token.access}`,
  };
  await TestValidator.error(
    "old access token rejected after refresh",
    async () => {
      // Use refresh endpoint which requires a valid token
      await api.functional.shoppingMall.auth.seller.refresh(
        oldTokenConnection,
        {
          body: {} satisfies IShoppingMallSeller.IRefresh,
        },
      );
    },
  );
}
