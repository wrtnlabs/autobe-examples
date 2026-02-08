import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_overview_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerAuth = await authorize_seller_join(
    { host: connection.host },
    {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    },
  );
  // Create actor-specific connection with Authorization header
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // 2. Retrieve the seller dashboard overview
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.index(sellerConnection);
  typia.assert(dashboard);
  // Since the schema for IShoppingMallSellerSellerDashboard is empty, no further validation is possible
  // This test confirms successful retrieval and response type validation
}
