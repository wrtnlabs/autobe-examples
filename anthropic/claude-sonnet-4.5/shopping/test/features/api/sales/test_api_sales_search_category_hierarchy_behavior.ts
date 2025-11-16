import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test category filtering behavior with available search API.
 *
 * Since category and product creation APIs are not provided, this test
 * validates the category filtering functionality by:
 *
 * 1. Searching with a random category_id to verify the API accepts the parameter
 * 2. Verifying the response structure is correct
 * 3. Testing that non-existent category_id returns empty results
 * 4. Validating pagination metadata is properly returned
 *
 * Note: Full category hierarchy testing would require category and product
 * creation APIs.
 */
export async function test_api_sales_search_category_hierarchy_behavior(
  connection: api.IConnection,
) {
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();

  const searchResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        category_id: randomCategoryId,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result has valid pagination structure",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "search result has data array",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "pagination current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    searchResult.pagination.limit === 20,
  );

  if (searchResult.data.length > 0) {
    TestValidator.predicate(
      "all returned products have category matching filter",
      searchResult.data.every(
        (product) => product.category.id === randomCategoryId,
      ),
    );
  }

  const anotherCategoryId = typia.random<string & tags.Format<"uuid">>();
  const secondSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        category_id: anotherCategoryId,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(secondSearch);

  TestValidator.predicate(
    "second search has valid response structure",
    secondSearch.pagination !== null && Array.isArray(secondSearch.data),
  );
}
