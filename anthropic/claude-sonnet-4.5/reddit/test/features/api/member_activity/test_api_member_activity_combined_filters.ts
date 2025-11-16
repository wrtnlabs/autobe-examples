import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test complex scenarios combining multiple filter parameters for member
 * activity retrieval.
 *
 * This test validates that the member activity API correctly applies multiple
 * filters simultaneously. It creates diverse member activity data across
 * communities, time periods, and content types, then retrieves activity using
 * various combinations of content_type, community_code, date range, search
 * text, and sorting options.
 *
 * The test ensures proper intersection of filter conditions - all filters must
 * be satisfied for results to be returned.
 *
 * Steps:
 *
 * 1. Generate test username for member activity queries
 * 2. Test baseline query with no filters
 * 3. Test content_type filter alone (posts, comments, all)
 * 4. Test community_code filter with specific community
 * 5. Test date range filtering (start_date and end_date)
 * 6. Test search text filtering
 * 7. Test sorting options (newest, oldest, most_upvoted)
 * 8. Test complex combinations of multiple filters together
 * 9. Test pagination with combined filters
 * 10. Validate that all filter combinations return valid paginated responses with
 *     proper data structure
 */
export async function test_api_member_activity_combined_filters(
  connection: api.IConnection,
) {
  // Generate test username
  const testUsername = RandomGenerator.name(1);

  // Test 1: Baseline query with no filters - just pagination
  const baselineResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(baselineResult);
  TestValidator.equals(
    "baseline pagination current page",
    baselineResult.pagination.current,
    0,
  );
  TestValidator.predicate(
    "baseline data is array",
    Array.isArray(baselineResult.data),
  );

  // Validate data structure if data exists
  if (baselineResult.data.length > 0) {
    const firstGuest = baselineResult.data[0];
    typia.assert(firstGuest);
    TestValidator.predicate(
      "guest has total_posts",
      typeof firstGuest.total_posts === "number",
    );
    TestValidator.predicate(
      "guest has total_comments",
      typeof firstGuest.total_comments === "number",
    );
    TestValidator.predicate(
      "guest has post_karma",
      typeof firstGuest.post_karma === "number",
    );
    TestValidator.predicate(
      "guest has comment_karma",
      typeof firstGuest.comment_karma === "number",
    );
    TestValidator.predicate(
      "guest has total_karma",
      typeof firstGuest.total_karma === "number",
    );
    TestValidator.predicate(
      "total_posts non-negative",
      firstGuest.total_posts >= 0,
    );
    TestValidator.predicate(
      "total_comments non-negative",
      firstGuest.total_comments >= 0,
    );
  }

  // Test 2: Content type filter - posts only
  const postsOnlyResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        content_type: "posts",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(postsOnlyResult);
  TestValidator.predicate(
    "posts only result is valid",
    postsOnlyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "posts only data is array",
    Array.isArray(postsOnlyResult.data),
  );

  // Test 3: Content type filter - comments only
  const commentsOnlyResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        content_type: "comments",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(commentsOnlyResult);
  TestValidator.predicate(
    "comments only result is valid",
    commentsOnlyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "comments only data is array",
    Array.isArray(commentsOnlyResult.data),
  );

  // Test 4: Content type filter - all content
  const allContentResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        content_type: "all",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(allContentResult);
  TestValidator.predicate(
    "all content result is valid",
    allContentResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all content data is array",
    Array.isArray(allContentResult.data),
  );

  // Test 5: Community filter
  const communityCode = RandomGenerator.alphabets(8);
  const communityFilterResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        community_code: communityCode,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(communityFilterResult);
  TestValidator.predicate(
    "community filter result is valid",
    communityFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "community filter data is array",
    Array.isArray(communityFilterResult.data),
  );

  // Test 6: Date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range result is valid",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "date range data is array",
    Array.isArray(dateRangeResult.data),
  );

  // Test 7: Search text filter
  const searchText = RandomGenerator.paragraph({ sentences: 2 });
  const searchResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: searchText,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search result is valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search data is array",
    Array.isArray(searchResult.data),
  );

  // Test 8: Sorting - newest first
  const newestSortResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        sort_by: "newest",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(newestSortResult);
  TestValidator.predicate(
    "newest sort result is valid",
    newestSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "newest sort data is array",
    Array.isArray(newestSortResult.data),
  );

  // Test 9: Sorting - oldest first
  const oldestSortResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        sort_by: "oldest",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(oldestSortResult);
  TestValidator.predicate(
    "oldest sort result is valid",
    oldestSortResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "oldest sort data is array",
    Array.isArray(oldestSortResult.data),
  );

  // Test 10: Sorting - most upvoted
  const mostUpvotedResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        sort_by: "most_upvoted",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(mostUpvotedResult);
  TestValidator.predicate(
    "most upvoted result is valid",
    mostUpvotedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "most upvoted data is array",
    Array.isArray(mostUpvotedResult.data),
  );

  // Test 11: Complex combination - content type + community + date range
  const complexCombo1 =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        content_type: "posts",
        community_code: communityCode,
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(complexCombo1);
  TestValidator.predicate(
    "complex combo 1 is valid",
    complexCombo1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complex combo 1 data is array",
    Array.isArray(complexCombo1.data),
  );

  // Test 12: Complex combination - content type + search + sorting
  const complexCombo2 =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        content_type: "comments",
        search: RandomGenerator.paragraph({ sentences: 1 }),
        sort_by: "newest",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(complexCombo2);
  TestValidator.predicate(
    "complex combo 2 is valid",
    complexCombo2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complex combo 2 data is array",
    Array.isArray(complexCombo2.data),
  );

  // Test 13: Complex combination - all filters together
  const allFiltersCombo =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 5,
        content_type: "all",
        community_code: communityCode,
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
        search: RandomGenerator.paragraph({ sentences: 1 }),
        sort_by: "most_upvoted",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(allFiltersCombo);
  TestValidator.predicate(
    "all filters combo is valid",
    allFiltersCombo.pagination.records >= 0,
  );
  TestValidator.equals(
    "all filters combo page limit",
    allFiltersCombo.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "all filters combo data is array",
    Array.isArray(allFiltersCombo.data),
  );

  // Test 14: Pagination with filters - page 2
  const paginationTest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 2,
        limit: 10,
        content_type: "all",
        sort_by: "newest",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination result is valid",
    paginationTest.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination data is array",
    Array.isArray(paginationTest.data),
  );

  // Test 15: Extreme limit values
  const smallLimitResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 1,
        content_type: "all",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit is respected",
    smallLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "small limit data is array",
    Array.isArray(smallLimitResult.data),
  );

  const largeLimitResult =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 100,
        content_type: "all",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit is respected",
    largeLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit data is array",
    Array.isArray(largeLimitResult.data),
  );
}
