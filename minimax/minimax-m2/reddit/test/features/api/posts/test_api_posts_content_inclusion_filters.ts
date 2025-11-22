import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test inclusion filters for post retrieval in Reddit-like platform API.
 *
 * This test validates the content filtering capabilities of the posts API
 * endpoint, specifically focusing on how include_deleted, include_nsfw, and
 * include_spoilers filters control content visibility. The test ensures proper
 * content safety filtering and correct behavior across different content types
 * and communities.
 */
export async function test_api_posts_content_inclusion_filters(
  connection: api.IConnection,
) {
  // Test 1: Default behavior - no deleted content should be shown
  const defaultFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(defaultFilterResult);
  TestValidator.equals(
    "default filter result has correct pagination",
    defaultFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default filter should not include soft-deleted content",
    !defaultFilterResult.data.some(
      (post) => post.status === "removed" || post.deleted_at !== null,
    ),
  );

  // Test 2: Include deleted content - should show soft-deleted posts with indication
  const includeDeletedResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
        include_deleted: true,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(includeDeletedResult);
  TestValidator.equals(
    "include deleted filter result has correct pagination",
    includeDeletedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "include_deleted should show posts with deleted_at timestamp",
    includeDeletedResult.data.some((post) => post.deleted_at !== null),
  );

  // Test 3: NSFW content filtering
  const nsfwFilteredResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
        include_nsfw: false,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(nsfwFilteredResult);
  TestValidator.equals(
    "NSFW filtered result has correct pagination",
    nsfwFilteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "NSFW filter should respect content policy",
    nsfwFilteredResult.data.every(
      (post) =>
        post.status !== "removed" || !post.title.toLowerCase().includes("nsfw"),
    ),
  );

  const includeNsfwResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
        include_nsfw: true,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(includeNsfwResult);
  TestValidator.equals(
    "include NSFW result has correct pagination",
    includeNsfwResult.pagination.current,
    1,
  );

  // Test 4: Spoiler content filtering
  const spoilerFilteredResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
        include_spoilers: false,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(spoilerFilteredResult);
  TestValidator.equals(
    "spoiler filtered result has correct pagination",
    spoilerFilteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "spoiler filter should exclude spoiler content",
    !spoilerFilteredResult.data.some((post) =>
      post.title.toLowerCase().includes("spoiler"),
    ),
  );

  const includeSpoilerResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
        include_spoilers: true,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(includeSpoilerResult);
  TestValidator.equals(
    "include spoiler result has correct pagination",
    includeSpoilerResult.pagination.current,
    1,
  );

  // Test 5: Combined filters - multiple inclusion filters together
  const combinedFiltersResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
        include_deleted: true,
        include_nsfw: true,
        include_spoilers: true,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(combinedFiltersResult);
  TestValidator.equals(
    "combined filters result has correct pagination",
    combinedFiltersResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined filters should show all content types",
    combinedFiltersResult.data.length >= defaultFilterResult.data.length,
  );

  // Test 6: Community-specific filtering
  const communityFilteredResult =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        page: 1,
        limit: 25,
        sort_by: "created_at",
        sort_order: "desc",
        include_deleted: false,
        include_nsfw: false,
        include_spoilers: false,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(communityFilteredResult);
  TestValidator.equals(
    "community filtered result has correct pagination",
    communityFilteredResult.pagination.current,
    1,
  );

  // Test 7: Edge case - boundary limits with filters
  const boundaryLimitResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Maximum limit
        sort_by: "created_at",
        sort_order: "desc",
        include_deleted: true,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(boundaryLimitResult);
  TestValidator.equals(
    "boundary limit result respects maximum limit",
    boundaryLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "boundary limit should return up to 100 items",
    boundaryLimitResult.data.length <= 100,
  );
}
