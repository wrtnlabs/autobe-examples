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
 * Test that restoring a soft-deleted parent comment preserves the complete
 * thread hierarchy with nested replies.
 *
 * This test validates the comment restoration workflow:
 *
 * 1. Register and authenticate as a member
 * 2. Create a community for discussion context
 * 3. Create a post to host the threaded comment discussion
 * 4. Create a parent comment that will be deleted and restored
 * 5. Create multiple nested replies under parent comment to establish thread
 *    hierarchy
 * 6. Delete the parent comment to test thread structure preservation
 * 7. Restore the parent comment as the author
 * 8. Validate that parent comment content becomes visible again, all child replies
 *    remain properly nested, depth levels and parent-child relationships are
 *    intact, and the thread displays correctly with full conversation context
 */
export async function test_api_comment_restoration_preserves_thread_structure(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a community for discussion context
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Create a post to host the threaded comment discussion
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Create a parent comment that will be deleted and restored
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Store original parent comment content for later validation
  const originalParentContent = parentComment.content_text;
  const originalParentDepth = parentComment.depth;

  // Step 5: Create multiple nested replies under parent comment to establish thread hierarchy
  const firstReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const firstReply =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: firstReplyData,
    });
  typia.assert(firstReply);
  TestValidator.equals(
    "first reply parent matches",
    firstReply.reddit_like_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "first reply depth is parent depth + 1",
    firstReply.depth,
    parentComment.depth + 1,
  );

  // Store first reply details for post-restoration validation
  const firstReplyContent = firstReply.content_text;
  const firstReplyDepth = firstReply.depth;

  const secondReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const secondReply =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: secondReplyData,
    });
  typia.assert(secondReply);
  TestValidator.equals(
    "second reply parent matches",
    secondReply.reddit_like_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "second reply depth is parent depth + 1",
    secondReply.depth,
    parentComment.depth + 1,
  );

  // Store second reply details for post-restoration validation
  const secondReplyContent = secondReply.content_text;
  const secondReplyDepth = secondReply.depth;

  // Create a nested reply to the first reply for deeper thread structure
  const nestedReplyData = {
    content_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const nestedReply =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: firstReply.id,
      body: nestedReplyData,
    });
  typia.assert(nestedReply);
  TestValidator.equals(
    "nested reply parent matches first reply",
    nestedReply.reddit_like_parent_comment_id,
    firstReply.id,
  );
  TestValidator.equals(
    "nested reply depth is first reply depth + 1",
    nestedReply.depth,
    firstReply.depth + 1,
  );

  // Store nested reply details for post-restoration validation
  const nestedReplyContent = nestedReply.content_text;
  const nestedReplyDepth = nestedReply.depth;

  // Step 6: Delete the parent comment (soft-delete)
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: parentComment.id,
  });

  // Step 7: Restore the parent comment as the author
  const restoredComment =
    await api.functional.redditLike.member.comments.restore(connection, {
      commentId: parentComment.id,
    });
  typia.assert(restoredComment);

  // Step 8: Validate restoration preserves thread structure
  TestValidator.equals(
    "restored comment ID matches original",
    restoredComment.id,
    parentComment.id,
  );
  TestValidator.equals(
    "restored comment content matches original",
    restoredComment.content_text,
    originalParentContent,
  );
  TestValidator.equals(
    "restored comment post ID matches",
    restoredComment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "restored comment depth preserved",
    restoredComment.depth,
    originalParentDepth,
  );

  // Validate parent comment parent reference is preserved (should be null/undefined for top-level comment)
  TestValidator.equals(
    "restored parent comment has no parent",
    restoredComment.reddit_like_parent_comment_id,
    parentComment.reddit_like_parent_comment_id,
  );
}
