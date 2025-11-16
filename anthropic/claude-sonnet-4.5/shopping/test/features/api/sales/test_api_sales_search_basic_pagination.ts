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
 * Test basic product sales search functionality with pagination parameters.
 *
 * Validates that the sales search endpoint correctly handles pagination through
 * the page and limit parameters. Verifies response structure, pagination
 * metadata accuracy, and proper handling of edge cases.
 *
 * Test workflow:
 *
 * 1. Test default pagination behavior (no parameters provided)
 * 2. Test with custom limit values (small, medium, large)
 * 3. Test page navigation with consistent limit
 * 4. Test edge cases (minimum limit, maximum limit, high page numbers)
 * 5. Validate pagination metadata calculations
 * 6. Verify different limit values produce consistent record counts
 */
export async function test_api_sales_search_basic_pagination(
  connection: api.IConnection,
) {
  // Test 1: Default pagination (no parameters)
  const defaultResponse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {} satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(defaultResponse);

  TestValidator.predicate(
    "default pagination current page should be 1",
    defaultResponse.pagination.current === 1,
  );

  // Test 2: Custom limit - small page size
  const smallLimitResponse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(smallLimitResponse);

  TestValidator.equals(
    "small limit pagination current should be 1",
    smallLimitResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "small limit pagination limit should be 5",
    smallLimitResponse.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "data array length should not exceed limit",
    smallLimitResponse.data.length <= 5,
  );

  // Test 3: Custom limit - medium page size
  const mediumLimitResponse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(mediumLimitResponse);

  TestValidator.equals(
    "medium limit pagination limit should be 20",
    mediumLimitResponse.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "data array length should not exceed medium limit",
    mediumLimitResponse.data.length <= 20,
  );

  // Test 4: Maximum limit value (boundary test)
  const maxLimitResponse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(maxLimitResponse);

  TestValidator.equals(
    "max limit pagination limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );

  TestValidator.predicate(
    "data array length should not exceed max limit",
    maxLimitResponse.data.length <= 100,
  );

  // Test 5: Minimum limit value (boundary test)
  const minLimitResponse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(minLimitResponse);

  TestValidator.equals(
    "min limit pagination limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );

  TestValidator.predicate(
    "data array length should not exceed 1",
    minLimitResponse.data.length <= 1,
  );

  // Test 6: Page navigation - second page
  const secondPageResponse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(secondPageResponse);

  TestValidator.equals(
    "second page pagination current should be 2",
    secondPageResponse.pagination.current,
    2,
  );

  TestValidator.equals(
    "second page pagination limit should be 10",
    secondPageResponse.pagination.limit,
    10,
  );

  // Test 7: Pagination metadata consistency
  TestValidator.predicate(
    "pagination pages calculation should be non-negative",
    defaultResponse.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    defaultResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "current page should be valid within total pages",
    defaultResponse.pagination.pages === 0 ||
      defaultResponse.pagination.current <= defaultResponse.pagination.pages,
  );

  // Test 8: High page number (edge case - beyond available pages)
  const highPageResponse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(highPageResponse);

  // Test 9: Different limit values produce consistent record counts
  const limit10Response = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(limit10Response);

  const limit50Response = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(limit50Response);

  TestValidator.predicate(
    "same records with different limits should have consistent total records",
    limit10Response.pagination.records === limit50Response.pagination.records,
  );
}
