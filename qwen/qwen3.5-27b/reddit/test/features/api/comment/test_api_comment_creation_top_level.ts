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
 * Test the primary success path for creating a top-level comment on a post.
 *
 * Validates the complete comment creation workflow including member registration, community subscription, post creation, and comment placement. Ensures that the comment correctly references the post and author, and that computed fields like vote score and reply count are initialized properly.
 *
 * Special attention is given to verifying that top-level comments have a null parentComment field, the comment is associated with the authenticated member's profile, and the vote score starts at zero.
 *
 * 1. Register a new member account with email, password, and username.
 * 2. Subscribe the member to a community (required for post creation).
 * 3. Create a post in the subscribed community.
 * 4. Create a top-level comment on the post without parentCommentId.
 * 5. Validate comment details match input and expected defaults.
 */
export async function test_api_comment_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community subscription (need community ID)
  // Using a random UUID for community - in real scenario, community should exist
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: communityId,
        } satisfies IRedditCloneCommunitySubscription.ICreate,
        params: {
          communityId,
        },
      },
    );
  typia.assert(subscription);
  // 3. Create a post in the subscribed community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: communityId,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post
  const commentContent: string = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: commentContent,
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Validate comment details
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.equals("comment post matches target", comment.post.id, post.id);
  TestValidator.equals(
    "comment author matches member",
    comment.author.id,
    member.id,
  );
  TestValidator.equals(
    "parentComment is null for top-level",
    comment.parentComment,
    null,
  );
  TestValidator.equals("voteScore starts at 0", comment.voteScore, 0);
  TestValidator.equals("replyCount starts at 0", comment.replyCount, 0);
  TestValidator.equals("deleted_at is null", comment.deleted_at, null);
  TestValidator.predicate(
    "has valid created_at",
    comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    comment.updated_at.length > 0,
  );
}
