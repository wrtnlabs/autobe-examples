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

export async function test_api_seller_dashboard_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and join
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "sellerPassword123",
        shopName: RandomGenerator.name(1),
        shopDescription: null,
        logoUri: null,
      },
    });
  typia.assert(sellerAuthorized);
  // 2. Create seller connection with token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // Verify seller approval status
  TestValidator.predicate(
    "seller has approved status",
    sellerAuthorized.approvalStatus === "approved",
  );
  // 3. Retrieve seller dashboard
  const dashboard: IShoppingMallSellerDashboard =
    await api.functional.shoppingMall.seller.dashboard.getSellerDashboard(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 4. Validate counts and orderItems
  TestValidator.predicate(
    "total products count is non-negative",
    dashboard.totalProductsCount >= 0,
  );
  TestValidator.predicate(
    "total order items count is non-negative",
    dashboard.totalOrderItemsCount >= 0,
  );
  TestValidator.predicate(
    "pending cancellation requests count is non-negative",
    dashboard.pendingCancellationRequestsCount >= 0,
  );
  TestValidator.predicate(
    "pending refund requests count is non-negative",
    dashboard.pendingRefundRequestsCount >= 0,
  );
  // Validate orderItems length conforms to totalOrderItemsCount (or less depending on list pagination, so just check the type and presence)
  TestValidator.predicate(
    "order items is an array",
    Array.isArray(dashboard.orderItems),
  );
  // Check each order item
  for (const item of dashboard.orderItems) {
    // Assert structure
    typia.assert(item);
    // The order item must have correct fields
    TestValidator.predicate(
      "order item quantity is positive",
      item.quantity > 0,
    );
    TestValidator.predicate(
      "order item status is one of the allowed",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    // Check nested order and customer
    typia.assert(item.order);
    typia.assert(item.order.customer);
    typia.assert(item.productVariant);
  }
  // 5. Access control test: without authentication
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.shoppingMall.seller.dashboard.getSellerDashboard(
        connection,
      );
    },
  );
}
