import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
 * Test shipment items status filtering functionality.
 *
 * This test validates that customers can filter shipment items by order item
 * status (paid, shipped, delivered, cancelled, refunded). The test creates a
 * shipment with multiple items in different statuses and verifies that the
 * filtering mechanism correctly returns only items matching the requested status.
 */
export async function test_api_shipment_items_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
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
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Customer creates order with items
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 4. Seller creates shipment with order items
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 5. Test filtering by 'shipped' status
  const shippedItems: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "shipped",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(shippedItems);
  // Verify all returned items have 'shipped' status
  for (const item of shippedItems.data) {
    TestValidator.equals(
      "item status is shipped",
      item.orderItem.status,
      "shipped",
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    shippedItems.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    shippedItems.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records match data length",
    shippedItems.pagination.records === shippedItems.data.length,
  );
  // 6. Test filtering by 'delivered' status (should be empty initially)
  const deliveredItems: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "delivered",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(deliveredItems);
  // Verify empty results for delivered status
  TestValidator.equals(
    "no delivered items initially",
    deliveredItems.data.length,
    0,
  );
  TestValidator.equals(
    "delivered pagination records is 0",
    deliveredItems.pagination.records,
    0,
  );
  // 7. Test filtering by 'cancelled' status (should be empty)
  const cancelledItems: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "cancelled",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(cancelledItems);
  TestValidator.equals("no cancelled items", cancelledItems.data.length, 0);
  // 8. Test filtering by 'refunded' status (should be empty)
  const refundedItems: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 20,
          status: "refunded",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(refundedItems);
  TestValidator.equals("no refunded items", refundedItems.data.length, 0);
  // 9. Test without status filter (should return all items)
  const allItems: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(allItems);
  // Verify all items are returned without filter
  TestValidator.predicate(
    "all items returned without filter",
    allItems.data.length > 0,
  );
  TestValidator.equals(
    "total items match order items count",
    allItems.pagination.records,
    order.orderItems.length,
  );
  // 10. Verify pagination with limit
  const paginatedItems: IPageIShoppingMallShipmentItem.ISummary =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 5,
          status: "shipped",
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(paginatedItems);
  TestValidator.equals(
    "pagination limit is 5",
    paginatedItems.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedItems.data.length <= 5,
  );
}
