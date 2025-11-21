import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_published_default(
  connection: api.IConnection,
) {
  const request: IShoppingMallReview.IRequest =
    typia.random<IShoppingMallReview.IRequest>();
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });
  typia.assert(response);

  // Validate pagination defaults
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 10", response.pagination.limit, 10);

  // Validate that data is an array of strings (as per IShoppingMallReview.ISummary type)
  TestValidator.predicate(
    "data is an array of strings",
    Array.isArray(response.data) &&
      response.data.every((item) => typeof item === "string"),
  );

  // Validate that pagination has correct total records and pages
  TestValidator.predicate(
    "total records should be non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );
}
