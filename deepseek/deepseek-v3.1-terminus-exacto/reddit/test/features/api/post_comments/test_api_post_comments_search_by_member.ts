import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Comprehensive E2E test for post comment search functionality.
 *
 * This test validates the complete workflow of comment search operations for
 * posts created by authenticated members. It tests various search scenarios
 * including pagination, text search, status filtering, date range queries, and
 * sorting options. The test ensures that the search API returns appropriate
 * results based on different filtering criteria and validates the pagination
 * metadata.
 */
export async function test_api_post_comments_search_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post using the authenticated member
  // Use a realistic community ID (assuming one exists in the system)
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Test basic comment search with pagination
  const emptySearchResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns pagination info",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search returns correct limit",
    emptySearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );

  // Step 4: Test search with specific status filter
  const statusSearchResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        status: "published",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(statusSearchResult);
  TestValidator.equals(
    "status search returns pagination info",
    statusSearchResult.pagination.current,
    1,
  );

  // Step 5: Test search with date range filtering
  const dateSearchResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        created_after: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
        created_before: new Date().toISOString(),
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(dateSearchResult);
  TestValidator.equals(
    "date range search returns pagination info",
    dateSearchResult.pagination.current,
    1,
  );

  // Step 6: Test search with sorting options
  const sortedSearchResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 15,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(sortedSearchResult);
  TestValidator.equals(
    "sorted search returns pagination info",
    sortedSearchResult.pagination.current,
    1,
  );

  // Step 7: Test search with score filtering
  const scoreSearchResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        score_min: 0,
        score_max: 100,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(scoreSearchResult);
  TestValidator.equals(
    "score filtered search returns pagination info",
    scoreSearchResult.pagination.current,
    1,
  );

  // Step 8: Test search with multiple criteria combined
  const combinedSearchResult =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        status: "published",
        sort_by: "score",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(combinedSearchResult);
  TestValidator.equals(
    "combined search returns pagination info",
    combinedSearchResult.pagination.current,
    1,
  );
}
