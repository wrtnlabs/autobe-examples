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
 * Test that a newly approved seller with no products, orders, or pending requests
 * receives a dashboard with all metrics set to zero.
 *
 * This validates the initial dashboard state for a seller who has just completed
 * onboarding, ensuring the dashboard correctly handles empty states.
 */
export async function test_api_seller_dashboard_initial_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(seller);
  // 2. Retrieve the seller dashboard
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 3. Validate all metrics are zero
  TestValidator.equals("total products count", dashboard.totalProductsCount, 0);
  TestValidator.equals(
    "total order items count",
    dashboard.totalOrderItemsCount,
    0,
  );
  TestValidator.equals(
    "pending cancellation requests count",
    dashboard.pendingCancellationRequestsCount,
    0,
  );
  TestValidator.equals(
    "pending refund requests count",
    dashboard.pendingRefundRequestsCount,
    0,
  );
  TestValidator.equals(
    "low stock variants count",
    dashboard.lowStockVariantsCount,
    0,
  );
}
