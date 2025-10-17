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
 * Test voting on nested comment replies within a threaded discussion.
 *
 * Validates that the voting system integrates properly with the comment
 * threading system by testing vote functionality on nested reply comments. This
 * test creates a complete discussion hierarchy (member → community → post →
 * comment → nested reply) and verifies that votes work correctly at all nesting
 * depths.
 *
 * Steps:
 *
 * 1. Create member account for authentication
 * 2. Create community for discussion hosting
 * 3. Create post for comment thread container
 * 4. Create top-level comment as parent
 * 5. Create nested reply to the comment
 * 6. Vote on the nested reply comment
 * 7. Validate vote recording and score updates
 */
export async function test_api_comment_vote_nested_reply_voting(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create top-level comment
  const topLevelCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeComment.ICreate;

  const topLevelComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: topLevelCommentData,
    });
  typia.assert(topLevelComment);

  // Step 5: Create nested reply to the top-level comment
  const nestedReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const nestedReply: IRedditLikeComment =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: topLevelComment.id,
      body: nestedReplyData,
    });
  typia.assert(nestedReply);

  // Validate nested reply structure
  TestValidator.equals(
    "nested reply parent should match top-level comment",
    nestedReply.reddit_like_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "nested reply post should match original post",
    nestedReply.reddit_like_post_id,
    post.id,
  );
  TestValidator.predicate(
    "nested reply depth should be greater than 0",
    nestedReply.depth > 0,
  );

  // Step 6: Vote on the nested reply comment
  const voteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const vote: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: nestedReply.id,
      body: voteData,
    });
  typia.assert(vote);

  // Step 7: Validate vote recording
  TestValidator.equals("vote value should be upvote", vote.vote_value, 1);
}
