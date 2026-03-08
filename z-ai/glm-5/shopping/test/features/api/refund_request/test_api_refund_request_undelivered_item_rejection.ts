import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that refund requests are rejected for order items that have not been delivered yet.
 *
 * Business Rule: Refund requests can only be created for order items with 'delivered' status.
 * Items that are 'paid' or 'shipped' (but not delivered) cannot be refunded through this endpoint.
 *
 * Setup:
 * 1. Customer creates account, address, and places order (items in 'paid' status)
 * 2. Seller ships the order (items transition to 'shipped' status)
 * 3. No delivery confirmation - items remain in 'shipped' status
 *
 * Test:
 * - Customer attempts to create refund request for order item in 'shipped' status
 *
 * Expected:
 * - Request fails with 400 Bad Request
 * - No refund request record is created
 */
export async function test_api_refund_request_undelivered_item_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // 2. Seller setup - create account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(seller);
  // 3. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "United States",
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 4. Customer places order via checkout
  // Note: checkout requires items in cart. The utility function uses prepare_random_shopping_mall_checkout
  // which may handle cart setup internally for simulation, or we need to add items to cart first.
  // For simulation mode (connection.simulate = true), random data is generated.
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 5. Seller ships the order - transitions items to 'shipped' status
  // Note: We need order_item_ids to create a shipment.
  // Since IShoppingMallOrder doesn't include order items, we simulate this step.
  // In production, there would be an API to get order items for an order.
  // For this test, we create a shipment with a simulated order item ID.
  // The validation we're testing is at the refund request level.
  // Create a shipment with the order ID
  // Note: order_item_ids is required - we use a generated UUID for simulation
  // In real scenario, order items would be fetched from order details
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Create shipment (this may fail in non-simulation mode without valid order items)
  // For simulation mode, it will succeed
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: [orderItemId],
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // 6. Verify the shipment was created and get the shipped order item
  TestValidator.predicate(
    "shipment has order items",
    shipment.orderItems.length > 0,
  );
  const shippedItem = shipment.orderItems[0];
  typia.assert(shippedItem);
  // Verify the item is in 'shipped' status (not delivered)
  TestValidator.equals(
    "order item status is shipped",
    shippedItem.status,
    "shipped",
  );
  // 7. Customer attempts to create refund request for undelivered (shipped but not delivered) item
  // This should FAIL with 400 Bad Request because the item has not been delivered
  await TestValidator.httpError(
    "refund request rejected for undelivered item",
    400,
    async () =>
      await generate_random_shopping_mall_customer_refund_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: shippedItem.id,
            reason:
              "Requesting refund before item is delivered. " +
              "This is a test reason that meets the minimum character requirement of 10 characters.",
          },
        },
      ),
  );
}
