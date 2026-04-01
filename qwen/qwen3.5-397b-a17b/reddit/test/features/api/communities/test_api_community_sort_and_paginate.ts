import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community listing sorting options and pagination behavior.
 *
 * This test validates that users can browse communities in different orders
 * (by name, creation date, subscriber count) and navigate through large
 * result sets using pagination.
 *
 * Test Steps:
 * 1. Create member account to own communities
 * 2. Create 15+ communities with varying names and subscriber counts
 * 3. Create second member to subscribe to some communities
 * 4. Test all sorting options (name, created_at, subscribers)
 * 5. Test pagination with different limit values
 * 6. Verify page navigation and metadata correctness
 */
export async function test_api_community_sort_and_paginate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create 15+ communities with unique names
  const communityNames = [
    "AlphaCommunity",
    "BetaCommunity",
    "GammaCommunity",
    "DeltaCommunity",
    "EpsilonCommunity",
    "ZetaCommunity",
    "EtaCommunity",
    "ThetaCommunity",
    "IotaCommunity",
    "KappaCommunity",
    "LambdaCommunity",
    "MuCommunity",
    "NuCommunity",
    "XiCommunity",
    "OmicronCommunity",
    "PiCommunity",
  ];
  const communities: IRedditCommunityCommunity[] = [];
  for (const name of communityNames) {
    const community =
      await generate_random_reddit_community_member_communities_create(
        ownerConnection,
        {
          body: {
            name: name,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Create second member to subscribe to some communities
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriberAuth = await authorize_member_join(subscriberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(subscriberAuth);
  // Subscribe to first 5 communities to create varying subscriber counts
  for (let i = 0; i < 5; i++) {
    const subscription =
      await api.functional.redditCommunity.member.communities.subscription.create(
        subscriberConnection,
        {
          communityName: communities[i].name,
        },
      );
    typia.assert(subscription);
  }
  // 4. Test sorting by name (alphabetical ASC)
  const sortedByName = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        sort: "name",
        limit: 100,
        page: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(sortedByName);
  TestValidator.predicate(
    "name sort returns communities",
    sortedByName.data.length > 0,
  );
  // Verify alphabetical order
  for (let i = 1; i < sortedByName.data.length; i++) {
    TestValidator.predicate(
      `communities sorted alphabetically at index ${i}`,
      sortedByName.data[i - 1].name.localeCompare(sortedByName.data[i].name) <=
        0,
    );
  }
  // 5. Test sorting by created_at (newest first DESC)
  const sortedByCreatedAt =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort: "created_at",
        limit: 100,
        page: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortedByCreatedAt);
  TestValidator.predicate(
    "created_at sort returns communities",
    sortedByCreatedAt.data.length > 0,
  );
  // Verify newest first (descending order)
  for (let i = 1; i < sortedByCreatedAt.data.length; i++) {
    TestValidator.predicate(
      `communities sorted by created_at DESC at index ${i}`,
      new Date(sortedByCreatedAt.data[i - 1].created_at).getTime() >=
        new Date(sortedByCreatedAt.data[i].created_at).getTime(),
    );
  }
  // 6. Test sorting by subscribers (most popular first DESC)
  const sortedBySubscribers =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort: "subscribers",
        limit: 100,
        page: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortedBySubscribers);
  TestValidator.predicate(
    "subscribers sort returns communities",
    sortedBySubscribers.data.length > 0,
  );
  // Verify subscriber count order (descending)
  for (let i = 1; i < sortedBySubscribers.data.length; i++) {
    TestValidator.predicate(
      `communities sorted by subscribers DESC at index ${i}`,
      sortedBySubscribers.data[i - 1].subscriber_count >=
        sortedBySubscribers.data[i].subscriber_count,
    );
  }
  // 7. Test pagination with different limit values
  const totalCommunities = sortedByName.data.length;
  // Test with limit 10
  const page1Limit10 = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        sort: "name",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(page1Limit10);
  TestValidator.predicate(
    "page 1 limit 10 returns max 10",
    page1Limit10.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Limit10.pagination.limit, 10);
  TestValidator.predicate(
    "pagination pages calculated correctly",
    page1Limit10.pagination.pages === Math.ceil(totalCommunities / 10),
  );
  // Test with limit 25
  const page1Limit25 = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        sort: "name",
        limit: 25,
        page: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(page1Limit25);
  TestValidator.predicate(
    "page 1 limit 25 returns max 25",
    page1Limit25.data.length <= 25,
  );
  TestValidator.equals(
    "pagination current page",
    page1Limit25.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Limit25.pagination.limit, 25);
  // Test with limit 50
  const page1Limit50 = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        sort: "name",
        limit: 50,
        page: 1,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(page1Limit50);
  TestValidator.predicate(
    "page 1 limit 50 returns max 50",
    page1Limit50.data.length <= 50,
  );
  TestValidator.equals(
    "pagination current page",
    page1Limit50.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Limit50.pagination.limit, 50);
  // 8. Test page navigation
  if (totalCommunities > 10) {
    const page2Limit10 = await api.functional.redditCommunity.communities.index(
      connection,
      {
        body: {
          sort: "name",
          limit: 10,
          page: 2,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
    typia.assert(page2Limit10);
    TestValidator.equals(
      "page 2 current page",
      page2Limit10.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Limit10.pagination.limit, 10);
    // Verify page 2 has different communities than page 1
    if (page1Limit10.data.length > 0 && page2Limit10.data.length > 0) {
      TestValidator.notEquals(
        "page 2 has different communities than page 1",
        page1Limit10.data[0].id,
        page2Limit10.data[0]?.id ?? null,
      );
    }
  }
  // Verify total records matches actual communities
  TestValidator.equals(
    "total records matches created communities",
    sortedByName.pagination.records,
    totalCommunities,
  );
}
