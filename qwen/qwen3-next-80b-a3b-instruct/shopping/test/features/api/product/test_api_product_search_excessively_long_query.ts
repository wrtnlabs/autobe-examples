import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_excessively_long_query(
  connection: api.IConnection,
) {
  const longQuery = ArrayUtil.repeat(2000, () => "a").join("");
  const result = await api.functional.shoppingMall.products.index(connection, {
    body: longQuery,
  });
  typia.assert(result);
  TestValidator.predicate("search results returned", result.data.length >= 0);
  TestValidator.equals(
    "pagination has correct structure",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
}
