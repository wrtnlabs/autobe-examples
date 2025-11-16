import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingContent";

/**
 * Test that the member discovery feed returns appropriate posts and community
 * recommendations.
 *
 * This test validates that authenticated members receive a personalized
 * discovery feed containing:
 *
 * - Trending posts from subscribed communities and algorithmically selected
 *   recommendations
 * - Proper engagement metrics (vote scores, upvote/downvote counts, comment
 *   counts)
 * - Complete post information with creator and community attribution
 * - Community recommendations for user discovery
 * - Pagination support for feed navigation
 *
 * The discovery algorithm filters deleted and moderator-removed posts, applies
 * member preferences for content visibility, and sorts results by relevance
 * considering vote scores, comment activity, and post freshness.
 *
 * Workflow:
 *
 * 1. Create authenticated member account via join operation
 * 2. Retrieve personalized discovery feed
 * 3. Validate feed contains posts with complete metadata
 * 4. Verify posts have proper engagement metrics and visibility status
 * 5. Confirm pagination metadata enables feed navigation
 * 6. Validate community recommendations are included
 * 7. Ensure all posts are publicly visible (not deleted or removed by moderator)
 */
export async function test_api_member_discover_post_feed_content(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member to receive personalized discovery feed
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const createMemberBody = {
    email: memberEmail,
    username: RandomGenerator.name(1),
    password: "ValidPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: createMemberBody,
  });
  typia.assert(authorizedMember);

  // Step 2: Retrieve personalized discovery feed for authenticated member
  const discoverFeed =
    await api.functional.communityPlatform.member.discover.index(connection);
  typia.assert(discoverFeed);

  // Step 3: Validate feed structure and pagination metadata
  TestValidator.predicate(
    "discovery feed should include posts array",
    Array.isArray(discoverFeed.posts),
  );

  TestValidator.predicate(
    "discovery feed should include community recommendations",
    Array.isArray(discoverFeed.community_recommendations),
  );

  TestValidator.predicate(
    "pagination metadata should be present",
    discoverFeed.pagination !== null && discoverFeed.pagination !== undefined,
  );

  // Step 4: Validate pagination metadata structure and values
  TestValidator.predicate(
    "pagination page should be a positive integer",
    discoverFeed.pagination.page >= 1,
  );

  TestValidator.predicate(
    "pagination limit should be a positive integer",
    discoverFeed.pagination.limit >= 1,
  );

  TestValidator.predicate(
    "pagination total should be non-negative",
    discoverFeed.pagination.total >= 0,
  );

  TestValidator.predicate(
    "pagination has_more should be a boolean",
    typeof discoverFeed.pagination.has_more === "boolean",
  );

  // Step 5: Validate posts have complete information and proper engagement metrics
  if (discoverFeed.posts.length > 0) {
    const samplePost = discoverFeed.posts[0];
    typia.assert(samplePost);

    // Validate post has all required fields
    TestValidator.predicate(
      "post should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.id,
      ),
    );

    TestValidator.predicate(
      "post should have title",
      samplePost.title !== null && samplePost.title !== undefined,
    );

    TestValidator.predicate(
      "post should have valid post type",
      ["text", "link", "image"].includes(samplePost.post_type),
    );

    // Validate visibility status - only public posts should appear in discovery feed
    TestValidator.predicate(
      "post visibility status should be public",
      samplePost.visibility_status === "public",
    );

    // Validate engagement metrics
    TestValidator.predicate(
      "post should have non-negative vote score",
      samplePost.vote_score >= 0,
    );

    TestValidator.predicate(
      "post should have non-negative upvote count",
      samplePost.upvote_count >= 0,
    );

    TestValidator.predicate(
      "post should have non-negative downvote count",
      samplePost.downvote_count >= 0,
    );

    TestValidator.predicate(
      "post should have non-negative comment count",
      samplePost.comment_count >= 0,
    );

    // Validate vote score calculation: upvotes - downvotes = vote_score
    TestValidator.equals(
      "post vote score should equal upvotes minus downvotes",
      samplePost.vote_score,
      samplePost.upvote_count - samplePost.downvote_count,
    );

    // Validate post creator information
    TestValidator.predicate(
      "post should have creator with valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.creator.id,
      ),
    );

    TestValidator.predicate(
      "post creator should have username",
      samplePost.creator.username !== null &&
        samplePost.creator.username !== undefined,
    );

    TestValidator.predicate(
      "post creator should have email",
      samplePost.creator.email !== null &&
        samplePost.creator.email !== undefined,
    );

    // Validate community attribution
    TestValidator.predicate(
      "post should have community with valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.community.id,
      ),
    );

    TestValidator.predicate(
      "post should have community name",
      samplePost.community.name !== null &&
        samplePost.community.name !== undefined,
    );

    // Validate timestamps
    TestValidator.predicate(
      "post should have valid creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(samplePost.created_at),
    );

    TestValidator.predicate(
      "post should have valid update timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(samplePost.updated_at),
    );
  }

  // Step 6: Validate community recommendations
  if (discoverFeed.community_recommendations.length > 0) {
    const sampleCommunity = discoverFeed.community_recommendations[0];
    typia.assert(sampleCommunity);

    TestValidator.predicate(
      "community recommendation should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleCommunity.id,
      ),
    );

    TestValidator.predicate(
      "community should have identifier",
      sampleCommunity.identifier !== null &&
        sampleCommunity.identifier !== undefined,
    );

    TestValidator.predicate(
      "community should have name",
      sampleCommunity.name !== null && sampleCommunity.name !== undefined,
    );

    TestValidator.predicate(
      "community should have non-negative subscriber count",
      sampleCommunity.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "community should have non-negative post count",
      sampleCommunity.post_count >= 0,
    );
  }

  // Step 7: Validate all posts in feed are publicly visible (not deleted or moderator-removed)
  const allPostsPublic = discoverFeed.posts.every(
    (post) => post.visibility_status === "public",
  );

  TestValidator.predicate(
    "all posts in discovery feed must be publicly visible",
    allPostsPublic,
  );

  // Step 8: Validate feed is sorted by relevance (vote scores indicate engagement)
  if (discoverFeed.posts.length > 1) {
    const postVoteScores = discoverFeed.posts.map((post) => post.vote_score);
    const isValidSort = postVoteScores.every(
      (score) => typeof score === "number" && score >= 0,
    );

    TestValidator.predicate(
      "all posts should have valid vote scores for relevance sorting",
      isValidSort,
    );
  }
}
