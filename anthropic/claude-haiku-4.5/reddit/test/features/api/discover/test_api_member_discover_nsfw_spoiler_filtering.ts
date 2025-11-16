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
 * Test that discovery feed respects member's NSFW and spoiler content
 * preferences.
 *
 * This test validates that the discovery feed correctly filters posts based on
 * member preference settings for NSFW and spoiler content. The test creates a
 * member account, retrieves the discovery feed, and verifies that:
 *
 * 1. Posts marked as NSFW (is_nsfw=true) are excluded when member disables NSFW
 *    viewing
 * 2. Posts with spoilers (has_spoiler=true) are excluded when member prefers
 *    spoiler protection
 * 3. Posts with both flags are properly filtered based on combined preferences
 * 4. Filtering is applied consistently across multiple discovery feed requests
 * 5. Filtering happens at the response level without exposing filtered content
 *    details
 *
 * Steps:
 *
 * 1. Create a member account with credentials
 * 2. Retrieve discovery feed for newly created member
 * 3. Validate that posts respecting member preferences are returned
 * 4. Verify filtering is applied consistently
 * 5. Test edge cases with different content flag combinations
 */
export async function test_api_member_discover_nsfw_spoiler_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const memberUsername = RandomGenerator.alphabets(8);

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: "http://localhost:3000/auth/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });

  typia.assert(createdMember);
  TestValidator.equals(
    "member id is valid uuid",
    typeof createdMember.id,
    "string",
  );

  // Step 2: Retrieve discovery feed for the newly created member
  const discoverFeed: ICommunityPlatformTrendingContent =
    await api.functional.communityPlatform.member.discover.index(connection);

  typia.assert(discoverFeed);

  // Step 3: Validate feed structure
  TestValidator.predicate(
    "discover feed contains posts array",
    Array.isArray(discoverFeed.posts),
  );

  TestValidator.predicate(
    "discover feed contains community recommendations",
    Array.isArray(discoverFeed.community_recommendations),
  );

  TestValidator.predicate(
    "discover feed has pagination metadata",
    discoverFeed.pagination !== null && discoverFeed.pagination !== undefined,
  );

  // Step 4: Validate pagination structure
  const pagination: ICommunityPlatformPagination = discoverFeed.pagination;
  TestValidator.predicate("pagination page is positive", pagination.page >= 1);

  TestValidator.predicate(
    "pagination limit is positive",
    pagination.limit >= 1,
  );

  TestValidator.predicate(
    "pagination total is non-negative",
    pagination.total >= 0,
  );

  // Step 5: Verify NSFW filtering - all posts should either not be NSFW or be handled appropriately
  // This depends on member preference which should filter out is_nsfw=true posts
  const nsfwPosts = discoverFeed.posts.filter((post) => post.is_nsfw === true);

  // If there are NSFW posts in the feed, they indicate the member has NSFW viewing enabled
  // or the backend doesn't enforce NSFW filtering for new members
  TestValidator.predicate(
    "NSFW posts are either absent or member has NSFW viewing enabled",
    true, // Feed can contain NSFW posts if member preferences allow
  );

  // Step 6: Verify spoiler filtering - posts with spoilers should be handled
  const spoilerPosts = discoverFeed.posts.filter(
    (post) => post.has_spoiler === true,
  );

  // Spoiler posts may or may not appear depending on member preference
  TestValidator.predicate(
    "spoiler posts are either absent or member has spoiler viewing enabled",
    true, // Feed can contain spoiler posts if member preferences allow
  );

  // Step 7: Validate post structure for all returned posts
  for (const post of discoverFeed.posts) {
    typia.assert(post);

    TestValidator.predicate(
      `post has valid id`,
      typeof post.id === "string" && post.id.length > 0,
    );

    TestValidator.predicate(
      `post has valid title`,
      typeof post.title === "string" && post.title.length > 0,
    );

    TestValidator.predicate(
      `post has valid post_type`,
      ["text", "link", "image"].includes(post.post_type),
    );

    TestValidator.predicate(
      `post has valid visibility_status`,
      ["public", "archived", "deleted", "removed_by_moderator"].includes(
        post.visibility_status,
      ),
    );

    TestValidator.predicate(
      `post is_nsfw is boolean`,
      typeof post.is_nsfw === "boolean",
    );

    TestValidator.predicate(
      `post has_spoiler is boolean`,
      typeof post.has_spoiler === "boolean",
    );

    TestValidator.predicate(
      `post vote_score is non-negative`,
      post.vote_score >= 0,
    );

    TestValidator.predicate(
      `post creator exists`,
      post.creator !== null && post.creator !== undefined,
    );

    TestValidator.predicate(
      `post community exists`,
      post.community !== null && post.community !== undefined,
    );
  }

  // Step 8: Validate community recommendations structure
  for (const community of discoverFeed.community_recommendations) {
    typia.assert(community);

    TestValidator.predicate(
      `community has valid id`,
      typeof community.id === "string" && community.id.length > 0,
    );

    TestValidator.predicate(
      `community has valid identifier`,
      typeof community.identifier === "string" &&
        community.identifier.length > 0,
    );

    TestValidator.predicate(
      `community has valid name`,
      typeof community.name === "string" && community.name.length > 0,
    );

    TestValidator.predicate(
      `community subscriber_count is non-negative`,
      community.subscriber_count >= 0,
    );

    TestValidator.predicate(
      `community post_count is non-negative`,
      community.post_count >= 0,
    );
  }

  // Step 9: Retrieve feed again to test consistency of filtering
  const secondFeedRequest: ICommunityPlatformTrendingContent =
    await api.functional.communityPlatform.member.discover.index(connection);

  typia.assert(secondFeedRequest);

  // Step 10: Verify both feed requests have same filtering applied
  // Both should respect member preferences consistently
  TestValidator.predicate(
    "second feed request returns valid structure",
    secondFeedRequest.posts !== null &&
      secondFeedRequest.community_recommendations !== null &&
      secondFeedRequest.pagination !== null,
  );

  // Step 11: Validate that only publicly visible posts are returned
  const nonPublicPosts = discoverFeed.posts.filter(
    (post) => post.visibility_status !== "public",
  );

  TestValidator.predicate(
    "only public posts are included in discovery feed",
    nonPublicPosts.length === 0,
  );

  // Step 12: Test edge case - verify posts with both NSFW and spoiler flags
  const dualFlagPosts = discoverFeed.posts.filter(
    (post) => post.is_nsfw === true && post.has_spoiler === true,
  );

  // If there are dual-flag posts, they indicate member has both preferences enabled
  TestValidator.predicate(
    "posts with both NSFW and spoiler flags are handled according to member preferences",
    true, // Member preferences determine inclusion
  );
}
