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

export async function test_api_community_search_name_with_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  const keyword: string = `search-${RandomGenerator.alphabets(8)}`;
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuthorized);
  const secondaryOwnerConnection: api.IConnection = { host: connection.host };
  const secondaryOwnerAuthorized = await authorize_member_join(
    secondaryOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(secondaryOwnerAuthorized);
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriberAuthorized = await authorize_member_join(
    subscriberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(subscriberAuthorized);
  const targetCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(6)}`,
          title: `${keyword} ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(targetCommunity);
  const otherMatchingCommunity =
    await generate_random_community_platform_member_communities_create(
      secondaryOwnerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(6)}`,
          title: `${RandomGenerator.name(1)} ${keyword} ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(otherMatchingCommunity);
  const nonMatchingCommunity =
    await generate_random_community_platform_member_communities_create(
      secondaryOwnerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(6)}`,
          title: `${RandomGenerator.name(2)} ${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(nonMatchingCommunity);
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      subscriberConnection,
      {
        body: {
          community_slug: targetCommunity.slug,
        },
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription targets target community",
    subscription.community.id,
    targetCommunity.id,
  );
  TestValidator.equals("subscription is active", subscription.active, true);
  const discoveryConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.communityPlatform.communities.index(
    discoveryConnection,
    {
      body: {
        search: keyword,
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(response);
  const matchedTarget = response.data.find(
    (community) => community.id === targetCommunity.id,
  );
  const matchedOther = response.data.find(
    (community) => community.id === otherMatchingCommunity.id,
  );
  const matchedNonTarget = response.data.find(
    (community) => community.id === nonMatchingCommunity.id,
  );
  TestValidator.predicate(
    "target community included in search results",
    matchedTarget !== undefined,
  );
  TestValidator.predicate(
    "other matching community included in search results",
    matchedOther !== undefined,
  );
  TestValidator.equals(
    "non-matching community excluded from search results",
    matchedNonTarget,
    undefined,
  );
  TestValidator.predicate(
    "all returned communities match keyword in title",
    response.data.every((community) => community.title.includes(keyword)),
  );

  if (matchedTarget === undefined)
    throw new Error("Target community must exist in search results.");
  if (matchedOther === undefined)
    throw new Error("Other matching community must exist in search results.");

  TestValidator.equals(
    "target title preserved in discovery result",
    matchedTarget.title,
    targetCommunity.title,
  );
  TestValidator.equals(
    "target subscriber count reflects active subscription",
    matchedTarget.subscriber_count,
    1,
  );
  TestValidator.equals(
    "other matching title preserved in discovery result",
    matchedOther.title,
    otherMatchingCommunity.title,
  );
  TestValidator.equals(
    "other matching community has no extra subscribers",
    matchedOther.subscriber_count,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records cover returned rows",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
}
