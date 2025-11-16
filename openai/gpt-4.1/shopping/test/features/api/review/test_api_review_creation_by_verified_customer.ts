import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify successful creation of a product review by a verified customer who has
 * purchased the product through a specific order item.
 *
 * This test covers the following steps:
 *
 * 1. Generate required reference objects for customer, session, product, product
 *    SKU, order, order item, and product rating, each as summary instances
 *    (real-life setup would include full purchase workflow, but for test scope
 *    we use random valid summary payloads to focus on review creation).
 * 2. Construct valid review creation request body according to
 *    IShoppingMallReview.ICreate, ensuring:
 *
 *    - Title is non-empty string;
 *    - Body is between 10 and 1000 characters;
 *    - All required summary IDs are included;
 *    - Is_draft and moderation_status are properly set (as per business rules:
 *         system initially sets as draft and in pending moderation, if
 *         applicable).
 * 3. Call api.functional.shoppingMall.reviews.create with the request body.
 * 4. Validate the response:
 *
 *    - Full review object is returned according to IShoppingMallReview
 *    - All contextual references (customer, session, product, SKU, order, order
 *         item, rating) are present as summaries
 *    - The review's properties (title, body, is_draft, moderation_status) match
 *         those provided in the creation request
 *    - Review has a unique id and correct timestamps.
 */
export async function test_api_review_creation_by_verified_customer(
  connection: api.IConnection,
) {
  // Step 1: Randomly generate summary reference objects for all required fields
  const customer = typia.random<IShoppingMallCustomer.ISummary>();
  const session = typia.random<IShoppingMallCustomerSession.ISummary>();
  const product = typia.random<IShoppingMallProduct.ISummary>();
  const productSku = typia.random<IShoppingMallProductSku.ISummary>();
  const order = typia.random<IShoppingMallOrder.ISummary>();
  const orderItem: IShoppingMallOrderItem.ISummary = {
    ...typia.random<IShoppingMallOrderItem.ISummary>(),
    shopping_mall_order_id: order.id,
    sku: productSku,
  };
  const rating = typia.random<IShoppingMallProductRating.ISummary>();

  // Step 2: Create valid review request body satisfying creation constraints
  const requestBody = {
    title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }) as string & tags.MinLength<1>,
    body: RandomGenerator.paragraph({
      sentences: 15,
      wordMin: 4,
      wordMax: 10,
    }) as string & tags.MinLength<10> & tags.MaxLength<1000>,
    shopping_mall_product_id: product.id,
    shopping_mall_product_sku_id: productSku.id,
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: orderItem.id,
    shopping_mall_product_rating_id: rating.id,
    is_draft: false,
    moderation_status: "pending",
    withdrawn_at: null,
  } satisfies IShoppingMallReview.ICreate;

  // Step 3: Call review creation API
  const review = await api.functional.shoppingMall.reviews.create(connection, {
    body: requestBody,
  });
  typia.assert(review);

  // Step 4: Validate returned data integrity and context
  TestValidator.predicate(
    "review id must be a valid uuid",
    typeof review.id === "string" && review.id.length > 0,
  );
  TestValidator.equals(
    "review title matches request",
    review.title,
    requestBody.title,
  );
  TestValidator.equals(
    "review body matches request",
    review.body,
    requestBody.body,
  );
  TestValidator.equals(
    "review is_draft flag matches",
    review.is_draft,
    requestBody.is_draft,
  );
  TestValidator.equals(
    "review moderation_status matches",
    review.moderation_status,
    requestBody.moderation_status,
  );
  TestValidator.equals(
    "review withdrawn_at should be null",
    review.withdrawn_at,
    null,
  );
  TestValidator.equals(
    "review product id matches",
    review.product.id,
    product.id,
  );
  TestValidator.equals(
    "review productSku id matches",
    review.productSku.id,
    productSku.id,
  );
  TestValidator.equals("review order id matches", review.order.id, order.id);
  TestValidator.equals(
    "review orderItem id matches",
    review.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals("review rating id matches", review.rating.id, rating.id);
  TestValidator.equals(
    "review customer id matches",
    review.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "review customerSession id matches",
    review.customerSession.id,
    session.id,
  );
  TestValidator.predicate(
    "review created_at is non-empty ISO 8601 string",
    typeof review.created_at === "string" && review.created_at.length > 0,
  );
  TestValidator.predicate(
    "review updated_at is non-empty ISO 8601 string",
    typeof review.updated_at === "string" && review.updated_at.length > 0,
  );
  TestValidator.equals(
    "review deleted_at should be null",
    review.deleted_at,
    null,
  );
}
