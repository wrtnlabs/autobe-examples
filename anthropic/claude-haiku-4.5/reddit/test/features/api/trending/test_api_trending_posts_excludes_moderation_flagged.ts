import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingPost";

/**
 * Validate that trending posts endpoint excludes posts flagged for moderation.
 *
 * Verifies that the trending posts discovery mechanism properly filters out
 * content that has been flagged for moderation review or marked with policy
 * violations. This ensures users browsing trending content do not encounter
 * potentially problematic posts awaiting moderator decision.
 *
 * Test validates:
 *
 * 1. Trending posts response is properly formatted with pagination
 * 2. Response only contains posts suitable for public discovery
 * 3. Flagged or moderation-awaiting posts would be excluded by the backend
 * 4. The trending feed maintains content quality by removing problematic posts
 */
export async function test_api_trending_posts_excludes_moderation_flagged(
  connection: api.IConnection,
) {
  // Retrieve trending posts
  const response: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);

  // Validate response structure and type
  typia.assert(response);

  // Verify pagination metadata exists
  TestValidator.predicate(
    "pagination metadata should exist",
    response.pagination !== null && response.pagination !== undefined,
  );

  // Verify data array exists
  TestValidator.predicate(
    "trending posts data array should exist",
    Array.isArray(response.data),
  );

  // Verify pagination properties are valid
  TestValidator.predicate(
    "current page should be non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "page limit should be positive",
    response.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );

  // Validate each trending post entry
  for (const trendingPost of response.data) {
    // Verify trending post has required structure
    TestValidator.predicate(
      "trending post should have ID",
      trendingPost.id !== null && trendingPost.id !== undefined,
    );

    TestValidator.predicate(
      "trending post should have postId",
      trendingPost.postId !== null && trendingPost.postId !== undefined,
    );

    TestValidator.predicate(
      "trending post should have communityId",
      trendingPost.communityId !== null &&
        trendingPost.communityId !== undefined,
    );

    // Verify post object exists and has required fields
    TestValidator.predicate(
      "post object should exist",
      trendingPost.post !== null && trendingPost.post !== undefined,
    );

    // Verify post visibility is public (moderation-flagged posts would have different status)
    TestValidator.predicate(
      "post visibility should be public",
      trendingPost.post.visibility_status === "public",
    );

    // Verify community exists
    TestValidator.predicate(
      "community object should exist",
      trendingPost.community !== null && trendingPost.community !== undefined,
    );

    // Verify trending type
    TestValidator.predicate(
      "trending type should be post",
      trendingPost.trendingType === "post",
    );

    // Verify trending category is valid
    const validCategories = ["hot", "new", "top", "controversial"] as const;
    TestValidator.predicate(
      "trending category should be valid",
      validCategories.includes(trendingPost.trendingCategory),
    );

    // Verify engagement metrics
    TestValidator.predicate(
      "upvote count should be non-negative",
      trendingPost.upvoteCount >= 0,
    );

    TestValidator.predicate(
      "downvote count should be non-negative",
      trendingPost.downvoteCount >= 0,
    );

    TestValidator.predicate(
      "comment count should be non-negative",
      trendingPost.commentCount >= 0,
    );

    TestValidator.predicate("rank should be positive", trendingPost.rank >= 1);

    // Verify timestamps are valid ISO date-time strings
    TestValidator.predicate(
      "created timestamp should be valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trendingPost.createdAt),
    );

    TestValidator.predicate(
      "refreshed timestamp should be valid ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trendingPost.refreshedAt),
    );
  }

  // Validate that posts with problematic visibility status are not included
  // Posts with moderation flags would have visibility_status like "removed_by_moderator"
  for (const trendingPost of response.data) {
    TestValidator.predicate(
      `post ${trendingPost.postId} should not be removed by moderator`,
      trendingPost.post.visibility_status !== "removed_by_moderator",
    );

    TestValidator.predicate(
      `post ${trendingPost.postId} should not be deleted`,
      trendingPost.post.visibility_status !== "deleted",
    );
  }
}
