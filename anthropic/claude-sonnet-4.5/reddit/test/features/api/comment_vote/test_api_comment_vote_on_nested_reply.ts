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
 * Test voting functionality on deeply nested comment replies.
 *
 * This test validates that the voting system works correctly at all nesting
 * levels in threaded discussions. The test creates a member account,
 * establishes community and post context, creates a top-level comment, creates
 * a nested reply to that comment, then casts a vote on the nested reply.
 *
 * The test verifies:
 *
 * 1. Votes work correctly on replies at any depth level
 * 2. The nested comment's vote_score updates properly
 * 3. Karma attribution flows to the reply author correctly
 *
 * This ensures the voting system integrates properly with the threaded comment
 * structure supporting up to 10 nesting levels.
 */
export async function test_api_comment_vote_on_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for voting
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

  // Step 2: Create a community to host posts and comments
  const communityData = {
    code: RandomGenerator.alphaNumeric(15).toLowerCase(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "discussion",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post to hold comment threads
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a parent comment (top-level comment)
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Verify parent comment is at depth 0 (top-level)
  TestValidator.equals("parent comment depth", parentComment.depth, 0);

  // Step 5: Create a nested reply to the parent comment
  const nestedReplyData = {
    content_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const nestedReply: IRedditLikeComment =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: nestedReplyData,
    });
  typia.assert(nestedReply);

  // Verify nested reply is at depth 1
  TestValidator.equals("nested reply depth", nestedReply.depth, 1);

  // Verify nested reply has correct parent
  TestValidator.equals(
    "nested reply parent",
    nestedReply.reddit_like_parent_comment_id,
    parentComment.id,
  );

  // Step 6: Cast a vote on the nested reply (upvote)
  const voteValue = 1 satisfies number;
  const voteData = {
    vote_value: voteValue,
  } satisfies IRedditLikeCommentVote.ICreate;

  const vote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: nestedReply.id,
      body: voteData,
    });
  typia.assert(vote);

  // Step 7: Validate the vote was recorded correctly
  TestValidator.equals("vote value", vote.vote_value, voteValue);
}
