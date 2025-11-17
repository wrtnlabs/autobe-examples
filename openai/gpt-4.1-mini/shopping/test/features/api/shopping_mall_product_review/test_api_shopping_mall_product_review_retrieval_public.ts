import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";

export async function test_api_shopping_mall_product_review_retrieval_public(
  connection: api.IConnection,
) {
  // Generate a realistic UUID for testing
  const shoppingMallProductReviewId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Retrieve the product review by ID
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.shoppingMallProductReviews.at(
      connection,
      {
        shoppingMallProductReviewId,
      },
    );

  typia.assert(review); // Validate the response structure and types

  // Verify rating range of 1 to 5
  TestValidator.predicate(
    "rating is between 1 and 5 inclusive",
    review.rating >= 1 && review.rating <= 5,
  );

  // Verify title is non-empty string
  TestValidator.predicate(
    "title is non-empty string",
    typeof review.title === "string" && review.title.length > 0,
  );

  // Verify body is non-empty string
  TestValidator.predicate(
    "body is non-empty string",
    typeof review.body === "string" && review.body.length > 0,
  );

  // Verify moderation status is valid
  TestValidator.predicate(
    "moderation_status is one of pending, approved, rejected",
    ["pending", "approved", "rejected"].includes(review.moderation_status),
  );

  // Verify deleted_at is null or undefined (non-deleted review)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    review.deleted_at === null || review.deleted_at === undefined,
  );
}
