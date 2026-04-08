import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeVote";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering vote history by vote type and content type.
 *
 * Validates that the vote history endpoint correctly filters votes based on vote_type (upvote/downvote) and content_type (post/comment) parameters. A member account is created and used to query vote history with various filter combinations to ensure proper filtering behavior.
 *
 * The test verifies five filtering scenarios:
 * 1. Filtering by vote_type='upvote' returns only upvoted content
 * 2. Filtering by vote_type='downvote' returns only downvoted content
 * 3. Filtering by content_type='post' returns only votes on posts
 * 4. Filtering by content_type='comment' returns only votes on comments
 * 5. Combined filters return votes matching both criteria
 *
 * 1. Create a member account for testing.
 * 2. Query vote history without filters to get all votes.
 * 3. Query vote history with vote_type='upvote' filter and validate results.
 * 4. Query vote history with vote_type='downvote' filter and validate results.
 * 5. Query vote history with content_type='post' filter and validate results.
 * 6. Query vote history with content_type='comment' filter and validate results.
 * 7. Query vote history with combined vote_type and content_type filters and validate results.
 * 8. Validate that filtered results contain only matching vote types and content types.
 */
export async function test_api_vote_history_filtering_by_type_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Helper function to validate vote filter results
  const validateVoteFilter = (
    title: string,
    votes: IPageIRedditLikeVote.ISummary,
    expectedVoteType?: string,
    expectedContentType?: string,
  ): void => {
    // Validate pagination metadata structure
    typia.assert(votes.pagination);
    // Validate each vote matches filter criteria
    for (const vote of votes.data) {
      if (expectedVoteType) {
        TestValidator.equals(
          `${title} - vote type`,
          vote.vote_type,
          expectedVoteType,
        );
      }
      if (expectedContentType) {
        TestValidator.equals(
          `${title} - content type`,
          vote.content_type,
          expectedContentType,
        );
      }
    }
  };
  // 2. Query all votes (no filters)
  const allVotes: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.votes.index(memberConnection, {
      body: {} satisfies IRedditLikeVote.IRequest,
    });
  typia.assert(allVotes);
  validateVoteFilter("all votes", allVotes);
  // 3. Filter by vote_type='upvote'
  const upvoteVotes: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.votes.index(memberConnection, {
      body: { vote_type: "upvote" } satisfies IRedditLikeVote.IRequest,
    });
  typia.assert(upvoteVotes);
  validateVoteFilter("upvote filter", upvoteVotes, "upvote");
  // 4. Filter by vote_type='downvote'
  const downvoteVotes: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.votes.index(memberConnection, {
      body: { vote_type: "downvote" } satisfies IRedditLikeVote.IRequest,
    });
  typia.assert(downvoteVotes);
  validateVoteFilter("downvote filter", downvoteVotes, "downvote");
  // 5. Filter by content_type='post'
  const postVotes: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.votes.index(memberConnection, {
      body: { content_type: "post" } satisfies IRedditLikeVote.IRequest,
    });
  typia.assert(postVotes);
  validateVoteFilter("post filter", postVotes, undefined, "post");
  // 6. Filter by content_type='comment'
  const commentVotes: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.votes.index(memberConnection, {
      body: { content_type: "comment" } satisfies IRedditLikeVote.IRequest,
    });
  typia.assert(commentVotes);
  validateVoteFilter("comment filter", commentVotes, undefined, "comment");
  // 7. Combined filter: vote_type='upvote' AND content_type='post'
  const combinedVotes: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.votes.index(memberConnection, {
      body: {
        vote_type: "upvote",
        content_type: "post",
      } satisfies IRedditLikeVote.IRequest,
    });
  typia.assert(combinedVotes);
  validateVoteFilter("combined filter", combinedVotes, "upvote", "post");
}
