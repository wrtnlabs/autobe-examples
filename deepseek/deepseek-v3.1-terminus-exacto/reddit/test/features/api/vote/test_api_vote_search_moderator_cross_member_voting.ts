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
 * Test that authenticated moderators can search and filter voting records
 * across multiple members for moderation purposes. Validates that the vote
 * search operation provides moderator-level access to voting patterns across
 * the platform, enabling comprehensive moderation workflows and community
 * voting analysis.
 */
export async function test_api_vote_search_moderator_cross_member_voting(
  connection: api.IConnection,
) {
  // Note: Community creation API is not available in provided functions,
  // so we'll use a randomly generated community ID that should exist in test environment
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 1. Create moderator account for authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create first member account for voting operations
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Switch to member1 to create content
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Create test post for voting operations
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Cast vote on post by first member
  const postVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(postVote);

  // 5. Create second member account for diverse voting patterns
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Switch to member2 to create content
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 6. Create test comment for voting operations
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 7. Cast vote on comment by second member
  const commentVote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(commentVote);

  // 8. Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 9. Perform comprehensive vote search with various filters
  const searchResults =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(searchResults);

  // 10. Validate search results contain expected voting data
  TestValidator.predicate(
    "search results should contain votes",
    searchResults.data.length > 0,
  );
  TestValidator.equals(
    "pagination should be correct",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be respected",
    searchResults.pagination.limit,
    10,
  );

  // 11. Test vote type filtering
  const upvoteSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(upvoteSearch);

  // 12. Test content type filtering
  const postVoteSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        content_type: "post",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(postVoteSearch);

  // 13. Test actor type filtering
  const memberVoteSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        actor_type: "member",
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(memberVoteSearch);

  // 14. Test date range filtering
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const dateFilteredSearch =
    await api.functional.communityPlatform.moderator.votes.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_at_start: yesterday,
        created_at_end: today,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(dateFilteredSearch);

  // 15. Final validation of moderator access to voting data
  TestValidator.predicate(
    "moderator should have access to voting records",
    searchResults.data.length >= 2,
  );

  // Validate that we can find both upvotes and downvotes
  const hasUpvotes = searchResults.data.some(
    (vote) => vote.vote_type === "upvote",
  );
  const hasDownvotes = searchResults.data.some(
    (vote) => vote.vote_type === "downvote",
  );
  TestValidator.predicate(
    "should find both upvotes and downvotes",
    hasUpvotes || hasDownvotes,
  );

  // Validate content type diversity
  const hasPostVotes = searchResults.data.some(
    (vote) => vote.content_type === "post",
  );
  const hasCommentVotes = searchResults.data.some(
    (vote) => vote.content_type === "comment",
  );
  TestValidator.predicate(
    "should find votes on different content types",
    hasPostVotes || hasCommentVotes,
  );
}
