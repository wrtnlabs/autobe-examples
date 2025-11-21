import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_unique_ids(
  connection: api.IConnection,
) {
  // Request a random set of reviews with default pagination
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });

  // Validate the response type
  typia.assert(response);

  // Extract the review IDs (they are strings as per IShoppingMallReview.ISummary definition)
  const reviewIds = response.data;

  // Ensure all review IDs are unique - compare array length with Set size
  TestValidator.equals(
    "review IDs should be unique",
    new Set(reviewIds).size,
    reviewIds.length,
  );
}
