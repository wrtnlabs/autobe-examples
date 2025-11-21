import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Test pagination functionality with different limit values and page numbers to
 * verify correct cursor-based pagination. Validates that limit parameter
 * (1-100) controls the number of results per page and current parameter
 * correctly navigates to the specified page with accurate pagination metadata.
 *
 * This test performs a series of pagination tests:
 *
 * 1. Basic pagination with default limit (10) and page 1
 * 2. Custom limit (5) to verify reduced result count
 * 3. Custom limit (100) to verify maximum allowed limit
 * 4. Page 2 with limit (5) to verify cursor-based navigation
 * 5. Validate pagination metadata (current, limit, records, pages) consistency
 *
 * The test confirms:
 *
 * - Api.functional.shoppingMall.reviews.index correctly accepts body parameters
 * - Limit parameter (1-100) controls result count per page
 * - Current parameter navigates to correct page
 * - Pagination metadata (current, limit, records, pages) is accurate
 * - Data array contains exact number of items specified by limit
 * - System enforces limit boundaries (min 1, max 100)
 */
export async function test_api_review_list_pagination(
  connection: api.IConnection,
) {
  // Generate random pagination parameters
  const limit5 = 5;
  const limit100 = 100;
  const current1 = 1;
  const current2 = 2;
  const current3 = 3;

  // Test 1: Default pagination (expected to use defaults)
  // IRequest is string type, so use empty JSON string to represent empty search criteria
  const result1: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: "{}" satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(result1);
  TestValidator.equals(
    "default limit should be 10",
    result1.pagination.limit,
    10,
  );
  TestValidator.equals(
    "default current should be 1",
    result1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data should have at least one result",
    result1.data.length > 0,
  );
  TestValidator.equals(
    "data length should match limit",
    result1.data.length,
    result1.pagination.limit,
  );

  // Test 2: Custom limit of 5
  const result2: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: '{"limit": 5}' satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(result2);
  TestValidator.equals(
    "custom limit 5 should return 5 results",
    result2.pagination.limit,
    limit5,
  );
  TestValidator.equals(
    "custom limit 5 should have 5 data items",
    result2.data.length,
    limit5,
  );

  // Test 3: Custom limit of 100 (maximum allowed)
  const result3: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: '{"limit": 100}' satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(result3);
  TestValidator.equals(
    "custom limit 100 should return 100 results",
    result3.pagination.limit,
    limit100,
  );
  TestValidator.equals(
    "custom limit 100 should have 100 data items",
    result3.data.length,
    limit100,
  );

  // Test 4: Page 2 with limit 5 - verify cursor-based navigation
  const result4: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: '{"limit": 5, "current": 2}' satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(result4);
  TestValidator.equals(
    "page 2 with limit 5 should have limit 5",
    result4.pagination.limit,
    limit5,
  );
  TestValidator.equals(
    "page 2 should have current 2",
    result4.pagination.current,
    current2,
  );
  TestValidator.equals(
    "page 2 with limit 5 should have 5 data items",
    result4.data.length,
    limit5,
  );

  // Test 5: Validate pagination metadata consistency
  // We'll use result3 (with limit 100) to calculate expected pages
  const records = result3.pagination.records;
  const expectedPages = Math.ceil(records / limit100);
  TestValidator.equals(
    "pages calculation should be correct",
    result3.pagination.pages,
    expectedPages,
  );

  // Test 6: Verify minimum limit enforcement (limit 1 is minimum allowed)
  const result6: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: '{"limit": 1}' satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(result6);
  TestValidator.equals(
    "minimum limit 1 should work",
    result6.pagination.limit,
    1,
  );
  TestValidator.equals(
    "minimum limit 1 should have 1 data item",
    result6.data.length,
    1,
  );

  // Test 7: Verify current parameter works with different page numbers
  const result7: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: ('{"limit": 10, "current": ' +
        current3 +
        "}") satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(result7);
  TestValidator.equals(
    "page 3 should have current 3",
    result7.pagination.current,
    current3,
  );
  TestValidator.equals(
    "page 3 should have 10 data items",
    result7.data.length,
    10,
  );
}
