import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Test temporal filtering capabilities for comment vote analysis, validating
 * that moderators can retrieve votes within specific date ranges to track
 * engagement trends over time. This scenario ensures that created_after and
 * created_before filters work correctly for historical analysis and recent
 * activity monitoring. It tests chronological sorting options to identify
 * voting patterns and detect potential vote manipulation through timing
 * analysis while maintaining proper pagination across time-based queries.
 */
export async function test_api_comment_vote_temporal_analysis(
  connection: api.IConnection,
) {
  // 1. Create moderator account with temporal analysis privileges
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

  // 2. Create member account to participate in voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Switch to member to create content
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Create a comment that will receive votes over time
  // Note: We need a valid post ID, but since post creation API is not available,
  // we'll use a randomly generated UUID that matches the format
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Cast multiple votes with different timestamps for temporal analysis
  const votes: ICommunityPlatformVote[] = [];

  // Create votes with different timestamps
  for (let i = 0; i < 5; i++) {
    const vote =
      await api.functional.communityPlatform.member.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: {
            vote_type: i % 2 === 0 ? "upvote" : "downvote",
            actor_type: "member",
            content_type: "comment",
            status: "active",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    typia.assert(vote);
    votes.push(vote);

    // Add small delay to create different timestamps
    if (i < 4) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // 5. Switch to moderator role and test temporal filtering
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test 1: Retrieve votes created after specific timestamp
  const middleVoteTimestamp = votes[2].created_at;
  const votesAfterMiddle =
    await api.functional.communityPlatform.moderator.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          created_after: middleVoteTimestamp,
          order_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(votesAfterMiddle);

  // Should contain votes created after the middle vote
  TestValidator.predicate(
    "votes after middle timestamp should include later votes",
    votesAfterMiddle.data.length > 0,
  );

  // Test 2: Retrieve votes created before specific timestamp
  const votesBeforeMiddle =
    await api.functional.communityPlatform.moderator.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          created_before: middleVoteTimestamp,
          order_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(votesBeforeMiddle);

  // Should contain votes created before the middle vote
  TestValidator.predicate(
    "votes before middle timestamp should include earlier votes",
    votesBeforeMiddle.data.length > 0,
  );

  // Test 3: Retrieve votes within specific date range
  const startTimestamp = votes[1].created_at;
  const endTimestamp = votes[3].created_at;
  const votesInRange =
    await api.functional.communityPlatform.moderator.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          created_after: startTimestamp,
          created_before: endTimestamp,
          order_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(votesInRange);

  // Should contain votes created between start and end timestamps
  TestValidator.predicate(
    "votes in date range should include votes within the range",
    votesInRange.data.length > 0,
  );

  // Test 4: Validate chronological sorting
  const chronologicalVotes =
    await api.functional.communityPlatform.moderator.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(chronologicalVotes);

  // Verify votes are sorted in ascending order (if we have multiple votes)
  if (chronologicalVotes.data.length > 1) {
    for (let i = 1; i < chronologicalVotes.data.length; i++) {
      TestValidator.predicate(
        `vote ${i} should be after vote ${i - 1} in chronological order`,
        new Date(chronologicalVotes.data[i].created_at) >=
          new Date(chronologicalVotes.data[i - 1].created_at),
      );
    }
  }

  // Test 5: Validate pagination across time-based queries
  const paginatedVotes =
    await api.functional.communityPlatform.moderator.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 3,
          order_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(paginatedVotes);

  TestValidator.predicate(
    "pagination should return correct number of votes per page",
    paginatedVotes.data.length <= 3,
  );

  TestValidator.predicate(
    "pagination metadata should be correct",
    paginatedVotes.pagination.current === 1 &&
      paginatedVotes.pagination.limit === 3,
  );

  // Test 6: Verify vote type filtering with temporal constraints
  const upvotesInRange =
    await api.functional.communityPlatform.moderator.comments.votes.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          vote_type: "upvote",
          created_after: votes[0].created_at,
          order_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(upvotesInRange);

  // Verify all returned votes are upvotes (if any returned)
  if (upvotesInRange.data.length > 0) {
    upvotesInRange.data.forEach((vote, index) => {
      TestValidator.equals(
        `vote ${index} should be an upvote`,
        vote.vote_type,
        "upvote",
      );
    });
  }

  // Final validation: Ensure temporal analysis provides meaningful insights
  TestValidator.predicate(
    "temporal filtering should work correctly",
    votesAfterMiddle.data.length + votesBeforeMiddle.data.length >=
      votes.length,
  );
}
