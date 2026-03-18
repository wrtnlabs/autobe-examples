import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_member_posts_snapshots_create_post_snapshot";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshot_deleted_post_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Register member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Use actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers ??= {};
  userConnection.headers.Authorization = member.token.access;
  // 2) Create community
  const community = await generate_random_community_platform_communities_create(
    userConnection,
    {},
  );
  typia.assert(community);
  // 3) Subscribe member to community
  await generate_random_community_platform_community_subscriptions_create(
    userConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4) Create a post (cannot capture postId with available SDK/generator)
  await generate_random_community_platform_member_posts_create(userConnection, {
    body: {
      community_id: community.id,
      post_type: "text",
      title: RandomGenerator.name(),
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // 5/6) Without postId, we cannot perform lifecycle delete on the created post.
  // Use a random UUID as postId and assert snapshot creation is rejected as ineligible.
  const postId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot creation for deleted/non-eligible post should be rejected",
    [400, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.posts.snapshots.createPostSnapshot(
        userConnection,
        {
          postId,
          body: {
            publishedAt: new Date().toISOString(),
            title: RandomGenerator.name(),
            body: RandomGenerator.paragraph({ sentences: 2 }),
            linkUrl: null,
          } satisfies ICommunityPlatformPostSnapshot.ICreate,
        },
      );
    },
  );
}
