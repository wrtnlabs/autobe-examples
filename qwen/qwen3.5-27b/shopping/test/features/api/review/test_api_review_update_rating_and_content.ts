import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test the primary success path for updating a product review.
 *
 * This test validates that:
 * 1. A customer can successfully update both rating and content of their own review
 * 2. The updated_at timestamp is changed to current time
 * 3. The response returns the complete updated review with all fields
 * 4. Rating values are properly validated (1-5 range)
 */
export async function test_api_review_update_rating_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer Authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  typia.assert(customer);
  // 2. Create Initial Review
  const initialReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(initialReview);
  // Store original values for comparison
  const originalRating = initialReview.rating;
  const originalContent = initialReview.content;
  const originalUpdatedAt = initialReview.updated_at;
  // 3. Prepare Update Request with different rating and content
  // Ensure rating is different from original by picking from remaining valid values
  const availableRatings = [1, 2, 3, 4, 5].filter((r) => r !== originalRating);
  const newRating = RandomGenerator.pick(availableRatings) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  // Generate new content that's different from original
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    rating: newRating,
    content: newContent,
  } satisfies IShoppingMallReview.IUpdate;
  // 4. Update the Review
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  // 5. Validation
  // Verify review ID remains the same
  TestValidator.equals(
    "review ID unchanged",
    updatedReview.id,
    initialReview.id,
  );
  // Verify rating was updated to new value (and is different from original)
  TestValidator.equals("rating updated", updatedReview.rating, newRating);
  TestValidator.notEquals(
    "rating changed from original",
    updatedReview.rating,
    originalRating,
  );
  // Verify content was updated to new value
  TestValidator.equals("content updated", updatedReview.content, newContent);
  // Verify rating is within valid range
  TestValidator.predicate(
    "rating in valid range",
    updatedReview.rating >= 1 && updatedReview.rating <= 5,
  );
  // Verify updated_at timestamp is different from original (should be newer)
  TestValidator.notEquals(
    "updated_at changed",
    updatedReview.updated_at,
    originalUpdatedAt,
  );
  // Verify updated_at is after or equal to created_at
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updatedReview.updated_at) >= new Date(updatedReview.created_at),
  );
  // Verify customer information matches authenticated customer
  TestValidator.equals(
    "customer ID matches",
    updatedReview.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    updatedReview.customer.email,
    customer.email,
  );
  // Verify order item information is preserved
  TestValidator.equals(
    "order item ID preserved",
    updatedReview.orderItem.id,
    initialReview.orderItem.id,
  );
  // Verify review is not deleted
  TestValidator.equals("review not deleted", updatedReview.deleted_at, null);
  // Verify all required fields are present
  TestValidator.predicate("has valid ID", updatedReview.id != null);
  TestValidator.predicate(
    "has valid order item",
    updatedReview.orderItem != null,
  );
  TestValidator.predicate("has valid customer", updatedReview.customer != null);
  TestValidator.predicate("has created_at", updatedReview.created_at != null);
  TestValidator.predicate("has updated_at", updatedReview.updated_at != null);
}
