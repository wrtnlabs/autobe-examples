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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller can filter order items by different fulfillment statuses.
 *
 * This test validates the seller's ability to filter order items by status
 * (paid, shipped, delivered) to manage their fulfillment workflow efficiently.
 * The test creates multiple order items with different statuses and verifies
 * that the filtering mechanism returns the correct items for each status.
 */
export async function test_api_seller_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Setup: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Setup: Create first order (will remain in 'paid' status)
  const order1 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order1);
  TestValidator.predicate("order1 has items", order1.orderItems.length > 0);
  // 4. Setup: Create second order (will be shipped)
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  TestValidator.predicate("order2 has items", order2.orderItems.length > 0);
  // 5. Setup: Create third order (will be delivered)
  const order3 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order3);
  TestValidator.predicate("order3 has items", order3.orderItems.length > 0);
  // 6. Setup: Create shipment for order2 items (status becomes 'shipped')
  const shipment2 =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order2.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // 7. Setup: Create shipment for order3 items (status becomes 'shipped')
  const shipment3 =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order3.orderItems.map((item) => item.id),
          tracking_carrier: "UPS",
          tracking_number: RandomGenerator.alphaNumeric(20),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment3);
  // 8. Setup: Customer confirms delivery for shipment3 (status becomes 'delivered')
  const confirmedShipment3 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment3.id,
      },
    );
  typia.assert(confirmedShipment3);
  TestValidator.equals(
    "delivery confirmed",
    confirmedShipment3.delivery_confirmed,
    true,
  );
  // 9. Test: Filter by status='paid'
  const paidItemsResult =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidItemsResult);
  TestValidator.equals(
    "paid items count matches order1",
    paidItemsResult.data.length,
    order1.orderItems.length,
  );
  TestValidator.predicate("all paid items have correct status", () =>
    paidItemsResult.data.every((item) => item.status === "paid"),
  );
  // 10. Test: Filter by status='shipped'
  const shippedItemsResult =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedItemsResult);
  TestValidator.equals(
    "shipped items count matches order2",
    shippedItemsResult.data.length,
    order2.orderItems.length,
  );
  TestValidator.predicate("all shipped items have correct status", () =>
    shippedItemsResult.data.every((item) => item.status === "shipped"),
  );
  // 11. Test: Filter by status='delivered'
  const deliveredItemsResult =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredItemsResult);
  TestValidator.equals(
    "delivered items count matches order3",
    deliveredItemsResult.data.length,
    order3.orderItems.length,
  );
  TestValidator.predicate("all delivered items have correct status", () =>
    deliveredItemsResult.data.every((item) => item.status === "delivered"),
  );
  // 12. Test: No status filter (should return all items)
  const allItemsResult =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(allItemsResult);
  const expectedTotal =
    order1.orderItems.length +
    order2.orderItems.length +
    order3.orderItems.length;
  TestValidator.equals(
    "total items count matches all orders",
    allItemsResult.data.length,
    expectedTotal,
  );
  // 13. Test: Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    allItemsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allItemsResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records",
    allItemsResult.pagination.records,
    expectedTotal,
  );
  // 14. Test: Verify status distribution in all items
  const paidCount = allItemsResult.data.filter(
    (item) => item.status === "paid",
  ).length;
  const shippedCount = allItemsResult.data.filter(
    (item) => item.status === "shipped",
  ).length;
  const deliveredCount = allItemsResult.data.filter(
    (item) => item.status === "delivered",
  ).length;
  TestValidator.equals(
    "paid count matches",
    paidCount,
    order1.orderItems.length,
  );
  TestValidator.equals(
    "shipped count matches",
    shippedCount,
    order2.orderItems.length,
  );
  TestValidator.equals(
    "delivered count matches",
    deliveredCount,
    order3.orderItems.length,
  );
}
