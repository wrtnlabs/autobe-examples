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
 * Validates product summary data completeness in search results.
 *
 * This test verifies that the product search endpoint returns complete and
 * correctly typed summary data for each product. The typia.assert() call
 * performs comprehensive validation of all fields including primitive
 * properties, nested seller and category summaries, computed fields, UUID
 * formats, timestamps, and enum values.
 *
 * Test steps:
 *
 * 1. Call the product search API with basic pagination
 * 2. Validate complete response structure with typia.assert()
 * 3. Verify pagination logic is consistent
 */
export async function test_api_sales_search_product_summary_completeness(
  connection: api.IConnection,
) {
  // Call the search API with basic pagination parameters
  const searchResponse: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  // Validate the complete response structure - this performs ALL type validation
  // including all required fields, data types, nested objects, UUIDs, timestamps,
  // enums, and format constraints
  typia.assert(searchResponse);

  // Validate business logic: data array length should not exceed the requested limit
  TestValidator.predicate(
    "returned products do not exceed limit",
    searchResponse.data.length <= 10,
  );

  // Validate business logic: current page matches requested page
  TestValidator.equals(
    "current page matches request",
    searchResponse.pagination.current,
    1,
  );

  // Validate business logic: limit matches requested limit
  TestValidator.equals(
    "limit matches request",
    searchResponse.pagination.limit,
    10,
  );
}
