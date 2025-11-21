import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_string_numbers(
  connection: api.IConnection,
) {
  const paginationString = JSON.stringify({
    limit: 5,
    current: 2,
  });

  const result: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: paginationString,
    });
  typia.assert(result);

  TestValidator.equals(
    "limit should be coerced from string representation",
    result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current should be coerced from string representation",
    result.pagination.current,
    2,
  );
}
