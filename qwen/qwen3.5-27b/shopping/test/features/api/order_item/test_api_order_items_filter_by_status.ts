import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering order items by status within a customer's order.
   * This test verifies that the order items API correctly filters items
   * based on their fulfillment status (paid, shipped, delivered, cancelled, refunded).
   * It also validates pagination metadata and edge cases like filtering with no matches.
   */
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create an order with multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 3. Test filtering by "paid" status
  const paidFilter = {
    status: "paid" as const,
  } satisfies IShoppingMallOrderItem.IRequest;
  const paidResult =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: paidFilter,
      },
    );
  typia.assert(paidResult);
  TestValidator.predicate(
    "paid filter returns valid pagination",
    paidResult.pagination.records >= 0 && paidResult.pagination.pages >= 0,
  );
  // 4. Test filtering by "shipped" status
  const shippedFilter = {
    status: "shipped" as const,
  } satisfies IShoppingMallOrderItem.IRequest;
  const shippedResult =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: shippedFilter,
      },
    );
  typia.assert(shippedResult);
  TestValidator.predicate(
    "shipped filter returns valid pagination",
    shippedResult.pagination.records >= 0 &&
      shippedResult.pagination.pages >= 0,
  );
  // 5. Test filtering by "delivered" status
  const deliveredFilter = {
    status: "delivered" as const,
  } satisfies IShoppingMallOrderItem.IRequest;
  const deliveredResult =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: deliveredFilter,
      },
    );
  typia.assert(deliveredResult);
  TestValidator.predicate(
    "delivered filter returns valid pagination",
    deliveredResult.pagination.records >= 0 &&
      deliveredResult.pagination.pages >= 0,
  );
  // 6. Test filtering by "cancelled" status
  const cancelledFilter = {
    status: "cancelled" as const,
  } satisfies IShoppingMallOrderItem.IRequest;
  const cancelledResult =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: cancelledFilter,
      },
    );
  typia.assert(cancelledResult);
  TestValidator.predicate(
    "cancelled filter returns valid pagination",
    cancelledResult.pagination.records >= 0 &&
      cancelledResult.pagination.pages >= 0,
  );
  // 7. Test filtering by "refunded" status
  const refundedFilter = {
    status: "refunded" as const,
  } satisfies IShoppingMallOrderItem.IRequest;
  const refundedResult =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: refundedFilter,
      },
    );
  typia.assert(refundedResult);
  TestValidator.predicate(
    "refunded filter returns valid pagination",
    refundedResult.pagination.records >= 0 &&
      refundedResult.pagination.pages >= 0,
  );
  // 8. Test filtering with no matching items (should return empty data array)
  // All items in a newly created order should be "paid", so filtering by other statuses should return empty
  const noMatchFilter = {
    status: "delivered" as const,
  } satisfies IShoppingMallOrderItem.IRequest;
  const noMatchResult =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: noMatchFilter,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match filter returns empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match filter returns zero records",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match filter returns zero pages",
    noMatchResult.pagination.pages,
    0,
  );
  // 9. Verify that "paid" filter returns the correct number of items
  TestValidator.equals(
    "paid filter returns all order items",
    paidResult.data.length,
    order.orderItems.length,
  );
  TestValidator.equals(
    "paid filter records count matches order items",
    paidResult.pagination.records,
    order.orderItems.length,
  );
  // 10. Verify all returned items have the correct status
  for (const item of paidResult.data) {
    TestValidator.equals(
      `item ${item.id} has paid status`,
      item.status,
      "paid",
    );
  }
}
