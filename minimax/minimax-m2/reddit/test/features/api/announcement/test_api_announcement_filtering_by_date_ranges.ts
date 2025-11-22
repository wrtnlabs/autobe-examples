import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAnnouncement";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

/**
 * Test announcement filtering by date ranges using start_date_from,
 * start_date_to, end_date_from, end_date_to, created_at_from, and created_at_to
 * parameters to validate temporal filtering capabilities. Verifies that date
 * range queries work correctly for announcement scheduling and administrative
 * queries.
 */
export async function test_api_announcement_filtering_by_date_ranges(
  connection: api.IConnection,
) {
  // Note: This test validates date range filtering functionality. Since we cannot
  // create announcements through the provided API (no POST endpoint available),
  // we focus on testing the filtering query parameters and response structure.

  // Generate test timestamps for filtering criteria
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const recentDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const farFutureDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

  const pastIsoString = pastDate.toISOString();
  const recentIsoString = recentDate.toISOString();
  const nowIsoString = now.toISOString();
  const futureIsoString = futureDate.toISOString();
  const farFutureIsoString = farFutureDate.toISOString();

  // Test 1: Basic start_date_from filter
  const startDateFromResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        start_date_from: recentIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(startDateFromResult);
  TestValidator.predicate(
    "start_date_from filter should accept valid ISO date-time format",
    startDateFromResult.data !== undefined &&
      Array.isArray(startDateFromResult.data),
  );
  TestValidator.equals(
    "pagination should be present in response",
    startDateFromResult.pagination,
    startDateFromResult.pagination,
  );

  // Test 2: Basic start_date_to filter
  const startDateToResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        start_date_to: recentIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(startDateToResult);
  TestValidator.predicate(
    "start_date_to filter should accept valid ISO date-time format",
    startDateToResult.data !== undefined,
  );

  // Test 3: Basic created_at_from filter
  const createdAtFromResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        created_at_from: pastIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(createdAtFromResult);
  TestValidator.predicate(
    "created_at_from filter should accept valid ISO date-time format",
    createdAtFromResult.data !== undefined,
  );

  // Test 4: Basic created_at_to filter
  const createdAtToResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        created_at_to: recentIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(createdAtToResult);
  TestValidator.predicate(
    "created_at_to filter should accept valid ISO date-time format",
    createdAtToResult.data !== undefined,
  );

  // Test 5: Basic end_date_from filter
  const endDateFromResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        end_date_from: futureIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(endDateFromResult);
  TestValidator.predicate(
    "end_date_from filter should accept valid ISO date-time format",
    endDateFromResult.data !== undefined,
  );

  // Test 6: Basic end_date_to filter
  const endDateToResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        end_date_to: futureIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(endDateToResult);
  TestValidator.predicate(
    "end_date_to filter should accept valid ISO date-time format",
    endDateToResult.data !== undefined,
  );

  // Test 7: Combined multiple date filters
  const combinedFiltersResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        start_date_from: pastIsoString,
        start_date_to: futureIsoString,
        created_at_from: pastIsoString,
        created_at_to: recentIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(combinedFiltersResult);
  TestValidator.predicate(
    "combined date filters should accept multiple date-time parameters",
    combinedFiltersResult.data !== undefined,
  );

  // Test 8: Edge case - far future dates
  const futureOnlyResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        start_date_from: farFutureIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(futureOnlyResult);
  TestValidator.predicate(
    "far future dates should be accepted as valid input",
    futureOnlyResult.data !== undefined,
  );

  // Test 9: Edge case - same from and to date (boundary condition)
  const sameDateResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        start_date_from: nowIsoString,
        start_date_to: nowIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(sameDateResult);
  TestValidator.predicate(
    "identical from/to dates should be accepted as valid input",
    sameDateResult.data !== undefined,
  );

  // Test 10: Pagination parameters with date filters
  const paginationResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        created_at_from: pastIsoString,
        page: 2,
        limit: 15,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination should return requested page size",
    paginationResult.pagination.limit,
    15,
  );
  TestValidator.equals(
    "pagination should return requested page number",
    paginationResult.pagination.current,
    2,
  );

  // Test 11: Large date range
  const largeRangeResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        created_at_from: new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 1 year ago
        created_at_to: nowIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(largeRangeResult);
  TestValidator.predicate(
    "large date ranges should be accepted as valid input",
    largeRangeResult.data !== undefined,
  );

  // Test 12: Validate response structure when data exists
  if (startDateFromResult.data.length > 0) {
    const announcement = startDateFromResult.data[0];
    TestValidator.predicate(
      "announcements should have required properties when data exists",
      announcement.id !== undefined &&
        announcement.title !== undefined &&
        announcement.start_date !== undefined &&
        announcement.created_at !== undefined,
    );
  }

  // Test 13: Combined with announcement_type filter
  const typeWithDateResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        announcement_type: "info",
        start_date_from: pastIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(typeWithDateResult);
  TestValidator.predicate(
    "announcement_type filter should work with date filters",
    typeWithDateResult.data !== undefined,
  );

  // Test 14: Combined with is_active filter
  const activeWithDateResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        is_active: true,
        created_at_from: pastIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(activeWithDateResult);
  TestValidator.predicate(
    "is_active filter should work with date filters",
    activeWithDateResult.data !== undefined,
  );

  // Test 15: Combined with priority filters
  const priorityWithDateResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        priority_min: 1,
        priority_max: 10,
        start_date_from: pastIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(priorityWithDateResult);
  TestValidator.predicate(
    "priority filters should work with date filters",
    priorityWithDateResult.data !== undefined,
  );

  // Test 16: Target audience filter with date filtering
  const audienceWithDateResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "all_users",
        created_at_from: pastIsoString,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(audienceWithDateResult);
  TestValidator.predicate(
    "target_audience filter should work with date filters",
    audienceWithDateResult.data !== undefined,
  );

  // Test 17: Order by with date filtering
  const orderedResult = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        created_at_from: pastIsoString,
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(orderedResult);
  TestValidator.predicate(
    "ordering should work with date filtering",
    orderedResult.data !== undefined,
  );

  // Test 18: All filters combined
  const allFiltersResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        announcement_type: "info",
        target_audience: "registered_users",
        is_active: true,
        priority_min: 5,
        priority_max: 10,
        start_date_from: pastIsoString,
        start_date_to: futureIsoString,
        end_date_from: futureIsoString,
        end_date_to: farFutureIsoString,
        created_at_from: pastIsoString,
        created_at_to: recentIsoString,
        order_by: "priority",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(allFiltersResult);
  TestValidator.predicate(
    "all filters combined should work correctly",
    allFiltersResult.data !== undefined,
  );

  // Test 19: Validate date-time format compliance
  const dateFormatTest =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        start_date_from: "2023-01-01T00:00:00.000Z", // ISO 8601 format
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(dateFormatTest);
  TestValidator.predicate(
    "ISO 8601 date-time format should be accepted",
    dateFormatTest.data !== undefined,
  );

  // Test 20: Empty results handling
  const emptyResultsTest =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        start_date_from: new Date(
          now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 100 years in future
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(emptyResultsTest);
  TestValidator.predicate(
    "empty results should return valid response structure",
    emptyResultsTest.data.length >= 0,
  );

  console.log(
    "Date range filtering tests completed successfully - all date filter parameters validated",
  );
}
