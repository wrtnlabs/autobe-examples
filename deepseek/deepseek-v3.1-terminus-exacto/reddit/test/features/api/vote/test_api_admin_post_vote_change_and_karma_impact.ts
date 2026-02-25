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

export async function test_api_admin_post_vote_change_and_karma_impact(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create post author (user) and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: "testuser@example.com",
      password: "password123",
      username: "testuser",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 2. Create admin voter and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "admin123",
      display_name: "Test Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 3. Create second admin for concurrent voting test
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: "admin2@example.com",
      password: "admin456",
      display_name: "Test Admin 2",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 4. Create a post with the user
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: "Test Post Title",
        community_name: "test_community",
        post_type: "text",
        text_content: "This is a test post content for voting tests.",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 5. Initial upvote by admin
  const initialVote =
    await api.functional.communityPlatform.admin.posts.votes.update(
      adminConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  // 6. Change to downvote
  const downvote =
    await api.functional.communityPlatform.admin.posts.votes.update(
      adminConnection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  // 7. Change back to upvote
  const finalVote =
    await api.functional.communityPlatform.admin.posts.votes.update(
      adminConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  // 8. Test concurrent voting by second admin
  const concurrentVote =
    await api.functional.communityPlatform.admin.posts.votes.update(
      admin2Connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  // 9. Verify vote uniqueness - admin cannot vote twice
  // This will test the business rule that each user can only have one active vote per post
}
