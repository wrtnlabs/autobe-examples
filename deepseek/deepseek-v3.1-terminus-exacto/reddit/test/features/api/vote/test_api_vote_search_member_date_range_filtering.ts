import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Test vote search filtering by date ranges for authenticated members.
 *
 * This comprehensive E2E test validates that the search operation correctly
 * filters votes based on creation timestamps and returns appropriate results
 * within specified date ranges. The test implements a complete workflow from
 * member authentication to comprehensive date range filtering validation.
 */
export async function test_api_vote_search_member_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Note: Community creation is not available in the provided API functions,
  // so we'll use realistic UUIDs that would correspond to existing communities
  const communityId1 = typia.random<string & tags.Format<"uuid">>();
  const communityId2 = typia.random<string & tags.Format<"uuid">>();

  // 2. Create test posts for voting operations
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId1,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId2,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);

  // 3. Create test comments for voting operations
  const comment1 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post1.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);

  const comment2 =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post2.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  // Record the time after creating posts/comments but before voting
  const preVoteTime = new Date().toISOString();

  // 4. Cast votes on posts and comments
  const vote1 =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post1.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote1);

  const vote2 =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post2.id,
        body: {
          vote_type: "downvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote2);

  const vote3 =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment1.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "comment",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote3);

  const vote4 =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment2.id,
        body: {
          vote_type: "downvote",
          actor_type: "member",
          content_type: "comment",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote4);

  // Record the time after all votes are created
  const postVoteTime = new Date().toISOString();

  // 5. Test search functionality with date range covering all votes
  const allVotes = await api.functional.communityPlatform.member.votes.index(
    connection,
    {
      body: {
        created_at_start: preVoteTime,
        created_at_end: postVoteTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(allVotes);

  TestValidator.predicate(
    "date range covering vote period should return results",
    allVotes.data.length >= 4,
  );

  // 6. Test search functionality with future date range (should return empty)
  const futureStart = new Date(Date.now() + 3600000).toISOString(); // 1 hour in future
  const futureEnd = new Date(Date.now() + 7200000).toISOString(); // 2 hours in future

  const futureVotes = await api.functional.communityPlatform.member.votes.index(
    connection,
    {
      body: {
        created_at_start: futureStart,
        created_at_end: futureEnd,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(futureVotes);

  TestValidator.predicate(
    "future date range should return empty results",
    futureVotes.data.length === 0,
  );

  // 7. Test search functionality with specific vote type filtering
  const upvotesOnly = await api.functional.communityPlatform.member.votes.index(
    connection,
    {
      body: {
        vote_type: "upvote",
        created_at_start: preVoteTime,
        created_at_end: postVoteTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    },
  );
  typia.assert(upvotesOnly);

  TestValidator.predicate(
    "upvotes search should only return upvotes",
    upvotesOnly.data.every((vote) => vote.vote_type === "upvote"),
  );

  // 8. Test search functionality with content type filtering
  const postVotesOnly =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        content_type: "post",
        created_at_start: preVoteTime,
        created_at_end: postVoteTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(postVotesOnly);

  TestValidator.predicate(
    "post votes search should only return post votes",
    postVotesOnly.data.every((vote) => vote.content_type === "post"),
  );

  // 9. Test pagination functionality
  const paginatedResults =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        page: 1,
        limit: 2,
        created_at_start: preVoteTime,
        created_at_end: postVoteTime,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "pagination should respect limit",
    paginatedResults.data.length <= 2,
  );

  // 10. Validate chronological organization (newest first)
  TestValidator.predicate(
    "votes should be ordered chronologically (newest first)",
    () => {
      const timestamps = paginatedResults.data.map((vote) =>
        new Date(vote.created_at).getTime(),
      );
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] > timestamps[i - 1]) {
          return false; // Should be descending order (newest first)
        }
      }
      return true;
    },
  );

  // 11. Test combined filtering with date range and vote type
  const combinedFilter =
    await api.functional.communityPlatform.member.votes.index(connection, {
      body: {
        vote_type: "downvote",
        content_type: "post",
        created_at_start: preVoteTime,
        created_at_end: postVoteTime,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(combinedFilter);

  TestValidator.predicate(
    "combined filter should return matching votes",
    combinedFilter.data.every(
      (vote) => vote.vote_type === "downvote" && vote.content_type === "post",
    ),
  );
}
