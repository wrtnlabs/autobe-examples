import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test the security validation that prevents token refresh when seller account status changes to banned.
 *
 * This test validates that:
 * 1. A seller can register and obtain valid refresh tokens
 * 2. An admin can ban the seller account
 * 3. The refresh operation fails when attempting to use the refresh token after the account is banned
 * 4. The error response indicates the account status issue
 */
export async function test_api_seller_refresh_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Store the refresh token before banning
  const refreshToken = sellerAuth.token.refresh;
  // 2. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Ban the seller account
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(bannedSeller);
  // Verify seller is now banned
  TestValidator.equals(
    "seller status is banned",
    bannedSeller.status,
    "banned",
  );
  // 4. Attempt to refresh tokens with the previously valid refresh token
  // Create a fresh connection for the refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // This should fail because the seller account is now banned
  await TestValidator.httpError(
    "refresh fails for banned seller",
    [401, 403],
    async () =>
      await authorize_seller_refresh(refreshConnection, {
        body: {
          refresh_token: refreshToken,
        },
      }),
  );
}
