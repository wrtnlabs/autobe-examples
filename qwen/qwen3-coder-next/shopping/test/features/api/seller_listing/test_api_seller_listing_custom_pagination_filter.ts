import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_listing_custom_pagination_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Custom pagination - page 2 with limit 5
  const paginationResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 2",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => paginationResult.pagination.records >= 0,
  );
  // Calculate expected pages: ceil(records / 5)
  const expectedPages = Math.ceil(paginationResult.pagination.records / 5);
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginationResult.pagination.pages,
    expectedPages,
  );
  // Validate we got at most 5 results on page 2
  TestValidator.predicate(
    "pagination result count <= limit",
    () => paginationResult.data.length <= 5,
  );
  // Test 2: Filtering by approval_status='approved'
  const approvedFilterResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approval_status: "approved",
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(approvedFilterResult);
  // Validate filtered results
  TestValidator.predicate("all results are approved", () =>
    approvedFilterResult.data.every(
      (seller) => seller.approval_status === "approved",
    ),
  );
  // Test 3: Search functionality
  const searchResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        search: "Test",
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult);
  // Test 4: Sorting by created_at descending
  const sortedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        sort: "created_at:desc",
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sortedResult);
  // Validate sorting - items should be sorted by created_at descending
  for (let i = 0; i < sortedResult.data.length - 1; i++) {
    const current = new Date(sortedResult.data[i].created_at).getTime();
    const next = new Date(sortedResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `item ${i} is >= item ${i + 1} in time`,
      () => current >= next,
    );
  }
  // Test 5: Combined pagination, filtering, and search
  const combinedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        approval_status: "approved",
        search: "Test",
        sort: "created_at:desc",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Validate combined filters
  TestValidator.equals(
    "combined pagination page is 1",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined pagination limit is 5",
    combinedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined results have proper length",
    () => combinedResult.data.length >= 0,
  );
}
