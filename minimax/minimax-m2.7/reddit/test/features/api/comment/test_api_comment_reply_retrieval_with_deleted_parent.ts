import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_comments_replies_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_replies_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test retrieving a nested reply when the parent comment has been soft-deleted.
 *
 * Business Rule Validation: Replies to a deleted parent comment SHALL remain visible
 * and accessible. This test verifies that soft-deleting a parent comment does not
 * affect the visibility or accessibility of its nested replies.
 *
 * Test Flow:
 * 1. Create member, community, subscribe, create post
 * 2. Create top-level comment on the post
 * 3. Create nested reply to the comment
 * 4. Soft-delete the parent comment
 * 5. Retrieve the reply - should still be accessible
 * 6. Validate reply content is intact and reply is not deleted
 */
export async function test_api_comment_reply_retrieval_with_deleted_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const parentComment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(parentComment);
  // 6. Create a nested reply to the comment
  const reply =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parentCommentId: parentComment.id,
        },
        params: {
          commentId: parentComment.id,
        },
      },
    );
  typia.assert(reply);
  // Store the reply content for validation
  const replyContent = reply.content;
  const replyId = reply.id;
  // 7. Soft-delete the parent comment
  await api.functional.redditClone.member.redditClone.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );
  // 8. Retrieve the reply via public endpoint (no auth required)
  // The reply should still be accessible even though parent is deleted
  const retrievedReply =
    await api.functional.redditClone.redditClone.comments.replies.at(
      connection,
      {
        commentId: parentComment.id,
        replyId: replyId,
      },
    );
  typia.assert(retrievedReply);
  // Test Validation:
  // - The reply should still be accessible (returns 200 OK with IRedditCloneComment)
  // - deletedAt should be null (reply itself is not deleted)
  // - content should contain actual reply content (not placeholder)
  TestValidator.equals("reply id matches", retrievedReply.id, replyId);
  TestValidator.equals(
    "reply content is intact",
    retrievedReply.content,
    replyContent,
  );
  TestValidator.equals(
    "reply deletedAt is null",
    retrievedReply.deletedAt,
    null,
  );
  TestValidator.predicate(
    "reply has valid voteScore",
    retrievedReply.voteScore >= 0,
  );
}
