import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Create a new seller account
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {},
    },
  );
  // Verify seller status is 'approved'
  TestValidator.equals(
    "seller status should be 'approved'",
    seller.status,
    "approved",
  );
  // Access dashboard
  const configuration: IShoppingMallConfiguration =
    await api.functional.shoppingMall.seller.dashboard.index(sellerConnection);
  typia.assert(configuration);
  // Verify key metric fields
  TestValidator.equals(
    "totalCustomers should be at least zero",
    configuration.totalCustomers,
    0,
  );
  TestValidator.equals(
    "totalSales should be at least zero",
    configuration.totalSales,
    0,
  );
  TestValidator.equals(
    "totalProducts should be at least zero",
    configuration.totalProducts,
    0,
  );
  TestValidator.equals(
    "trendingProducts should be at least zero",
    configuration.trendingProducts,
    0,
  );
}
