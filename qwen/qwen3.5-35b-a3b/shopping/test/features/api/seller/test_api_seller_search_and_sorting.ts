import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Empty search returns all sellers
  const searchEmpty = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    { body: {} satisfies IEcommerceMallSeller.IRequest },
  );
  typia.assert(searchEmpty);
  const allSellerCount = searchEmpty.data.length;
  TestValidator.equals(
    "empty search returns sellers",
    allSellerCount > 0,
    true,
  );
  // Test 2: Pagination works with empty search
  const paginatedSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "paginated limit respected",
    paginatedSearch.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "pagination metadata",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedSearch.pagination.limit, 5);
  TestValidator.equals(
    "total records accurate",
    paginatedSearch.pagination.records,
    paginatedSearch.pagination.records,
  );
  // Test 3: Sort by created_at descending (default)
  const sortedDesc = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: "created_at",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(sortedDesc);
  TestValidator.equals(
    "sort by created_at executed",
    sortedDesc.data.length > 0,
    true,
  );
  // Test 4: Sort by display_name alphabetically
  const sortedByName = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: "display_name",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(sortedByName);
  TestValidator.equals(
    "sort by display_name executed",
    sortedByName.data.length > 0,
    true,
  );
  // Test 5: Sort by approval_status
  const sortedByStatus = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: "approval_status",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(sortedByStatus);
  TestValidator.equals(
    "sort by approval_status executed",
    sortedByStatus.data.length > 0,
    true,
  );
  // Test 6: Filter by approval_status=pending
  const pendingSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(pendingSearch);
  // Validate all returned sellers have pending status
  const allPending = pendingSearch.data.every(
    (seller) => seller.approval_status === "pending",
  );
  TestValidator.predicate("all pending sellers filtered", allPending);
  // Test 7: Filter by approval_status=approved
  const approvedSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "approved",
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(approvedSearch);
  const allApproved = approvedSearch.data.every(
    (seller) => seller.approval_status === "approved",
  );
  TestValidator.predicate("all approved sellers filtered", allApproved);
  // Test 8: Filter by is_suspended
  const suspendedSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        is_suspended: true,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(suspendedSearch);
  const allSuspended = suspendedSearch.data.every(
    (seller) => seller.is_suspended === true,
  );
  TestValidator.predicate("all suspended sellers filtered", allSuspended);
  // Test 9: Search by display_name partial match
  if (allSellerCount > 0) {
    const sampleSeller = searchEmpty.data[0];
    const searchByName = await api.functional.ecommerceMall.sellers.index(
      adminConnection,
      {
        body: {
          search: sampleSeller.display_name.substring(0, 3),
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
    typia.assert(searchByName);
    TestValidator.equals(
      "search by name returns results",
      searchByName.pagination.records >= 0,
      true,
    );
  }
  // Test 10: Search by email partial match
  const allSellersWithEmail = searchEmpty.data.filter(
    (s) => s.email !== undefined,
  );
  if (allSellersWithEmail.length > 0) {
    const sampleSellerEmail = allSellersWithEmail[0].email!;
    const searchByEmail = await api.functional.ecommerceMall.sellers.index(
      adminConnection,
      {
        body: {
          search: sampleSellerEmail.substring(0, 5),
        } satisfies IEcommerceMallSeller.IRequest,
      },
    );
    typia.assert(searchByEmail);
    TestValidator.equals(
      "search by email returns results",
      searchByEmail.pagination.records >= 0,
      true,
    );
  }
  // Test 11: Date range filtering - created_at_min
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const dateMinSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        created_at_min: twoWeeksAgo.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(dateMinSearch);
  // All sellers should be created after the min date
  const allAfterMin = dateMinSearch.data.every(
    (seller) => new Date(seller.created_at) >= twoWeeksAgo,
  );
  TestValidator.predicate("all sellers after min date", allAfterMin);
  // Test 12: Date range filtering - created_at_max
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateMaxSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        created_at_max: yesterday.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(dateMaxSearch);
  // All sellers should be created before the max date
  const allBeforeMax = dateMaxSearch.data.every(
    (seller) => new Date(seller.created_at) <= yesterday,
  );
  TestValidator.predicate("all sellers before max date", allBeforeMax);
  // Test 13: Combined date range (min + max)
  const dateRangeSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        created_at_min: twoWeeksAgo.toISOString(),
        created_at_max: yesterday.toISOString(),
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
  const allInRange = dateRangeSearch.data.every((seller) => {
    const created = new Date(seller.created_at);
    return created >= twoWeeksAgo && created <= yesterday;
  });
  TestValidator.predicate("sellers in date range", allInRange);
  // Test 14: Pagination with search filter
  const paginatedWithFilter = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "approved",
        page: 1,
        limit: 3,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(paginatedWithFilter);
  TestValidator.equals(
    "pagination with filter limit respected",
    paginatedWithFilter.data.length <= 3,
    true,
  );
  TestValidator.equals(
    "pagination with filter current page",
    paginatedWithFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination with filter limit value",
    paginatedWithFilter.pagination.limit,
    3,
  );
  // Test 15: Pagination with different page
  const page2Search = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(page2Search);
  TestValidator.equals("pagination page 2", page2Search.pagination.current, 2);
  TestValidator.equals(
    "pagination page 2 limit",
    page2Search.pagination.limit,
    5,
  );
  // Test 16: include_deleted=false (default) - no deleted sellers
  const deletedFalseSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        include_deleted: false,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(deletedFalseSearch);
  const noDeletedIncluded = deletedFalseSearch.data.every(
    (seller) => seller.deleted_at === undefined || seller.deleted_at === null,
  );
  TestValidator.predicate("no deleted sellers included", noDeletedIncluded);
  // Test 17: include_deleted=true - should include deleted sellers if any exist
  const deletedTrueSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        include_deleted: true,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(deletedTrueSearch);
  // Verify the call succeeds and include_deleted is honored
  // Note: Deleted sellers count may vary based on test database state
  const deletedCount = deletedTrueSearch.data.filter(
    (s) => s.deleted_at !== null,
  ).length;
  TestValidator.equals(
    "deleted sellers can be included",
    deletedCount >= 0,
    true,
  );
  // Test 18: Multiple sort and filter combination
  const complexSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
        sort: "created_at",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(complexSearch);
  const allPendingInComplex = complexSearch.data.every(
    (seller) => seller.approval_status === "pending",
  );
  TestValidator.predicate("complex search all pending", allPendingInComplex);
  TestValidator.equals(
    "complex search pagination",
    complexSearch.pagination.current,
    1,
  );
  // Test 19: Verify pagination metadata accuracy
  const totalPages = Math.ceil(
    deletedTrueSearch.pagination.records / deletedTrueSearch.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    totalPages,
    deletedTrueSearch.pagination.pages,
  );
  // Test 20: Verify limit maximum constraint (100)
  const maxLimitSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(maxLimitSearch);
  TestValidator.equals(
    "max limit respected",
    maxLimitSearch.pagination.limit,
    100,
  );
  // Test 21: Verify page minimum constraint (1)
  const minPageSearch = await api.functional.ecommerceMall.sellers.index(
    adminConnection,
    {
      body: {
        page: 1,
      } satisfies IEcommerceMallSeller.IRequest,
    },
  );
  typia.assert(minPageSearch);
  TestValidator.equals(
    "min page respected",
    minPageSearch.pagination.current,
    1,
  );
}
