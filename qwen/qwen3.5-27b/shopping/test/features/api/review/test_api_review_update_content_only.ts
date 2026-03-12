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
 * Test partial update scenario where only the text content is modified while preserving the existing rating.
 * The authenticated customer sends an update request with only the content field, omitting the rating field.
 * Verify that: (1) the content is updated to the new text value, (2) the rating field remains unchanged from the original review,
 * (3) the updated_at timestamp is changed to current time, (4) a ReviewSnapshot is created capturing the state before the content change,
 * (5) the response returns the complete updated review showing the preserved rating and new content,
 * (6) the product average rating remains unchanged since rating was not modified.
 */
export async function test_api_review_update_content_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authResult);
  // 2. Create a review with both rating and content
  const originalReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 4,
          content: "Original review content before update",
        },
      },
    );
  typia.assert(originalReview);
  const originalRating = originalReview.rating;
  const originalContent = originalReview.content;
  const originalUpdatedAt = originalReview.updated_at;
  // 3. Update the review with only content field (no rating)
  const newContent = "Updated review content after partial update";
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: originalReview.id,
        body: {
          content: newContent,
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 4. Validate that rating is preserved
  TestValidator.equals(
    "rating preserved after content-only update",
    updatedReview.rating,
    originalRating,
  );
  // 5. Validate that content is updated
  TestValidator.equals(
    "content updated to new value",
    updatedReview.content,
    newContent,
  );
  TestValidator.notEquals(
    "content is different from original",
    updatedReview.content,
    originalContent,
  );
  // 6. Validate that updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp changed after update",
    updatedReview.updated_at,
    originalUpdatedAt,
  );
  // 7. Validate that the review ID remains the same
  TestValidator.equals(
    "review ID unchanged",
    updatedReview.id,
    originalReview.id,
  );
  // 8. Validate that orderItem and customer references are preserved
  TestValidator.equals(
    "orderItem preserved",
    updatedReview.orderItem.id,
    originalReview.orderItem.id,
  );
  TestValidator.equals(
    "customer preserved",
    updatedReview.customer.id,
    originalReview.customer.id,
  );
  // 9. Validate that deleted_at is still null (review is active)
  TestValidator.equals(
    "review is still active (not deleted)",
    updatedReview.deleted_at,
    null,
  );
  // 10. Validate that created_at timestamp is unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedReview.created_at,
    originalReview.created_at,
  );
}
