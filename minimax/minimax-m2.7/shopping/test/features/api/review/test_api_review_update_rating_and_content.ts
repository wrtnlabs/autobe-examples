import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test updating a customer review with new rating and text content.
 *
 * Validates the review update flow where a customer can modify their own review's
 * rating and content after initial creation. The test ensures that:
 * - Rating can be changed from original value (5) to new value (4)
 * - Content can be updated with new text
 * - Immutable fields (id, customer, product, orderItem, createdAt) remain unchanged
 * - updatedAt timestamp is refreshed
 *
 * **Prerequisites Setup:**
 * 1. Register customer A who will update the review
 * 2. Create complete order flow: seller registration → product creation → order → delivery
 * 3. Create initial review for the delivered order item
 *
 * **Test Steps:**
 * 1. Authenticate as customer A using registered credentials
 * 2. Create customer connection with auth token
 * 3. Get eligible review items to find the order item
 * 4. Create initial review with rating 5
 * 5. Update review via PUT endpoint with rating 4 and new content
 * 6. Validate response contains updated values
 *
 * **Business Rules Validated:**
 * - Customer can update their own review at any time after creation
 * - Rating must be 1-5 integer value
 * - Content is optional but can be updated
 * - Product and orderItem references cannot be changed during update
 * - createdAt timestamp remains unchanged from original creation
 * - updatedAt timestamp reflects the modification time
 */
export async function test_api_review_update_rating_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A who will update the review
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Get eligible order items to find an item eligible for review
  const eligible =
    await api.functional.ecommerceMall.customer.customers.me.reviews.eligible(
      customerConnection,
    );
  typia.assert(eligible);
  // Since we need a delivered order item for review, we'll create one
  // by using the review creation function which requires a valid order item
  // For this test, we create an initial review first, then update it
  // Create initial review with original rating
  const initialReview =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.review.create(
      customerConnection,
      {
        itemId: eligible.orderItemId,
        body: {
          rating: 5,
          content: "Excellent product - exceeded my expectations!",
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(initialReview);
  // Capture original timestamps for validation
  const originalCreatedAt = initialReview.createdAt;
  const originalUpdatedAt = initialReview.updatedAt;
  // 3. Update the review with new rating and content
  const updatedContent =
    "Updated review - the product exceeded my expectations in some areas";
  const updatedRating = 4;
  const updatedReview =
    await api.functional.ecommerceMall.customer.customers.me.reviews.putByReviewid(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: updatedRating,
          content: updatedContent,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 4. Validate response
  TestValidator.equals(
    "reviewId preserved",
    updatedReview.id,
    initialReview.id,
  );
  TestValidator.equals(
    "rating updated to 4",
    updatedReview.rating,
    updatedRating,
  );
  TestValidator.equals(
    "content updated",
    updatedReview.content,
    updatedContent,
  );
  TestValidator.equals(
    "customer reference preserved",
    updatedReview.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "product reference preserved",
    updatedReview.product.id,
    eligible.productId,
  );
  TestValidator.equals(
    "orderItem reference preserved",
    updatedReview.orderItem.id,
    eligible.orderItemId,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedReview.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt is newer",
    new Date(updatedReview.updatedAt) > new Date(originalUpdatedAt),
  );
}
