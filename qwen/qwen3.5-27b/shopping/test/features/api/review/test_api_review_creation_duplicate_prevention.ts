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
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that duplicate review creation is prevented for the same order item.
 *
 * Validates the unique constraint that each customer can only write one review per order item. After a customer has written a review for a delivered order item, any subsequent attempt to create another review for the same order item should be rejected with a 409 Conflict response.
 *
 * This test ensures that the platform enforces the business rule of one review per verified purchase, preventing spam or manipulation of review systems. The test covers the complete flow from product creation through order fulfillment to review creation and duplicate prevention.
 *
 * 1. Customer and seller accounts are registered and authenticated.
 * 2. Seller creates a product for testing.
 * 3. Customer completes checkout to create an order with the product.
 * 4. Seller creates a shipment for the order item.
 * 5. Customer confirms delivery to make the order item eligible for review.
 * 6. First review is created successfully for the delivered order item.
 * 7. Second review attempt with same order item ID is expected to fail with 409 Conflict.
 */
export async function test_api_review_creation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
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
  // 2. Register and authenticate as seller
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
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer completes checkout (requires cart setup - using utility)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item for testing
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 5. Seller creates shipment for the order item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "Test Carrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: [orderItem.id],
        order_id: order.id,
      },
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 7. Create first review successfully
  const firstReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_item_id: orderItem.id,
          rating: 5,
          content: "First review - excellent product!",
        },
      },
    );
  typia.assert(firstReview);
  // 8. Attempt to create duplicate review - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate review creation rejected with 409",
    409,
    async () => {
      await api.functional.shoppingMall.customer.reviews.create(
        customerConnection,
        {
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_order_item_id: orderItem.id,
            rating: 3,
            content: "Attempting duplicate review",
          } satisfies IShoppingMallReview.ICreate,
        },
      );
    },
  );
  // 9. Verify original review still exists and unchanged
  TestValidator.equals(
    "original review rating unchanged",
    firstReview.rating,
    5,
  );
  TestValidator.equals(
    "original review content unchanged",
    firstReview.content,
    "First review - excellent product!",
  );
}
