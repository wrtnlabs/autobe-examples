import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the edge case where a comment thread contains deleted comments.
 * Deleted comments should remain visible in the thread structure to preserve
 * conversation context for nested replies, but content must be hidden (null).
 */
export async function test_api_moderator_comment_thread_with_deleted_parents(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  // 3. Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // 4. Create a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 5. Create a parent comment
  const parentComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { content: "This is a parent comment" },
      },
    );
  // 6. Create nested reply comments under the parent
  const reply1 = await generate_random_reddit_like_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { content: "Reply 1 under parent", parentId: parentComment.id },
    },
  );
  const reply2 = await generate_random_reddit_like_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { content: "Reply 2 under parent", parentId: parentComment.id },
    },
  );
  // 7. Delete the parent comment (as the comment author)
  await api.functional.redditLike.member.posts.comments.erase(
    memberConnection,
    { postId: post.id, commentId: parentComment.id },
  );
  // 8. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 9. Call the target endpoint to retrieve the thread
  const thread =
    await api.functional.redditLike.moderator.posts.comments.thread(
      moderatorConnection,
      { postId: post.id },
    );
  typia.assert(thread);
  // 10-13. Find the deleted parent comment in thread and validate its structure
  const findDeletedParent = (
    comments: IRedditLikeComment.IThread[],
  ): IRedditLikeComment.IThread | undefined => {
    for (const comment of comments) {
      if (comment.id === parentComment.id) {
        return comment;
      }
      const found = findDeletedParent(comment.replies);
      if (found) return found;
    }
    return undefined;
  };
  // Search starting from thread (wrapped in array) to handle both virtual root and direct return cases
  const deletedParentInThread = findDeletedParent([thread]);
  // Verify deleted parent is found
  TestValidator.predicate(
    "deleted parent exists in thread",
    deletedParentInThread !== undefined,
  );
  if (deletedParentInThread) {
    // 10. Verify deleted parent comment structure is preserved (id, author, timestamps visible)
    TestValidator.equals(
      "deleted parent id",
      deletedParentInThread.id,
      parentComment.id,
    );
    TestValidator.equals(
      "deleted parent author",
      deletedParentInThread.author.id,
      member.id,
    );
    TestValidator.predicate(
      "deleted parent createdAt exists",
      deletedParentInThread.createdAt !== undefined,
    );
    // 11. Verify deleted parent comment's content is null (hidden)
    TestValidator.equals(
      "deleted parent content is null",
      deletedParentInThread.content,
      null,
    );
    TestValidator.predicate(
      "deleted parent isDeleted flag",
      deletedParentInThread.isDeleted === true,
    );
    // 12. Verify nested replies under deleted parent remain visible with full content
    const replyIds = deletedParentInThread.replies.map((r) => r.id);
    TestValidator.predicate(
      "reply 1 exists under deleted parent",
      replyIds.includes(reply1.id),
    );
    TestValidator.predicate(
      "reply 2 exists under deleted parent",
      replyIds.includes(reply2.id),
    );
    const findReply = (
      comments: IRedditLikeComment.IThread[],
      targetId: string,
    ): IRedditLikeComment.IThread | undefined => {
      for (const comment of comments) {
        if (comment.id === targetId) {
          return comment;
        }
        const found = findReply(comment.replies, targetId);
        if (found) return found;
      }
      return undefined;
    };
    const reply1InThread = findReply(deletedParentInThread.replies, reply1.id);
    const reply2InThread = findReply(deletedParentInThread.replies, reply2.id);
    // Verify replies have full content (not deleted)
    TestValidator.predicate(
      "reply 1 has content",
      reply1InThread !== undefined && reply1InThread.content !== null,
    );
    TestValidator.predicate(
      "reply 2 has content",
      reply2InThread !== undefined && reply2InThread.content !== null,
    );
    TestValidator.predicate(
      "reply 1 is not marked deleted",
      reply1InThread !== undefined && reply1InThread.isDeleted === false,
    );
    TestValidator.predicate(
      "reply 2 is not marked deleted",
      reply2InThread !== undefined && reply2InThread.isDeleted === false,
    );
    // 13. Verify thread structure maintains parent-child relationships
    TestValidator.predicate(
      "replies under deleted parent preserve structure",
      deletedParentInThread.replies.length >= 2,
    );
  }
}
