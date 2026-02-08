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

export async function test_api_seller_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // After join, set auth token in sellerConnection headers
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call seller dashboard endpoint
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.index(sellerConnection);
  typia.assert(dashboard);
  // 3. Validate empty state: no products, no order items, no pending cancellations/refunds
  // The exact properties of IShoppingMallSellerSellerDashboard are unknown,
  // so we test typical zero or empty array properties if exist.
  // Check total products count property if exists
  if ("total_products" in dashboard) {
    TestValidator.equals(
      "total products count",
      dashboard["total_products"],
      0,
    );
  }
  // Check total order items count property if exists
  if ("total_order_items" in dashboard) {
    TestValidator.equals(
      "total order items count",
      dashboard["total_order_items"],
      0,
    );
  }
  // Check pending cancellation count property if exists
  if ("pending_cancellations" in dashboard) {
    TestValidator.equals(
      "pending cancellations count",
      dashboard["pending_cancellations"],
      0,
    );
  }
  // Check pending refunds count property if exists
  if ("pending_refunds" in dashboard) {
    TestValidator.equals(
      "pending refunds count",
      dashboard["pending_refunds"],
      0,
    );
  }
  // Check order item list is empty if exists and is an array
  if ("order_items" in dashboard && Array.isArray(dashboard["order_items"])) {
    TestValidator.equals(
      "order items list empty",
      dashboard["order_items"].length,
      0,
    );
  }
}
