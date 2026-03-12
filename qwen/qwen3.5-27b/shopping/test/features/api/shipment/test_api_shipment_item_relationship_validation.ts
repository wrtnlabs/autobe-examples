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

export async function test_api_shipment_item_relationship_validation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the endpoint validates the shipment-item relationship and returns accurate data
   * when an order item is part of a multi-item shipment.
   *
   * Setup:
   * 1. Register and authenticate as a seller
   * 2. Register and authenticate as a customer
   * 3. Customer creates an order with multiple items from the same seller
   * 4. Seller creates a shipment bundling multiple order items together
   * 5. Seller retrieves one specific order item from the multi-item shipment
   *
   * Validation:
   * - Verify the response contains the correct order item (matching the itemId path parameter)
   * - Verify the order item's shipments array includes the shipment referenced by shipmentId
   * - Verify the shipment in the response has the correct tracking_carrier and tracking_number
   * - Verify the order item status is 'shipped'
   * - Verify all other order items in the same shipment are NOT returned (only the requested item)
   * - Verify the junction table relationship is correctly queried
   * - Verify the productSnapshot and variantSnapshot are preserved
   */
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "12345678",
      shop_name: RandomGenerator.name(),
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
    },
  });
  const sellerId = sellerAuth.id;
  // 2. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: "https://example.com/customer/join",
      referrer: "https://example.com",
    },
  });
  // 3. Customer creates an order with multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order has multiple items
  TestValidator.predicate(
    "order has multiple items",
    order.orderItems.length >= 2,
  );
  // 4. Seller creates a shipment with multiple order items
  const shipmentItemIds = order.orderItems
    .filter((item) => item.sellerId === sellerId)
    .map((item) => item.id);
  if (shipmentItemIds.length < 2) {
    throw new Error(
      "Not enough order items from the same seller to create multi-item shipment",
    );
  }
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: shipmentItemIds,
          tracking_carrier: "FedEx",
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(shipment);
  // Validate shipment contains multiple items
  TestValidator.equals(
    "shipment item count",
    shipment.orderItems.length,
    shipmentItemIds.length,
  );
  // 5. Retrieve one specific order item from the multi-item shipment
  const targetItemId = shipment.orderItems[0].id;
  const retrievedItem =
    await api.functional.shoppingMall.seller.shipments.items.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
        itemId: targetItemId,
      },
    );
  typia.assert(retrievedItem);
  // Validation: Verify the response contains the correct order item
  TestValidator.equals("item ID matches", retrievedItem.id, targetItemId);
  // Validation: Verify the order item's shipments array includes the shipment
  const shipmentInResponse = retrievedItem.shipments.find(
    (s) => s.id === shipment.id,
  );
  TestValidator.predicate(
    "shipment exists in items shipments array",
    shipmentInResponse != null,
  );
  // Validation: Verify the shipment has correct tracking information
  typia.assertGuard(shipmentInResponse!);
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
  // Validation: Verify the order item status is 'shipped'
  TestValidator.equals(
    "order item status is shipped",
    retrievedItem.status,
    "shipped",
  );
  // Validation: Verify productSnapshot and variantSnapshot are preserved
  TestValidator.predicate(
    "productSnapshot exists",
    retrievedItem.productSnapshot.length > 0,
  );
  TestValidator.predicate(
    "variantSnapshot exists",
    retrievedItem.variantSnapshot.length > 0,
  );
  // Validation: Verify the order item belongs to the correct order
  TestValidator.equals("order ID matches", retrievedItem.orderId, order.id);
  // Validation: Verify seller information is correct
  TestValidator.equals("seller ID matches", retrievedItem.sellerId, sellerId);
}
