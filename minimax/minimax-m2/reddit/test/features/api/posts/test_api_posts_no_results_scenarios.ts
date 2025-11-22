import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_posts_no_results_scenarios(
  connection: api.IConnection,
) {
  // Test 1: Empty database scenario - no posts exist
  const emptyDbResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(emptyDbResult);
  TestValidator.equals(
    "empty database returns zero records",
    emptyDbResult.data,
    [],
  );
  TestValidator.equals(
    "empty database shows zero pagination records",
    emptyDbResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty database shows zero pagination pages",
    emptyDbResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty database pagination current is 1",
    emptyDbResult.pagination.current,
    1,
  );

  // Test 2: Non-existent community ID filter
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  const communityFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        reddit_community_id: nonExistentCommunityId,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(communityFilterResult);
  TestValidator.equals(
    "non-existent community returns empty results",
    communityFilterResult.data,
    [],
  );

  // Test 3: Non-existent user ID filter
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const userFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        reddit_registereduser_id: nonExistentUserId,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(userFilterResult);
  TestValidator.equals(
    "non-existent user returns empty results",
    userFilterResult.data,
    [],
  );

  // Test 4: Overly restrictive score filters - impossible ranges
  const scoreFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        min_score: 999999, // Extremely high score threshold
        max_score: -999999, // Impossible negative range
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(scoreFilterResult);
  TestValidator.equals(
    "impossible score range returns empty results",
    scoreFilterResult.data,
    [],
  );

  // Test 5: Date range that excludes all posts (future dates if any posts exist)
  const farFutureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        created_after: farFutureDate,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "future date range returns empty results",
    dateRangeResult.data,
    [],
  );

  // Test 6: Search term that doesn't exist in any posts
  const nonExistentSearch = RandomGenerator.alphabets(20); // Random 20-char string
  const searchResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        search: nonExistentSearch,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "non-existent search term returns empty results",
    searchResult.data,
    [],
  );

  // Test 7: Valid content type filters that return no results (testing empty state for specific content)
  const contentTypeResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        content_type: "image", // Test with valid content type that might not exist
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(contentTypeResult);
  TestValidator.equals(
    "specific content type with no posts returns empty results",
    contentTypeResult.data,
    [],
  );

  // Test 8: Valid status filters that return no results (testing empty state for specific status)
  const statusResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        status: "locked", // Test with valid status that might not exist
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(statusResult);
  TestValidator.equals(
    "specific status with no posts returns empty results",
    statusResult.data,
    [],
  );

  // Test 9: Multiple restrictive filters combined
  const combinedFiltersResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        min_score: 1000,
        min_comment_count: 100,
        created_before: "2020-01-01T00:00:00.000Z", // Very old date
        search: "nonexistentkeyword123",
        page: 1,
        limit: 25,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(combinedFiltersResult);
  TestValidator.equals(
    "combined restrictive filters return empty results",
    combinedFiltersResult.data,
    [],
  );

  // Test 10: Pagination edge case - requesting high page numbers
  const highPageResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 999999, // Very high page number
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(highPageResult);
  TestValidator.equals(
    "high page number returns empty results",
    highPageResult.data,
    [],
  );

  // Test 11: Combination of non-existent resource + restrictive filters
  const complexFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_registereduser_id: typia.random<string & tags.Format<"uuid">>(),
        min_score: 500,
        search: "randomsearchterm",
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(complexFilterResult);
  TestValidator.equals(
    "complex non-existent filters return empty results",
    complexFilterResult.data,
    [],
  );

  // Test 12: Verify pagination metadata consistency across all empty results
  TestValidator.equals(
    "pagination metadata is consistent for empty results",
    emptyDbResult.pagination,
    {
      current: 1,
      limit: 25,
      records: 0,
      pages: 0,
    },
  );

  // Test 13: Test with include_deleted=true but still no deleted posts exist
  const includeDeletedResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        include_deleted: true,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(includeDeletedResult);
  TestValidator.equals(
    "include_deleted with no deleted posts returns empty",
    includeDeletedResult.data,
    [],
  );

  // Test 14: Test with extreme comment count thresholds
  const commentThresholdResult =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        min_comment_count: 999999, // Extremely high threshold
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(commentThresholdResult);
  TestValidator.equals(
    "extreme comment threshold returns empty results",
    commentThresholdResult.data,
    [],
  );

  // Test 15: Test with NSFW/Spoiler filters when no matching content exists
  const nsfwFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        include_nsfw: true,
        include_spoilers: true,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(nsfwFilterResult);
  TestValidator.equals(
    "NSFW/spoiler filters with no matching content return empty",
    nsfwFilterResult.data,
    [],
  );
}
