import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test search and sorting capabilities for seller listing with multiple filter combinations.
 * 1. Authenticate as administrator
 * 2. Test search by shop name (partial match)
 * 3. Test sorting by created_at (asc/desc), shop_name, approval_status
 * 4. Test combined filters (search + approval_status + status)
 * 5. Test edge cases (empty search, non-matching search, pagination)
 * 6. Validate response structure and pagination metadata
 */
export async function test_api_seller_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test search functionality - search by partial shop name
  const searchResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: "shop",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns valid response",
    searchResult.data.length >= 0,
  );
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  // Validate that all returned sellers contain the search term in shop_name
  await ArrayUtil.asyncForEach(searchResult.data, async (seller) => {
    TestValidator.predicate(
      `seller ${seller.id} shop_name contains search term`,
      seller.shop_name.toLowerCase().includes("shop"),
    );
  });
  // 3. Test sorting by created_at descending (newest first)
  const sortDescResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sortDescResult);
  TestValidator.predicate(
    "sort desc returns valid response",
    sortDescResult.data.length >= 0,
  );
  // Verify descending order (each seller should be older than or equal to previous)
  for (let i = 1; i < sortDescResult.data.length; i++) {
    const prevDate = new Date(sortDescResult.data[i - 1].created_at).getTime();
    const currDate = new Date(sortDescResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `seller ${i} is not newer than seller ${i - 1} in desc order`,
      currDate <= prevDate,
    );
  }
  // 4. Test sorting by created_at ascending (oldest first)
  const sortAscResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: "created_at",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sortAscResult);
  TestValidator.predicate(
    "sort asc returns valid response",
    sortAscResult.data.length >= 0,
  );
  // Verify ascending order (each seller should be newer than or equal to previous)
  for (let i = 1; i < sortAscResult.data.length; i++) {
    const prevDate = new Date(sortAscResult.data[i - 1].created_at).getTime();
    const currDate = new Date(sortAscResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `seller ${i} is not older than seller ${i - 1} in asc order`,
      currDate >= prevDate,
    );
  }
  // 5. Test sorting by shop_name alphabetically
  const sortByNameResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: "shop_name",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sortByNameResult);
  TestValidator.predicate(
    "sort by name returns valid response",
    sortByNameResult.data.length >= 0,
  );
  // Verify alphabetical order
  for (let i = 1; i < sortByNameResult.data.length; i++) {
    const prevName = sortByNameResult.data[i - 1].shop_name.toLowerCase();
    const currName = sortByNameResult.data[i].shop_name.toLowerCase();
    TestValidator.predicate(
      `seller ${i} name is not before seller ${i - 1} name alphabetically`,
      currName >= prevName,
    );
  }
  // 6. Test sorting by approval_status
  const sortByStatusResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: "approval_status",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sortByStatusResult);
  TestValidator.predicate(
    "sort by status returns valid response",
    sortByStatusResult.data.length >= 0,
  );
  // 7. Test combined filters: search + approval_status + status
  const combinedFilterResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: "shop",
        approval_status: "approved",
        status: "active",
        sort: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters return valid response",
    combinedFilterResult.data.length >= 0,
  );
  // Validate all results match all filter criteria
  await ArrayUtil.asyncForEach(combinedFilterResult.data, async (seller) => {
    TestValidator.predicate(
      `seller ${seller.id} matches search term`,
      seller.shop_name.toLowerCase().includes("shop"),
    );
    TestValidator.equals(
      `seller ${seller.id} approval_status is approved`,
      seller.approval_status,
      "approved",
    );
    TestValidator.equals(
      `seller ${seller.id} status is active`,
      seller.status,
      "active",
    );
  });
  // 8. Test empty search term returns all sellers
  const emptySearchResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: "",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns valid response",
    emptySearchResult.data.length >= 0,
  );
  // 9. Test non-matching search returns empty array
  const nonMatchingResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: "xyz_nonexistent_shop_name_12345",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(nonMatchingResult);
  TestValidator.equals(
    "non-matching search returns empty data",
    nonMatchingResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search pagination records",
    nonMatchingResult.pagination.records,
    0,
  );
  // 10. Test pagination with search and sort
  const paginationResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: "shop",
        sort: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginationResult.pagination.pages >= 0,
  );
  // Verify data length doesn't exceed limit
  TestValidator.predicate(
    "data length doesn't exceed limit",
    paginationResult.data.length <= 10,
  );
  // 11. Validate response structure - each seller has required fields
  if (searchResult.data.length > 0) {
    const firstSeller = searchResult.data[0];
    TestValidator.predicate("seller has id", firstSeller.id !== undefined);
    TestValidator.predicate(
      "seller has email",
      firstSeller.email !== undefined,
    );
    TestValidator.predicate(
      "seller has shop_name",
      firstSeller.shop_name !== undefined,
    );
    TestValidator.predicate(
      "seller has approval_status",
      firstSeller.approval_status !== undefined,
    );
    TestValidator.predicate(
      "seller has status",
      firstSeller.status !== undefined,
    );
    TestValidator.predicate(
      "seller has created_at",
      firstSeller.created_at !== undefined,
    );
    TestValidator.predicate(
      "seller has updated_at",
      firstSeller.updated_at !== undefined,
    );
  }
  // 12. Test filter by approval_status only
  const approvalStatusFilter = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(approvalStatusFilter);
  // Validate all results have pending approval_status
  await ArrayUtil.asyncForEach(approvalStatusFilter.data, async (seller) => {
    TestValidator.equals(
      `seller ${seller.id} has pending approval_status`,
      seller.approval_status,
      "pending",
    );
  });
  // 13. Test filter by status only
  const statusFilter = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        status: "banned",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(statusFilter);
  // Validate all results have banned status
  await ArrayUtil.asyncForEach(statusFilter.data, async (seller) => {
    TestValidator.equals(
      `seller ${seller.id} has banned status`,
      seller.status,
      "banned",
    );
  });
  // 14. Test pagination page 2
  const page2Result = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 pagination current",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    page2Result.pagination.limit,
    10,
  );
}
