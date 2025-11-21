import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_no_results(
  connection: api.IConnection,
) {
  const nonExistentProductId = "00000000-0000-0000-0000-000000000000";
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: nonExistentProductId,
    });
  typia.assert(response);

  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages is 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("data array is empty", response.data.length, 0);
}
