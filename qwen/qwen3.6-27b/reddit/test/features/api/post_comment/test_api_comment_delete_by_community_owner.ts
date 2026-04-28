import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test that a community owner can delete a comment authored by a different community member.
 *
 * Validates that the community owner, who automatically holds OWNER authority upon community creation, can delete comments authored by other community members. This demonstrates that OWNER-level moderation privileges override the standard author-only deletion restriction. The test ensures soft-delete succeeds without error.
 *
 * 1. Authenticate a new member as the community owner.
 * 2. Owner creates a new community (automatically becomes OWNER).
 * 3. Authenticate a second member as a regular community subscriber.
 * 4. Subscriber joins the community to gain posting privileges.
 * 5. Regular member creates a post in the community.
 * 6. Regular member creates a comment on the post.
 * 7. Owner deletes the comment using moderation authority.
 */
export async function test_api_comment_delete_by_community_owner(
  connection: api.IConnection,
) {
  // 1. Authenticate as the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: { username: RandomGenerator.name() },
  });
  // 2. Owner creates a community (automatically becomes OWNER)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate a regular community member
  const subscriberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(subscriberConnection, {
    body: { username: RandomGenerator.name() },
  });
  // 4. Subscriber joins the owner's community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      subscriberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription is active", subscription.is_active, true);
  // 5. Regular member creates a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    subscriberConnection,
    {
      body: { community_id: community.id },
    },
  );
  typia.assert(post);
  // 6. Regular member creates a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      subscriberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 7. Owner deletes the comment using moderation authority
  await api.functional.redditLikeCommunity.member.posts.comments.erase(
    ownerConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
}
