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
 * Test that a seller can retrieve detailed information about a specific order item within their shipment.
 *
 * This test validates the complete workflow:
 * 1. Seller registration and authentication
 * 2. Customer registration and authentication
 * 3. Customer order creation (generates order items)
 * 4. Seller shipment creation (updates order item status to 'shipped')
 * 5. Seller retrieval of specific order item from shipment
 * 6. Validation of order item data including snapshots and tracking information
 */
export async function test_api_shipment_item_retrieve_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Customer creates an order (generates order items)
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order was created successfully with items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get the first order item to include in shipment
  const orderItem = order.orderItems[0];
  // 4. Seller creates a shipment including the order item
  const shipment: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string>(),
        },
      },
    );
  typia.assert(shipment);
  // Validate shipment was created successfully
  TestValidator.equals("shipment has one item", shipment.orderItems.length, 1);
  TestValidator.equals(
    "shipment contains correct order item",
    shipment.orderItems[0].id,
    orderItem.id,
  );
  // 5. Seller retrieves the specific order item from the shipment
  const retrievedItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.shipments.items.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 6. Validate the retrieved order item data
  TestValidator.equals("item ID matches", retrievedItem.id, orderItem.id);
  TestValidator.equals("order ID matches", retrievedItem.orderId, order.id);
  TestValidator.equals(
    "quantity preserved",
    retrievedItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals("price preserved", retrievedItem.price, orderItem.price);
  // Verify status is 'shipped' after shipment creation
  TestValidator.equals("status is shipped", retrievedItem.status, "shipped");
  // Verify snapshots are present (typia.assert already validates they are non-empty strings)
  TestValidator.equals(
    "product snapshot matches",
    retrievedItem.productSnapshot,
    orderItem.productSnapshot,
  );
  TestValidator.equals(
    "variant snapshot matches",
    retrievedItem.variantSnapshot,
    orderItem.variantSnapshot,
  );
  TestValidator.equals(
    "seller snapshot matches",
    retrievedItem.sellerProfileSnapshot,
    orderItem.sellerProfileSnapshot,
  );
  // Verify shipments array contains tracking information
  TestValidator.predicate(
    "has shipment info",
    retrievedItem.shipments.length > 0,
  );
  TestValidator.equals(
    "shipment tracking carrier",
    retrievedItem.shipments[0].tracking_carrier,
    "FedEx",
  );
  TestValidator.equals(
    "shipment tracking number",
    retrievedItem.shipments[0].tracking_number,
    shipment.tracking_number,
  );
  // Verify deletedAt is null (active order item)
  TestValidator.equals("not deleted", retrievedItem.deletedAt, null);
}
