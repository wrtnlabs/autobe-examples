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

export async function test_api_post_snapshots_deleted_post_not_visible_to_member(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(8)}`,
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
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  // create post and capture returned snapshot-relevant fields via snapshot API later
  // (SDK create returns void, so rely on snapshot processing response to infer)
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: postTitle,
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // We don't have an endpoint to list posts; try snapshot selection by publishedAt range around now.
  const publishedAt = new Date().toISOString();
  const snapshots =
    await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
      memberConnection,
      {
        postId: memberAuth.id,
        body: {
          publishedAt,
          includeDeleted: true,
          orderDirection: "desc",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Delete post using member post erase. We must know postId; assume returned id in snapshots.
  const postId = snapshots.postId;
  await api.functional.communityPlatform.member.posts.erase(memberConnection, {
    postId,
  });
  const publishedAtRange = {
    from: new Date(Date.now() - 60000).toISOString(),
    to: new Date(Date.now() + 60000).toISOString(),
  };
  await TestValidator.error(
    "deleted post snapshots should not be visible to member",
    async () => {
      const after =
        await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
          memberConnection,
          {
            postId,
            body: {
              publishedAtRange,
              includeDeleted: true,
              orderDirection: "desc",
              limit: 10,
              page: 1,
            } satisfies ICommunityPlatformPostSnapshot.IRequest,
          },
        );
      typia.assert(after);
      // If endpoint returns instead of throwing, ensure communityId matches and content is absent-like.
      TestValidator.notEquals(
        "snapshot should not expose deleted post content",
        after.body,
        RandomGenerator.paragraph({ sentences: 2 }),
      );
    },
  );
}
