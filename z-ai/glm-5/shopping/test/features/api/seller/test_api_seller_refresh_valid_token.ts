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

export async function test_api_seller_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and obtain initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const sellerId = initialAuth.id;
  const sellerEmail = initialAuth.email;
  // 2. Call refresh endpoint with valid refresh token
  const refreshedAuth = await authorize_seller_refresh(sellerConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify new tokens are different from initial (token rotation)
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 4. Verify token expiration timestamps are valid
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  // Access token should expire in approximately 1 hour (give or take 5 minutes)
  const oneHourMs = 60 * 60 * 1000;
  const expiredAtDiff = expiredAt.getTime() - now.getTime();
  TestValidator.predicate(
    "expired_at should be approximately 1 hour from now",
    expiredAtDiff > 0 && expiredAtDiff <= oneHourMs + 5 * 60 * 1000,
  );
  // Refresh token should be valid for approximately 7 days
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const refreshableUntilDiff = refreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refreshable_until should be approximately 7 days from now",
    refreshableUntilDiff > 0 &&
      refreshableUntilDiff <= sevenDaysMs + 60 * 60 * 1000,
  );
  // 5. Verify seller profile matches initial join
  TestValidator.equals("seller id matches", refreshedAuth.id, sellerId);
  TestValidator.equals(
    "seller email matches",
    refreshedAuth.email,
    sellerEmail,
  );
  TestValidator.equals(
    "shop_name matches",
    refreshedAuth.shop_name,
    initialAuth.shop_name,
  );
  TestValidator.equals(
    "shop_description matches",
    refreshedAuth.shop_description,
    initialAuth.shop_description,
  );
  TestValidator.equals(
    "logo_image matches",
    refreshedAuth.logo_image,
    initialAuth.logo_image,
  );
  TestValidator.equals(
    "approval_status is pending",
    refreshedAuth.approval_status,
    "pending",
  );
  TestValidator.equals("suspended is false", refreshedAuth.suspended, false);
  TestValidator.equals("banned is false", refreshedAuth.banned, false);
  // 6. Verify the new access token is valid by using it for another refresh
  const secondRefresh = await authorize_seller_refresh(sellerConnection, {
    body: {
      refresh: refreshedAuth.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(secondRefresh);
  TestValidator.equals(
    "second refresh seller id matches",
    secondRefresh.id,
    sellerId,
  );
}
