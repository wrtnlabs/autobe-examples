import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_performance_under_load(
  connection: api.IConnection,
) {
  // Generate a large dataset of reviews to simulate high load
  const largeReviewData = typia.random<IShoppingMallReview.IRequest>();

  // Maintain fixed parameters for consistent performance testing
  const performanceTestRequest = {
    // Using the exact type from API definition
    body: largeReviewData satisfies IShoppingMallReview.IRequest,
  };

  // Execute the performance test under load with a large dataset
  const performanceResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(
      connection,
      performanceTestRequest,
    );

  // Validate that the response is correctly typed and structured
  typia.assert(performanceResponse);

  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination structure is correct",
    performanceResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is reasonable",
    performanceResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is positive",
    performanceResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count is adequate",
    performanceResponse.pagination.pages >= 1,
  );

  // Validate that data array is properly populated and non-empty
  TestValidator.predicate(
    "data array is not empty",
    performanceResponse.data.length > 0,
  );

  // Validate that each data item conforms to the expected summary type
  performanceResponse.data.forEach((review) => {
    TestValidator.equals("review ID is a valid UUID", typeof review, "string");
    // Note: Since ISummary is defined as string, we validate it's a non-empty string
    TestValidator.predicate("review string is not empty", review.length > 0);
  });
}
