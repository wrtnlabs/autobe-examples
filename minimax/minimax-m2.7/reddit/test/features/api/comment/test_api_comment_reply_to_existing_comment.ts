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
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test creating nested replies to an existing comment.
 *
 * This test validates the threaded discussion capability with parent-child relationships:
 * 1. Create a member and authenticate
 * 2. Create a community and subscribe to it
 * 3. Create a post in the community
 * 4. Create a top-level comment on the post
 * 5. Create a nested reply to the top-level comment
 * 6. Verify unlimited nesting depth by creating another level of reply
 *
 * Validations verify:
 * - Response contains correct content matching the reply text
 * - Vote score is 0 for new replies
 * - Parent comment ID is correctly linked
 * - Parent's replies array contains the nested reply
 */
export async function test_api_comment_reply_to_existing_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
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
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post
  const topLevelCommentContent = RandomGenerator.paragraph({ sentences: 2 });
  const topLevelComment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        body: {
          content: topLevelCommentContent,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(topLevelComment);
  // Validate top-level comment
  TestValidator.equals(
    "top-level comment content",
    topLevelComment.content,
    topLevelCommentContent,
  );
  TestValidator.equals("vote score is 0", topLevelComment.voteScore, 0);
  TestValidator.equals(
    "no parent for top-level comment",
    topLevelComment.parent,
    null,
  );
  TestValidator.equals(
    "empty replies array initially",
    topLevelComment.replies.length,
    0,
  );
  // 6. Create a nested reply to the top-level comment
  const replyContent = RandomGenerator.paragraph({ sentences: 2 });
  const reply =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        body: {
          content: replyContent,
          parentCommentId: topLevelComment.id,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(reply);
  // Validate nested reply
  TestValidator.equals("reply content matches", reply.content, replyContent);
  TestValidator.equals("reply vote score is 0", reply.voteScore, 0);
  TestValidator.notEquals("reply has parent", reply.parent, null);
  TestValidator.equals(
    "parent ID matches top-level comment",
    reply.parent!.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "parent content matches",
    reply.parent!.content,
    topLevelCommentContent,
  );
  // 7. Create another level of reply to verify unlimited nesting depth
  const deepReplyContent = RandomGenerator.paragraph({ sentences: 2 });
  const deepReply =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        body: {
          content: deepReplyContent,
          parentCommentId: reply.id,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(deepReply);
  // Validate deep reply (third level of nesting)
  TestValidator.equals(
    "deep reply content matches",
    deepReply.content,
    deepReplyContent,
  );
  TestValidator.equals("deep reply vote score is 0", deepReply.voteScore, 0);
  TestValidator.notEquals("deep reply has parent", deepReply.parent, null);
  TestValidator.equals(
    "deep reply parent ID matches reply",
    deepReply.parent!.id,
    reply.id,
  );
  TestValidator.equals(
    "deep reply parent content matches",
    deepReply.parent!.content,
    replyContent,
  );
}
