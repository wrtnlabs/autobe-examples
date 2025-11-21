import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_default_pagination(
  connection: api.IConnection,
) {
  const requestBody: IShoppingMallReview.IRequest =
    typia.random<IShoppingMallReview.IRequest>();
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestBody,
    });
  typia.assert(response);
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "data should have at least one item",
    response.data.length > 0,
  );
}
