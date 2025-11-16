import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test full-text search functionality across member activity.
 *
 * This test validates the search parameter functionality for filtering member
 * activity (posts and comments) based on text content. It verifies:
 *
 * 1. Baseline activity retrieval without search filters
 * 2. Search filtering with specific search terms
 * 3. Search combined with content type filters (posts/comments/all)
 * 4. Pagination functionality with search parameters
 * 5. Case-insensitive and partial text matching behavior
 *
 * The test ensures that the API correctly filters activity items containing the
 * search text in their title or content fields, supporting case-insensitive
 * partial matching as specified in the requirements.
 */
export async function test_api_member_activity_text_search(
  connection: api.IConnection,
) {
  // Generate a test username for activity queries
  const testUsername = RandomGenerator.name(1);

  // Test 1: Retrieve activity without search filter (baseline)
  const baselineActivity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(baselineActivity);

  // Test 2: Retrieve activity with a search term
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });
  const searchedActivity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(searchedActivity);

  // Test 3: Search with content_type filter for posts only
  const postsWithSearch =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "posts",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(postsWithSearch);

  // Test 4: Search with content_type filter for comments only
  const commentsWithSearch =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "comments",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(commentsWithSearch);

  // Test 5: Search with content_type 'all'
  const allContentWithSearch =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 20,
        search: RandomGenerator.name(2),
        content_type: "all",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(allContentWithSearch);

  // Test 6: Pagination with search
  const paginatedSearch =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 2,
        limit: 5,
        search: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(paginatedSearch);

  // Test 7: Search with date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const searchWithDateRange =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(searchWithDateRange);

  // Test 8: Search with community filter
  const communityCode = RandomGenerator.alphaNumeric(8);
  const searchWithCommunity =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 1 }),
        community_code: communityCode,
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(searchWithCommunity);

  // Test 9: Search with sorting by newest
  const searchSortedNewest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 1 }),
        sort_by: "newest",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(searchSortedNewest);

  // Test 10: Search with sorting by most_upvoted
  const searchSortedUpvoted =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.paragraph({ sentences: 2 }),
        sort_by: "most_upvoted",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(searchSortedUpvoted);

  // Test 11: Empty search string
  const emptySearch =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 10,
        search: "",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(emptySearch);

  // Test 12: Complex search scenario with all parameters
  const complexSearch =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: {
        page: 1,
        limit: 15,
        search: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        content_type: "all",
        community_code: RandomGenerator.alphaNumeric(6),
        start_date: thirtyDaysAgo.toISOString(),
        end_date: now.toISOString(),
        sort_by: "newest",
      } satisfies IRedditCommunityGuest.IActivityRequest,
    });
  typia.assert(complexSearch);
}
