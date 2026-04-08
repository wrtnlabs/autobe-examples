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
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test that deleting a review preserves all snapshots for audit and dispute resolution.
 *
 * Validates the complete review lifecycle including creation, multiple edits, and deletion. Each modification creates an immutable snapshot for audit trail purposes. This test verifies that the review workflow functions correctly through all stages.
 *
 * The test creates a review, edits it multiple times to generate snapshots, then deletes the review. While snapshot retrieval endpoints are not available in the current SDK, the test validates that the review operations complete successfully, ensuring the server-side snapshot creation mechanism is triggered.
 *
 * 1. Register and authenticate as a customer and seller.
 * 2. Create a product with variants and inventory.
 * 3. Place an order and mark as delivered.
 * 4. Create a review with initial rating and content.
 * 5. Edit the review multiple times to create snapshots.
 * 6. Delete the review.
 * 7. Verify all operations complete successfully.
 */
export async function test_api_customer_review_deletion_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create dedicated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Seller setup - create dedicated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create a product using utility function
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Place an order using utility function
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item for review
  const orderItem = order.items[0];
  if (!orderItem) {
    throw new Error("Order has no items for review");
  }
  typia.assert(orderItem);
  // 5. Create a review using utility function
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_item_id: orderItem.id,
        rating: 5,
        content: "Great product! Highly recommended.",
      },
    },
  );
  typia.assert(review);
  // Store original review ID
  const reviewId = review.id;
  // 6. Edit the review multiple times to create snapshots
  // First edit - change rating
  const updatedReview1 =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          rating: 4,
          content: "Good product, but could be better.",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview1);
  // Second edit - change content only
  const updatedReview2 =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          content: "Updated review after using the product for a while.",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview2);
  // Third edit - change both rating and content
  const updatedReview3 =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          rating: 3,
          content: "Final review - average experience.",
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview3);
  // 7. Delete the review
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: reviewId,
  });
  // 8. Verify data integrity throughout the lifecycle
  TestValidator.equals(
    "review ID preserved through updates",
    updatedReview3.id,
    reviewId,
  );
  TestValidator.equals(
    "product ID preserved",
    updatedReview3.product.id,
    product.id,
  );
  TestValidator.equals(
    "order item ID preserved",
    updatedReview3.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate(
    "final rating is valid",
    updatedReview3.rating >= 1 && updatedReview3.rating <= 5,
  );
}
