import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing all categories with default pagination and sorting.
 *
 * Calls the category listing endpoint with an empty request body — no search filters, no parent filtering, no explicit pagination or sort parameters. This exercises the endpoint's default behavior: returning all active (non-soft-deleted) categories sorted by created_at descending (newest first) with server-side default pagination.
 *
 * Verifies that pagination metadata is internally consistent — the returned data array length does not exceed the stated page limit, and the total pages value correctly matches the ceiling of records divided by limit. Also validates that categories are returned in the expected sort order by confirming each category's created_at timestamp is not greater than the previous one.
 *
 * 1. Send empty body `{}` satisfying `IShoppingMallCategory.IRequest` with all fields omitted.
 * 2. `typia.assert` validates every structural type constraint on the response.
 * 3. Confirm `data.length ≤ pagination.limit` — the server respects the page size.
 * 4. Confirm `pagination.pages === Math.ceil(pagination.records / pagination.limit)`.
 * 5. Walk through data array pairwise and confirm `created_at` is non-increasing (descending order).
 */
export async function test_api_category_browse_all_default_pagination(
  connection: api.IConnection,
) {
  const result = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result);
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "data count ≤ limit",
    result.data.length <= result.pagination.limit,
  );
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation",
    result.pagination.pages,
    expectedPages,
  );
  // Validate sorting by created_at descending (newest first)
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      `sorted by created_at desc at index ${i}`,
      new Date(result.data[i - 1].created_at).getTime() >=
        new Date(result.data[i].created_at).getTime(),
    );
  }
}
