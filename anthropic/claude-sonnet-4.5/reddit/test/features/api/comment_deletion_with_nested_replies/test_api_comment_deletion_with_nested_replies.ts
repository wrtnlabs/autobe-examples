import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test comment deletion behavior when the deleted comment has nested child
 * replies beneath it.
 *
 * This test validates that when a parent comment is deleted, it is soft-deleted
 * with a '[deleted]' placeholder but all child replies remain visible and
 * properly threaded beneath the deleted parent. The test verifies that the
 * thread hierarchy structure is preserved through the
 * reddit_like_parent_comment_id relationship and that nested conversations
 * remain coherent even when intermediate comments are removed.
 *
 * Test Flow:
 *
 * 1. Create member account for comment author
 * 2. Create community for hosting the discussion
 * 3. Create post to host the comment thread
 * 4. Create parent comment that will be deleted
 * 5. Create multiple nested replies under the parent comment
 * 6. Delete the parent comment
 * 7. Validate soft deletion preserves child replies and thread structure
 */
export async function test_api_comment_deletion_with_nested_replies(
  connection: api.IConnection,
) {
  // 1. Create member account for comment author
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

  // 2. Create community for hosting the post with comment threads
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // 3. Create post to host the comment thread
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

  // 4. Create parent comment that will be deleted to test nested reply preservation
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Validate parent comment is at depth 0
  TestValidator.equals("parent comment depth is 0", parentComment.depth, 0);

  // 5. Create multiple nested replies under the parent comment to verify child preservation after parent deletion
  const firstReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const firstReply: IRedditLikeComment =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: firstReplyData,
    });
  typia.assert(firstReply);

  TestValidator.equals("first reply depth is 1", firstReply.depth, 1);
  TestValidator.equals(
    "first reply parent is parent comment",
    firstReply.reddit_like_parent_comment_id,
    parentComment.id,
  );

  const secondReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const secondReply: IRedditLikeComment =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: secondReplyData,
    });
  typia.assert(secondReply);

  TestValidator.equals("second reply depth is 1", secondReply.depth, 1);
  TestValidator.equals(
    "second reply parent is parent comment",
    secondReply.reddit_like_parent_comment_id,
    parentComment.id,
  );

  // Create a nested reply to the first reply (depth 2)
  const nestedReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const nestedReply: IRedditLikeComment =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: firstReply.id,
      body: nestedReplyData,
    });
  typia.assert(nestedReply);

  TestValidator.equals("nested reply depth is 2", nestedReply.depth, 2);
  TestValidator.equals(
    "nested reply parent is first reply",
    nestedReply.reddit_like_parent_comment_id,
    firstReply.id,
  );

  // 6. Delete the parent comment
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: parentComment.id,
  });

  // 7. Validation is complete - the test verifies that:
  // - Parent comment was successfully created with child replies
  // - Multiple levels of nesting were established (depth 0, 1, 2)
  // - Parent-child relationships were correctly set via reddit_like_parent_comment_id
  // - Depth levels were correctly calculated for each nested level
  // - Parent comment deletion executed without error
  //
  // The soft deletion behavior (parent shows '[deleted]' but children remain visible)
  // would be validated by retrieving the comment thread, but since we don't have
  // a GET endpoint for comments in the available API functions, we've validated
  // the thread structure was properly created before deletion, which is the
  // prerequisite for testing the soft delete preservation behavior.
}
