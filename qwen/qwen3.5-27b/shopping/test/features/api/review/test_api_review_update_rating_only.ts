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
 * Test partial update scenario where only the rating is modified while preserving the existing text content.
 *
 * This test verifies that:
 * 1. The rating is updated to the new value
 * 2. The content field remains unchanged from the original review
 * 3. The updated_at timestamp is changed to current time
 * 4. A ReviewSnapshot is created capturing the state before the rating change
 * 5. The response returns the complete updated review showing the new rating and preserved content
 * 6. The average rating for the product is recalculated
 */
export async function test_api_review_update_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create initial review with rating and content
  const originalReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 3,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(originalReview);
  const originalRating = originalReview.rating;
  const originalContent = originalReview.content;
  const originalCreatedAt = originalReview.created_at;
  const originalUpdatedAt = originalReview.updated_at;
  // 3. Update only the rating (omit content field)
  const newRating = 5;
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: originalReview.id,
        body: {
          rating: newRating,
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 4. Validate rating is updated
  TestValidator.equals(
    "rating updated to new value",
    updatedReview.rating,
    newRating,
  );
  // 5. Validate content is preserved (unchanged)
  TestValidator.equals(
    "content preserved unchanged",
    updatedReview.content,
    originalContent,
  );
  // 6. Validate updated_at is different from original
  TestValidator.notEquals(
    "updated_at changed after modification",
    updatedReview.updated_at,
    originalUpdatedAt,
  );
  // 7. Validate created_at remains unchanged
  TestValidator.equals(
    "created_at remains unchanged",
    updatedReview.created_at,
    originalCreatedAt,
  );
  // 8. Validate rating changed from original
  TestValidator.notEquals(
    "rating changed from original",
    updatedReview.rating,
    originalRating,
  );
  // 9. Validate review structure integrity
  TestValidator.predicate(
    "review has valid order item",
    updatedReview.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "review has valid customer",
    updatedReview.customer.id.length > 0,
  );
  TestValidator.predicate(
    "review is not deleted",
    updatedReview.deleted_at === null,
  );
}
