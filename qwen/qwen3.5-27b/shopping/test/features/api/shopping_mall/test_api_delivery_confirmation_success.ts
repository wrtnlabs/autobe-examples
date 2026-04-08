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
 * Test successful delivery confirmation workflow for a shipment containing order items.
 *
 * Validates the complete delivery confirmation flow where a customer confirms receipt of a shipment, triggering status transitions from 'shipped' to 'delivered' for all included order items. The test ensures that the delivery confirmation timestamp is properly recorded and that the order status is updated accordingly.
 *
 * Special attention is given to verifying that the customer owns the order, the shipment was not already delivered, and all order items in the shipment successfully transition to delivered status.
 *
 * 1. Customer registers and authenticates via /shoppingMall/auth/customer/join
 * 2. Seller registers and authenticates via /shoppingMall/auth/seller/join
 * 3. Customer creates an order through checkout via /shoppingMall/customer/checkout
 * 4. Seller creates a shipment for the order items via /shoppingMall/seller/shipments, transitioning items from 'paid' to 'shipped'
 * 5. Customer confirms delivery via /shoppingMall/customer/orders/{orderId}/shipments/{shipmentId}/delivered
 * 6. Validates shipment.delivered_at is set and shipment response contains updated order summary
 */
export async function test_api_delivery_confirmation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Customer creates an order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has at least one item
  TestValidator.predicate("order has items", order.items.length > 0);
  // Get the first order item to create shipment
  const orderItemId = order.items[0].id;
  const orderId = order.id;
  // 4. Seller creates a shipment for the order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: RandomGenerator.name(),
        tracking_number: RandomGenerator.alphaNumeric(20),
        order_item_ids: [orderItemId],
        order_id: orderId,
      },
    },
  );
  typia.assert(shipment);
  // Verify shipment was created successfully
  TestValidator.equals("shipment belongs to order", shipment.order.id, orderId);
  TestValidator.predicate(
    "shipment not yet delivered",
    shipment.delivered_at === null,
  );
  // 5. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: orderId,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 6. Validate delivery confirmation results
  TestValidator.predicate(
    "shipment delivered_at is set",
    confirmedShipment.delivered_at !== null,
  );
  TestValidator.equals(
    "shipment ID matches",
    confirmedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment order matches",
    confirmedShipment.order.id,
    orderId,
  );
  TestValidator.predicate(
    "shipment carrier name preserved",
    confirmedShipment.carrier_name === shipment.carrier_name,
  );
  TestValidator.predicate(
    "shipment tracking number preserved",
    confirmedShipment.tracking_number === shipment.tracking_number,
  );
  TestValidator.predicate(
    "order status reflects delivery",
    confirmedShipment.order.status === "delivered" ||
      confirmedShipment.order.status === "partially_completed",
  );
}
