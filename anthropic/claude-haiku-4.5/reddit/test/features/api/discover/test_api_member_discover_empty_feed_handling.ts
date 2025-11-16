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
 * Test discovery feed behavior when member has minimal or no interaction
 * history.
 *
 * This test validates the discovery feed endpoint for a newly created member
 * with no prior activity, subscriptions, or interaction history. It ensures
 * that the feed returns a properly structured response with trending content
 * and community recommendations, even when the member has no personalized
 * history.
 *
 * The test creates a new member account through registration and immediately
 * calls the discovery feed endpoint to verify that the response includes:
 *
 * - A valid pagination structure with metadata about available content
 * - Arrays for posts and community recommendations (potentially empty for new
 *   members)
 * - Proper pagination values (page, limit, total, has_more)
 * - Complete and valid response structure conforming to
 *   ICommunityPlatformTrendingContent
 *
 * Steps:
 *
 * 1. Create a new member account with unique credentials
 * 2. Call the discovery feed endpoint with the new member's authentication
 * 3. Validate the response structure and pagination metadata
 * 4. Verify that empty arrays are handled gracefully
 * 5. Confirm pagination shows accurate total count and has_more status
 */
export async function test_api_member_discover_empty_feed_handling(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with unique credentials
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;
  const memberPassword = `SecurePass${RandomGenerator.alphaNumeric(4)}123!`;

  const newMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(newMember);

  // Step 2: Call the discovery feed endpoint with the new member's authentication
  const discoveryFeed =
    await api.functional.communityPlatform.member.discover.index(connection);
  typia.assert(discoveryFeed);

  // Step 3: Validate the response structure and pagination metadata
  TestValidator.predicate(
    "response should have posts array",
    Array.isArray(discoveryFeed.posts),
  );
  TestValidator.predicate(
    "response should have community_recommendations array",
    Array.isArray(discoveryFeed.community_recommendations),
  );
  TestValidator.predicate(
    "pagination object should exist",
    discoveryFeed.pagination !== null && discoveryFeed.pagination !== undefined,
  );

  // Step 4: Verify that pagination metadata is valid
  typia.assert(discoveryFeed.pagination);
  TestValidator.predicate(
    "pagination page should be positive integer",
    discoveryFeed.pagination.page >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive integer",
    discoveryFeed.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination total should be non-negative",
    discoveryFeed.pagination.total >= 0,
  );
  TestValidator.predicate(
    "pagination has_more should be boolean",
    typeof discoveryFeed.pagination.has_more === "boolean",
  );

  // Step 5: Validate relationship between total count and has_more flag
  if (discoveryFeed.pagination.total === 0) {
    TestValidator.predicate(
      "has_more should be false when total is 0",
      discoveryFeed.pagination.has_more === false,
    );
  }

  // Step 6: Verify consistency between has_more and current page content
  const currentPageItemCount =
    discoveryFeed.posts.length + discoveryFeed.community_recommendations.length;
  if (currentPageItemCount < discoveryFeed.pagination.limit) {
    TestValidator.predicate(
      "has_more should be false when current page has fewer items than limit",
      discoveryFeed.pagination.has_more === false,
    );
  }

  // Step 7: Validate post structure if posts exist
  if (discoveryFeed.posts.length > 0) {
    for (const post of discoveryFeed.posts) {
      typia.assert(post);
      TestValidator.predicate(
        "each post should have valid id",
        post.id && typeof post.id === "string",
      );
      TestValidator.predicate(
        "each post should have title",
        post.title && typeof post.title === "string",
      );
      TestValidator.predicate(
        "each post should have valid vote_score",
        typeof post.vote_score === "number",
      );
    }
  }

  // Step 8: Validate community recommendation structure if recommendations exist
  if (discoveryFeed.community_recommendations.length > 0) {
    for (const community of discoveryFeed.community_recommendations) {
      typia.assert(community);
      TestValidator.predicate(
        "each community should have valid id",
        community.id && typeof community.id === "string",
      );
      TestValidator.predicate(
        "each community should have identifier",
        community.identifier && typeof community.identifier === "string",
      );
      TestValidator.predicate(
        "each community should have name",
        community.name && typeof community.name === "string",
      );
    }
  }

  // Step 9: Confirm overall response validity
  TestValidator.predicate(
    "discovery feed response should have valid structure",
    discoveryFeed.posts !== null &&
      discoveryFeed.community_recommendations !== null &&
      discoveryFeed.pagination !== null,
  );
}
