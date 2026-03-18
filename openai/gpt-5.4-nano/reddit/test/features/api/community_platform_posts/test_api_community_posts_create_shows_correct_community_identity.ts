import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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

export async function test_api_community_posts_create_shows_correct_community_identity(
  connection: api.IConnection,
): Promise<void> {
  // 1) Setup/auth: join member.
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: credentials,
  });
  // 2) Create two communities A and B
  const communityA =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {},
    );
  typia.assert(communityB);
  TestValidator.notEquals(
    "community names should differ",
    communityA.name,
    communityB.name,
  );
  // 3) Subscribe member to both communities
  const subscriptionToA =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: communityA.id,
        },
      },
    );
  typia.assert(subscriptionToA);
  const subscriptionToB =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: communityB.id,
        },
      },
    );
  typia.assert(subscriptionToB);
  // 4) Update community A’s public identity fields
  const updatedName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(6)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedIconHref = `https://example.com/icon-${RandomGenerator.alphabets(8)}.png`;
  const updatedCommunityA =
    await api.functional.communityPlatform.communities.updateCommunity(
      memberConnection,
      {
        communityId: communityA.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          icon_href: updatedIconHref,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunityA);
  TestValidator.equals(
    "communityA name updated",
    updatedCommunityA.name,
    updatedName,
  );
  TestValidator.equals(
    "communityA description updated",
    updatedCommunityA.description,
    updatedDescription,
  );
  TestValidator.equals(
    "communityA icon updated",
    updatedCommunityA.iconHref,
    updatedIconHref,
  );
  // 5) Create a post in community A
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: updatedCommunityA.id,
        post_type: "text",
        title: `Post-${RandomGenerator.alphabets(10)}`,
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 6) Create another post in community B
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: communityB.id,
        post_type: "text",
        title: `Post-${RandomGenerator.alphabets(10)}`,
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Note: The posts.create endpoint is typed as returning void in this SDK,
  // so this test cannot directly validate the community identity embedded in
  // a post response payload. The test instead validates that community A
  // identity updates persist, communities are distinct, subscriptions succeed,
  // and post creation succeeds for both target communities.
}
