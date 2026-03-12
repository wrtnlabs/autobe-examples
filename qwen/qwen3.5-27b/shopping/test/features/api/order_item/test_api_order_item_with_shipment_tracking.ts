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
 * Test that order item retrieval includes complete shipment tracking information when the item has been shipped.
 *
 * This test validates the complete order fulfillment workflow:
 * 1. Customer registration and authentication
 * 2. Seller registration and authentication
 * 3. Product variant added to cart
 * 4. Order creation from cart
 * 5. Shipment creation by seller with tracking information
 * 6. Order item retrieval with shipment tracking data
 *
 * The test verifies that when an order item is retrieved after shipment creation,
 * the response includes complete shipment tracking information including carrier
 * name, tracking number, shipment timestamp, and delivery status.
 */
export async function test_api_order_item_with_shipment_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Customer creates order from cart
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract first order item for shipment
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 5. Seller creates shipment for the order item with tracking information
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string>(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 6. Customer retrieves order item with shipment tracking information
  const retrievedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedOrderItem);
  // 7. Validate shipment tracking information is present
  TestValidator.predicate(
    "order item has shipments array",
    Array.isArray(retrievedOrderItem.shipments) &&
      retrievedOrderItem.shipments.length > 0,
  );
  const shipmentData = retrievedOrderItem.shipments[0];
  typia.assert(shipmentData);
  // Validate shipment contains tracking carrier
  TestValidator.equals(
    "tracking carrier matches",
    shipmentData.tracking_carrier,
    "FedEx",
  );
  // Validate tracking number is present
  TestValidator.predicate(
    "tracking number exists",
    shipmentData.tracking_number !== null &&
      shipmentData.tracking_number !== undefined &&
      shipmentData.tracking_number.length > 0,
  );
  // Validate shipment timestamp exists
  TestValidator.predicate(
    "shipped_at timestamp exists",
    shipmentData.shipped_at !== null &&
      shipmentData.shipped_at !== undefined &&
      shipmentData.shipped_at.length > 0,
  );
  // Validate delivered_at is null (not yet delivered)
  TestValidator.equals("delivered_at is null", shipmentData.delivered_at, null);
  // Validate delivery_confirmed is false
  TestValidator.equals(
    "delivery_confirmed is false",
    shipmentData.delivery_confirmed,
    false,
  );
  // Validate item_count is at least 1
  TestValidator.predicate(
    "item_count is positive",
    shipmentData.item_count >= 1,
  );
  // Validate seller information is present
  TestValidator.predicate(
    "seller information exists",
    shipmentData.seller !== null &&
      shipmentData.seller !== undefined &&
      shipmentData.seller.shop_name !== null &&
      shipmentData.seller.shop_name !== undefined,
  );
  // Validate order item status is 'shipped'
  TestValidator.equals(
    "order item status is shipped",
    retrievedOrderItem.status,
    "shipped",
  );
  // Validate product snapshot is present
  TestValidator.predicate(
    "product_snapshot exists",
    retrievedOrderItem.productSnapshot !== null &&
      retrievedOrderItem.productSnapshot !== undefined &&
      retrievedOrderItem.productSnapshot.length > 0,
  );
  // Validate variant snapshot is present
  TestValidator.predicate(
    "variant_snapshot exists",
    retrievedOrderItem.variantSnapshot !== null &&
      retrievedOrderItem.variantSnapshot !== undefined &&
      retrievedOrderItem.variantSnapshot.length > 0,
  );
  // Validate seller profile snapshot is present
  TestValidator.predicate(
    "seller_profile_snapshot exists",
    retrievedOrderItem.sellerProfileSnapshot !== null &&
      retrievedOrderItem.sellerProfileSnapshot !== undefined &&
      retrievedOrderItem.sellerProfileSnapshot.length > 0,
  );
}
