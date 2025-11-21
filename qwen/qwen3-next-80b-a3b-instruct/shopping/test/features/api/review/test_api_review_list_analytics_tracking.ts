import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_analytics_tracking(
  connection: api.IConnection,
) {
  const searchRequest: IShoppingMallReview.IRequest = typia.random<string>();

  const result: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: searchRequest,
    });

  typia.assert(result);

  TestValidator.equals("pagination exists", result.pagination, {
    current: result.pagination.current,
    limit: result.pagination.limit,
    records: result.pagination.records,
    pages: result.pagination.pages,
  });

  TestValidator.predicate("data array exists", Array.isArray(result.data));

  TestValidator.predicate("data has at least one item", result.data.length > 0);

  result.data.forEach((reviewId) => {
    TestValidator.predicate(
      "review ID is valid string",
      typeof reviewId === "string",
    );
  });
}
