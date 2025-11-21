import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test moderator vote search functionality on community platform posts.
 *
 * Validates that authenticated moderators can search and filter votes cast on
 * posts within their moderation scope. This includes testing comprehensive
 * filtering options such as vote type, actor type, content type, and date
 * ranges to ensure moderators have appropriate access to voting analytics for
 * community management and content quality assessment.
 */
export async function test_api_post_vote_search_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create and authenticate as member
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

  // 3. Create a post for voting
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Switch to member and cast votes
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Note: Since there's no actual vote casting API provided, we'll test the search functionality
  // with the assumption that votes exist or the system handles empty results properly

  // 5. Switch back to moderator and perform vote search
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test comprehensive vote search with various filters
  const searchResults =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
          created_at_start: new Date(Date.now() - 86400000).toISOString(), // last 24 hours
          created_at_end: new Date().toISOString(),
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(searchResults);

  // Validate search results structure
  TestValidator.equals(
    "search results should have pagination",
    typeof searchResults.pagination.current,
    "number",
  );
  TestValidator.equals(
    "search results should have data array",
    Array.isArray(searchResults.data),
    true,
  );

  // Test search with different filters
  const emptySearch =
    await api.functional.communityPlatform.moderator.posts.votes.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          vote_type: "downvote", // Filter for downvotes which may not exist
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(emptySearch);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    searchResults.pagination.current >= 0 &&
      searchResults.pagination.limit > 0 &&
      searchResults.pagination.records >= 0 &&
      searchResults.pagination.pages >= 0,
  );

  // Test error handling for malformed request
  await TestValidator.error(
    "should reject invalid request parameters",
    async () => {
      await api.functional.communityPlatform.moderator.posts.votes.index(
        connection,
        {
          postId: post.id,
          body: {
            page: 0, // Invalid page number (should be >= 1)
            limit: 10,
          } satisfies ICommunityPlatformVote.IRequest,
        },
      );
    },
  );
}
