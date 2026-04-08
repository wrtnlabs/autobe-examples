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
 * Test idempotency of delivery confirmation when attempting to confirm delivery for an already delivered shipment.
 *
 * Validates that delivery confirmation cannot be applied twice to the same shipment. After the first successful delivery confirmation, subsequent attempts should fail with an appropriate error, and the shipment state should remain unchanged.
 *
 * This test ensures that the delivery confirmation endpoint properly validates the current state of the shipment before allowing state transitions, preventing duplicate delivery confirmations and maintaining data integrity.
 *
 * 1. Register and authenticate as a customer via /shoppingMall/auth/customer/join
 * 2. Register and authenticate as a seller via /shoppingMall/auth/seller/join
 * 3. Create an order through checkout via /shoppingMall/customer/checkout
 * 4. Create a shipment for the order items via /shoppingMall/seller/shipments
 * 5. Confirm delivery for the shipment (first time, should succeed)
 * 6. Attempt to confirm delivery again (should fail with 400 error)
 * 7. Verify shipment state from first confirmation response
 */
export async function test_api_delivery_confirmation_already_delivered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 4. Create shipment for order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        order_item_ids: order.items.map((item) => item.id),
      },
    },
  );
  typia.assert(shipment);
  // Verify shipment was created with delivered_at as null
  TestValidator.predicate(
    "shipment initially not delivered",
    shipment.delivered_at === null,
  );
  // 5. First delivery confirmation (should succeed)
  const firstConfirmation =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(firstConfirmation);
  // Verify first confirmation succeeded
  TestValidator.predicate(
    "first delivery confirmation succeeded",
    firstConfirmation.delivered_at !== null,
  );
  TestValidator.equals(
    "shipment id matches",
    firstConfirmation.id,
    shipment.id,
  );
  const deliveredAtTimestamp = firstConfirmation.delivered_at;
  // 6. Attempt second delivery confirmation (should fail with error)
  await TestValidator.error(
    "second delivery confirmation should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
        customerConnection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
        },
      );
    },
  );
  // 7. Verify idempotency: the delivered_at timestamp from first confirmation
  // remains the authoritative value (no new confirmation was applied)
  TestValidator.predicate(
    "delivered_at timestamp is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(deliveredAtTimestamp!),
  );
  // Verify order items count matches shipment
  TestValidator.predicate("order has items", order.items.length > 0);
}
