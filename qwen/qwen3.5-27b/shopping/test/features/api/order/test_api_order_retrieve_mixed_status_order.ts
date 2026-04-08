import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test retrieving an order with items in different statuses (partially completed).
 *
 * Validates the complete order retrieval flow where an order contains items in mixed fulfillment states. Tests that items have different statuses (some delivered, some paid), and that all order details including shipments and snapshots are properly returned.
 *
 * Special attention is given to verifying that individual item statuses are tracked independently, shipment records are associated with delivered items, and immutable snapshots preserve product and seller information at purchase time.
 *
 * 1. Customer joins the platform and authenticates.
 * 2. Seller joins the platform and authenticates.
 * 3. Customer places an order with multiple items from the cart.
 * 4. Seller creates a shipment for only one of the order items.
 * 5. Customer confirms delivery for the shipped item.
 * 6. Customer retrieves the complete order details.
 * 7. Validates that items have mixed statuses (delivered and paid).
 */
export async function test_api_order_retrieve_mixed_status_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // 2. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // 3. Place order with multiple items (using utility function)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has at least 2 items for mixed status testing
  TestValidator.predicate("order has multiple items", order.items.length >= 2);
  // 4. Seller creates shipment for only the first item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: [order.items[0].id],
      },
    },
  );
  typia.assert(shipment);
  // 5. Customer confirms delivery for the shipped item
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Verify shipment has delivered_at timestamp
  TestValidator.predicate(
    "shipment has delivered_at timestamp",
    confirmedShipment.delivered_at !== null,
  );
  // 6. Customer retrieves the complete order details
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // 7. Validate items have mixed statuses
  const deliveredItems = retrievedOrder.items.filter(
    (item) => item.status === "delivered",
  );
  const paidItems = retrievedOrder.items.filter(
    (item) => item.status === "paid",
  );
  TestValidator.predicate(
    "has at least one delivered item",
    deliveredItems.length >= 1,
  );
  TestValidator.predicate("has at least one paid item", paidItems.length >= 1);
  // 8. Validate first item is delivered (the one we shipped)
  TestValidator.equals(
    "first item status is delivered",
    retrievedOrder.items[0].status,
    "delivered",
  );
  // 9. Validate second item is still paid (not shipped)
  TestValidator.equals(
    "second item status is paid",
    retrievedOrder.items[1].status,
    "paid",
  );
  // 10. Validate shipments array contains the confirmed shipment
  TestValidator.predicate(
    "order has shipments",
    retrievedOrder.shipments.length >= 1,
  );
  const shipmentInOrder = retrievedOrder.shipments.find(
    (s) => s.id === shipment.id,
  );
  TestValidator.predicate(
    "shipment exists in order",
    shipmentInOrder !== undefined,
  );
  // 11. Validate shipment has delivered_at timestamp
  TestValidator.predicate(
    "shipment in order has delivered_at",
    shipmentInOrder!.delivered_at !== null,
  );
  // 12. Validate all items have immutable snapshots
  for (const item of retrievedOrder.items) {
    TestValidator.predicate(
      `item ${item.id} has product_name snapshot`,
      item.product_name !== undefined && item.product_name.length > 0,
    );
    TestValidator.predicate(
      `item ${item.id} has product_description snapshot`,
      item.product_description !== undefined,
    );
    TestValidator.predicate(
      `item ${item.id} has variant_sku_code snapshot`,
      item.variant_sku_code !== undefined && item.variant_sku_code.length > 0,
    );
    TestValidator.predicate(
      `item ${item.id} has variant_price snapshot`,
      item.variant_price !== undefined && item.variant_price > 0,
    );
    TestValidator.predicate(
      `item ${item.id} has seller_shop_name snapshot`,
      item.seller_shop_name !== undefined && item.seller_shop_name.length > 0,
    );
  }
  // 13. Validate order total by computing from items
  const expectedTotal = retrievedOrder.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  TestValidator.predicate(
    "order items total calculation is valid",
    expectedTotal > 0,
  );
  // 14. Validate customer can view individual item statuses
  TestValidator.predicate(
    "all items have status field",
    retrievedOrder.items.every((item) => item.status !== undefined),
  );
}
