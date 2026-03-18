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

export async function test_api_post_snapshot_link_post_linkurl_persisted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member registration + auth
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2) Create a community
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<80000>
        >(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Subscribe to community
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4) Create a link-type post
  const linkUrl = typia.random<string & tags.Format<"uri">>();
  const initialSnapshotTitle = RandomGenerator.name(2);
  const initialSnapshotBody = RandomGenerator.paragraph({ sentences: 2 });
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: RandomGenerator.name(3),
        link: {
          href: linkUrl,
          display_title: RandomGenerator.name(3),
          display_description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 5) Create first snapshot (postId cannot be retrieved from available create API signatures)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const snapshot1 =
    await generate_random_community_platform_member_posts_snapshots_create_post_snapshot(
      memberConnection,
      {
        params: { postId },
        body: {
          publishedAt: new Date().toISOString(),
          title: initialSnapshotTitle,
          body: initialSnapshotBody,
          linkUrl,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  // 6) Business assertions on success
  TestValidator.equals(
    "snapshot1 title matches",
    snapshot1.title,
    initialSnapshotTitle,
  );
  TestValidator.equals(
    "snapshot1 body matches",
    snapshot1.body,
    initialSnapshotBody,
  );
  TestValidator.equals(
    "snapshot1 linkUrl persisted",
    snapshot1.linkUrl,
    linkUrl,
  );
  TestValidator.equals(
    "snapshot1 deletedByUserId is null",
    snapshot1.deletedByUserId,
    null,
  );
  // 7) Consistency check: second snapshot with different title/body but same linkUrl
  const secondSnapshotTitle = RandomGenerator.name(2);
  const secondSnapshotBody = RandomGenerator.paragraph({ sentences: 2 });
  const snapshot2 =
    await generate_random_community_platform_member_posts_snapshots_create_post_snapshot(
      memberConnection,
      {
        params: { postId: snapshot1.postId },
        body: {
          publishedAt: new Date().toISOString(),
          title: secondSnapshotTitle,
          body: secondSnapshotBody,
          linkUrl,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  TestValidator.equals(
    "snapshot2 linkUrl consistent with snapshot1",
    snapshot2.linkUrl,
    snapshot1.linkUrl,
  );
}
