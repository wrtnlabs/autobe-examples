import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verify that a banned seller cannot refresh their access token.
 *
 * Validates the business rule that when a seller is banned (banned_at IS NOT NULL), the seller refresh endpoint must reject the request with 401 Unauthorized. This ensures banned sellers lose all platform access including session renewal, even when the original refresh token is still valid.
 *
 * 1. Seller registers via join endpoint and receives a valid refresh token.
 * 2. Administrator registers and bans the seller account, setting banned_at.
 * 3. Seller attempts to refresh using the original refresh token on a clean connection.
 * 4. Refresh is rejected with 401 because banned_at is no longer NULL.
 */
export async function test_api_seller_refresh_token_after_ban_blocked(
  connection: api.IConnection,
) {
  // 1. Register seller via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Register admin and ban the seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const banned = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(banned);
  TestValidator.predicate("seller is banned", banned.banned_at !== null);
  // 3. Attempt to refresh as the banned seller — must be rejected
  await TestValidator.httpError(
    "banned seller refresh rejected",
    401,
    async () => {
      await api.functional.shoppingMall.auth.seller.refresh(
        { host: connection.host },
        {
          body: {
            refresh: seller.token.refresh,
          } satisfies IShoppingMallSeller.IRefresh,
        },
      );
    },
  );
}
