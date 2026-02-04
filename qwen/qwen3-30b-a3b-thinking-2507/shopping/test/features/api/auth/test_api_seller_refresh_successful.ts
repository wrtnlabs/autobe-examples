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

export async function test_api_seller_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Create a seller account using authorize_seller_join
  const seller = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 3: Extract refresh token from the response
  const refreshToken: string & tags.Format<"uuid"> = seller.token.refresh;
  // Step 4: Refresh the token using the refresh token
  const refreshedSeller = await authorize_seller_refresh(sellerConnection, {
    body: {
      refreshToken: refreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedSeller);
  // Step 5: Verify the new access token is different
  TestValidator.equals(
    "access tokens are different",
    seller.token.access,
    refreshedSeller.token.access,
  );
  // Step 6: Verify session extension by 24 hours
  const now = new Date();
  now.setHours(now.getHours() + 24);
  TestValidator.equals(
    "session extended by 24 hours",
    now.toISOString(),
    refreshedSeller.token.refreshable_until,
  );
}