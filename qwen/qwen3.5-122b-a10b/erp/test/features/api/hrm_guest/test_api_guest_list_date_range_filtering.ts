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

/**
 * Test guest list filtering by creation date range.
 *
 * Validates that the createdAfter and createdBefore query parameters correctly filter guest records within specified time windows. This test ensures inclusive boundary handling and validates various filtering combinations.
 *
 * The test queries the guest list endpoint with different date range configurations to verify filtering accuracy. Since guest creation is not directly available through the API, this test validates the filtering logic with existing data and parameter combinations.
 *
 * 1. Query guests with no date filters (baseline).
 * 2. Query guests with only createdAfter filter.
 * 3. Query guests with only createdBefore filter.
 * 4. Query guests with both createdAfter and createdBefore filters.
 * 5. Query with date range that returns no results.
 * 6. Validate pagination metadata is correct for each query.
 * 7. Validate all returned guests satisfy the date constraints.
 */
export async function test_api_guest_list_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Generate test date boundaries
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const twoDaysAgo = new Date(now.getTime() - 2 * oneDay);
  const oneDayAgo = new Date(now.getTime() - oneDay);
  const futureDate = new Date(now.getTime() + oneDay);
  // Test 1: Query with no date filters (baseline)
  const baseline = await api.functional.hrm.guests.index(connection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies IHrmGuest.IRequest,
  });
  typia.assert(baseline);
  // Test 2: Query with only createdAfter filter
  const afterFilter = await api.functional.hrm.guests.index(connection, {
    body: {
      createdAfter: twoDaysAgo.toISOString(),
      page: 1,
      limit: 100,
    } satisfies IHrmGuest.IRequest,
  });
  typia.assert(afterFilter);
  // Validate all returned guests were created after the filter date
  TestValidator.predicate(
    "all guests created after filter date",
    afterFilter.data.every((guest) => new Date(guest.created_at) >= twoDaysAgo),
  );
  // Test 3: Query with only createdBefore filter
  const beforeFilter = await api.functional.hrm.guests.index(connection, {
    body: {
      createdBefore: oneDayAgo.toISOString(),
      page: 1,
      limit: 100,
    } satisfies IHrmGuest.IRequest,
  });
  typia.assert(beforeFilter);
  // Validate all returned guests were created before the filter date
  TestValidator.predicate(
    "all guests created before filter date",
    beforeFilter.data.every((guest) => new Date(guest.created_at) <= oneDayAgo),
  );
  // Test 4: Query with both createdAfter and createdBefore filters
  const rangeFilter = await api.functional.hrm.guests.index(connection, {
    body: {
      createdAfter: twoDaysAgo.toISOString(),
      createdBefore: oneDayAgo.toISOString(),
      page: 1,
      limit: 100,
    } satisfies IHrmGuest.IRequest,
  });
  typia.assert(rangeFilter);
  // Validate all returned guests fall within the date range
  TestValidator.predicate(
    "all guests within date range",
    rangeFilter.data.every((guest) => {
      const guestDate = new Date(guest.created_at);
      return guestDate >= twoDaysAgo && guestDate <= oneDayAgo;
    }),
  );
  // Test 5: Query with date range that returns no results
  const emptyRange = await api.functional.hrm.guests.index(connection, {
    body: {
      createdAfter: futureDate.toISOString(),
      page: 1,
      limit: 100,
    } satisfies IHrmGuest.IRequest,
  });
  typia.assert(emptyRange);
  // Validate empty result for future date
  TestValidator.equals(
    "future date filter returns empty",
    emptyRange.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyRange.pagination.records,
    0,
  );
  // Test 6: Validate pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    () => baseline.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => baseline.pagination.limit >= 1 && baseline.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => baseline.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => baseline.pagination.pages >= 0,
  );
  // Test 7: Validate guest data exists and has valid structure
  TestValidator.predicate("baseline has valid guest data", () =>
    baseline.data.every((guest) => typia.is<IHrmGuest.ISummary>(guest)),
  );
}
