import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering guest accounts by creation date range.
 *
 * This test validates the date range filtering functionality for guest account
 * listings, ensuring that guests are correctly filtered by their creation
 * timestamp. It also verifies pagination accuracy and search parameter
 * combination with date filters.
 */
export async function test_api_guest_list_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create base connection for API access
  const apiConnection: api.IConnection = { host: connection.host };
  // Generate test date range
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Create date boundaries for testing
  const dateBeforeRange = new Date(now.getTime() - oneDayMs * 10);
  const dateInRangeStart = new Date(now.getTime() - oneDayMs * 5);
  const dateInRangeMiddle = new Date(now.getTime() - oneDayMs * 2);
  const dateInRangeEnd = new Date(now.getTime() - oneDayMs);
  const dateAfterRange = new Date(now.getTime() + oneDayMs * 2);
  // Test 1: Query with empty date range (future dates) - should return empty or minimal results
  const emptyRangeQuery = await api.functional.shoppingMall.guests.index(
    apiConnection,
    {
      body: {
        created_at_from: dateAfterRange.toISOString(),
        created_at_to: new Date(
          dateAfterRange.getTime() + oneDayMs,
        ).toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(emptyRangeQuery);
  TestValidator.predicate(
    "empty range returns valid pagination",
    emptyRangeQuery.pagination.records >= 0,
  );
  // Test 2: Query with wide date range to capture existing guests
  const wideRangeQuery = await api.functional.shoppingMall.guests.index(
    apiConnection,
    {
      body: {
        created_at_from: dateBeforeRange.toISOString(),
        created_at_to: new Date(now.getTime() + oneDayMs * 30).toISOString(),
        page: 1,
        limit: 100,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(wideRangeQuery);
  // Validate all returned guests are within the date range
  for (const guest of wideRangeQuery.data) {
    const guestCreatedAt = new Date(guest.created_at);
    TestValidator.predicate(
      `guest ${guest.id} created_at is within range`,
      guestCreatedAt >= dateBeforeRange &&
        guestCreatedAt <= new Date(now.getTime() + oneDayMs * 30),
    );
  }
  // Test 3: Test inclusive boundary - query exact timestamp
  if (wideRangeQuery.data.length > 0) {
    const sampleGuest = wideRangeQuery.data[0];
    const exactBoundaryQuery = await api.functional.shoppingMall.guests.index(
      apiConnection,
      {
        body: {
          created_at_from: sampleGuest.created_at,
          created_at_to: sampleGuest.created_at,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallGuest.IRequest,
      },
    );
    typia.assert(exactBoundaryQuery);
    // Verify the guest at exact boundary is included
    const foundAtBoundary = exactBoundaryQuery.data.some(
      (g) => g.id === sampleGuest.id,
    );
    TestValidator.predicate(
      "guest at exact boundary timestamp is included",
      foundAtBoundary,
    );
  }
  // Test 4: Test pagination with date filter
  const paginatedQuery = await api.functional.shoppingMall.guests.index(
    apiConnection,
    {
      body: {
        created_at_from: dateBeforeRange.toISOString(),
        created_at_to: new Date(now.getTime() + oneDayMs * 30).toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(paginatedQuery);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    paginatedQuery.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedQuery.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginatedQuery.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginatedQuery.data.length <= 10,
  );
  // Test 5: Test combination of date filter with search parameter
  if (wideRangeQuery.data.length > 0) {
    const searchGuest = wideRangeQuery.data[0];
    const searchQuery = await api.functional.shoppingMall.guests.index(
      apiConnection,
      {
        body: {
          created_at_from: dateBeforeRange.toISOString(),
          created_at_to: new Date(now.getTime() + oneDayMs * 30).toISOString(),
          search: searchGuest.device_fingerprint.substring(0, 5),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallGuest.IRequest,
      },
    );
    typia.assert(searchQuery);
    // Validate all results match both date range and search criteria
    for (const guest of searchQuery.data) {
      const guestCreatedAt = new Date(guest.created_at);
      TestValidator.predicate(
        `guest ${guest.id} is within date range`,
        guestCreatedAt >= dateBeforeRange &&
          guestCreatedAt <= new Date(now.getTime() + oneDayMs * 30),
      );
      TestValidator.predicate(
        `guest ${guest.id} matches search term`,
        guest.device_fingerprint.includes(
          searchGuest.device_fingerprint.substring(0, 5),
        ) || guest.ip.includes(searchGuest.device_fingerprint.substring(0, 5)),
      );
    }
  }
  // Test 6: Test pagination page 2 with date filter
  if (paginatedQuery.pagination.pages > 1) {
    const page2Query = await api.functional.shoppingMall.guests.index(
      apiConnection,
      {
        body: {
          created_at_from: dateBeforeRange.toISOString(),
          created_at_to: new Date(now.getTime() + oneDayMs * 30).toISOString(),
          page: 2,
          limit: 10,
        } satisfies IShoppingMallGuest.IRequest,
      },
    );
    typia.assert(page2Query);
    TestValidator.equals(
      "page 2 pagination current is 2",
      page2Query.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 total records matches page 1",
      page2Query.pagination.records,
      paginatedQuery.pagination.records,
    );
    // Ensure no duplicate guests between pages
    const page1Ids = new Set(paginatedQuery.data.map((g) => g.id));
    const hasDuplicates = page2Query.data.some((g) => page1Ids.has(g.id));
    TestValidator.predicate(
      "no duplicate guests between pages",
      !hasDuplicates,
    );
  }
  // Test 7: Test include_deleted parameter with date filter
  const activeOnlyQuery = await api.functional.shoppingMall.guests.index(
    apiConnection,
    {
      body: {
        created_at_from: dateBeforeRange.toISOString(),
        created_at_to: new Date(now.getTime() + oneDayMs * 30).toISOString(),
        include_deleted: false,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(activeOnlyQuery);
  const includeDeletedQuery = await api.functional.shoppingMall.guests.index(
    apiConnection,
    {
      body: {
        created_at_from: dateBeforeRange.toISOString(),
        created_at_to: new Date(now.getTime() + oneDayMs * 30).toISOString(),
        include_deleted: true,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(includeDeletedQuery);
  // When include_deleted is false, count should be <= count when true
  TestValidator.predicate(
    "active only count is less than or equal to include deleted count",
    activeOnlyQuery.pagination.records <=
      includeDeletedQuery.pagination.records,
  );
}
