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
 * Test edge case where customer attempts to confirm delivery for a shipment that is already delivered.
 *
 * This test validates that the system properly prevents duplicate delivery confirmations
 * by enforcing the business rule that a shipment can only be confirmed once.
 */
export async function test_api_shipment_delivery_confirmation_already_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create shipping address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Add product variant to cart (utility handles variant ID generation)
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Create order with the address and cart items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Validate order has items in paid status
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  const orderItemId = orderItem.id;
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 5. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 6. Seller creates shipment with tracking information
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: [orderItemId],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Validate shipment was created successfully
  TestValidator.equals(
    "shipment tracking carrier",
    shipment.tracking_carrier,
    "FedEx",
  );
  TestValidator.predicate(
    "shipment not yet confirmed",
    shipment.confirmed_at === null,
  );
  TestValidator.predicate(
    "shipment has items",
    shipment.shipmentItems.length > 0,
  );
  // 7. Customer confirms delivery (first confirmation - should succeed)
  const firstConfirmation =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(firstConfirmation);
  // Validate first confirmation succeeded
  TestValidator.predicate(
    "first confirmation has confirmed_at",
    firstConfirmation.confirmed_at !== null,
  );
  const firstConfirmedAt = firstConfirmation.confirmed_at;
  TestValidator.predicate(
    "first confirmation has shipment items",
    firstConfirmation.shipmentItems.length > 0,
  );
  // Validate all shipment items are now delivered
  TestValidator.predicate(
    "all shipment items delivered after first confirmation",
    firstConfirmation.shipmentItems.every(
      (item) => item.orderItem.status === "delivered",
    ),
  );
  // 8. Customer attempts to confirm delivery again (should fail)
  await TestValidator.error("duplicate delivery confirmation", async () => {
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  });
  // 9. Validate first confirmation response data is still valid
  // Since we've already validated confirmed_at !== null, we can safely parse it
  TestValidator.predicate(
    "confirmed_at timestamp is valid ISO date",
    firstConfirmedAt !== null && !isNaN(Date.parse(firstConfirmedAt)),
  );
  // Validate shipment structure from first confirmation
  TestValidator.equals(
    "shipment ID matches",
    firstConfirmation.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking carrier unchanged",
    firstConfirmation.tracking_carrier,
    shipment.tracking_carrier,
  );
  TestValidator.equals(
    "tracking number unchanged",
    firstConfirmation.tracking_number,
    shipment.tracking_number,
  );
}
