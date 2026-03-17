import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test partial update of review - updating only rating while preserving content.
 *
 * Scenario: Customer wants to change only the star rating of their review
 * while keeping the text content unchanged.
 *
 * Pre-conditions:
 * 1. Customer account authenticated
 * 2. Review exists with both rating and content
 *
 * Steps:
 * 1. Create customer via authorize_customer_join
 * 2. Create review with rating=4 and content via generate utility
 * 3. Update only the rating to 5 (content field omitted)
 * 4. Validate rating changed, content preserved
 */
export async function test_api_review_update_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create initial review with rating=4 and content
  const originalReview =
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: 4,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(originalReview);
  // Store original values for comparison
  const originalRating = originalReview.rating;
  const originalContent = originalReview.content;
  const reviewId = originalReview.id;
  TestValidator.equals("original rating is 4", originalRating, 4);
  TestValidator.predicate("original content exists", originalContent !== null);
  // 3. Update only the rating field (partial update)
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId,
        body: { rating: 5 } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 4. Validate partial update results
  TestValidator.equals("review ID unchanged", updatedReview.id, reviewId);
  TestValidator.equals("rating updated to 5", updatedReview.rating, 5);
  TestValidator.notEquals(
    "rating changed",
    updatedReview.rating,
    originalRating,
  );
  TestValidator.equals(
    "content preserved",
    updatedReview.content,
    originalContent,
  );
  TestValidator.equals(
    "customer unchanged",
    updatedReview.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "product unchanged",
    updatedReview.product.id,
    originalReview.product.id,
  );
  TestValidator.equals(
    "order unchanged",
    updatedReview.order.id,
    originalReview.order.id,
  );
}
