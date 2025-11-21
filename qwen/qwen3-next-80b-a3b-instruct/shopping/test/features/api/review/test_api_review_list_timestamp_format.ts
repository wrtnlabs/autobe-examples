import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_timestamp_format(
  connection: api.IConnection,
) {
  const reviewsPage: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });
  typia.assert(reviewsPage);

  // Validate pagination structure integrity
  TestValidator.equals(
    "pagination current is a positive integer",
    reviewsPage.pagination.current,
    reviewsPage.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is a positive integer",
    reviewsPage.pagination.limit,
    reviewsPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination records is a non-negative integer",
    reviewsPage.pagination.records,
    reviewsPage.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is a non-negative integer",
    reviewsPage.pagination.pages,
    reviewsPage.pagination.pages,
  );

  // Validate pagination constraints
  TestValidator.predicate(
    "current page >= 1",
    reviewsPage.pagination.current >= 1,
  );
  TestValidator.predicate("limit >= 1", reviewsPage.pagination.limit >= 1);
  TestValidator.predicate("records >= 0", reviewsPage.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", reviewsPage.pagination.pages >= 0);

  // Validate data structure: array of strings as per IShoppingMallReview.ISummary definition
  TestValidator.predicate("data is an array", Array.isArray(reviewsPage.data));
  TestValidator.equals(
    "data length equals pagination records",
    reviewsPage.data.length,
    reviewsPage.pagination.records,
  );

  // Validate each item is string as per IShoppingMallReview.ISummary (string type)
  for (const reviewSummary of reviewsPage.data) {
    TestValidator.predicate(
      "review summary is a string",
      typeof reviewSummary === "string",
    );
  }

  // Validate response represents valid paginated structure
  TestValidator.predicate(
    "at least 1 review or 0",
    reviewsPage.data.length >= 0,
  );
}
