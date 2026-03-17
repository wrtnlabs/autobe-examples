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
 * Test customer review update workflow.
 * 1. Customer authenticates via join
 * 2. Customer creates a review
 * 3. Customer updates the review with new rating and content
 * 4. Validate the updated review data
 */
export async function test_api_review_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a review for the product
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 3,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(review);
  // Store original values for comparison
  const originalRating = review.rating;
  const originalContent = review.content;
  // 3. Update the review with new rating and content
  const newRating = 5;
  const newContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const updateBody = {
    rating: newRating,
    content: newContent,
  } satisfies IShoppingMallReview.IUpdate;
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  // 4. Validate the update succeeded
  TestValidator.equals(
    "rating should be updated",
    updatedReview.rating,
    newRating,
  );
  TestValidator.equals(
    "content should be updated",
    updatedReview.content,
    newContent,
  );
  TestValidator.equals("review id unchanged", updatedReview.id, review.id);
  TestValidator.equals(
    "customer id unchanged",
    updatedReview.customer.id,
    review.customer.id,
  );
  TestValidator.equals(
    "product id unchanged",
    updatedReview.product.id,
    review.product.id,
  );
  TestValidator.equals(
    "order id unchanged",
    updatedReview.order.id,
    review.order.id,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedReview.updated_at) >= new Date(review.updated_at),
  );
}
