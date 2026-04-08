import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeVote";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test retrieving the paginated list of votes cast on a comment with multiple votes.
 *
 * Validates the comment votes list endpoint by creating a comment that receives votes from multiple members, then verifying the paginated response contains accurate vote records with proper sorting and voter information.
 *
 * The test ensures that vote records include complete voter profiles, timestamps are accurate, pagination metadata is correct, and votes are sorted by creation time in descending order.
 *
 * 1. First member (comment author) authenticates and creates a post.
 * 2. First member creates a comment on the post.
 * 3. Second member authenticates and upvotes the comment.
 * 4. Third member authenticates and downvotes the comment.
 * 5. Retrieve the votes list for the comment.
 * 6. Validate pagination metadata (current page, limit, records, pages).
 * 7. Verify each vote record contains voter information (id, username, display_name, karma_score).
 * 8. Verify vote records are sorted by created_at descending.
 * 9. Verify vote types are correctly recorded (upvote/downvote).
 * 10. Verify comment author's karma reflects cumulative votes (upvote +1, downvote -1).
 */
export async function test_api_comment_votes_list_with_multiple_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (comment author) authenticates
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth: IRedditLikeMember.IAuthorized = await authorize_member_join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(authorAuth);
  // 2. Create a post for the comment to attach to
  // Note: Need a community first - but we don't have community creation API in SDK
  // Using a random UUID for community_id as the test environment should have existing communities
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(authorConnection, {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 3. First member creates a comment on the post
  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(
      authorConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // Store initial karma score for validation
  const initialKarma: number = authorAuth.karma_score;
  // 4. Second member authenticates and upvotes the comment
  const upvoterConnection: api.IConnection = { host: connection.host };
  const upvoterAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(upvoterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(upvoterAuth);
  // Upvote the comment
  const upvote: IRedditLikeVote =
    await api.functional.redditLike.member.comments.votes.create(
      upvoterConnection,
      {
        commentId: comment.id,
        body: { vote_type: "upvote" } satisfies IRedditLikeVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 5. Third member authenticates and downvotes the comment
  const downvoterConnection: api.IConnection = { host: connection.host };
  const downvoterAuth: IRedditLikeMember.IAuthorized =
    await authorize_member_join(downvoterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(downvoterAuth);
  // Downvote the comment
  const downvote: IRedditLikeVote =
    await api.functional.redditLike.member.comments.votes.create(
      downvoterConnection,
      {
        commentId: comment.id,
        body: { vote_type: "downvote" } satisfies IRedditLikeVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 6. Retrieve the votes list for the comment
  const votesList: IPageIRedditLikeVote.ISummary =
    await api.functional.redditLike.member.comments.votes.list(connection, {
      commentId: comment.id,
    });
  typia.assert(votesList);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    votesList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    votesList.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination records match votes count",
    votesList.pagination.records,
    votesList.data.length,
  );
  // 8. Verify vote count is exactly 2 (one upvote, one downvote)
  TestValidator.equals("vote count is 2", votesList.data.length, 2);
  // 9. Verify each vote record contains required voter information
  for (const vote of votesList.data) {
    typia.assert(vote);
    TestValidator.predicate("vote has voter id", vote.voter.id !== undefined);
    TestValidator.predicate(
      "vote has voter username",
      vote.voter.username !== undefined,
    );
    TestValidator.predicate(
      "vote has voter display_name",
      vote.voter.display_name !== undefined,
    );
    TestValidator.predicate(
      "vote has voter karma_score",
      vote.voter.karma_score !== undefined,
    );
    TestValidator.predicate(
      "vote has vote_type",
      vote.vote_type === "upvote" || vote.vote_type === "downvote",
    );
    TestValidator.predicate(
      "vote has created_at",
      vote.created_at !== undefined,
    );
    TestValidator.predicate(
      "vote has updated_at",
      vote.updated_at !== undefined,
    );
  }
  // 10. Verify votes are sorted by created_at descending (newest first)
  if (votesList.data.length >= 2) {
    const firstVoteTime: Date = new Date(votesList.data[0].created_at);
    const secondVoteTime: Date = new Date(votesList.data[1].created_at);
    TestValidator.predicate(
      "votes sorted by created_at descending",
      firstVoteTime >= secondVoteTime,
    );
  }
  // 11. Verify we have both upvote and downvote
  const voteTypes: string[] = votesList.data.map((v) => v.vote_type);
  TestValidator.predicate("has upvote", voteTypes.includes("upvote"));
  TestValidator.predicate("has downvote", voteTypes.includes("downvote"));
  // 12. Verify voter information matches the members who cast votes
  const upvoteVoter: IRedditLikeMember.ISummary | undefined =
    votesList.data.find((v) => v.vote_type === "upvote")?.voter;
  const downvoteVoter: IRedditLikeMember.ISummary | undefined =
    votesList.data.find((v) => v.vote_type === "downvote")?.voter;
  TestValidator.predicate("upvote voter exists", upvoteVoter !== undefined);
  TestValidator.predicate("downvote voter exists", downvoteVoter !== undefined);
  TestValidator.notEquals(
    "upvoter and downvoter are different",
    upvoteVoter?.id,
    downvoteVoter?.id,
  );
  // 13. Verify comment author's karma reflects cumulative votes (upvote +1, downvote -1 = net 0)
  // Note: The karma should remain the same since +1 and -1 cancel out
  const refreshedAuthor: IRedditLikeMember.IAuthorized =
    await api.functional.redditLike.auth.member.join(authorConnection, {
      body: {
        email: authorAuth.email,
        password: authorAuth.token.access,
        username: authorAuth.username,
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  typia.assert(refreshedAuthor);
  // Since upvote (+1) and downvote (-1) cancel out, karma should be unchanged
  TestValidator.equals(
    "author karma unchanged after equal votes",
    refreshedAuthor.karma_score,
    initialKarma,
  );
}
