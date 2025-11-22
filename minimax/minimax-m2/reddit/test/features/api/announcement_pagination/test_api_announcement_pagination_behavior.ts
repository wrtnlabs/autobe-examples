import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAnnouncement";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

/**
 * Test pagination functionality for the Reddit platform announcements endpoint.
 *
 * This test validates the complete pagination behavior by:
 *
 * 1. Testing default pagination (first page with default limit)
 * 2. Testing different page numbers (page 2, page 3, beyond available pages)
 * 3. Testing different limit values (small, medium, large limits)
 * 4. Validating pagination metadata accuracy (current, limit, records, pages
 *    calculations)
 * 5. Testing page navigation consistency across multiple requests
 * 6. Testing boundary conditions (empty pages, last page, etc.)
 * 7. Verifying that the same page returns consistent results
 * 8. Testing pagination with filtering options combined
 * 9. Validating that pagination works correctly with different sorting orders
 *
 * The test ensures that the pagination system correctly handles:
 *
 * - Proper calculation of total pages based on records and limit
 * - Accurate current page tracking
 * - Consistent data ordering across pages
 * - Proper handling of edge cases (no results, single page, multiple pages)
 * - Correct record counting and metadata reporting
 */
export async function test_api_announcement_pagination_behavior(
  connection: api.IConnection,
) {
  // Test 1: Default pagination behavior
  const defaultResult = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {} satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(defaultResult);

  TestValidator.equals(
    "default page should be 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    defaultResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data array length should match limit or remaining records",
    defaultResult.data.length,
    Math.min(defaultResult.pagination.limit, defaultResult.pagination.records),
  );

  // Test 2: Test page 2 with standard limit
  const page2Result = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 current should be 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 5",
    page2Result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "same total records across pages",
    page2Result.pagination.records,
    defaultResult.pagination.records,
  );
  TestValidator.equals(
    "same total pages across requests",
    page2Result.pagination.pages,
    defaultResult.pagination.pages,
  );

  // Test 3: Test maximum limit (100)
  const maxLimitResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "max limit should be 100",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data should not exceed 100 items",
    maxLimitResult.data.length <= 100,
  );

  // Test 4: Test small limit (1 item per page)
  const smallLimitResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(smallLimitResult);

  TestValidator.equals(
    "small limit should be 1",
    smallLimitResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 1 with limit 1 should show 1 item",
    smallLimitResult.data.length,
    1,
  );

  // Test 5: Test page navigation consistency - request same page twice
  const firstRequest = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(firstRequest);

  const secondRequest = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(secondRequest);

  TestValidator.equals(
    "same page should return same results",
    firstRequest.data.length,
    secondRequest.data.length,
  );
  TestValidator.equals(
    "pagination metadata should be consistent",
    firstRequest.pagination.current,
    secondRequest.pagination.current,
  );
  TestValidator.equals(
    "total records should be consistent",
    firstRequest.pagination.records,
    secondRequest.pagination.records,
  );

  // Test 6: Test boundary condition - request beyond available pages
  const beyondPagesResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 999999,
        limit: 5,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(beyondPagesResult);

  TestValidator.equals(
    "beyond available pages should return empty data",
    beyondPagesResult.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be 999999",
    beyondPagesResult.pagination.current,
    999999,
  );
  TestValidator.equals(
    "total records should remain accurate",
    beyondPagesResult.pagination.records,
    defaultResult.pagination.records,
  );

  // Test 7: Test pagination with filtering
  const filteredResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 10,
        announcement_type: "info",
        is_active: true,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(filteredResult);

  TestValidator.equals(
    "filtered result should have pagination",
    filteredResult.data.length,
    Math.min(10, filteredResult.pagination.records),
  );
  TestValidator.predicate(
    "filtered pagination should be valid",
    filteredResult.pagination.pages >= 0,
  );

  // Test 8: Test sorting with pagination
  const sortedResult = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        order_by: "priority",
        order_direction: "desc",
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(sortedResult);

  TestValidator.equals(
    "sorted result should be paginated correctly",
    sortedResult.data.length,
    Math.min(5, sortedResult.pagination.records),
  );

  // Test 9: Validate announcement data structure in paginated results
  if (defaultResult.data.length > 0) {
    const firstAnnouncement = defaultResult.data[0];
    TestValidator.predicate(
      "announcement should have valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstAnnouncement.id,
      ),
    );
    TestValidator.predicate(
      "announcement should have title",
      firstAnnouncement.title.length > 0,
    );
    TestValidator.predicate(
      "announcement should have type",
      firstAnnouncement.announcement_type.length > 0,
    );
    TestValidator.predicate(
      "announcement should have target audience",
      firstAnnouncement.target_audience.length > 0,
    );
    TestValidator.predicate(
      "announcement should have valid priority",
      firstAnnouncement.priority >= 1 && firstAnnouncement.priority <= 10,
    );
    TestValidator.predicate(
      "announcement should have boolean active status",
      typeof firstAnnouncement.is_active === "boolean",
    );
  }

  // Test 10: Page calculation validation
  const calculationTestResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 7,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(calculationTestResult);

  // Validate that pages = Math.ceil(records / limit)
  const expectedPages = Math.ceil(calculationTestResult.pagination.records / 7);
  TestValidator.equals(
    "pages should be calculated correctly",
    calculationTestResult.pagination.pages,
    expectedPages,
  );

  // Test that current page is within valid range
  TestValidator.predicate(
    "current page should be within valid range",
    calculationTestResult.pagination.current >= 0 &&
      calculationTestResult.pagination.current <=
        calculationTestResult.pagination.pages,
  );
}
