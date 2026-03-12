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
 * Test that a shipment containing multiple order items from the same seller returns all items correctly.
 *
 * This test validates:
 * 1. Customer and seller authentication
 * 2. Order creation with multiple items from the same seller
 * 3. Shipment creation bundling all order items
 * 4. Retrieval of shipment items with correct pagination and data
 */
export async function test_api_shipment_items_multiple_items_same_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
    },
  });
  // 3. Customer creates order with multiple items from the same seller
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has items from the same seller
  const sellerId = order.orderItems[0].sellerId;
  const itemsFromSameSeller = order.orderItems.filter(
    (item) => item.sellerId === sellerId,
  );
  TestValidator.predicate(
    "order has multiple items from same seller",
    itemsFromSameSeller.length >= 3,
  );
  // Extract order item IDs for shipment creation
  const orderItemIds = itemsFromSameSeller.map((item) => item.id);
  // 4. Seller creates shipment bundling all order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: orderItemIds,
          tracking_carrier: RandomGenerator.name(1),
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // Verify shipment contains all order items
  TestValidator.equals(
    "shipment item count matches order items",
    shipment.orderItems.length,
    orderItemIds.length,
  );
  // 5. Customer retrieves shipment items
  const shipmentItems =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(shipmentItems);
  // 6. Validate shipment items response
  TestValidator.equals(
    "total records matches shipment item count",
    shipmentItems.pagination.records,
    orderItemIds.length,
  );
  TestValidator.equals(
    "data array length matches records",
    shipmentItems.data.length,
    orderItemIds.length,
  );
  // 7. Verify each shipment item has correct data
  await ArrayUtil.asyncForEach(shipmentItems.data, async (shipmentItem) => {
    typia.assert(shipmentItem);
    // Verify shipment tracking information is consistent
    TestValidator.equals(
      `tracking carrier matches for item ${shipmentItem.orderItem.id}`,
      shipmentItem.shipment.tracking_carrier,
      shipment.tracking_carrier,
    );
    TestValidator.equals(
      `tracking number matches for item ${shipmentItem.orderItem.id}`,
      shipmentItem.shipment.tracking_number,
      shipment.tracking_number,
    );
    // Verify shipment timestamps are consistent
    TestValidator.equals(
      `shipped_at matches for item ${shipmentItem.orderItem.id}`,
      shipmentItem.shipment.shipped_at,
      shipment.shipped_at,
    );
    TestValidator.equals(
      `delivery_confirmed matches for item ${shipmentItem.orderItem.id}`,
      shipmentItem.shipment.delivery_confirmed,
      shipment.delivery_confirmed,
    );
    // Verify order item has valid business data
    TestValidator.predicate(
      `order item ${shipmentItem.orderItem.id} has positive quantity`,
      shipmentItem.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      `order item ${shipmentItem.orderItem.id} has non-negative price`,
      shipmentItem.orderItem.price >= 0,
    );
  });
  // 8. Verify all order items are distinct (different product/variant snapshots)
  const productSnapshots = shipmentItems.data.map((item) =>
    JSON.stringify(item.orderItem.productSnapshot),
  );
  const variantSnapshots = shipmentItems.data.map((item) =>
    JSON.stringify(item.orderItem.variantSnapshot),
  );
  TestValidator.predicate(
    "all product snapshots are distinct",
    new Set(productSnapshots).size === productSnapshots.length,
  );
  TestValidator.predicate(
    "all variant snapshots are distinct",
    new Set(variantSnapshots).size === variantSnapshots.length,
  );
  // 9. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    shipmentItems.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    shipmentItems.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    shipmentItems.pagination.pages ===
      Math.ceil(
        shipmentItems.pagination.records / shipmentItems.pagination.limit,
      ),
  );
}
