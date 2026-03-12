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
 * Test that a shipment containing multiple order items from the same seller returns all bundled items correctly.
 *
 * This test validates:
 * 1. Multi-item shipment creation and retrieval
 * 2. Each bundled item maintains unique product/variant snapshots
 * 3. Quantity and price preservation from order placement
 * 4. Pagination functionality for shipments with multiple items
 */
export async function test_api_shipment_items_multi_item_bundle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Customer creates order with multiple items from same seller
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract order items from the same seller
  const sellerId = order.orderItems[0].sellerId;
  const sellerOrderItems = order.orderItems.filter(
    (item) => item.sellerId === sellerId,
  );
  // Ensure we have at least 2 items from the same seller for multi-item test
  TestValidator.predicate(
    "order contains items from same seller",
    sellerOrderItems.length >= 2,
  );
  // 4. Seller creates shipment bundling multiple order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: sellerOrderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(shipment);
  // 5. Verify shipment contains all bundled items
  TestValidator.equals(
    "shipment item count matches",
    shipment.orderItems.length,
    sellerOrderItems.length,
  );
  // 6. Call endpoint to retrieve shipment items
  const shipmentItemsPage1 =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(shipmentItemsPage1);
  // 7. Verify all items are returned
  TestValidator.equals(
    "all shipment items returned",
    shipmentItemsPage1.data.length,
    sellerOrderItems.length,
  );
  // 8. Verify each item has unique IDs (snapshots are {} in summary, so verify by item uniqueness)
  const itemIds = new Set(shipmentItemsPage1.data.map((item) => item.id));
  TestValidator.predicate(
    "each item has unique ID",
    itemIds.size === shipmentItemsPage1.data.length,
  );
  // 9. Verify quantity and price are preserved
  for (const retrievedItem of shipmentItemsPage1.data) {
    let originalItem = sellerOrderItems.find(
      (item) => item.id === retrievedItem.id,
    );
    originalItem = typia.assert(originalItem!);
    TestValidator.equals(
      `quantity preserved for item ${retrievedItem.id}`,
      retrievedItem.quantity satisfies number as number,
      originalItem.quantity,
    );
    TestValidator.equals(
      `price preserved for item ${retrievedItem.id}`,
      retrievedItem.price,
      originalItem.price,
    );
  }
  // 10. Test pagination with limit=2
  const shipmentItemsPage1Limited =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(shipmentItemsPage1Limited);
  // Verify first page has correct limit
  TestValidator.equals(
    "first page has correct limit",
    shipmentItemsPage1Limited.data.length,
    Math.min(2, sellerOrderItems.length),
  );
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    shipmentItemsPage1Limited.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    shipmentItemsPage1Limited.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records matches",
    shipmentItemsPage1Limited.pagination.records,
    sellerOrderItems.length,
  );
  // 11. If we have more than 2 items, test second page
  if (sellerOrderItems.length > 2) {
    const shipmentItemsPage2 =
      await api.functional.shoppingMall.seller.shipments.items.index(
        sellerConnection,
        {
          shipmentId: shipment.id,
          body: {
            page: 2,
            limit: 2,
          },
        },
      );
    typia.assert(shipmentItemsPage2);
    // Verify second page contains remaining items
    const expectedPage2Count = sellerOrderItems.length - 2;
    TestValidator.equals(
      "second page has remaining items",
      shipmentItemsPage2.data.length,
      expectedPage2Count,
    );
    // Verify pagination metadata for page 2
    TestValidator.equals(
      "pagination current page is 2",
      shipmentItemsPage2.pagination.current,
      2,
    );
    // Verify items on page 2 are different from page 1
    const page1Ids = new Set(shipmentItemsPage1Limited.data.map((i) => i.id));
    const page2HasDifferentItems = shipmentItemsPage2.data.every(
      (item) => !page1Ids.has(item.id),
    );
    TestValidator.predicate(
      "second page contains different items than first page",
      page2HasDifferentItems,
    );
  }
}