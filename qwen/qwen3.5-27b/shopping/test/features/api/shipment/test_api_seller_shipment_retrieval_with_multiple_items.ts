import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that an authenticated seller can retrieve detailed information for a shipment they created containing multiple order items from the same order.
 *
 * This test validates:
 * 1. Seller authentication and setup
 * 2. Customer registration and order creation with multiple items
 * 3. Shipment creation bundling multiple order items
 * 4. Shipment retrieval with complete details including order items
 * 5. Verification that all order items show 'shipped' status
 * 6. Tracking information accessibility
 */
export async function test_api_seller_shipment_retrieval_with_multiple_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Customer adds seller's products to cart (multiple items)
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 4. Customer creates order from cart containing multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order contains multiple items
  TestValidator.predicate(
    "order contains multiple items",
    order.orderItems.length >= 2,
  );
  // Get order items belonging to the seller
  const sellerOrderItems = order.orderItems.filter(
    (item) => item.sellerId === sellerAuth.id,
  );
  TestValidator.predicate(
    "seller has order items in this order",
    sellerOrderItems.length >= 2,
  );
  // 5. Seller creates shipment bundling multiple order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: sellerOrderItems.slice(0, 2).map((item) => item.id),
          tracking_carrier: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // 6. Seller retrieves shipment details
  const retrievedShipment =
    await api.functional.shoppingMall.seller.shipments.at(sellerConnection, {
      shipmentId: shipment.id,
    });
  typia.assert(retrievedShipment);
  // 7. Verify shipment details
  TestValidator.equals(
    "shipment id matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking carrier matches",
    retrievedShipment.tracking_carrier,
    shipment.tracking_carrier,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "shipped_at is present",
    retrievedShipment.shipped_at !== undefined,
  );
  TestValidator.equals(
    "delivered_at is null initially",
    retrievedShipment.delivered_at,
    null,
  );
  TestValidator.equals(
    "delivery_confirmed is false initially",
    retrievedShipment.delivery_confirmed,
    false,
  );
  // 8. Verify seller information matches
  TestValidator.equals(
    "seller id matches",
    retrievedShipment.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedShipment.seller.email,
    sellerAuth.email,
  );
  // 9. Verify order items in shipment
  TestValidator.equals(
    "order items count matches",
    retrievedShipment.orderItems.length,
    2,
  );
  // 10. Verify all order items have 'shipped' status
  for (const orderItem of retrievedShipment.orderItems) {
    TestValidator.equals(
      `order item ${orderItem.id} status is shipped`,
      orderItem.status,
      "shipped",
    );
    TestValidator.predicate(
      `order item ${orderItem.id} has valid quantity`,
      orderItem.quantity > 0,
    );
    TestValidator.predicate(
      `order item ${orderItem.id} has valid price`,
      orderItem.price > 0,
    );
    TestValidator.predicate(
      `order item ${orderItem.id} has product snapshot`,
      orderItem.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      `order item ${orderItem.id} has variant snapshot`,
      orderItem.variantSnapshot !== undefined,
    );
    TestValidator.predicate(
      `order item ${orderItem.id} has seller profile snapshot`,
      orderItem.sellerProfileSnapshot !== undefined,
    );
    TestValidator.equals(
      `order item ${orderItem.id} belongs to correct order`,
      orderItem.orderId,
      order.id,
    );
    TestValidator.equals(
      `order item ${orderItem.id} belongs to correct seller`,
      orderItem.sellerId,
      sellerAuth.id,
    );
  }
  // 11. Verify tracking information is accessible
  TestValidator.predicate(
    "tracking carrier is not empty",
    retrievedShipment.tracking_carrier.length > 0,
  );
  TestValidator.predicate(
    "tracking number is not empty",
    retrievedShipment.tracking_number.length > 0,
  );
}
