import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

export async function test_api_customer_order_history_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create an actor-specific connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer account to obtain an authenticated session
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 1. Retrieve all orders without any status filter (default pagination)
  const allOrders = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    {
      body: { page: 1, limit: 100 } satisfies IECommerceMallOrder.IRequest,
    },
  );
  typia.assert(allOrders);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    allOrders.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    allOrders.pagination.limit >= 1,
  );
  // Validate that orders are sorted by created_at descending (newest first)
  for (let i: number = 1; i < allOrders.data.length; i++) {
    TestValidator.predicate(
      "orders sorted by created_at descending",
      allOrders.data[i - 1].created_at >= allOrders.data[i].created_at,
    );
  }
  // 2. Filter by "paid" status
  const paidOrders = await api.functional.eCommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: 100,
      } satisfies IECommerceMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  // Validate that every returned order has status "paid"
  for (const order of paidOrders.data) {
    TestValidator.equals("filtered order status is paid", order.status, "paid");
  }
  // 3. Filter by "delivered" status
  const deliveredOrders =
    await api.functional.eCommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallOrder.IRequest,
      },
    );
  typia.assert(deliveredOrders);
  // Validate that every returned order has status "delivered"
  for (const order of deliveredOrders.data) {
    TestValidator.equals(
      "filtered order status is delivered",
      order.status,
      "delivered",
    );
  }
  // 4. Verify that paid and delivered results are subsets of all orders
  const allOrderIds: Set<string> = new Set(allOrders.data.map((o) => o.id));
  for (const order of paidOrders.data) {
    TestValidator.predicate(
      "paid order exists in full result set",
      allOrderIds.has(order.id),
    );
  }
  for (const order of deliveredOrders.data) {
    TestValidator.predicate(
      "delivered order exists in full result set",
      allOrderIds.has(order.id),
    );
  }
}
