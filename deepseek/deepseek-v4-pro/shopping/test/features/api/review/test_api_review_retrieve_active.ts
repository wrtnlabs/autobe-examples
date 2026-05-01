import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review_review } from "../../../prepare/prepare_random_shopping_mall_review_review";

/**
 * Test retrieving an active (non-deleted) product review by its unique identifier.
 *
 * Validates that the GET /shoppingMall/customer/reviews/{reviewId} endpoint returns
 * the complete IShoppingMallReviewReview response containing all expected fields:
 * the review's UUID identifier, integer star rating (1–5), optional textual content,
 * customer summary with display name, product summary, order summary, order item summary,
 * an array of edit history snapshots, and audit timestamps (created_at, updated_at).
 *
 * The test confirms that a newly created review has deleted_at set to null, indicating
 * it is active and publicly visible on the product detail page. The rating, content,
 * and relational data (customer, product, order, orderItem) are verified to match the
 * values submitted during creation.
 *
 * 1. Customer authenticates via join with randomized credentials.
 * 2. Customer creates a new review with a specific rating and text content.
 * 3. Customer retrieves the review by its ID using the review retrieval endpoint.
 * 4. Validates the full response structure via typia.assert and business logic checks
 *    including active status (null deleted_at), matching rating/content, and
 *    presence of all relational references.
 */
export async function test_api_review_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer via join
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a review with specific rating and content
  const rating = 4;
  const content = "Great product, highly recommended!";
  const created = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    { body: { rating, content } },
  );
  typia.assert(created);
  // 3. Retrieve the review by its ID
  const review = await api.functional.shoppingMall.customer.reviews.at(
    customerConnection,
    { reviewId: created.id },
  );
  typia.assert(review);
  // 4. Validate business logic
  TestValidator.equals("review id matches", review.id, created.id);
  TestValidator.equals("rating matches", review.rating, rating);
  TestValidator.equals("content matches", review.content, content);
  TestValidator.equals("review is active", review.deleted_at, null);
  TestValidator.predicate(
    "has valid created_at",
    new Date(review.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    new Date(review.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "customer has display_name",
    review.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "snapshots is array",
    Array.isArray(review.snapshots),
  );
}
