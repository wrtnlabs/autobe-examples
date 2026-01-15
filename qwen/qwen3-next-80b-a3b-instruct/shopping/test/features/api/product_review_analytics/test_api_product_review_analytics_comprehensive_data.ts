import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewAnalytics";
import type { IShoppingMallProductReviewFrequency } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewFrequency";
import type { IShoppingMallProductReviewGeography } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewGeography";
import type { IShoppingMallProductReviewRatingsBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewRatingsBreakdown";
import type { IShoppingMallProductReviewReviewersByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewReviewersByCategory";
import type { IShoppingMallProductReviewReviewersByProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewReviewersByProduct";
import type { IShoppingMallProductReviewSentimentTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSentimentTrend";
import type { IShoppingMallProductReviewTopKeyword } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewTopKeyword";
export async function test_api_product_review_analytics_comprehensive_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Fetch product review analytics data
  const analytics: IShoppingMallProductReviewAnalytics =
    await api.functional.shoppingMall.analytics.product_reviews.index(
      connection,
    );
  // Step 2: Validate complete type structure using typia.assert
  typia.assert(analytics);
  // Validate that average_rating is within defined range
  TestValidator.predicate(
    "average_rating should be between 0 and 5",
    analytics.average_rating >= 0 && analytics.average_rating <= 5,
  );
  // Validate that total_reviews is non-negative
  TestValidator.predicate(
    "total_reviews should be non-negative",
    analytics.total_reviews >= 0,
  );
  // Validate that ratings_breakdown is a non-negative integer
  TestValidator.predicate(
    "ratings_breakdown should be non-negative",
    analytics.ratings_breakdown >= 0,
  );
  // Validate that top_keywords is an array
  TestValidator.predicate(
    "top_keywords should be an array",
    Array.isArray(analytics.top_keywords),
  );
  // Validate that reviewers_by_product is an object
  TestValidator.predicate(
    "reviewers_by_product should be an object",
    typeof analytics.reviewers_by_product === "object" &&
      analytics.reviewers_by_product !== null,
  );
}
