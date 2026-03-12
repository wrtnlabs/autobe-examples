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
 * Test that sellers can only retrieve items from their own shipments, not from other sellers' shipments.
 *
 * This test validates the authorization boundary for shipment item access:
 * 1. Sets up two sellers (A and B) and one customer
 * 2. Creates an order with items from both sellers
 * 3. Each seller creates a shipment for their respective order items
 * 4. Verifies that seller A cannot access seller B's shipment items (403 Forbidden)
 * 5. Verifies that seller A can access their own shipment items (200 OK)
 */
export async function test_api_shipment_items_seller_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerA);
  // 2. Register and authenticate as seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerB);
  // 3. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // 4. Customer creates an order containing items from both sellers
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract order items by seller
  const sellerAItems = order.orderItems.filter(
    (item) => item.sellerId === sellerA.id,
  );
  const sellerBItems = order.orderItems.filter(
    (item) => item.sellerId === sellerB.id,
  );
  // Ensure we have items from both sellers
  TestValidator.predicate(
    "order has items from seller A",
    sellerAItems.length > 0,
  );
  TestValidator.predicate(
    "order has items from seller B",
    sellerBItems.length > 0,
  );
  // 5. Seller A creates a shipment for their order items
  const shipmentA =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerAConnection,
      {
        body: {
          order_item_ids: sellerAItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipmentA);
  // 6. Seller B creates a separate shipment for their order items
  const shipmentB =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerBConnection,
      {
        body: {
          order_item_ids: sellerBItems.map((item) => item.id),
          tracking_carrier: "UPS",
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipmentB);
  // Test Step 1: Seller A calls the endpoint with seller B's shipmentId
  // Expected: HTTP 403 Forbidden
  await TestValidator.httpError(
    "seller A cannot access seller B's shipment items",
    403,
    async () =>
      await api.functional.shoppingMall.seller.shipments.items.index(
        sellerAConnection,
        {
          shipmentId: shipmentB.id,
          body: {},
        },
      ),
  );
  // Test Step 3: Seller A calls the endpoint with their own shipmentId
  // Expected: HTTP 200 OK
  const ownShipmentItems =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerAConnection,
      {
        shipmentId: shipmentA.id,
        body: {},
      },
    );
  typia.assert(ownShipmentItems);
  // Test Step 5: Verify only seller A's items are returned
  TestValidator.equals(
    "shipment contains only seller A's items",
    ownShipmentItems.data.length,
    sellerAItems.length,
  );
  // Verify all returned items belong to seller A
  const allItemsBelongToSellerA = ownShipmentItems.data.every((item) =>
    sellerAItems.some((sAItem) => sAItem.id === item.id),
  );
  TestValidator.predicate(
    "all returned items belong to seller A",
    allItemsBelongToSellerA,
  );
  // Verify no seller B items are in the response
  const hasSellerBItems = ownShipmentItems.data.some((item) =>
    sellerBItems.some((sBItem) => sBItem.id === item.id),
  );
  TestValidator.predicate(
    "no seller B items in seller A's shipment response",
    !hasSellerBItems,
  );
}
