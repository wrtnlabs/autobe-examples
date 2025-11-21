import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_multiple_pages_consistent(
  connection: api.IConnection,
) {
  // Generate a consistent request for pagination testing
  const request: IShoppingMallReview.IRequest =
    typia.random<IShoppingMallReview.IRequest>();

  // Fetch the first page of reviews
  const firstPage: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });
  typia.assert(firstPage);

  // Fetch the second page of reviews using the same request parameters
  const secondPage: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });
  typia.assert(secondPage);

  // Validate that the pagination parameters are identical between pages
  TestValidator.equals(
    "pagination parameters should be identical across pages",
    firstPage.pagination,
    secondPage.pagination,
  );

  // Validate that data arrays have the same ordering and content
  // Two consecutive requests with identical parameters should return identical results
  TestValidator.equals(
    "review data should be consistent across consecutive page requests",
    firstPage.data,
    secondPage.data,
  );
}
