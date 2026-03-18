import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_detail_retrieve_viewable_post(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: `Aa1!${RandomGenerator.alphabets(8)}`,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const memberPassword = `Aa1!${RandomGenerator.alphabets(8)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          subscriptionStatus: "active",
        },
      },
    );
  typia.assert(subscription);
  const postTitle = RandomGenerator.name();
  const postContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        contentType: "text",
        text: {
          body: true,
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const retrieved = await api.functional.communityPlatform.admin.posts.at(
    adminConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrieved);
  const retrievedAgain = await api.functional.communityPlatform.admin.posts.at(
    adminConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedAgain);
  TestValidator.equals("post id should match", retrieved.id, post.id);
  TestValidator.equals("post title should match", retrieved.title, post.title);
  TestValidator.equals(
    "post status should match",
    retrieved.status,
    post.status,
  );
  TestValidator.equals(
    "post detail should be stable across repeated reads",
    retrievedAgain,
    retrieved,
  );
}
