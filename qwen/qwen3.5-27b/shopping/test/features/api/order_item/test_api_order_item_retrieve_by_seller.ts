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
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_item_retrieve_by_seller(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a seller can retrieve detailed order item information.
   * Workflow: Seller registers → Customer registers → Customer creates order → Seller retrieves order item
   */
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Customer creates an order (generates order items)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order has at least one item
  TestValidator.predicate(
    "order must have at least one item",
    order.orderItems.length > 0,
  );
  // Get the first order item for testing
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Seller retrieves the order item by ID
  const retrievedItem =
    await api.functional.shoppingMall.seller.orders.items.at(sellerConnection, {
      itemId: orderItem.id,
    });
  typia.assert(retrievedItem);
  // 5. Validate order item structure and snapshots
  TestValidator.equals("order item ID matches", retrievedItem.id, orderItem.id);
  TestValidator.equals(
    "order ID matches parent order",
    retrievedItem.orderId,
    order.id,
  );
  TestValidator.equals(
    "seller ID matches authenticated seller",
    retrievedItem.sellerId,
    sellerAuth.id,
  );
  // 6. Validate quantity and price are positive
  TestValidator.predicate("quantity is positive", retrievedItem.quantity > 0);
  TestValidator.predicate("price is positive", retrievedItem.price > 0);
  // 7. Validate status is a valid fulfillment state
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  TestValidator.predicate(
    "status is valid",
    validStatuses.includes(retrievedItem.status),
  );
  // 8. Validate snapshots are present (JSON strings)
  TestValidator.predicate(
    "product snapshot exists",
    retrievedItem.productSnapshot !== null &&
      retrievedItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "variant snapshot exists",
    retrievedItem.variantSnapshot !== null &&
      retrievedItem.variantSnapshot !== undefined,
  );
  TestValidator.predicate(
    "seller profile snapshot exists",
    retrievedItem.sellerProfileSnapshot !== null &&
      retrievedItem.sellerProfileSnapshot !== undefined,
  );
  // 9. Validate parent order summary is included
  TestValidator.equals(
    "parent order ID matches",
    retrievedItem.order.id,
    order.id,
  );
  TestValidator.equals(
    "parent order status matches",
    retrievedItem.order.status,
    order.status,
  );
  // 10. Validate seller summary is included
  TestValidator.equals(
    "seller ID in summary matches",
    retrievedItem.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller shop name matches",
    retrievedItem.seller.shop_name,
    sellerAuth.shop_name,
  );
  // 11. Validate timestamps are present
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedItem.createdAt !== null &&
      retrievedItem.createdAt !== undefined &&
      retrievedItem.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedItem.updatedAt !== null &&
      retrievedItem.updatedAt !== undefined &&
      retrievedItem.updatedAt.length > 0,
  );
  // 12. Validate shipments array exists (may be empty if not shipped yet)
  TestValidator.predicate(
    "shipments array exists",
    Array.isArray(retrievedItem.shipments),
  );
}
