import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_list_search_and_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for accessing HRM guest management endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  // Test 1: Search with partial matching (case-insensitive)
  const searchResult = await api.functional.hrm.guests.index(adminConnection, {
    body: {
      search: "device",
      limit: 100,
    } satisfies IHrmGuest.IRequest,
  });
  typia.assert(searchResult);
  // Test 2: Search with uppercase pattern (case-insensitive test)
  const upperSearchResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        search: "DEVICE",
        limit: 100,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(upperSearchResult);
  // Case-insensitive matching should find same count
  TestValidator.equals(
    "case-insensitive search returns same count",
    searchResult.pagination.records,
    upperSearchResult.pagination.records,
  );
  // Test 3: Deleted filter - deleted=false (active only)
  const activeOnlyResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        deleted: false,
        limit: 100,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(activeOnlyResult);
  // Test 4: Deleted filter - deleted=true (deleted only)
  const deletedOnlyResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        deleted: true,
        limit: 100,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(deletedOnlyResult);
  // Test 5: Deleted filter omitted (both active and deleted)
  const allResult = await api.functional.hrm.guests.index(adminConnection, {
    body: {
      limit: 100,
    } satisfies IHrmGuest.IRequest,
  });
  typia.assert(allResult);
  // Combined count validation
  TestValidator.predicate(
    "all results count >= active only count",
    allResult.pagination.records >= activeOnlyResult.pagination.records,
  );
  TestValidator.predicate(
    "all results count >= deleted only count",
    allResult.pagination.records >= deletedOnlyResult.pagination.records,
  );
  // Test 6: Search + deleted filter combination
  const searchAndActiveResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        search: "device",
        deleted: false,
        limit: 100,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(searchAndActiveResult);
  // Test 7: Search + deleted=true combination
  const searchAndDeletedResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        search: "device",
        deleted: true,
        limit: 100,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(searchAndDeletedResult);
  // Test 8: Empty search results handling
  const emptySearchResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        search: "nonexistent_fingerprint_xyz123abc",
        limit: 100,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  // Non-matching search should return empty data
  TestValidator.equals(
    "non-matching search returns empty data",
    emptySearchResult.data.length,
    0,
  );
  // Test 9: Pagination with search
  const paginatedSearchResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        search: "device",
        page: 1,
        limit: 10,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(paginatedSearchResult);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    paginatedSearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respects request",
    paginatedSearchResult.pagination.limit <= 10,
  );
  // Test 10: Verify search works across all guests (deleted filter omitted)
  const searchAllResult = await api.functional.hrm.guests.index(
    adminConnection,
    {
      body: {
        search: "device",
        limit: 100,
      } satisfies IHrmGuest.IRequest,
    },
  );
  typia.assert(searchAllResult);
  // Search without deleted filter should return results matching the search pattern
  // (or empty if no matching guests exist, which is also valid)
  TestValidator.predicate(
    "search without deleted filter returns matching guests or empty",
    searchAllResult.data.length === 0 ||
      searchAllResult.data.every((guest) =>
        guest.device_fingerprint.toLowerCase().includes("device"),
      ),
  );
}
