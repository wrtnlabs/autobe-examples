import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_empty_data_initialization(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account with approved status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(seller);
  // Retrieve seller dashboard immediately after registration
  const dashboard: IEcommerceMallDashboard.ISummary =
    await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // Verify all metrics are zero for new seller with no data
  TestValidator.equals("total products is zero", dashboard.totalProducts, 0);
  TestValidator.equals(
    "pending cancellation requests is zero",
    dashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pending refund requests is zero",
    dashboard.pendingRefundRequests,
    0,
  );
  TestValidator.equals(
    "total order items sold is zero",
    dashboard.totalOrderItemsSold,
    0,
  );
}
