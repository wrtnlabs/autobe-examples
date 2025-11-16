import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category retrieval with various pagination parameters.
 *
 * This test validates that the category listing API properly handles pagination
 * by testing different page numbers and limits. It ensures that:
 *
 * 1. First page retrieval works correctly
 * 2. Middle pages return the expected number of items
 * 3. Last page handling is correct
 * 4. Pages beyond available data return empty results
 * 5. Pagination metadata (current, limit, records, pages) is accurate
 * 6. Different page sizes (limits) work as expected
 */
export async function test_api_category_search_with_pagination(
  connection: api.IConnection,
) {
  // Test with first page and default limit
  const firstPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(firstPage);

  // Validate pagination metadata for first page
  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page should have records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page data length should not exceed limit",
    firstPage.data.length <= 10,
  );

  // Test with a different page size
  const smallPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page limit should be 5",
    smallPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small page data length should not exceed 5",
    smallPage.data.length <= 5,
  );

  // Test middle page if there are enough records
  if (firstPage.pagination.pages > 2) {
    const middlePage = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(middlePage);

    TestValidator.equals(
      "middle page current should be 2",
      middlePage.pagination.current,
      2,
    );
    TestValidator.equals(
      "middle page should have same total records",
      middlePage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.predicate(
      "middle page data length should not exceed limit",
      middlePage.data.length <= 10,
    );
  }

  // Test last page
  if (firstPage.pagination.pages > 0) {
    const lastPage = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          page: firstPage.pagination.pages,
          limit: 10,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(lastPage);

    TestValidator.equals(
      "last page current should match pages count",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    TestValidator.equals(
      "last page should have same total records",
      lastPage.pagination.records,
      firstPage.pagination.records,
    );
  }

  // Test page beyond available data
  const beyondPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: firstPage.pagination.pages + 10,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(beyondPage);

  TestValidator.predicate(
    "beyond page should return empty or minimal data",
    beyondPage.data.length === 0 ||
      beyondPage.pagination.current > beyondPage.pagination.pages,
  );

  // Test with maximum allowed limit
  const maxLimitPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "max limit page limit should be 100",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page data length should not exceed 100",
    maxLimitPage.data.length <= 100,
  );

  // Verify pagination calculations are consistent
  TestValidator.predicate(
    "total pages calculation should be consistent",
    firstPage.pagination.pages ===
      Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
}
