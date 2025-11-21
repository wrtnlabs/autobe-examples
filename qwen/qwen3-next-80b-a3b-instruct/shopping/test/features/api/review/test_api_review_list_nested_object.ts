import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_nested_object(
  connection: api.IConnection,
) {
  const requestString = RandomGenerator.paragraph();

  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestString,
    });

  typia.assert(response);

  TestValidator.predicate(
    "pagination current page is non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );

  TestValidator.predicate("data is an array", Array.isArray(response.data));

  TestValidator.equals(
    "data array length matches pagination records count",
    response.data.length,
    response.pagination.records,
  );
}
