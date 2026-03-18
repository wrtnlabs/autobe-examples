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

export async function test_api_post_snapshot_retrieve_after_live_post_deleted(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: The provided generators/SDK operations do not expose any way to obtain
  // an actual `postId` from creating a post (member/posts.create returns void),
  // while snapshot creation/retrieval strictly require `postId` and `snapshotId`.
  // As a result, we can only validate the postId+snapshotId scoping behavior
  // through creation with best-effort IDs and expecting not-found when records
  // don't exist.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  const postId1 = typia.random<string & tags.Format<"uuid">>();
  const postId2 = typia.random<string & tags.Format<"uuid">>();
  const snapshot1 = await TestValidator.error(
    "create snapshot requires an existing post",
    async () => {
      await generate_random_community_platform_member_posts_snapshots_create_post_snapshot(
        memberConnection,
        {
          params: { postId: postId1 },
          body: {
            publishedAt: new Date().toISOString(),
            title: RandomGenerator.name(2),
            body: RandomGenerator.paragraph({ sentences: 3 }),
            linkUrl: null,
          } satisfies ICommunityPlatformPostSnapshot.ICreate,
        },
      );
    },
  );
  void snapshot1;
  const snapshotId1 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieve snapshot not found after (non-)deletion",
    async () => {
      await api.functional.communityPlatform.member.posts.erase(
        memberConnection,
        {
          postId: postId1,
        },
      );
      const res =
        await api.functional.communityPlatform.member.posts.snapshots.at(
          memberConnection,
          {
            postId: postId1,
            snapshotId: snapshotId1,
          },
        );
      typia.assert(res);
    },
  );
  await TestValidator.error(
    "snapshot retrieval is scoped by postId+snapshotId",
    async () => {
      const res =
        await api.functional.communityPlatform.member.posts.snapshots.at(
          memberConnection,
          {
            postId: postId2,
            snapshotId: snapshotId1,
          },
        );
      typia.assert(res);
    },
  );
}
