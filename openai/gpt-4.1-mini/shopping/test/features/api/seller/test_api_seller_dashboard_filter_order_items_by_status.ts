import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_filter_order_items_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Call dashboard API
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.getSellerDashboard(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 3. Collect counts for validation
  const totalProductsCount = dashboard.totalProductsCount;
  const totalOrderItemsCount = dashboard.totalOrderItemsCount;
  const pendingCancellationRequestsCount =
    dashboard.pendingCancellationRequestsCount;
  const pendingRefundRequestsCount = dashboard.pendingRefundRequestsCount;
  // 4. Define valid statuses to verify
  const statuses = new Set(["paid", "shipped", "delivered"] as const);
  // 5. For each status, filter orderItems manually and validate
  for (const status of statuses) {
    const filteredItems = dashboard.orderItems.filter(
      (item) => item.status === status,
    );
    // Every filtered item must have the requested status
    for (const orderItem of filteredItems) {
      TestValidator.equals(
        "orderItem status matches filter",
        orderItem.status,
        status,
      );
    }
    // total counts remain consistent
    TestValidator.equals(
      "totalProductsCount consistent",
      dashboard.totalProductsCount,
      totalProductsCount,
    );
    TestValidator.equals(
      "pendingCancellationRequestsCount consistent",
      dashboard.pendingCancellationRequestsCount,
      pendingCancellationRequestsCount,
    );
    TestValidator.equals(
      "pendingRefundRequestsCount consistent",
      dashboard.pendingRefundRequestsCount,
      pendingRefundRequestsCount,
    );
    // totalOrderItemsCount is greater or equal filtered items count
    TestValidator.predicate(
      "totalOrderItemsCount consistent",
      dashboard.totalOrderItemsCount >= filteredItems.length,
    );
  }
}
