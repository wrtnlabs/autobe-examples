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
 * Test the primary success path of seller token refresh operation.
 * 1. Register and authenticate seller to obtain initial refresh token
 * 2. Use refresh token to request new access and refresh tokens
 * 3. Verify token rotation (new tokens differ from original)
 * 4. Verify seller identity information in response
 * 5. Verify timestamp updates (access token ~1 hour, refresh token ~7 days)
 * 6. Verify old refresh token is invalidated
 */
export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Store original tokens
  const originalAccessToken = sellerAuth.token.access;
  const originalRefreshToken = sellerAuth.token.refresh;
  // 2. Refresh tokens using the refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_seller_refresh(refreshedConnection, {
    body: {
      refresh_token: sellerAuth.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify token rotation (new tokens differ from original)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 4. Verify seller identity information in response
  TestValidator.equals("seller id matches", sellerAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "seller email matches",
    sellerAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "shop name matches",
    sellerAuth.shop_name,
    refreshedAuth.shop_name,
  );
  TestValidator.equals(
    "approval status preserved",
    sellerAuth.approval_status,
    refreshedAuth.approval_status,
  );
  TestValidator.equals(
    "status preserved",
    sellerAuth.status,
    refreshedAuth.status,
  );
  // 5. Verify timestamp updates
  const originalExpiredAt = new Date(sellerAuth.token.expired_at).getTime();
  const refreshedExpiredAt = new Date(refreshedAuth.token.expired_at).getTime();
  TestValidator.predicate(
    "access token expired_at updated",
    refreshedExpiredAt > originalExpiredAt,
  );
  const originalRefreshableUntil = new Date(
    sellerAuth.token.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshedAuth.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refresh token refreshable_until updated",
    refreshedRefreshableUntil > originalRefreshableUntil,
  );
  // 6. Verify old refresh token is invalidated
  await TestValidator.error("old refresh token rejected", async () => {
    const oldTokenConnection: api.IConnection = { host: connection.host };
    await authorize_seller_refresh(oldTokenConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
}
