import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_community_delete_removes_subscription_visibility(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    }),
  );
  const subscriberConnection: api.IConnection = { host: connection.host };
  typia.assert(
    await authorize_member_join(subscriberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    }),
  );
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(12)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      subscriberConnection,
      {
        body: {
          community_slug: community.slug,
        },
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription targets created community slug",
    subscription.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "subscription is active before deletion",
    subscription.active,
    true,
  );
  const beforePage =
    await api.functional.communityPlatform.member.subscriptions.index(
      subscriberConnection,
      {
        body: {
          slug: community.slug,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(beforePage);
  TestValidator.predicate(
    "community is visible in subscribed communities before deletion",
    ArrayUtil.has(beforePage.data, (item) => item.slug === community.slug),
  );
  await api.functional.communityPlatform.member.communities.erase(
    ownerConnection,
    {
      communitySlug: community.slug as unknown as string & tags.Format<"uuid">,
    },
  );
  const afterPage =
    await api.functional.communityPlatform.member.subscriptions.index(
      subscriberConnection,
      {
        body: {
          slug: community.slug,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(afterPage);
  TestValidator.predicate(
    "deleted community is no longer visible in subscribed communities",
    !ArrayUtil.has(afterPage.data, (item) => item.slug === community.slug),
  );
}
