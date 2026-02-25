import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving an existing published review for a valid product-review relationship.
 * Validates that the endpoint correctly returns review analytics data including
 * average rating, rating distribution, total reviews count, recent trends, and helpful votes ratio.
 */
export async function test_api_review_retrieval_existing_review(
  connection: api.IConnection,
): Promise<void> {
  // Generate random valid UUIDs for product and review
  const productId = typia.random<string & tags.Format<"uuid">>();
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve review analytics
  const review = await api.functional.ecommerce.products.reviews.at(
    connection,
    { productId, reviewId },
  );
  // Validate the response structure using typia.assert
  typia.assert(review);
  // Validate specific properties of the review analytics
  TestValidator.predicate(
    "average rating should be between 1-5",
    review.average_rating >= 1 && review.average_rating <= 5,
  );
  TestValidator.predicate(
    "total reviews should be non-negative",
    review.total_reviews >= 0,
  );
  // Validate rating distribution structure
  const distribution = review.rating_distribution;
  TestValidator.predicate(
    "one_star count should be non-negative",
    distribution.one_star >= 0,
  );
  TestValidator.predicate(
    "two_stars count should be non-negative",
    distribution.two_stars >= 0,
  );
  TestValidator.predicate(
    "three_stars count should be non-negative",
    distribution.three_stars >= 0,
  );
  TestValidator.predicate(
    "four_stars count should be non-negative",
    distribution.four_stars >= 0,
  );
  TestValidator.predicate(
    "five_stars count should be non-negative",
    distribution.five_stars >= 0,
  );
  // Validate recent trends structure
  const trends = review.recent_trends;
  TestValidator.predicate(
    "last_30_days count should be non-negative",
    trends.last_30_days >= 0,
  );
  TestValidator.predicate(
    "helpful_votes_last_30_days should be non-negative",
    trends.helpful_votes_last_30_days >= 0,
  );
  // average_rating_last_30_days can be null, but if present should be between 1-5
  if (trends.average_rating_last_30_days !== null) {
    TestValidator.predicate(
      "average_rating_last_30_days should be valid",
      trends.average_rating_last_30_days >= 1 &&
        trends.average_rating_last_30_days <= 5,
    );
  }
  // helpful_votes_ratio can be null, but if present should be between 0-1
  if (review.helpful_votes_ratio !== null) {
    TestValidator.predicate(
      "helpful_votes_ratio should be between 0-1",
      review.helpful_votes_ratio >= 0 && review.helpful_votes_ratio <= 1,
    );
  }
}
