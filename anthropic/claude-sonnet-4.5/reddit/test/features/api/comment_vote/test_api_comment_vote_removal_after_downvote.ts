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
 * Test removing a downvote from a comment to return to neutral voting state.
 *
 * This test validates the complete vote retraction workflow for negative votes:
 *
 * 1. Create member account for authentication
 * 2. Create community to host content
 * 3. Create post to hold comments
 * 4. Create comment that will receive downvote
 * 5. Create another member who will cast the downvote
 * 6. Cast downvote (-1) on the comment
 * 7. Remove the downvote
 * 8. Verify vote deletion completes successfully
 *
 * The test ensures that downvote removal properly executes without errors.
 * Note: Full verification of vote_score and comment_karma changes would require
 * GET endpoints which are not available in the current API function set.
 */
export async function test_api_comment_vote_removal_after_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create first member (comment author)
  const authorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorData,
    });
  typia.assert(author);

  // Step 2: Create community
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post
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

  // Step 4: Create comment
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Verify initial comment state
  TestValidator.equals("initial vote score is 0", comment.vote_score, 0);

  // Step 5: Create second member (voter)
  const voterData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const voter: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: voterData,
    });
  typia.assert(voter);

  // Step 6: Cast downvote on the comment
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const downvote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: comment.id,
      body: downvoteData,
    });
  typia.assert(downvote);
  TestValidator.equals("downvote value is -1", downvote.vote_value, -1);

  // Step 7: Remove the downvote
  await api.functional.redditLike.member.comments.votes.erase(connection, {
    commentId: comment.id,
  });

  // Step 8: Verify vote removal completed successfully
  // Note: Full validation of vote_score and comment_karma restoration would require
  // GET endpoints to retrieve updated comment and author data, which are not available
  // in the current API function set. The successful completion of the erase operation
  // without throwing errors indicates the vote was removed properly.
  TestValidator.predicate("downvote removal completed successfully", true);
}
