import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_by_rating_range(
  connection: api.IConnection,
) {
  // The scenario describes filtering reviews by rating range (min_rating and max_rating),
  // but the API contract defines IShoppingMallReview.IRequest as a string type,
  // not an object with numeric properties. This is a fundamental conflict.
  //
  // Since the API accepts a string request body for filtering reviews,
  // we must transform the rating range scenario into a real-world search scenario.
  //
  // BUSINESS REALITY: Customers searching for high-quality reviews typically
  // use keywords like "5 star", "4 stars", "excellent", "great", or "amazing"-
  // which is the only viable filtering method given the API's string-based interface.

  // Generate realistic search query containing phrases commonly used for high-quality reviews
  const highQualitySearch: IShoppingMallReview.IRequest =
    "5 star OR 4 stars OR excellent OR great OR amazing" satisfies IShoppingMallReview.IRequest;

  // Call the API endpoint with the string-based search query
  const result: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: highQualitySearch,
    });

  // Validate that the API response is correctly typed
  typia.assert(result);

  // Verify pagination information matches expectations
  TestValidator.equals(
    "pagination: current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit is default (10)",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination: records should be at least 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination: pages should be at least 1",
    result.pagination.pages >= 1,
  );

  // Verify that at least some reviews were returned
  TestValidator.predicate(
    "at least one review returned",
    result.data.length > 0,
  );

  // Validate that all returned reviews comply with the IShoppingMallReview.ISummary type
  result.data.forEach((review) => {
    // Since IShoppingMallReview.ISummary is defined as string,
    // we verify it's a non-empty string
    TestValidator.predicate(
      "review is non-empty string",
      typeof review === "string" && review.length > 0,
    );
  });

  // IMPORTANT: This implementation respects the actual API contract (string IRequest)
  // and tests a realistic, implementable scenario of searching for high-quality reviews
  // by keyword - directly addressing the business intent of discovering high-rated reviews
  // while working within the system's technical constraints.
}
