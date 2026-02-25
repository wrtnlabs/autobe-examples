import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_post_vote_initial_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Create post author user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuthorized);
  // Create a community subscription for the user (using direct SDK since no utility function)
  const communityName = RandomGenerator.alphabets(10);
  // Create post with user
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: communityName,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      permissions_level: "admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Record initial karma
  const initialKarma = userAuthorized.karma;
  // Admin votes downvote on the post
  const voteResult =
    await api.functional.communityPlatform.admin.posts.votes.update(
      adminConnection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(voteResult);
  // Validate vote scores
  TestValidator.equals(
    "downvote count should be 1",
    voteResult.downvote_count,
    1,
  );
  TestValidator.equals("upvote count should be 0", voteResult.upvote_count, 0);
  TestValidator.equals("total score should be -1", voteResult.total_score, -1);
  // Test vote uniqueness - try to vote again (should update existing vote)
  const secondVoteResult =
    await api.functional.communityPlatform.admin.posts.votes.update(
      adminConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(secondVoteResult);
  // After changing vote, downvote should be 0, upvote should be 1
  TestValidator.equals(
    "downvote count after change should be 0",
    secondVoteResult.downvote_count,
    0,
  );
  TestValidator.equals(
    "upvote count after change should be 1",
    secondVoteResult.upvote_count,
    1,
  );
  TestValidator.equals(
    "total score after change should be 1",
    secondVoteResult.total_score,
    1,
  );
  // Test that admin cannot vote on their own post
  const adminPost = await generate_random_community_platform_user_posts_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: communityName,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(adminPost);
  // Admin should not be able to vote on their own post
  await TestValidator.error("admin cannot vote on own post", async () => {
    await api.functional.communityPlatform.admin.posts.votes.update(
      adminConnection,
      {
        postId: adminPost.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  });
}
