import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller updating tracking information for an unconfirmed shipment.
 *
 * This test validates the core business workflow where a seller can update
 * tracking carrier and tracking number for a shipment before customer delivery
 * confirmation. The test creates a complete order flow from customer registration
 * through order placement, then has the seller create and update a shipment.
 *
 * Setup:
 * 1. Register and authenticate seller account
 * 2. Register and authenticate customer account
 * 3. Customer creates shipping address for order delivery
 * 4. Customer adds product variant to shopping cart
 * 5. Customer creates order (items have 'paid' status)
 * 6. Seller creates shipment with initial tracking info (FedEx, FX123456)
 *
 * Test:
 * - Seller updates shipment tracking to new carrier (UPS) and number (UP789012)
 *
 * Validation:
 * - tracking_carrier changed from 'FedEx' to 'UPS'
 * - tracking_number changed from 'FX123456' to 'UP789012'
 * - updated_at is newer than created_at
 * - All shipment items remain associated
 * - confirmed_at remains null (not yet delivered)
 */
export async function test_api_shipment_tracking_update_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Customer creates shipping address
  const address =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Customer adds product variant to cart (generation function handles product setup)
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Customer creates order with paid status
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item (should have 'paid' status)
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 6. Seller creates shipment with initial tracking info
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "FedEx",
        tracking_number: "FX123456",
        order_item_ids: [orderItem.id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Validate initial shipment state
  TestValidator.equals("initial carrier", shipment.tracking_carrier, "FedEx");
  TestValidator.equals(
    "initial tracking number",
    shipment.tracking_number,
    "FX123456",
  );
  TestValidator.predicate(
    "shipment not confirmed",
    shipment.confirmed_at === null,
  );
  TestValidator.predicate(
    "has shipment items",
    shipment.shipmentItems.length > 0,
  );
  const originalCreatedAt = shipment.created_at;
  const originalUpdatedAt = shipment.updated_at;
  // 7. Seller updates shipment tracking information
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          trackingCarrier: "UPS",
          trackingNumber: "UP789012",
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 8. Validate update results
  TestValidator.equals(
    "carrier updated to UPS",
    updatedShipment.tracking_carrier,
    "UPS",
  );
  TestValidator.equals(
    "tracking number updated",
    updatedShipment.tracking_number,
    "UP789012",
  );
  TestValidator.predicate(
    "updated_at is newer",
    updatedShipment.updated_at > originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedShipment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "still not confirmed",
    updatedShipment.confirmed_at === null,
  );
  TestValidator.equals(
    "shipment items preserved",
    updatedShipment.shipmentItems.length,
    shipment.shipmentItems.length,
  );
  // Verify shipment item still references the order item
  const shipmentItem = updatedShipment.shipmentItems[0];
  TestValidator.equals(
    "order item linked",
    shipmentItem.orderItem.id,
    orderItem.id,
  );
}