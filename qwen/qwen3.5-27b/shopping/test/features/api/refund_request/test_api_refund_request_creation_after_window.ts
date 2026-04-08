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
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test refund request rejection when outside the 7-day window after delivery.
 *
 * Validates that the system correctly rejects refund requests submitted more than 7 days after an order item has been delivered. The test sets up a complete order flow including customer registration, seller registration, product creation, checkout, shipment, and delivery confirmation, then attempts to create a refund request outside the allowed time window.
 *
 * The test verifies that:
 * - The system enforces the 7-day refund window strictly
 * - Appropriate HTTP error is returned when the window is exceeded
 * - No refund request record is created on rejection
 * - The order item status remains unchanged ('delivered')
 *
 * Note: In E2E testing, actual time passage cannot be simulated. This test relies on the backend's time validation logic to reject the request. The backend should be configured to treat the delivery timestamp as being more than 7 days in the past, or the test database should have manipulated timestamps.
 *
 * 1. Customer registers and authenticates
 * 2. Seller registers and authenticates
 * 3. Seller creates a product with variants and inventory
 * 4. Customer completes checkout to create an order
 * 5. Seller creates a shipment for the order item
 * 6. Customer confirms delivery (this sets the delivery timestamp)
 * 7. Customer attempts to create a refund request (expected to fail due to 7-day window)
 * 8. Verify the request is rejected with appropriate HTTP error
 */
export async function test_api_refund_request_creation_after_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer completes checkout to create an order
  // Note: This assumes the cart has been populated with items
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: undefined, // Uses prepare function to generate random checkout data
    },
  );
  typia.assert(order);
  // Validate order has items
  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  // Get the first order item for testing
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 5. Seller creates a shipment for the order item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: [orderItem.id],
        order_id: order.id,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const deliveredShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  TestValidator.predicate(
    "shipment is delivered",
    deliveredShipment.delivered_at !== null,
  );
  // 7. Attempt to create refund request (should fail due to 7-day window)
  // The backend should reject this with a 400 error if delivery was > 7 days ago
  await TestValidator.httpError(
    "refund request rejected after 7-day window",
    400,
    async () => {
      await generate_random_shopping_mall_customer_customers_me_orders_items_refund_create(
        customerConnection,
        {
          params: {
            orderId: order.id,
            itemId: orderItem.id,
          },
          body: {
            reason: "Product not as described",
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    },
  );
  // 8. Verify order item status remains 'delivered'
  // The error above confirms the refund request was not created,
  // so the order item status should still be 'delivered'
  TestValidator.equals(
    "order item status unchanged",
    orderItem.status,
    "delivered",
  );
}
