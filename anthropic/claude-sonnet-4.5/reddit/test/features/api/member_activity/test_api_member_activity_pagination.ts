import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test pagination functionality for member activity retrieval.
 *
 * This test validates that the member activity API correctly implements
 * pagination by verifying metadata accuracy and ensuring proper data
 * segmentation across pages.
 *
 * Steps:
 *
 * 1. Generate a test username for activity retrieval
 * 2. Fetch the first page with a small limit to enable pagination
 * 3. Verify pagination metadata (current page, total pages, records, limit)
 * 4. Validate pagination calculation formulas (pages = ceiling(records / limit))
 * 5. Verify data array length constraints
 * 6. Fetch subsequent pages to test navigation
 * 7. Verify non-overlapping result sets between pages
 * 8. Test with different limit values and verify recalculation
 * 9. Handle edge cases like empty results and boundary conditions
 */
export async function test_api_member_activity_pagination(
  connection: api.IConnection,
) {
  // Generate a random username for testing
  const testUsername = RandomGenerator.name(1);

  // Define pagination parameters - use small limit to test pagination
  const pageLimit =
    (typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() %
      10) +
    5;

  // Fetch first page of member activity
  const firstPageRequest = {
    page: 1,
    limit: pageLimit,
  } satisfies IRedditCommunityGuest.IActivityRequest;

  const firstPage: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: firstPageRequest,
    });
  typia.assert(firstPage);

  // Validate first page pagination metadata
  TestValidator.equals(
    "first page current should be 0",
    firstPage.pagination.current,
    0,
  );

  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    pageLimit,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Validate pagination calculation: pages = ceiling(records / limit)
  const expectedPages =
    firstPage.pagination.records === 0
      ? 0
      : Math.ceil(firstPage.pagination.records / firstPage.pagination.limit);

  TestValidator.equals(
    "pages should equal ceiling(records / limit)",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Validate data array length constraints
  TestValidator.predicate(
    "data array length should not exceed limit",
    firstPage.data.length <= pageLimit,
  );

  // Handle edge case: empty results
  if (firstPage.pagination.records === 0) {
    TestValidator.equals(
      "empty results should have 0 pages",
      firstPage.pagination.pages,
      0,
    );

    TestValidator.equals(
      "empty results should have empty data array",
      firstPage.data.length,
      0,
    );
  } else {
    // Non-empty results validation
    TestValidator.predicate(
      "non-empty results should have at least 1 page",
      firstPage.pagination.pages >= 1,
    );

    // First page should have data (unless records = 0, already handled above)
    TestValidator.predicate(
      "first page should contain data",
      firstPage.data.length > 0,
    );
  }

  // If there are multiple pages, test page navigation
  if (firstPage.pagination.pages > 1) {
    // Fetch second page
    const secondPageRequest = {
      page: 2,
      limit: pageLimit,
    } satisfies IRedditCommunityGuest.IActivityRequest;

    const secondPage: IPageIRedditCommunityGuest =
      await api.functional.redditCommunity.members.activity.index(connection, {
        username: testUsername,
        body: secondPageRequest,
      });
    typia.assert(secondPage);

    // Validate second page pagination metadata
    TestValidator.equals(
      "second page current should be 1",
      secondPage.pagination.current,
      1,
    );

    TestValidator.equals(
      "second page limit matches request",
      secondPage.pagination.limit,
      pageLimit,
    );

    TestValidator.equals(
      "total records should be consistent",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );

    TestValidator.equals(
      "total pages should be consistent",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );

    // Validate second page data length
    TestValidator.predicate(
      "second page data length should not exceed limit",
      secondPage.data.length <= pageLimit,
    );

    // Verify non-overlapping data between pages
    const firstPageIds = firstPage.data.map((item) => JSON.stringify(item));
    const secondPageIds = secondPage.data.map((item) => JSON.stringify(item));

    const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));

    TestValidator.predicate(
      "pages should contain non-overlapping data",
      !hasOverlap,
    );
  }

  // Test with different limit values to ensure flexibility
  const alternativeLimit =
    (typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() %
      20) +
    1;

  const alternativeLimitRequest = {
    page: 1,
    limit: alternativeLimit,
  } satisfies IRedditCommunityGuest.IActivityRequest;

  const alternativePage: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: alternativeLimitRequest,
    });
  typia.assert(alternativePage);

  TestValidator.equals(
    "alternative limit matches request",
    alternativePage.pagination.limit,
    alternativeLimit,
  );

  TestValidator.equals(
    "total records consistent across different limits",
    alternativePage.pagination.records,
    firstPage.pagination.records,
  );

  // Validate pages recalculation with different limit
  const expectedAlternativePages =
    alternativePage.pagination.records === 0
      ? 0
      : Math.ceil(alternativePage.pagination.records / alternativeLimit);

  TestValidator.equals(
    "pages recalculated correctly with different limit",
    alternativePage.pagination.pages,
    expectedAlternativePages,
  );
}
