import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination behavior for cancellation request snapshots.
 * Tests various page sizes, offsets, and edge cases for the pagination API.
 */
export async function test_api_cancellation_request_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  // Test pagination with different page sizes and offsets
  const testCases = [
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: 3, limit: 5 },
    { page: 1, limit: 10 },
    { page: 2, limit: 10 },
    { page: 1, limit: 20 },
    { page: 5, limit: 5 }, // Beyond available pages
  ];
  for (const testCase of testCases) {
    // Call the pagination API
    const result =
      await api.functional.shoppingMall.cancellation_request_snapshots.index(
        adminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(result);
    // Validate pagination metadata
    TestValidator.equals(
      `page number matches for page ${testCase.page}`,
      result.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `limit matches for page ${testCase.page}`,
      result.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `records count valid for page ${testCase.page}`,
      () => result.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pages count valid for page ${testCase.page}`,
      () => result.pagination.pages >= 0,
    );
    // Calculate expected total pages
    const expectedPages = Math.max(
      0,
      Math.ceil(result.pagination.records / testCase.limit),
    );
    TestValidator.equals(
      `total pages calculation for page ${testCase.page}`,
      result.pagination.pages,
      expectedPages,
    );
    // Validate data array size for non-empty pages
    if (testCase.page <= expectedPages && expectedPages > 0) {
      TestValidator.predicate(
        `data array size valid for page ${testCase.page}`,
        () => result.data.length <= testCase.limit,
      );
    } else {
      // Page beyond available data should have empty array
      TestValidator.equals(
        `empty data for page ${testCase.page} beyond available`,
        result.data.length,
        0,
      );
    }
    // Validate each snapshot structure
    for (const snapshot of result.data) {
      typia.assert<IShoppingMallCancellationRequestSnapshot>(snapshot);
    }
  }
}
