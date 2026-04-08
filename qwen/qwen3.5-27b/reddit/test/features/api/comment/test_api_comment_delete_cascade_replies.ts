import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test cascade deletion of comments and all nested replies.
 *
 * Validates that deleting a parent comment automatically deletes all child replies at any depth through database CASCADE ON DELETE constraint. The test creates a comment hierarchy with multiple nesting levels, then deletes the root comment to verify all descendants are removed.
 *
 * This test ensures the referential integrity of the comment threading system and validates that the cascade deletion behavior works correctly for unlimited nesting depth.
 *
 * 1. Authenticate as a member user to enable comment operations.
 * 2. Create a post in a subscribed community to serve as the comment container.
 * 3. Create a top-level comment on the post.
 * 4. Create a reply to the top-level comment (depth 1).
 * 5. Create a reply to the depth-1 comment (depth 2).
 * 6. Delete the top-level comment.
 * 7. Verify that all nested replies were cascade deleted by attempting to access them.
 */
export async function test_api_comment_delete_cascade_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(post);
  // 3. Create top-level comment
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { content: "Top-level comment" },
      },
    );
  typia.assert(topLevelComment);
  // 4. Create reply to top-level comment (depth 1)
  const depth1Comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply to top-level comment",
          parentCommentId: topLevelComment.id,
        },
      },
    );
  typia.assert(depth1Comment);
  // 5. Create reply to depth-1 comment (depth 2)
  const depth2Comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply to depth-1 comment",
          parentCommentId: depth1Comment.id,
        },
      },
    );
  typia.assert(depth2Comment);
  // 6. Delete top-level comment (should cascade delete all replies)
  await api.functional.redditClone.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: topLevelComment.id,
    },
  );
  // 7. Verify cascade deletion by attempting to access deleted comments
  // The comments should be soft-deleted and not accessible
  await TestValidator.error("top-level comment should be deleted", async () => {
    await api.functional.redditClone.member.posts.comments.erase(
      memberConnection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
      },
    );
  });
  await TestValidator.error(
    "depth-1 comment should be cascade deleted",
    async () => {
      await api.functional.redditClone.member.posts.comments.erase(
        memberConnection,
        {
          postId: post.id,
          commentId: depth1Comment.id,
        },
      );
    },
  );
  await TestValidator.error(
    "depth-2 comment should be cascade deleted",
    async () => {
      await api.functional.redditClone.member.posts.comments.erase(
        memberConnection,
        {
          postId: post.id,
          commentId: depth2Comment.id,
        },
      );
    },
  );
}
