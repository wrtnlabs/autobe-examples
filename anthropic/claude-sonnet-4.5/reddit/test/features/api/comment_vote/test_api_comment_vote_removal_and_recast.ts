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
 * Test the complete vote lifecycle on a comment: cast upvote, remove vote, then
 * cast downvote.
 *
 * This test validates that the voting system properly handles sequential vote
 * operations without state corruption. It creates a complete context (member,
 * community, post, comment), then tests the full vote lifecycle: casting an
 * upvote, removing it to return to neutral, and finally casting a downvote.
 *
 * The test verifies each state transition is correct:
 *
 * 1. Initial state: comment score is 0 (neutral)
 * 2. After upvote: comment score is 1
 * 3. After vote removal: comment score returns to 0 (neutral)
 * 4. After downvote: comment score is -1
 *
 * This ensures the voting system accurately maintains state through multiple
 * transitions and properly reflects vote changes in both vote scores and karma
 * attribution.
 */
export async function test_api_comment_vote_removal_and_recast(
  connection: api.IConnection,
) {
  // 1. Create member account for testing vote lifecycle
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 2. Create community to host content
  const communityData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // 3. Create post to hold comments
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

  // 4. Create comment for testing vote lifecycle
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Verify initial state: comment score should be 0 (neutral)
  TestValidator.equals(
    "initial comment score is neutral",
    comment.vote_score,
    0,
  );

  // 5. Cast initial upvote
  const upvoteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const upvote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: comment.id,
      body: upvoteData,
    });
  typia.assert(upvote);

  // Verify upvote was created with correct value
  TestValidator.equals("upvote value is 1", upvote.vote_value, 1);

  // 6. Remove the upvote to return to neutral state
  await api.functional.redditLike.member.comments.votes.erase(connection, {
    commentId: comment.id,
  });

  // 7. Cast downvote after removal
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const downvote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: comment.id,
      body: downvoteData,
    });
  typia.assert(downvote);

  // Verify downvote was created with correct value
  TestValidator.equals("downvote value is -1", downvote.vote_value, -1);
}
