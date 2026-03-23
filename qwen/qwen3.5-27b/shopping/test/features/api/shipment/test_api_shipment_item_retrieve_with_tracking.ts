import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a customer can retrieve detailed information about an order item within a shipment, including tracking information.
 *
 * This test validates the complete shipment item retrieval workflow:
 * 1. Customer registration and authentication
 * 2. Order creation with order items
 * 3. Seller registration and authentication
 * 4. Shipment creation with tracking information
 * 5. Customer retrieval of shipment item details with tracking data
 */
export async function test_api_shipment_item_retrieve_with_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  // 2. Create an order (generates order items in 'paid' status)
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Extract the first order item for shipment
  const orderItem = order.orderItems[0];
  TestValidator.predicate(
    "order has at least one item",
    orderItem !== undefined,
  );
  // 3. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // 4. Create a shipment with tracking information
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string & tags.MinLength<5>>(),
        },
      },
    );
  typia.assert(shipment);
  // Verify shipment contains the order item
  TestValidator.equals(
    "shipment contains order item",
    shipment.orderItems.length,
    1,
  );
  TestValidator.equals(
    "shipment order item matches",
    shipment.orderItems[0].id,
    orderItem.id,
  );
  // 5. Customer retrieves shipment item details with tracking
  const retrievedItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shipments.items.at(
      customerConnection,
      {
        shipmentId: shipment.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 6. Validate order item details
  TestValidator.equals("item id matches", retrievedItem.id, orderItem.id);
  TestValidator.equals("order id matches", retrievedItem.orderId, order.id);
  TestValidator.equals(
    "seller id matches",
    retrievedItem.sellerId,
    orderItem.sellerId,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals("price matches", retrievedItem.price, orderItem.price);
  // Verify status changed to 'shipped' after shipment creation
  TestValidator.equals(
    "item status is shipped",
    retrievedItem.status,
    "shipped",
  );
  // Verify snapshots are preserved (non-empty JSON strings)
  TestValidator.predicate(
    "product snapshot exists",
    retrievedItem.productSnapshot.length > 0,
  );
  TestValidator.predicate(
    "variant snapshot exists",
    retrievedItem.variantSnapshot.length > 0,
  );
  TestValidator.predicate(
    "seller profile snapshot exists",
    retrievedItem.sellerProfileSnapshot.length > 0,
  );
  // Verify timestamps exist
  TestValidator.predicate(
    "created at exists",
    retrievedItem.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at exists",
    retrievedItem.updatedAt.length > 0,
  );
  // Verify shipment tracking information is included
  TestValidator.predicate(
    "shipment exists in response",
    retrievedItem.shipments.length > 0,
  );
  const shipmentInResponse = retrievedItem.shipments[0];
  TestValidator.equals(
    "shipment id matches",
    shipmentInResponse.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking carrier matches",
    shipmentInResponse.tracking_carrier,
    shipment.tracking_carrier,
  );
  TestValidator.equals(
    "tracking number matches",
    shipmentInResponse.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "shipped at exists",
    shipmentInResponse.shipped_at.length > 0,
  );
  TestValidator.equals(
    "delivered at is null",
    shipmentInResponse.delivered_at,
    null,
  );
  TestValidator.equals(
    "delivery confirmed is false",
    shipmentInResponse.delivery_confirmed,
    false,
  );
}
