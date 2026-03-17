import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_thread_deleted_comment_structure_preserved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate member 1 (owner/poster)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(owner);
  // Step 2: Upload attachment for community icon
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      ownerConnection,
      {},
    );
  typia.assert(attachment);
  // Step 3: Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        iconAttachmentId: attachment.id,
      },
    },
  );
  typia.assert(community);
  // Step 4: Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 5: Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Create top-level comment A
  const topComment =
    await generate_random_reddit_like_member_posts_comments_create(
      ownerConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is the top-level comment that will be deleted",
          parentId: null,
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(topComment);
  // Step 7: Create nested reply B under A
  const replyB = await generate_random_reddit_like_member_posts_comments_create(
    ownerConnection,
    {
      params: { postId: post.id },
      body: {
        content: "This is reply B to the top-level comment",
        parentId: topComment.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(replyB);
  // Step 8: Create deep-nested reply C under B
  const replyC = await generate_random_reddit_like_member_posts_comments_create(
    ownerConnection,
    {
      params: { postId: post.id },
      body: {
        content: "This is reply C nested under reply B",
        parentId: replyB.id,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(replyC);
  // Step 9: Delete the top-level comment A
  await api.functional.redditLike.member.posts.comments.erase(ownerConnection, {
    postId: post.id,
    commentId: topComment.id,
  });
  // Step 10: Retrieve the comment thread
  const thread = await api.functional.redditLike.member.posts.comments.thread(
    ownerConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(thread);
  // Step 11: Validate the thread structure with deleted comments preserved
  // Find deleted top comment in thread - should exist with structure preserved
  const findCommentInThread = (
    thread: IRedditLikeComment.IThread,
    commentId: string,
  ): IRedditLikeComment.IThread | null => {
    if (thread.id === commentId) {
      return thread;
    }
    for (const reply of thread.replies) {
      const found = findCommentInThread(reply, commentId);
      if (found !== null) {
        return found;
      }
    }
    return null;
  };
  // Find all three comments in the thread
  const deletedTop = findCommentInThread(thread, topComment.id);
  const replyBInThread = findCommentInThread(thread, replyB.id);
  const replyCInThread = findCommentInThread(thread, replyC.id);
  // (1) Deleted comment exists in tree and structure is preserved
  TestValidator.predicate(
    "deleted parent comment exists in thread tree",
    deletedTop !== null,
  );
  typia.assertGuard<IRedditLikeComment.IThread>(deletedTop!);
  // (2) Deleted comment content is null while isDeleted is true
  TestValidator.predicate(
    "deleted comment has isDeleted flag true",
    deletedTop.isDeleted === true,
  );
  TestValidator.predicate(
    "deleted comment content is null",
    deletedTop.content === null,
  );
  // (3) Reply B to deleted comment remains visible and accessible
  TestValidator.predicate(
    "reply B exists and is accessible",
    replyBInThread !== null,
  );
  typia.assertGuard<IRedditLikeComment.IThread>(replyBInThread!);
  TestValidator.predicate(
    "reply B has non-null content",
    replyBInThread.content !== null,
  );
  TestValidator.predicate(
    "reply B is not deleted",
    replyBInThread.isDeleted === false,
  );
  // (4) Deep-nested reply C remains visible
  TestValidator.predicate(
    "reply C exists and is accessible",
    replyCInThread !== null,
  );
  typia.assertGuard<IRedditLikeComment.IThread>(replyCInThread!);
  TestValidator.predicate(
    "reply C has non-null content",
    replyCInThread.content !== null,
  );
  TestValidator.predicate(
    "reply C is not deleted",
    replyCInThread.isDeleted === false,
  );
  // (5) Thread hierarchy is preserved - replies are nested under deleted parent
  TestValidator.predicate(
    "deleted comment has nested replies preserved",
    deletedTop.replies.length > 0,
  );
  // Verify reply B is directly under the deleted top comment
  const replyBUnderDeleted = deletedTop.replies.find((r) => r.id === replyB.id);
  TestValidator.predicate(
    "reply B is nested under deleted parent",
    replyBUnderDeleted !== undefined,
  );
  // Verify reply C is nested under reply B
  const replyCUnderB = replyBUnderDeleted!.replies.find(
    (r) => r.id === replyC.id,
  );
  TestValidator.predicate(
    "reply C is nested under reply B",
    replyCUnderB !== undefined,
  );
}