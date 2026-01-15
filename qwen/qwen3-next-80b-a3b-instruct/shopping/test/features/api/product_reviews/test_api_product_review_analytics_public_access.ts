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
export async function test_api_product_review_analytics_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an unauthenticated connection for public access
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Call the product reviews analytics endpoint without authentication
  const analytics: IShoppingMallProductReviewAnalytics =
    await api.functional.shoppingMall.analytics.product_reviews.index(
      guestConnection,
    );
  // Step 3: Validate the response structure using typia.assert() for complete type safety
  // typia.assert() performs complete and perfect validation of ALL type aspects:
  // - average_rating (number & Minimum<0> & Maximum<5>)
  // - total_reviews (number & Type<"int32"> & Minimum<0>)
  // - ratings_breakdown (number & Type<"int32">)
  // - sentiment_trend (string)
  // - review_geography (string)
  // - review_frequency (string)
  // - top_keywords (array of IShoppingMallProductReviewTopKeyword)
  // - reviewers_by_category (string)
  // - reviewers_by_product (object)
  typia.assert(analytics);
}
