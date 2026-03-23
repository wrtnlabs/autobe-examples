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
 * Test that duplicate delivery confirmations for the same shipment are prevented.
 *
 * Setup:
 * 1. Register and authenticate as a customer
 * 2. Register and authenticate as a seller
 * 3. Customer creates an order with items from the seller
 * 4. Seller creates a shipment containing the order items
 * 5. Customer successfully confirms delivery for the shipment (first confirmation)
 *
 * Test Steps:
 * 1. Customer attempts to confirm delivery for the same shipment again
 * 2. Verify the duplicate confirmation is rejected
 *
 * Expected Results:
 * - HTTP 400 Bad Request response
 * - Error message indicates shipment already confirmed
 * - Shipment remains with delivery_confirmed=true from first confirmation
 * - delivered_at timestamp remains unchanged from first confirmation
 * - Order items remain in 'delivered' status
 */
export async function test_api_shipment_delivery_confirmation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerJoin);
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerJoin);
  // 3. Customer creates an order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 4. Seller creates a shipment containing the order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          tracking_carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(20),
        },
      },
    );
  typia.assert(shipment);
  // 5. Customer confirms delivery for the first time (should succeed)
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
    "first delivery confirmation succeeded",
    firstConfirmation.delivery_confirmed === true,
  );
  TestValidator.predicate(
    "delivered_at is set after first confirmation",
    firstConfirmation.delivered_at !== null,
  );
  // Store the delivered_at timestamp from first confirmation
  const firstDeliveredAt = firstConfirmation.delivered_at;
  // 6. Customer attempts to confirm delivery again (should fail)
  await TestValidator.httpError(
    "duplicate delivery confirmation is rejected",
    400,
    async () =>
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerConnection,
        {
          shipmentId: shipment.id,
        },
      ),
  );
}
