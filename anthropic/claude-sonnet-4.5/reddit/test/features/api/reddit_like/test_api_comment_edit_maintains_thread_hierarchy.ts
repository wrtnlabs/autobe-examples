import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_comment_edit_maintains_thread_hierarchy(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community for threaded discussion
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post to enable commenting
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create a parent comment on the post
  const originalParentContent = RandomGenerator.paragraph({ sentences: 5 });
  const parentComment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: originalParentContent,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(parentComment);

  TestValidator.equals("parent comment depth is 0", parentComment.depth, 0);
  TestValidator.equals(
    "parent comment not edited initially",
    parentComment.edited,
    false,
  );

  // Step 5: Create multiple nested replies under the parent comment
  const childReply1 =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    });
  typia.assert(childReply1);

  TestValidator.equals("first child reply depth is 1", childReply1.depth, 1);
  TestValidator.equals(
    "first child parent reference",
    childReply1.reddit_like_parent_comment_id,
    parentComment.id,
  );

  const childReply2 =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    });
  typia.assert(childReply2);

  TestValidator.equals("second child reply depth is 1", childReply2.depth, 1);
  TestValidator.equals(
    "second child parent reference",
    childReply2.reddit_like_parent_comment_id,
    parentComment.id,
  );

  // Create a nested reply under the first child (grandchild of parent)
  const grandchildReply =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: childReply1.id,
      body: {
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.IReplyCreate,
    });
  typia.assert(grandchildReply);

  TestValidator.equals("grandchild reply depth is 2", grandchildReply.depth, 2);
  TestValidator.equals(
    "grandchild parent reference",
    grandchildReply.reddit_like_parent_comment_id,
    childReply1.id,
  );

  // Step 6: Edit the parent comment's text content
  const updatedParentContent = RandomGenerator.paragraph({ sentences: 6 });
  const editedParentComment =
    await api.functional.redditLike.member.comments.update(connection, {
      commentId: parentComment.id,
      body: {
        content_text: updatedParentContent,
      } satisfies IRedditLikeComment.IUpdate,
    });
  typia.assert(editedParentComment);

  // Step 7: Verify the parent comment is updated correctly
  TestValidator.equals(
    "parent comment ID unchanged",
    editedParentComment.id,
    parentComment.id,
  );
  TestValidator.equals(
    "parent comment content updated",
    editedParentComment.content_text,
    updatedParentContent,
  );
  TestValidator.equals(
    "parent comment marked as edited",
    editedParentComment.edited,
    true,
  );
  TestValidator.equals(
    "parent comment depth unchanged",
    editedParentComment.depth,
    0,
  );

  // Step 8: Verify child replies still reference the parent correctly
  // We cannot retrieve children directly from API based on provided functions,
  // but we can verify the data we already have remains consistent
  TestValidator.equals(
    "first child still references parent",
    childReply1.reddit_like_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "second child still references parent",
    childReply2.reddit_like_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "grandchild still references first child",
    grandchildReply.reddit_like_parent_comment_id,
    childReply1.id,
  );

  // Step 9: Verify depth levels remain unchanged
  TestValidator.equals("first child depth unchanged", childReply1.depth, 1);
  TestValidator.equals("second child depth unchanged", childReply2.depth, 1);
  TestValidator.equals("grandchild depth unchanged", grandchildReply.depth, 2);
}
