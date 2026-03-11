import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that seller token refresh works correctly.
 * Note: Full banned account testing requires a "ban seller" admin API endpoint
 * which is not currently available in the API.
 */
export async function test_api_seller_refresh_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account for elevated privileges
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create seller account and receive initial tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Store the refresh token before it gets updated
  const originalRefreshToken = seller.token.refresh;
  // 3. Attempt to refresh tokens using the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSeller = await authorize_seller_refresh(refreshConnection, {
    body: { refresh: originalRefreshToken },
  });
  typia.assert(refreshedSeller);
  // 4. Validate that refresh worked correctly
  TestValidator.equals("seller ID preserved", refreshedSeller.id, seller.id);
  TestValidator.equals("email preserved", refreshedSeller.email, seller.email);
  TestValidator.predicate(
    "new access token issued",
    refreshedSeller.token.access !== seller.token.access,
  );
  TestValidator.predicate(
    "new refresh token issued",
    refreshedSeller.token.refresh !== originalRefreshToken,
  );
  TestValidator.predicate(
    "account is not banned",
    refreshedSeller.banned === false,
  );
}
