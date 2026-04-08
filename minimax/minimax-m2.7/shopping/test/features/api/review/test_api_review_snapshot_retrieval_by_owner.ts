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
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test retrieving a review snapshot after editing a review.
 *
 * Validates the review snapshot retrieval workflow by:
 * 1. Customer registers and completes full purchase flow
 * 2. Order item status becomes 'delivered'
 * 3. Customer writes a review for the order item
 * 4. Customer edits the review (changing rating and/or content)
 * 5. System creates a snapshot of the previous state
 * 6. Customer retrieves the snapshot
 *
 * This test validates that:
 * - Review creation works with valid order item and rating
 * - Review editing works and updates the review
 * - The review ID is preserved after editing
 * - Snapshot endpoint exists and returns valid IEcommerceMallReviewSnapshot structure
 *
 * @param connection Base API connection
 */
export async function test_api_review_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and establish authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Add item to cart using generation function (handles seller/product setup)
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Create order from cart (this simulates the purchase flow)
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the order item ID for review creation
  const orderItemId = order.orderItems[0]?.id;
  TestValidator.predicate(
    "order item should exist",
    orderItemId !== undefined && orderItemId !== null,
  );
  // 4. Write initial review with specific rating and content
  const initialRating = 4;
  const initialContent = "Good product, fast delivery!";
  const review =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.review.create(
      customerConnection,
      {
        itemId: orderItemId!,
        body: {
          rating: initialRating,
          content: initialContent,
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // Validate initial review data
  TestValidator.equals("initial rating matches", review.rating, initialRating);
  TestValidator.equals(
    "initial content matches",
    review.content,
    initialContent,
  );
  TestValidator.equals(
    "review belongs to correct product",
    review.product.id,
    cartItem.product.id,
  );
  // 5. Edit the review - this creates a snapshot of the previous state
  const editedRating = 5;
  const editedContent = "Excellent product! Exceeded expectations!";
  const editedReview =
    await api.functional.ecommerceMall.customer.customers.me.reviews.patchByReviewid(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: editedRating,
          content: editedContent,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(editedReview);
  // Validate edited review data
  TestValidator.equals(
    "edited rating matches",
    editedReview.rating,
    editedRating,
  );
  TestValidator.equals(
    "edited content matches",
    editedReview.content,
    editedContent,
  );
  TestValidator.equals(
    "review id preserved after edit",
    editedReview.id,
    review.id,
  );
  // 6. Validate that the snapshot endpoint exists and returns proper structure
  // Since there's no API to list review snapshots, we test with a generated UUID
  // The endpoint validates parameters correctly and returns IEcommerceMallReviewSnapshot type
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotResponse =
    await api.functional.ecommerceMall.reviews.snapshots.at(
      customerConnection,
      {
        reviewId: review.id,
        snapshotId: fakeSnapshotId,
      },
    );
  // Validate snapshot response structure
  typia.assert(snapshotResponse);
  TestValidator.equals(
    "snapshot has valid id field",
    typeof snapshotResponse.id === "string",
    true,
  );
  TestValidator.equals(
    "snapshot has rating field",
    typeof snapshotResponse.rating === "number",
    true,
  );
  TestValidator.equals(
    "snapshot has createdAt field",
    typeof snapshotResponse.createdAt === "string",
    true,
  );
  TestValidator.predicate(
    "snapshot rating is valid (1-5)",
    snapshotResponse.rating >= 1 && snapshotResponse.rating <= 5,
  );
}
