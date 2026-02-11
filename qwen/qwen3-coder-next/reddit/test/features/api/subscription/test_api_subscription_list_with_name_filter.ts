import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_subscription_list_with_name_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connections for testing
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  // 2. Register two different members
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1);
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 3. Create communities with distinct names
  const techCommunity =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: "technology",
          description: "Tech discussions",
        },
      },
    );
  typia.assert(techCommunity);
  const sportCommunity =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: "sports",
          description: "Sports discussions",
        },
      },
    );
  typia.assert(sportCommunity);
  const musicCommunity =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: "music",
          description: "Music discussions",
        },
      },
    );
  typia.assert(musicCommunity);
  // 4. Member1 subscribes to all communities
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    member1Connection,
    {
      communityId: techCommunity.id,
    },
  );
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    member1Connection,
    {
      communityId: sportCommunity.id,
    },
  );
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    member1Connection,
    {
      communityId: musicCommunity.id,
    },
  );
  // 5. Member2 subscribes to only tech and music communities
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    member2Connection,
    {
      communityId: techCommunity.id,
    },
  );
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    member2Connection,
    {
      communityId: musicCommunity.id,
    },
  );
  // 6. Test filtering with different name patterns
  // Test 1: Filter by "tech"
  const techSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      member1Connection,
      {
        body: {
          name: "tech",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(techSubscriptions);
  // Should only return tech community subscription
  TestValidator.equals(
    "should return only tech community",
    techSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "should be tech community",
    techSubscriptions.data[0].community.name,
    "technology",
  );
  TestValidator.predicate(
    "community name contains tech",
    techSubscriptions.data[0].community.name.toLowerCase().includes("tech"),
  );
  // Test 2: Filter by "music"
  const musicSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      member1Connection,
      {
        body: {
          name: "music",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(musicSubscriptions);
  // Should only return music community subscription
  TestValidator.equals(
    "should return only music community",
    musicSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "should be music community",
    musicSubscriptions.data[0].community.name,
    "music",
  );
  TestValidator.predicate(
    "community name contains music",
    musicSubscriptions.data[0].community.name.toLowerCase().includes("music"),
  );
  // Test 3: Filter by "sport" (should return sport community)
  const sportSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      member1Connection,
      {
        body: {
          name: "sport",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(sportSubscriptions);
  // Should only return sport community subscription
  TestValidator.equals(
    "should return only sport community",
    sportSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "should be sport community",
    sportSubscriptions.data[0].community.name,
    "sports",
  );
  TestValidator.predicate(
    "community name contains sport",
    sportSubscriptions.data[0].community.name.toLowerCase().includes("sport"),
  );
  // Test 4: Filter by non-matching pattern (should return empty)
  const emptySubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      member1Connection,
      {
        body: {
          name: "nonexistent",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(emptySubscriptions);
  TestValidator.equals(
    "should return empty list for non-matching filter",
    emptySubscriptions.data.length,
    0,
  );
  // Test 5: Member2 filters subscriptions (should not see sport community)
  const member2TechSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      member2Connection,
      {
        body: {
          name: "tech",
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(member2TechSubscriptions);
  TestValidator.equals(
    "member2 should have tech subscription",
    member2TechSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "member2 tech subscription is correct",
    member2TechSubscriptions.data[0].community.name,
    "technology",
  );
  // Test 6: Pagination test with name filter
  const paginatedSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      member1Connection,
      {
        body: {
          name: "",
          page: 1,
          limit: 2,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(paginatedSubscriptions);
  // Should return first 2 subscriptions (all 3 communities)
  TestValidator.predicate(
    "pagination works",
    paginatedSubscriptions.data.length <= 2,
  );
  TestValidator.equals(
    "pagination records count",
    paginatedSubscriptions.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    paginatedSubscriptions.pagination.pages,
    Math.ceil(3 / 2),
  );
}
