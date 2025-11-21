import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_duplicate_parameters(
  connection: api.IConnection,
) {
  const request: IShoppingMallReview.IRequest =
    "sort_by=rating&sort_by=created_at&sort_order=desc&sort_order=asc&limit=10&limit=5";

  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });
  typia.assert(response);

  // Validate that the response uses the last occurrence of duplicated parameters
  // limit should be 5 (last occurrence)
  TestValidator.equals(
    "last limit value should override previous",
    response.pagination.limit,
    5,
  );
}
