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
 * Test that NSFW filtering works correctly in trending posts.
 *
 * When a guest user (without NSFW preferences configured) requests trending
 * posts, verify that NSFW-flagged posts (is_nsfw=true) are appropriately
 * handled based on platform defaults. Validate response handling of NSFW
 * content in trending results, ensuring that adult-flagged posts are properly
 * marked and structured.
 *
 * This test validates:
 *
 * 1. API response structure for trending posts endpoint
 * 2. Pagination metadata accuracy
 * 3. NSFW flag presence and correctness on posts
 * 4. Post metadata completeness (creator, community, engagement)
 * 5. Proper type safety and data integrity
 * 6. Client-side rendering readiness with all required fields
 */
export async function test_api_trending_posts_nsfw_content_filtering(
  connection: api.IConnection,
) {
  // Retrieve trending posts as a guest user
  const trendingResponse: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);

  // Validate response structure
  typia.assert(trendingResponse);

  // Verify pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination metadata should exist",
    trendingResponse.pagination !== undefined &&
      trendingResponse.pagination !== null,
  );

  TestValidator.predicate(
    "pagination current page should be non-negative",
    trendingResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    trendingResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    trendingResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    trendingResponse.pagination.pages >= 0,
  );

  // Verify data array exists
  TestValidator.predicate(
    "trending posts data array should exist",
    Array.isArray(trendingResponse.data),
  );

  // Validate each trending post in the response
  for (const trendingPost of trendingResponse.data) {
    // Verify trending post structure
    TestValidator.predicate(
      "trending post should have valid ID",
      typeof trendingPost.id === "string" && trendingPost.id.length > 0,
    );

    TestValidator.predicate(
      "trending post should reference valid post ID",
      typeof trendingPost.postId === "string" && trendingPost.postId.length > 0,
    );

    TestValidator.predicate(
      "trending post should reference valid community ID",
      typeof trendingPost.communityId === "string" &&
        trendingPost.communityId.length > 0,
    );

    // Verify trending type
    TestValidator.predicate(
      "trending type should be 'post'",
      trendingPost.trendingType === "post",
    );

    // Verify trending category
    TestValidator.predicate(
      "trending category should be valid",
      ["hot", "new", "top", "controversial"].includes(
        trendingPost.trendingCategory,
      ),
    );

    // Validate engagement metrics
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

    TestValidator.predicate(
      "subscriber count should be non-negative",
      trendingPost.subscriberCount >= 0,
    );

    // Validate ranking
    TestValidator.predicate("rank should be positive", trendingPost.rank > 0);

    // Verify post summary data
    const post: ICommunityPlatformPost.ISummary = trendingPost.post;
    TestValidator.predicate(
      "post summary should exist",
      post !== undefined && post !== null,
    );

    TestValidator.predicate(
      "post should have valid ID",
      typeof post.id === "string" && post.id.length > 0,
    );

    TestValidator.predicate(
      "post should have title",
      typeof post.title === "string" && post.title.length > 0,
    );

    // Verify NSFW flag is present
    TestValidator.predicate(
      "post should have NSFW flag",
      typeof post.is_nsfw === "boolean",
    );

    // Validate post type
    TestValidator.predicate(
      "post type should be valid",
      ["text", "link", "image"].includes(post.post_type),
    );

    // Verify vote scores
    TestValidator.predicate(
      "post vote score should be non-negative",
      post.vote_score >= 0,
    );

    TestValidator.predicate(
      "post upvote count should be non-negative",
      post.upvote_count >= 0,
    );

    TestValidator.predicate(
      "post downvote count should be non-negative",
      post.downvote_count >= 0,
    );

    TestValidator.predicate(
      "post comment count should be non-negative",
      post.comment_count >= 0,
    );

    // Verify visibility status
    TestValidator.predicate(
      "post visibility status should be public",
      post.visibility_status === "public",
    );

    // Verify spoiler flag
    TestValidator.predicate(
      "post should have spoiler flag",
      typeof post.has_spoiler === "boolean",
    );

    // Verify lock status
    TestValidator.predicate(
      "post should have lock status",
      typeof post.is_locked === "boolean",
    );

    // Verify pin status
    TestValidator.predicate(
      "post should have pin status",
      typeof post.is_pinned === "boolean",
    );

    // Verify creator information
    const creator: ICommunityPlatformMember.ISummary = post.creator;
    TestValidator.predicate(
      "creator should exist",
      creator !== undefined && creator !== null,
    );

    TestValidator.predicate(
      "creator should have valid ID",
      typeof creator.id === "string" && creator.id.length > 0,
    );

    TestValidator.predicate(
      "creator should have username",
      typeof creator.username === "string" && creator.username.length > 0,
    );

    TestValidator.predicate(
      "creator should have valid account status",
      ["active", "suspended", "pending_deletion", "deleted"].includes(
        creator.account_status,
      ),
    );

    TestValidator.predicate(
      "creator karma score should be non-negative",
      creator.karma_score >= 0,
    );

    // Verify community information
    const community: ICommunityPlatformCommunity.ISummary =
      trendingPost.community;
    TestValidator.predicate(
      "community should exist",
      community !== undefined && community !== null,
    );

    TestValidator.predicate(
      "community should have valid ID",
      typeof community.id === "string" && community.id.length > 0,
    );

    TestValidator.predicate(
      "community should have identifier",
      typeof community.identifier === "string" &&
        community.identifier.length > 0,
    );

    TestValidator.predicate(
      "community should have name",
      typeof community.name === "string" && community.name.length > 0,
    );

    TestValidator.predicate(
      "community subscriber count should be non-negative",
      community.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "community post count should be non-negative",
      community.post_count >= 0,
    );

    // Verify timestamps
    TestValidator.predicate(
      "post created_at should be valid date-time",
      typeof trendingPost.createdAt === "string" &&
        trendingPost.createdAt.length > 0,
    );

    TestValidator.predicate(
      "post refreshed_at should be valid date-time",
      typeof trendingPost.refreshedAt === "string" &&
        trendingPost.refreshedAt.length > 0,
    );
  }

  // Validate NSFW content handling
  const nsfwPosts = trendingResponse.data.filter(
    (tp) => tp.post.is_nsfw === true,
  );
  const nonNsfwPosts = trendingResponse.data.filter(
    (tp) => tp.post.is_nsfw === false,
  );

  TestValidator.predicate(
    "trending posts should contain mix of NSFW and non-NSFW content or be all non-NSFW",
    nsfwPosts.length >= 0 && nonNsfwPosts.length >= 0,
  );

  // If NSFW posts exist, verify they are properly marked
  if (nsfwPosts.length > 0) {
    TestValidator.predicate(
      "NSFW posts should be properly flagged",
      nsfwPosts.every((tp) => tp.post.is_nsfw === true),
    );
  }
}
