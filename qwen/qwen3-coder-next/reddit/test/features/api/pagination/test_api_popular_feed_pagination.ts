import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Fetch popular feed with pagination
  const result = await api.functional.redditPlatform.popular.index(connection);
  typia.assert(result);
  // Test 2: Verify pagination structure exists
  TestValidator.predicate(
    "pagination exists",
    result.pagination !== null && result.pagination !== undefined,
  );
  // Test 3: Validate pagination fields are present and correct types
  TestValidator.equals(
    "current page type",
    typeof result.pagination.current,
    "number",
  );
  TestValidator.equals("limit type", typeof result.pagination.limit, "number");
  TestValidator.equals(
    "records type",
    typeof result.pagination.records,
    "number",
  );
  TestValidator.equals("pages type", typeof result.pagination.pages, "number");
  // Test 4: Verify pagination formula: pages = ceil(records / limit)
  if (result.pagination.records > 0 && result.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      result.pagination.records / result.pagination.limit,
    );
    TestValidator.equals(
      "pagination formula correct",
      result.pagination.pages,
      expectedPages,
    );
  }
  // Test 5: Validate data array structure
  TestValidator.predicate("data array type", Array.isArray(result.data));
  // Test 6: Verify data array length doesn't exceed limit
  TestValidator.predicate(
    "data within limit",
    result.data.length <= result.pagination.limit,
  );
  // Test 7: Test pagination boundary conditions
  TestValidator.predicate("current page >= 1", result.pagination.current >= 1);
  TestValidator.predicate("limit >= 1", result.pagination.limit >= 1);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Test 8: Verify current page doesn't exceed total pages
  if (result.pagination.records > 0) {
    TestValidator.predicate(
      "current page within bounds",
      result.pagination.current <= result.pagination.pages,
    );
  }
  // Test 9: Test empty results pagination edge case
  if (result.pagination.records === 0) {
    TestValidator.equals("empty results pages", result.pagination.pages, 0);
    TestValidator.equals("empty results data length", result.data.length, 0);
  }
  // Test 10: Verify data elements structure
  if (result.data.length > 0) {
    typia.assert<IRedditPlatformPost.ISummary[]>(result.data);
  }
  // Test 11: Test that pagination is consistent across multiple calls
  const result2 = await api.functional.redditPlatform.popular.index(connection);
  typia.assert(result2);
  TestValidator.predicate(
    "pagination consistency - same structure",
    result.pagination.current === result2.pagination.current &&
      result.pagination.limit === result2.pagination.limit &&
      result.pagination.records === result2.pagination.records &&
      result.pagination.pages === result2.pagination.pages,
  );
  // Test 12: Verify no extra properties in pagination (strict type checking)
  const paginationKeys = Object.keys(result.pagination).sort();
  const expectedPaginationKeys = [
    "current",
    "limit",
    "records",
    "pages",
  ].sort();
  TestValidator.equals(
    "pagination has exact keys",
    paginationKeys,
    expectedPaginationKeys,
  );
}
