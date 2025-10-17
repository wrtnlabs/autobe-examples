import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test vote state transition from upvote to downvote on a comment.
 *
 * This test validates the flexible voting system that allows members to change
 * their assessment of comments. The test creates a member account, establishes
 * community and post context, creates a comment, casts an initial upvote, then
 * changes the vote to downvote through a second vote submission.
 *
 * The test verifies that the vote record is updated (not duplicated), the
 * comment's vote_score changes appropriately when transitioning from upvote to
 * downvote, and the system properly handles vote state transitions.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create a community to host discussions
 * 3. Create a post within the community
 * 4. Create a comment on the post (initial score: 0)
 * 5. Cast an initial upvote (+1) on the comment
 * 6. Change the vote to downvote (-1)
 * 7. Verify the vote change was successful
 * 8. Verify the updated vote has correct value
 */
export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community to host discussions
  const communityData = {
    code: RandomGenerator.alphaNumeric(15).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post within the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Verify initial vote score is 0
  TestValidator.equals("initial comment vote score", comment.vote_score, 0);

  // Step 5: Cast an initial upvote (+1) on the comment
  const upvoteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const upvote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: comment.id,
      body: upvoteData,
    });
  typia.assert(upvote);
  TestValidator.equals("upvote value", upvote.vote_value, 1);

  // Step 6: Change the vote to downvote (-1)
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const downvote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: comment.id,
      body: downvoteData,
    });
  typia.assert(downvote);

  // Step 7: Verify the vote change was successful
  TestValidator.equals("downvote value", downvote.vote_value, -1);

  // Step 8: Verify the vote record was updated (same ID indicates update, not duplicate)
  TestValidator.equals(
    "vote record updated not duplicated",
    downvote.id,
    upvote.id,
  );

  // Verify the updated_at timestamp changed
  TestValidator.predicate(
    "vote record timestamp updated",
    new Date(downvote.updated_at).getTime() >=
      new Date(upvote.updated_at).getTime(),
  );
}
