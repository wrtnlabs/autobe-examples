import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
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
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test creating a reply to an existing comment, validating the parentCommentId functionality and nested comment structure.
 *
 * Validates the complete comment reply workflow including member authentication, community subscription, post creation, parent comment creation, and reply comment creation. Ensures that the reply correctly references the parent comment and that the nested comment structure is properly maintained.
 *
 * Special attention is given to verifying that the parentCommentId reference is correctly maintained, the parentComment field contains the parent comment's summary, and that the reply inherits the same post context as the parent comment.
 *
 * 1. Member registers with email, password, and unique username.
 * 2. Member subscribes to a community.
 * 3. Member creates a post in the subscribed community.
 * 4. Member creates a parent comment on the post.
 * 5. Member creates a reply comment to the parent comment with parentCommentId.
 * 6. Validates reply comment details match input and parent comment reference, ...
 */
export async function test_api_comment_creation_reply_to_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Subscribe to a community
  const communityId: string = typia.random<string>();
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    memberConnection,
    {
      params: { communityId },
    },
  );
  // 3. Create a post in the subscribed community
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        community_id: communityId,
      },
    });
  typia.assert(post);
  // 4. Create a parent comment on the post
  const parentComment: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is the parent comment content",
        },
      },
    );
  typia.assert(parentComment);
  // 5. Create a reply comment to the parent comment
  const replyComment: IRedditCloneComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is my reply to the parent comment",
          parentCommentId: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 6. Validate reply comment details
  TestValidator.equals(
    "reply content matches",
    replyComment.content,
    "This is my reply to the parent comment",
  );
  TestValidator.equals(
    "reply author is member",
    replyComment.author.id,
    parentComment.author.id,
  );
  TestValidator.equals("reply post matches", replyComment.post.id, post.id);
  TestValidator.equals(
    "parentComment id matches",
    replyComment.parentComment!.id,
    parentComment.id,
  );
  TestValidator.equals(
    "parentComment content matches",
    replyComment.parentComment!.content,
    "This is the parent comment content",
  );
  TestValidator.predicate("voteScore is zero", replyComment.voteScore === 0);
  TestValidator.predicate("replyCount is zero", replyComment.replyCount === 0);
  TestValidator.predicate(
    "created_at exists",
    replyComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    replyComment.updated_at.length > 0,
  );
}
