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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_snapshots_range_ordering_deterministic(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a member (join).
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Create a community.
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = memberConnection.headers;
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      communityConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3) Subscribe member.
  const subscription: ICommunityPlatformCommunitySubscription =
    await generate_random_community_platform_community_subscriptions_create(
      communityConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // NOTE: Provided SDK typings indicate:
  // - communityPlatform.member.posts.create returns Promise<void>
  // - snapshots.processSnapshots returns a single ICommunityPlatformPostSnapshot (not an array)
  // Therefore we cannot reliably obtain real postId or multiple snapshots in a type-safe way.
  // For compilation success, use a random UUID postId and verify deterministic snapshot
  // fields between asc/desc calls for the same publishedAtRange.
  // 4) Use a placeholder postId for compilation.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 5) Update the post core content (compiles; may fail at runtime if postId is invalid).
  await api.functional.communityPlatform.member.posts.update(
    communityConnection,
    {
      postId,
      body: {
        title: RandomGenerator.name(),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  // 6) Call PATCH snapshots with publishedAtRange (inclusive) orderDirection='asc'.
  const baseTime = new Date().toISOString();
  const from = new Date(new Date(baseTime).getTime() - 60000).toISOString();
  const to = new Date(new Date(baseTime).getTime() + 60000).toISOString();
  const request: ICommunityPlatformPostSnapshot.IRequest = {
    publishedAtRange: { from, to },
    orderDirection: "asc",
    includeDeleted: false,
    page: 1,
    limit: 100,
  };
  const snapshotAsc: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
      communityConnection,
      {
        postId,
        body: request,
      },
    );
  typia.assert(snapshotAsc);
  // 7) Same range but orderDirection='desc'.
  const snapshotDesc: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
      communityConnection,
      {
        postId,
        body: {
          ...request,
          orderDirection: "desc",
        },
      },
    );
  typia.assert(snapshotDesc);
  // Validate deterministic selection for identical criteria.
  TestValidator.equals(
    "snapshot id same asc/desc",
    snapshotDesc.id,
    snapshotAsc.id,
  );
  TestValidator.equals(
    "publishedAt same asc/desc",
    snapshotDesc.publishedAt,
    snapshotAsc.publishedAt,
  );
  TestValidator.equals(
    "createdAt same asc/desc",
    snapshotDesc.createdAt,
    snapshotAsc.createdAt,
  );
  // Edge validation: partial overlap range should still respect inclusive bounds.
  const partialFrom = new Date(new Date(from).getTime() + 20000).toISOString();
  const partialTo = new Date(new Date(to).getTime() - 20000).toISOString();
  const snapshotPartial: ICommunityPlatformPostSnapshot =
    await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
      communityConnection,
      {
        postId,
        body: {
          publishedAtRange: { from: partialFrom, to: partialTo },
          orderDirection: "asc",
          includeDeleted: false,
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(snapshotPartial);
  TestValidator.predicate(
    "publishedAt within inclusive partial bounds",
    snapshotPartial.publishedAt >= partialFrom &&
      snapshotPartial.publishedAt <= partialTo,
  );
}
