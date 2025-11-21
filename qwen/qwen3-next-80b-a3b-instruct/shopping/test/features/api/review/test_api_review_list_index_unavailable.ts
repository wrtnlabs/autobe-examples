import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_index_unavailable(
  connection: api.IConnection,
) {
  const request: IShoppingMallReview.IRequest =
    typia.random<IShoppingMallReview.IRequest>();

  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  typia.assert(response);

  TestValidator.equals(
    "response should contain pagination information",
    response.pagination,
    {
      current: response.pagination.current,
      limit: response.pagination.limit,
      records: response.pagination.records,
      pages: response.pagination.pages,
    },
  );

  TestValidator.predicate(
    "data array should be defined",
    ArrayUtil.has(response.data, (item) => typeof item === "string"),
  );

  TestValidator.predicate(
    "data array should not be empty",
    response.data.length > 0,
  );
}
